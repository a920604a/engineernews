import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync, spawnSync } from 'node:child_process';
import { SOURCES, type Source } from './sources.js';

const POSTS_BASE_DIR = path.join(process.cwd(), 'src/content/posts');
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const MAX_VIDEOS_PER_CHANNEL = 5;

// ── Helpers ──────────────────────────────────────────────────────────────────

function isAlreadyProcessed(videoId: string, videoUrl: string): boolean {
  const categories = ['tech', 'product', 'learning', 'career', 'life'];
  for (const cat of categories) {
    const dir = path.join(POSTS_BASE_DIR, cat);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.includes(videoId)) return true;
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      if (content.includes(`original_url: "${videoUrl}"`)) return true;
    }
  }
  return false;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

// ── Mermaid Validator ────────────────────────────────────────────────────────

function validateMermaid(code: string): { ok: boolean; error?: string } {
  // 1. 檢查括號平衡
  const stack: string[] = [];
  const pairs: Record<string, string> = { '{': '}', '[': ']', '(': ')' };
  for (const char of code) {
    if (pairs[char]) stack.push(pairs[char]);
    else if (Object.values(pairs).includes(char)) {
      if (stack.pop() !== char) return { ok: false, error: '括號未對齊' };
    }
  }
  if (stack.length > 0) return { ok: false, error: '括號未閉合' };

  // 2. 基本關鍵字檢查
  const validTypes = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie'];
  const firstLine = code.trim().split('\n')[0].toLowerCase();
  if (!validTypes.some(t => firstLine.includes(t))) {
    return { ok: false, error: '無效的圖表類型' };
  }

  return { ok: true };
}

async function tryFixMermaid(badCode: string, reason: string): Promise<string> {
  console.log(`  🔧 嘗試修復 Mermaid 語法 (${reason})...`);
  const prompt = `你是一個 Mermaid 語法專家。以下這段代碼有語法錯誤（原因：${reason}），請修正它。
只輸出修正後的代碼，不要有任何解釋文字，也不要包含 \`\`\`mermaid 標籤。

錯誤代碼：
${badCode}`;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-70b-instruct`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    }
  );

  const json = await response.json() as any;
  return (json.result?.response ?? badCode).replace(/```mermaid/g, '').replace(/```/g, '').trim();
}

// ── Video Discovery (yt-dlp) ─────────────────────────────────────────────────

interface VideoEntry {
  id: string;
  title: string;
  url: string;
  description: string;
}

function getLatestVideos(source: Source): VideoEntry[] {
  const result = spawnSync(
    'python3',
    [
      '-m', 'yt_dlp',
      '--flat-playlist',
      '--print', '%(id)s|||%(title)s|||%(webpage_url)s|||%(description)s',
      '--playlist-end', String(MAX_VIDEOS_PER_CHANNEL),
      '-q',
      source.url,
    ],
    { encoding: 'utf-8', timeout: 30000 }
  );

  if (result.status !== 0 || !result.stdout.trim()) {
    console.warn(`  ⚠️  無法取得影片列表：${source.name}`);
    return [];
  }

  return result.stdout
    .trim()
    .split('\n')
    .filter(line => line.includes('|||'))
    .map(line => {
      const parts = line.split('|||');
      const [id, title, url, ...descParts] = parts;
      return {
        id: (id ?? '').trim(),
        title: (title ?? '').trim(),
        url: (url ?? '').trim(),
        description: descParts.join('|||').trim(),
      };
    })
    .filter(v => v.id && v.title && v.url);
}

// ── Subtitle Download (yt-dlp) ────────────────────────────────────────────────

function downloadSubtitles(videoUrl: string, tmpDir: string): string | null {
  const result = spawnSync(
    'python3',
    [
      '-m', 'yt_dlp',
      '--write-subs',
      '--write-auto-subs',
      '--sub-lang', 'zh-TW,zh-Hant,zh,en',
      '--sub-format', 'vtt',
      '--skip-download',
      '--output', path.join(tmpDir, '%(id)s'),
      '-q',
      videoUrl,
    ],
    { encoding: 'utf-8', timeout: 60000 }
  );

  const files = fs.readdirSync(tmpDir);
  const vttFiles = files.filter(f => f.endsWith('.vtt'));
  if (vttFiles.length === 0) return null;

  const preferred = vttFiles.find(f => f.includes('.zh-TW.')) ?? 
                    vttFiles.find(f => f.includes('.zh-Hant.')) ??
                    vttFiles.find(f => f.includes('.zh.')) ?? 
                    vttFiles[0];

  const raw = fs.readFileSync(path.join(tmpDir, preferred), 'utf-8');
  return parseVtt(raw);
}

function parseVtt(vtt: string): string {
  return vtt
    .split('\n')
    .filter(line => !line.startsWith('WEBVTT') && !line.match(/^\d+$/) && !line.match(/[\d:,]+ --> [\d:,]+/) && line.trim())
    .join(' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000);
}

// ── Workers AI Summarize ─────────────────────────────────────────────────────

interface AISummary {
  title: string;
  tldr: string;
  tags: string[];
  category: string;
  type: string;
  summary: string;
}

interface EnglishArticle {
  title: string;
  tldr: string;
  tags: string[];
  description: string;
  content: string;
}

const VALID_TYPES = ['how-to', 'explainer', 'listicle', 'deep-dive', 'debug', 'case-study', 'comparison', 'research', 'newsjacking'] as const;

const TYPE_STRUCTURES: Record<string, string> = {
  'debug': `## TL;DR
{{一句話說明問題與解法}}

## 情境
{{在做什麼時遇到這個問題}}

## 問題
{{錯誤訊息或異常行為，盡量引用原文}}

## 嘗試過程
{{試了什麼、為什麼沒用}}

## 解法
{{最終怎麼解的，程式碼要完整}}

## 為什麼會這樣
{{根本原因}}

## 學到的事
{{一句話總結}}

## 參考資料
{{相關連結}}`,

  'how-to': `## TL;DR
{{一句話說明這篇教什麼}}

## 前置條件
{{需要什麼環境、工具或知識}}

## 步驟
{{逐步說明，每步都要具體，有指令就放指令}}

## 完整範例
{{如果有程式碼，放完整可執行的版本}}

## 常見問題
{{容易卡住的地方}}

## 參考資料
{{相關連結}}`,

  'explainer': `{{開頭 2-3 句：這篇要解釋什麼？讀者看完會理解什麼？}}

## TL;DR
{{核心概念一句話}}

## 是什麼
{{概念定義，說清楚，不要廢話}}

## 為什麼重要
{{解決了什麼問題，或帶來什麼改變}}

## 怎麼運作
{{原理說明。有流程就用 Mermaid flowchart，有服務互動就用 sequenceDiagram}}

## 跟 {{相近概念}} 的差別
{{比較，說清楚適用情境}}

## 小結
{{適合誰用、什麼情況下選它}}

## 參考資料
{{相關連結}}`,

  'deep-dive': `{{開頭 2-4 句：這篇要深入介紹什麼，讀者看完會得到什麼}}

## TL;DR
{{核心重點}}

## 設計哲學
{{這個工具 / 技術為什麼這樣設計，解決什麼問題}}

## 核心概念
{{展開說明，架構圖用 Mermaid graph 或 sequenceDiagram}}

## 跟常見替代方案比較
{{為什麼選這個而不是 X，用表格或條列}}

## 適合 / 不適合的情境
{{具體說明}}

## 整體來說
{{核心取捨，適合什麼樣的專案或團隊}}

## 參考資料
{{相關連結}}`,

  'listicle': `## TL;DR
{{這份清單的核心價值一句話}}

## {{項目 1：名稱}}
{{說明，為什麼值得列進來}}

## {{項目 2：名稱}}
{{說明}}

## {{項目 3～N：依內容增減}}
{{說明}}

## 總結
{{怎麼選，或綜合建議}}

## 參考資料
{{相關連結}}`,

  'comparison': `## TL;DR
{{結論先說：推薦誰、用在什麼情境}}

## 比較對象
{{說明這次比較的是什麼，各自的定位}}

## 功能比較
{{用表格列出關鍵維度}}

## 效能 / 成本
{{如果影片有數據就引用}}

## 適用情境
{{A 適合哪種，B 適合哪種}}

## 結論
{{明確建議，不要模糊}}

## 參考資料
{{相關連結}}`,

  'research': `{{開頭：這份研究 / 調查在看什麼}}

## TL;DR
{{最重要的發現}}

## 研究背景
{{為什麼有人做這個研究，問題是什麼}}

## 關鍵發現
{{數據、結論，有圖表就用表格或 Mermaid}}

## 影響與意義
{{對工程師 / 產品人 / 業界的意義}}

## 限制與注意事項
{{這份研究有什麼不足}}

## 參考資料
{{原始論文 / 報告連結}}`,

  'newsjacking': `## TL;DR
{{這件事是什麼、為什麼重要}}

## 發生了什麼
{{事件說明，具體時間、對象、影響}}

## 為什麼這件事值得關注
{{對工程師或產業的意義}}

## 技術角度怎麼看
{{從技術面解讀}}

## 後續值得觀察的點
{{還沒有答案但值得追蹤的問題}}

## 參考資料
{{新聞來源}}`,

  'case-study': `{{開頭：這個案例要解決什麼問題}}

## TL;DR
{{一句話總結解法與成果}}

## 背景與挑戰
{{情境說明，為什麼這個問題不好解}}

## 解法設計
{{怎麼思考、怎麼決策。有架構就加 Mermaid graph}}

## 實作細節
{{關鍵的技術選擇與取捨}}

## 成果
{{數據或具體改善}}

## 學到的事
{{可以複用的洞察}}

## 參考資料
{{相關連結}}`,
};

async function callAI(prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-70b-instruct`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
    }
  );
  const json = await response.json() as any;
  return json.result?.response ?? '';
}

async function summarize(content: string, sourceTags: string[], videoTitle: string): Promise<AISummary> {
  if (!ACCOUNT_ID || !API_TOKEN) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN');
  }

  // ── Step 1：決定 metadata ────────────────────────────────────────────────────
  const metaPrompt = `你是台灣技術主編。根據以下 YouTube 影片內容，輸出文章的 metadata。

只能輸出一個 JSON，不要有任何其他文字：
{
  "title": "台灣繁體中文標題",
  "tldr": "一句話摘要（台灣繁體中文）",
  "tags": ["標籤1", "標籤2"],
  "category": "tech 或 product 或 learning 或 career 其中一個",
  "type": "根據內容從以下選一個最符合的：how-to（教學步驟）、explainer（概念解釋）、listicle（清單介紹）、deep-dive（深入介紹工具或技術）、debug（問題排查）、case-study（案例分析）、comparison（工具或方案比較）、research（研究或調查）、newsjacking（時事評論）"
}

術語規範：使用「程式碼」非「代碼」、「框架」非「架構（指 framework 時）」、「專案」非「項目」。

<content>
影片標題：${videoTitle}
內容：${content}
</content>`;

  const metaRaw = await callAI(metaPrompt, 400);

  let meta: any;
  try {
    const jsonMatch = metaRaw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    meta = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('  ❌ Metadata 解析失敗：', metaRaw.slice(0, 200));
    throw new Error('Invalid metadata response');
  }

  const validType = VALID_TYPES.includes(meta.type as any) ? meta.type : 'explainer';
  console.log(`  📌 type: ${validType} / category: ${meta.category}`);

  // ── Step 2：根據 type 生成內容 ────────────────────────────────────────────────
  const structure = TYPE_STRUCTURES[validType];

  const contentPrompt = `你是台灣技術主編。將以下 YouTube 影片內容撰寫成一篇台灣繁體中文技術文章。

【寫作規範】
- 語言：全程使用台灣繁體中文。術語：「程式碼」非「代碼」、「框架」非「架構（指 framework 時）」、「專案」非「項目」。
- 語氣：直接，不客套，可以有觀點，不需要介紹自己。
- 長度：600–1000 字。
- 圖表：有流程或架構時用 Mermaid（flowchart / sequenceDiagram / graph 依情境選用），不要為了加圖而加圖。Mermaid 箭頭格式：\`A --> B\` 或 \`A -->|label| B\`，不要用 \`|label|>\`。
- 必須以此結構撰寫（將 {{...}} 替換為實際內容）：

${structure}

只輸出文章 Markdown 內容，不要輸出任何 frontmatter 或額外說明。

<content>
影片標題：${videoTitle}
內容：${content}
</content>`;

  let articleContent = await callAI(contentPrompt, 2500);

  if (!articleContent || articleContent.length < 200) {
    throw new Error('Content too short');
  }

  // ── Mermaid 驗證與修復 ────────────────────────────────────────────────────────
  const mermaidRegex = /```mermaid([\s\S]*?)```/g;
  let match;
  while ((match = mermaidRegex.exec(articleContent)) !== null) {
    const originalCode = match[1].trim();
    const validation = validateMermaid(originalCode);
    if (!validation.ok) {
      const fixedCode = await tryFixMermaid(originalCode, validation.error!);
      articleContent = articleContent.replace(originalCode, fixedCode);
    }
  }

  return {
    title: meta.title || 'Untitled',
    tldr: meta.tldr || '',
    tags: [...(meta.tags || []), ...sourceTags].filter((v, i, a) => a.indexOf(v) === i),
    category: (meta.category || 'learning').toLowerCase(),
    type: validType,
    summary: articleContent,
  };
}

async function generateMermaidDiagram(videoTitle: string, content: string, articleContent: string): Promise<string> {
  const prompt = `你是 Mermaid 圖表設計師。根據以下影片內容與文章摘要，產生一張最能表達技術結構、資料流或步驟順序的 Mermaid 圖。

規則：
- 只輸出 Mermaid code，不要輸出 \`\`\`mermaid fence
- 優先使用 flowchart，若流程互動更適合則用 sequenceDiagram
- 圖要具體，不要把整篇文章變成文字清單
- 節點名稱簡短，箭頭格式要正確

影片標題：${videoTitle}

影片內容：
${content}

文章摘要：
${articleContent}`;

  const raw = await callAI(prompt, 500);
  return raw.replace(/```mermaid/g, '').replace(/```/g, '').trim();
}

async function translateArticle(article: AISummary, articleContent: string, videoTitle: string): Promise<EnglishArticle> {
  const metaPrompt = `你是一位技術編輯，請把以下台灣繁體中文文章資訊翻譯成自然的英文。

只輸出 JSON，不要輸出其他文字：
{
  "title": "English title",
  "tldr": "English one-sentence summary",
  "tags": ["english-tag-1", "english-tag-2"],
  "description": "English meta description"
}

規則：
- tags 必須是 lower-case kebab-case
- 保留技術術語與產品名稱的專有名詞
- title 盡量自然、精準

原始影片標題：${videoTitle}
中文標題：${article.title}
中文摘要：${article.tldr}
中文標籤：${article.tags.join(', ')}`;

  const metaRaw = await callAI(metaPrompt, 400);
  let meta: Partial<EnglishArticle> = {};

  try {
    const jsonMatch = metaRaw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    meta = JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.warn('  ⚠️  英文 metadata 解析失敗，使用 fallback。');
    meta = {
      title: article.title,
      tldr: article.tldr,
      tags: article.tags.map((tag) => tag.toLowerCase()),
      description: article.tldr,
    };
  }

  const contentPrompt = `You are a technical editor.

Translate the following Taiwanese Traditional Chinese Markdown article into natural English.

Rules:
- Preserve the Markdown structure, headings, lists, tables, links, and code fences.
- Keep Mermaid code blocks intact, translating only surrounding prose.
- Do not add explanations or prefaces.
- Keep the tone direct and concise.

Article title: ${article.title}

Markdown:
${articleContent}`;

  let translatedContent = await callAI(contentPrompt, 3200);
  translatedContent = translatedContent.trim();

  if (!translatedContent || translatedContent.length < 100) {
    console.warn('  ⚠️  英文內容翻譯過短，fallback to original content.');
    translatedContent = articleContent;
  }

  return {
    title: meta.title || article.title,
    tldr: meta.tldr || article.tldr,
    tags: (meta.tags?.length ? meta.tags : article.tags.map((tag) => tag.toLowerCase())) as string[],
    description: meta.description || meta.tldr || article.tldr,
    content: translatedContent,
  };
}

// ── Markdown Output ──────────────────────────────────────────────────────────

function writePost(videoId: string, source: Source, video: VideoEntry, ai: AISummary): string {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const nowIso = now.toISOString();
  const category = ['tech', 'product', 'learning', 'career', 'life'].includes(ai.category) ? ai.category : 'learning';
  const categoryDir = path.join(POSTS_BASE_DIR, category);
  if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });

  const fileName = `${today}-${slugify(video.title) || video.id}.md`;
  const outputPath = path.join(categoryDir, fileName);

  let finalSummary = ai.summary;
  const videoRef = `- [${video.title}](${video.url})`;
  if (!finalSummary.includes('## 參考資料')) {
    finalSummary += `\n\n## 參考資料\n\n${videoRef}`;
  } else if (!finalSummary.includes(video.url)) {
    finalSummary += `\n${videoRef}`;
  }

  const frontmatter = [
    '---',
    `title: "${ai.title.replace(/"/g, '\\"')}"`,
    `date: ${nowIso}`,
    `category: ${category}`,
    `tags: [${ai.tags.map(t => `"${t}"`).join(', ')}]`,
    `lang: zh-TW`,
    `tldr: "${ai.tldr.replace(/"/g, '\\"')}"`,
    `description: "${ai.tldr.replace(/"/g, '\\"')}"`,
    `type: ${ai.type}`,
    `original_url: "${video.url}"`,
    `draft: false`,
    '---',
    '',
    finalSummary,
  ].join('\n');

  fs.writeFileSync(outputPath, frontmatter);
  return outputPath;
}

function writeEnglishPost(videoId: string, source: Source, video: VideoEntry, ai: AISummary, english: EnglishArticle): string {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const nowIso = now.toISOString();
  const category = ['tech', 'product', 'learning', 'career', 'life'].includes(ai.category) ? ai.category : 'learning';
  const categoryDir = path.join(POSTS_BASE_DIR, category);
  if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });

  const fileName = `${today}-${slugify(video.title) || video.id}.en.md`;
  const outputPath = path.join(categoryDir, fileName);

  const frontmatter = [
    '---',
    `title: "${english.title.replace(/"/g, '\\"')}"`,
    `date: ${nowIso}`,
    `category: ${category}`,
    `tags: [${english.tags.map(t => `"${t}"`).join(', ')}]`,
    `lang: en`,
    `tldr: "${english.tldr.replace(/"/g, '\\"')}"`,
    `description: "${english.description.replace(/"/g, '\\"')}"`,
    `type: ${ai.type}`,
    `original_url: "${video.url}"`,
    `draft: false`,
    '---',
    '',
    english.content,
  ].join('\n');

  fs.writeFileSync(outputPath, frontmatter);
  return outputPath;
}

// ── Main ─────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  return arr
    .map(v => ({ v, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ v }) => v);
}

async function crawl() {
  const enabledSources = shuffle(SOURCES.filter(s => s.enabled && s.type === 'youtube'));
  console.log(`\n🔍 爬蟲啟動（隨機單頻道模式）`);

  // 依序嘗試隨機排列的頻道，找到第一個有新影片的就處理並結束
  for (const source of enabledSources) {
    const videos = getLatestVideos(source);
    const newVideos = videos.filter(v => !isAlreadyProcessed(v.id, v.url));

    if (newVideos.length === 0) {
      console.log(`  ⏭️  ${source.name} 無新影片，換下一個`);
      continue;
    }

    const video = newVideos[0];
    console.log(`\n📺 ${source.name} → ${video.title}`);
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crawl-'));

    try {
      const subtitles = downloadSubtitles(video.url, tmpDir);
      const content = subtitles ?? `標題：${video.title}\n簡介：${video.description}`;

      const ai = await summarize(content, source.tags, video.title);
      const mermaid = await generateMermaidDiagram(video.title, content, ai.summary);
      let articleWithDiagram = ai.summary;
      if (!/```mermaid[\s\S]*?```/.test(articleWithDiagram) && mermaid) {
        articleWithDiagram += `\n\n## 技術結構圖\n\n\`\`\`mermaid\n${mermaid}\n\`\`\``;
      }

      const articleForWrite = { ...ai, summary: articleWithDiagram };
      const english = await translateArticle(articleForWrite, articleForWrite.summary, video.title);
      const outPath = writePost(video.id, source, video, articleForWrite);
      const enOutPath = writeEnglishPost(video.id, source, video, ai, english);
      console.log(`  ✅ ${path.relative(process.cwd(), outPath)}`);
      console.log(`  ✅ ${path.relative(process.cwd(), enOutPath)}`);
      console.log(`\n✅ 完成 1 篇文章。`);
      return;
    } catch (e) {
      console.warn(`  ❌ 處理失敗：${(e as Error).message}`);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  console.log(`\n⚠️ 所有頻道均無新影片。`);
}

crawl().catch(e => {
  console.error(e);
  process.exit(1);
});
