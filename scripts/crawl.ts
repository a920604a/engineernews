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

function isAlreadyProcessed(videoId: string): boolean {
  const categories = ['tech', 'product', 'learning', 'career', 'life'];
  for (const cat of categories) {
    const dir = path.join(POSTS_BASE_DIR, cat);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    if (files.some(f => f.includes(videoId))) return true;
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
  summary: string;
}

async function summarize(content: string, sourceTags: string[], videoTitle: string): Promise<AISummary> {
  if (!ACCOUNT_ID || !API_TOKEN) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN');
  }

  const prompt = `你是一個專業的台灣技術主編。你的任務是將 YouTube 影片內容轉化為高品質的「台灣繁體中文」技術文章。

寫作規範（極重要）：
1. 語言語言：必須完全使用「台灣繁體中文」輸出。
2. 術語使用：嚴格使用台灣技術圈慣用語。例如：使用「資訊」而非「信息」、「程式碼」而非「代碼」、「框架」而非「架構(當指framework時)」、「專案」而非「項目」、「內容」而非「內容」。
3. 結構：
   - 開頭必須為「## TL;DR」。
   - 涉及流程或架構時，必須使用 \`\`\`mermaid。
4. 長度：約 600-1000 字。

請嚴格按照以下格式輸出內容，不要輸出任何額外文字：

---METADATA---
{
  "title": "繁體中文標題",
  "tldr": "繁體中文重點摘要",
  "tags": ["標籤1", "標籤2"],
  "category": "tech | product | learning | career"
}
---CONTENT---
[完整的繁體中文 Markdown 文章內容]

<content>
影片標題：${videoTitle}
內容：${content}
</content>`;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-70b-instruct`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2500
      }),
    }
  );

  const json = await response.json() as any;
  const text: string = json.result?.response ?? '';

  if (!text || !text.includes('---METADATA---') || !text.includes('---CONTENT---')) {
    console.error('  ❌ AI 輸出格式錯誤（缺少標籤）：', text.slice(0, 200));
    throw new Error('Invalid AI response format');
  }

  try {
    const metaPart = text.split('---METADATA---')[1].split('---CONTENT---')[0].trim();
    let contentPart = text.split('---CONTENT---')[1].trim();

    const meta = JSON.parse(metaPart);
    
    // Mermaid 驗證與修復
    const mermaidRegex = /```mermaid([\s\S]*?)```/g;
    let match;
    while ((match = mermaidRegex.exec(contentPart)) !== null) {
      const originalCode = match[1].trim();
      const validation = validateMermaid(originalCode);
      if (!validation.ok) {
        const fixedCode = await tryFixMermaid(originalCode, validation.error!);
        contentPart = contentPart.replace(originalCode, fixedCode);
      }
    }

    if (contentPart.length < 200) {
      throw new Error('Content too short');
    }

    return {
      title: meta.title || 'Untitled',
      tldr: meta.tldr || '',
      tags: [...(meta.tags || []), ...sourceTags].filter((v, i, a) => a.indexOf(v) === i),
      category: (meta.category || 'learning').toLowerCase(),
      summary: contentPart,
    };
  } catch (e) {
    console.error('  ❌ 解析失敗。Metadata 部份：', text.split('---CONTENT---')[0]);
    throw e;
  }
}

// ── Markdown Output ──────────────────────────────────────────────────────────

function writePost(videoId: string, source: Source, video: VideoEntry, ai: AISummary): string {
  const today = new Date().toISOString().split('T')[0];
  const category = ['tech', 'product', 'learning', 'career', 'life'].includes(ai.category) ? ai.category : 'learning';
  const categoryDir = path.join(POSTS_BASE_DIR, category);
  if (!fs.existsSync(categoryDir)) fs.mkdirSync(categoryDir, { recursive: true });

  const fileName = `${today}-${slugify(video.title) || video.id}.md`;
  const outputPath = path.join(categoryDir, fileName);

  let finalSummary = ai.summary;
  if (!finalSummary.includes('## 參考資料')) {
    finalSummary += `\n\n## 參考資料\n\n- [${video.title}](${video.url})`;
  }

  const frontmatter = [
    '---',
    `title: "${ai.title.replace(/"/g, '\\"')}"`,
    `date: ${today}`,
    `category: ${category}`,
    `tags: [${ai.tags.map(t => `"${t}"`).join(', ')}]`,
    `lang: zh-TW`,
    `tldr: "${ai.tldr.replace(/"/g, '\\"')}"`,
    `description: "${ai.tldr.replace(/"/g, '\\"')}"`,
    `original_url: "${video.url}"`,
    `draft: false`,
    '---',
    '',
    finalSummary,
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
    const newVideos = videos.filter(v => !isAlreadyProcessed(v.id));

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
      const outPath = writePost(video.id, source, video, ai);
      console.log(`  ✅ ${path.relative(process.cwd(), outPath)}`);
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
