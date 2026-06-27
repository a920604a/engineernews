/**
 * 為文章 backfill「重點速覽」key_points（每篇 3 條）。
 *
 * 比照 tts-all.ts：用 gray-matter 讀 frontmatter、claude --print 生成、
 * regex 寫回（不重排既有 YAML）。冪等：已有 key_points 的檔會跳過。
 *
 * 用法：
 *   tsx scripts/gen-key-points.ts --after=2026-06-20      # 只處理該日(含)之後
 *   tsx scripts/gen-key-points.ts --file=path/to/post.md  # 單檔
 *   tsx scripts/gen-key-points.ts --after=2026-06-20 --dry-run
 *   tsx scripts/gen-key-points.ts --force                 # 覆蓋已存在的 key_points
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const afterArg = process.argv.find(a => a.startsWith('--after='))?.slice(8);
const fileArg = process.argv.find(a => a.startsWith('--file='))?.slice(7);
const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');

const ZH_MAX = 45;   // 每條硬上限（字）
const EN_MAX = 22;   // 每條硬上限（詞）

const ZH_PROMPT = (title: string, content: string, retry = false) => `你是技術編輯。為以下文章寫「重點速覽」，給沒耐心的讀者 3 秒掃一條。

最重要的規則——長度：
- 每條 **最多 ${ZH_MAX} 個字**，像手機推播標題。寧可只講結論、捨棄細節與舉例。
- 不要用「：」帶出長解釋、不要塞多個子句。一條只講一件事。${retry ? '\n- 上一版太長了，這次務必砍到 ' + ZH_MAX + ' 字以內，能刪的都刪。' : ''}

其他規則：
- 剛好 3 條，面向「該不該讀」：核心結論／關鍵取捨／最容易踩的坑
- 要有實質資訊，不是改寫標題；繁體中文（台灣用語）
- 只輸出 JSON 陣列：["第一條","第二條","第三條"]，無其他文字或標記

範例（長度感）：「先寫測試會逼你想清楚介面，不是為了覆蓋率」

文章標題：${title}
---
${content}`;

const EN_PROMPT = (title: string, content: string, retry = false) => `You are a technical editor. Write "Key Points" a busy reader scans in 3 seconds each.

Most important rule — length:
- Each item **${EN_MAX} words MAX**, like a push notification. Drop detail and examples; keep the conclusion.
- No colons introducing long explanations, no stacked clauses. One idea per item.${retry ? '\n- The previous version was too long. Cut hard to under ' + EN_MAX + ' words this time.' : ''}

Other rules:
- Exactly 3 items, triage-oriented: core takeaway / key tradeoff / common pitfall
- Real substance, not a rephrased title; precise English
- Output ONLY a JSON array: ["first","second","third"] — no other text or markup

Example (length feel): "Writing tests first clarifies your interface, not just coverage"

Article title: ${title}
---
${content}`;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function getDate(data: Record<string, unknown>, filePath: string): string {
  const d = data.date;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (typeof d === 'string') return d.slice(0, 10);
  const m = path.basename(filePath).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '0000-00-00';
}

function callClaude(prompt: string): string[] | null {
  const res = spawnSync('claude', ['--print', '--dangerously-skip-permissions'], {
    input: prompt,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (res.status !== 0 || !res.stdout) {
    console.warn(`    ⚠️  claude 失敗: ${res.stderr?.trim() || res.status}`);
    return null;
  }
  const match = res.stdout.match(/\[[\s\S]*\]/);
  if (!match) { console.warn(`    ⚠️  回傳不含 JSON 陣列`); return null; }
  try {
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr.map(String).slice(0, 3);
  } catch { console.warn(`    ⚠️  JSON 解析失敗`); return null; }
}

// 長度量度：中文算字、英文算詞
function measure(s: string, lang: string): number {
  return lang === 'en' ? s.trim().split(/\s+/).length : [...s].length;
}

function generate(title: string, content: string, lang: string): string[] | null {
  const max = lang === 'en' ? EN_MAX : ZH_MAX;
  // 第一次 + 最多兩次重試（帶「太長了」回饋）
  let best: string[] | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const prompt = lang === 'en'
      ? EN_PROMPT(title, content, attempt > 0)
      : ZH_PROMPT(title, content, attempt > 0);
    const arr = callClaude(prompt);
    if (!arr || arr.length < 3) continue;

    const worst = Math.max(...arr.map(p => measure(p, lang)));
    if (worst <= max) return arr;  // 全部達標
    // 記住「最不爛」的版本（最長那條最短的）
    if (!best || worst < Math.max(...best.map(p => measure(p, lang)))) best = arr;
    console.warn(`    ↻ 第 ${attempt + 1} 次最長 ${worst}（上限 ${max}），重試`);
  }
  if (best) console.warn(`    ⚠️  重試後仍超標，採用最佳版本`);
  return best;
}

function writeKeyPoints(filePath: string, points: string[]): void {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const block = 'key_points:\n' + points.map(p => `  - ${JSON.stringify(p)}`).join('\n');
  if (/^key_points:/m.test(raw)) {
    // 覆蓋既有 block（key_points: 行到下一個 top-level 鍵或 frontmatter 結尾）
    const replaced = raw.replace(/^key_points:\n(?: {2}-.*\n?)*/m, block + '\n');
    fs.writeFileSync(filePath, replaced);
  } else {
    const closingIdx = raw.indexOf('\n---', 4);
    fs.writeFileSync(filePath, raw.slice(0, closingIdx) + '\n' + block + raw.slice(closingIdx));
  }
}

function main() {
  const files = fileArg
    ? [path.resolve(fileArg)]
    : walk(POSTS_DIR);

  let generated = 0, skipped = 0, failed = 0;

  for (const filePath of files.sort()) {
    const rel = path.relative(process.cwd(), filePath);
    const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'));

    if (!force && Array.isArray(data.key_points) && data.key_points.length > 0) { skipped++; continue; }
    if (data.draft === true) { skipped++; continue; }
    if (afterArg && getDate(data, filePath) < afterArg) { skipped++; continue; }

    const title = String(data.title ?? '');
    const lang = data.lang === 'en' || filePath.endsWith('.en.md') ? 'en' : 'zh-TW';
    if (!title || content.trim().length < 200) { skipped++; continue; }

    console.log(`  ▸ ${rel} (${lang})`);
    if (dryRun) { generated++; continue; }

    const points = generate(title, content.slice(0, 8000), lang);
    if (!points || points.length < 3) { failed++; continue; }

    writeKeyPoints(filePath, points);
    points.forEach(p => console.log(`      • ${p}`));
    generated++;
  }

  console.log(`\n  完成：生成 ${generated}　跳過 ${skipped}　失敗 ${failed}`);
}

main();
