/**
 * rewrite-posts.ts
 * 批次重寫所有爬蟲生成的文章（有 original_url 的）
 * 使用 web search 補充資料，以更深度、更有觀點的方式重寫
 *
 * Usage:
 *   tsx scripts/rewrite-posts.ts              # dry-run（只顯示清單）
 *   tsx scripts/rewrite-posts.ts --write      # 實際寫入
 *   tsx scripts/rewrite-posts.ts --write --file=path/to/post.md  # 單篇
 */

import fs from 'node:fs';
import path from 'node:path';

const POSTS_BASE_DIR = path.join(process.cwd(), 'src/content/posts');
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const doWrite = process.argv.includes('--write');
const singleFile = process.argv.find(a => a.startsWith('--file='))?.replace('--file=', '');

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseFrontmatter(content: string): { meta: Record<string, any>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, any> = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^"(.*)"$/, '$1');
    if (val.startsWith('[')) {
      try { meta[key] = JSON.parse(val.replace(/'/g, '"')); } catch { meta[key] = val; }
    } else {
      meta[key] = val;
    }
  }
  return { meta, body: match[2] };
}

function buildFrontmatter(meta: Record<string, any>): string {
  const lines = ['---'];
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map(t => `"${t}"`).join(', ')}]`);
    } else {
      lines.push(`${k}: "${String(v).replace(/"/g, '\\"')}"`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

// ── AI ───────────────────────────────────────────────────────────────────────

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

// ── Web Search ───────────────────────────────────────────────────────────────

async function searchWeb(query: string): Promise<string> {
  // 加 2 秒延遲避免 rate limit
  await new Promise(r => setTimeout(r, 2000));
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(`https://s.jina.ai/${encoded}`, {
      headers: { 'Accept': 'text/plain', 'X-No-Cache': 'true' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return '';
    const text = await res.text();
    return text.slice(0, 8000);
  } catch {
    return '';
  }
}

async function searchWebWithFallback(zhQuery: string, enQuery?: string): Promise<string> {
  const result = await searchWeb(zhQuery);
  if (result.length > 200) return result;

  if (enQuery) {
    console.log(`  🔄 中文搜尋失敗，改用英文搜尋...`);
    await new Promise(r => setTimeout(r, 2000));
    return await searchWeb(enQuery);
  }
  return result;
}

// ── Rewrite ──────────────────────────────────────────────────────────────────

const TYPE_STRUCTURES: Record<string, string> = {
  'debug': `## TL;DR
（一句話：問題 + 解法）

## 情境
（在做什麼時踩到這個問題，要具體）

## 問題
（錯誤訊息或異常行為，直接引用）

## 嘗試過程
（試了哪些方向、為什麼行不通，這段要老實說）

## 解法
（最終解法，程式碼要完整可執行）

## 為什麼會這樣
（根本原因，技術層面解釋）

## 學到的事
（一兩句話，要有洞察，不要廢話）

## 參考資料`,

  'how-to': `## TL;DR
（這篇教什麼，完成後能做到什麼）

## 前置條件
（需要什麼，列清楚）

## 步驟
（每步要具體，指令要完整，不要省略）

## 完整範例
（可以直接跑的程式碼）

## 常見地雷
（容易出錯的地方，最好是自己踩過的）

## 參考資料`,

  'explainer': `（開頭先說一個讓人意外或反直覺的事實，或點出這個概念解決了什麼過去解不了的問題。2-3 句，不要自我介紹。）

## TL;DR
（核心概念一句話，要有觀點）

## 是什麼，為什麼現在才出現
（定義 + 背景，說清楚之前的替代方案有什麼問題）

## 怎麼運作
（原理說明，有流程就用 Mermaid flowchart，有服務互動就用 sequenceDiagram。圖要有資訊量，不只是把文字重新排列）

## 跟 {{相近概念}} 的差別
（具體比較，說清楚什麼情況下選哪個）

## 實際用起來怎麼樣
（優點、限制、踩坑點，要誠實）

## 參考資料`,

  'deep-dive': `（開頭先指出這個技術最不直覺或最容易誤解的地方。2-4 句，不要從「XXX是一個...」開始。）

## TL;DR
（核心重點，要有立場）

## 設計哲學
（為什麼這樣設計，是在解決什麼具體問題，不是「提升效能」這種廢話）

## 核心概念
（深入說明，架構圖用 Mermaid，圖要有資訊量）

## 跟常見替代方案比較
（用表格，列出關鍵維度，有具體數字最好）

## 適合 / 不適合的情境
（要說清楚「什麼情況下不適合」，這比說適合更有價值）

## 整體評估
（給個明確的立場：推薦給誰、不推薦給誰，不要模糊帶過）

## 參考資料`,

  'comparison': `## TL;DR
（結論先說：什麼情況選哪個）

## 比較對象
（各自的定位和設計目標）

## 功能比較
（用表格，關鍵維度要選對）

## 效能 / 成本
（如果有數字就用，沒有就說明差異方向）

## 適用情境
（給出具體的選擇標準）

## 我的建議
（明確建議，不要模糊）

## 參考資料`,

  'research': `（開頭點出這份研究最反直覺的發現。2-3 句。）

## TL;DR
（最重要的發現，具體數字）

## 研究背景
（為什麼有人做這個，過去的認知是什麼）

## 關鍵發現
（數據和結論，用表格或條列）

## 影響與意義
（對工程師或業界的具體意義，不是「值得關注」）

## 限制
（這份研究有什麼做不到或要小心的地方）

## 參考資料`,

  'newsjacking': `## TL;DR
（這件事是什麼 + 為什麼值得花時間讀）

## 發生了什麼
（具體時間、對象、影響，要有細節）

## 技術角度怎麼看
（從工程師視角解讀，不是新聞稿的角度）

## 為什麼現在發生
（背後的原因或趨勢）

## 後續值得觀察的點
（還沒有答案的問題，要具體）

## 參考資料`,

  'case-study': `（開頭描述問題的規模或困難度，讓讀者感受到這個問題有多難解。）

## TL;DR
（解法和成果一句話）

## 背景與挑戰
（為什麼這個問題難，有什麼限制條件）

## 解法設計
（怎麼思考、怎麼決策，架構圖用 Mermaid）

## 關鍵的技術選擇
（為什麼選 A 不選 B，要有理由）

## 成果
（具體數據或改善，越具體越好）

## 可以複用的洞察
（什麼東西可以帶走，用在其他地方）

## 參考資料`,

  'listicle': `## TL;DR
（這份清單的核心價值）

（各項目每個都要有實質說明，不只是名稱加一行描述）

## 總結
（怎麼選，或綜合建議）

## 參考資料`,
};

async function rewritePost(filePath: string): Promise<{ zhContent: string; enContent: string | null }> {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { meta, body } = parseFrontmatter(raw);

  const originalUrl = meta.original_url as string;
  const videoTitle = meta.title as string;
  const articleType = (meta.type as string) || 'explainer';
  const structure = TYPE_STRUCTURES[articleType] ?? TYPE_STRUCTURES['explainer'];

  console.log(`  🔍 搜尋補充資料：${videoTitle}`);
  // 嘗試以影片標題搜尋，失敗則用 original_url domain 當作 fallback query
  const enFallback = originalUrl ? new URL(originalUrl).searchParams.get('v') ?? videoTitle : videoTitle;
  const webContext = await searchWebWithFallback(videoTitle, videoTitle);
  console.log(`  📚 補充資料：${webContext.length} 字`);

  // ── 重寫中文 ────────────────────────────────────────────────────────────────

  const zhPrompt = `你是一位有豐富實戰經驗的台灣技術主編，也是一名工程師。請根據以下資料，寫一篇給工程師看的深度技術文章。

【寫作原則】
- 語言：全程繁體中文，不得夾雜簡體字。術語：「程式碼」非「代碼」、「框架」非「架構（框架時）」、「專案」非「項目」。
- 語氣：直接、有觀點。像工程師在講給工程師聽，不需要客套。偶爾可以用第一人稱（「我認為」「這讓我想到」）。
- 長度：1500–2500 字。要有深度，每個段落都要有實質內容。
- 禁止的寫法：「非常重要」「值得關注」「在現代社會中」「隨著AI的發展」等空洞起頭。不要說「本文將介紹」。
- 只能引用 <sources> 中出現的資訊。資訊不足的段落就直接略過，不要補充沒有根據的內容。
- 圖表：只在有實質資訊量時才加 Mermaid（流程、架構、互動）。箭頭格式：\`A --> B\` 或 \`A -->|label| B\`。

【文章結構】（將 {{}} 替換為實際內容）：
${structure}

只輸出 Markdown 文章內容，不要輸出 frontmatter。

<sources>
主題：${videoTitle}
原始影片：${originalUrl}

現有文章（品質差，供參考主題方向，不要直接複製）：
${body.slice(0, 1500)}

網路補充資料：
${webContext}
</sources>`;

  const zhContent = await callAI(zhPrompt, 4000);
  if (!zhContent || zhContent.length < 100) throw new Error('重寫內容太短');

  // ── 重寫英文 ────────────────────────────────────────────────────────────────

  const enFilePath = filePath.replace(/\.md$/, '.en.md');
  let enContent: string | null = null;

  if (fs.existsSync(enFilePath)) {
    const enPrompt = `You are an experienced technical editor and software engineer. Translate and rewrite the following Traditional Chinese technical article into natural, direct English for a developer audience.

Rules:
- Preserve all Markdown structure, headings, code blocks, tables, and Mermaid diagrams.
- Translate Mermaid node labels and comments too.
- Tone: direct, opinionated, engineer-to-engineer. No filler phrases like "it's worth noting" or "in conclusion".
- Length: match the Chinese version's depth.
- Only output the Markdown content, no frontmatter.

Chinese article:
${zhContent}`;

    enContent = await callAI(enPrompt, 4000);
    if (!enContent || enContent.length < 200) enContent = null;
  }

  return { zhContent, enContent };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (doWrite && (!ACCOUNT_ID || !API_TOKEN)) {
    console.error('❌ Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN');
    process.exit(1);
  }

  // 收集要處理的檔案
  let targets: string[] = [];

  if (singleFile) {
    const absPath = path.isAbsolute(singleFile) ? singleFile : path.join(process.cwd(), singleFile);
    if (!fs.existsSync(absPath)) {
      console.error(`❌ 找不到檔案：${absPath}`);
      process.exit(1);
    }
    targets = [absPath];
  } else {
    const categories = ['tech', 'product', 'learning', 'career', 'life'];
    for (const cat of categories) {
      const dir = path.join(POSTS_BASE_DIR, cat);
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.md') || file.endsWith('.en.md')) continue;
        const fullPath = path.join(dir, file);
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('original_url:')) {
          targets.push(fullPath);
        }
      }
    }
    targets.sort();
  }

  console.log(`\n📋 找到 ${targets.length} 篇爬蟲文章需要重寫\n`);

  if (!doWrite) {
    console.log('（dry-run 模式，加上 --write 才會實際修改）\n');
    for (const t of targets) {
      console.log(`  - ${path.relative(process.cwd(), t)}`);
    }
    return;
  }

  let done = 0;
  let failed = 0;

  for (const filePath of targets) {
    const rel = path.relative(process.cwd(), filePath);
    console.log(`\n[${done + failed + 1}/${targets.length}] ${rel}`);

    try {
      const { meta } = parseFrontmatter(fs.readFileSync(filePath, 'utf-8'));
      const { zhContent, enContent } = await rewritePost(filePath);

      // 更新中文
      const videoRef = `- [原始影片](${meta.original_url})`;
      let finalZh = zhContent.trim();
      if (!finalZh.includes('## 參考資料')) {
        finalZh += `\n\n## 參考資料\n\n${videoRef}`;
      } else if (!finalZh.includes(meta.original_url)) {
        finalZh += `\n${videoRef}`;
      }

      fs.writeFileSync(filePath, buildFrontmatter(meta) + finalZh);
      console.log(`  ✅ 中文重寫完成（${finalZh.length} 字）`);

      // 更新英文
      const enFilePath = filePath.replace(/\.md$/, '.en.md');
      if (enContent && fs.existsSync(enFilePath)) {
        const { meta: enMeta } = parseFrontmatter(fs.readFileSync(enFilePath, 'utf-8'));
        fs.writeFileSync(enFilePath, buildFrontmatter(enMeta) + enContent.trim());
        console.log(`  ✅ 英文重寫完成（${enContent.length} 字）`);
      }

      done++;
      // 每篇之間稍微停一下，避免 rate limit
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`  ❌ 失敗：${(e as Error).message}`);
      failed++;
    }
  }

  console.log(`\n✅ 完成 ${done} 篇，失敗 ${failed} 篇`);
}

main().catch(e => { console.error(e); process.exit(1); });
