/**
 * B 軌重生：對「有來源」的舊文章，從原始素材（YouTube 逐字稿 / GitHub README）
 * 用 Opus（claude --print）重寫 zh 文章，grounded 在真實 source、修掉弱 LLM 的腦補。
 *
 * 只做 zh 內容重生。翻譯 / glossary / TTS 留到最後集中批次。
 * 可中斷續跑：每篇即時寫 ledger（opus-regen-ledger.json）。
 *
 * track 值：regen-b（成功）/ no-transcript（YouTube 無字幕）/ regen-b-failed（其他失敗）
 *
 * 用法（需 set -a; . ./.env; set +a；Node ≥ 20；yt-dlp 已裝）：
 *   tsx scripts/regen-b.ts --status
 *   tsx scripts/regen-b.ts --limit=3                 # 跑 3 篇（試跑）
 *   tsx scripts/regen-b.ts --file=src/content/posts/x.md  # 單篇
 *   tsx scripts/regen-b.ts                            # 跑所有未處理的
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execSync } from 'node:child_process';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const LEDGER = path.join(process.cwd(), 'opus-regen-ledger.json');
const TRANSCRIPT_BUDGET = 12000;
const DONE_TRACKS = new Set(['restore', 'deleted', 'regen', 'regen-b', 'no-transcript', 'no-source-other']);

const statusOnly = process.argv.includes('--status');
const fileArg = process.argv.find(a => a.startsWith('--file='))?.slice(7);
const limitArg = process.argv.find(a => a.startsWith('--limit='))?.slice(8);
const limit = limitArg ? parseInt(limitArg, 10) : Infinity;

interface Ledger { items: Record<string, any>; updatedAt: string; }
function loadLedger(): Ledger { return JSON.parse(fs.readFileSync(LEDGER, 'utf-8')); }
function saveLedger(l: Ledger) { l.updatedAt = new Date().toISOString(); fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2)); }

// ── 取得 source ────────────────────────────────────────────────────────────
function fetchTranscript(url: string): string | null {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-'));
  try {
    spawnSync('yt-dlp', ['--write-subs', '--write-auto-subs', '--sub-lang', 'en,zh-TW,zh-Hant,zh',
      '--sub-format', 'vtt', '--skip-download', '--output', path.join(tmp, '%(id)s'), '-q', url],
      { encoding: 'utf-8', timeout: 90000 });
    const vtts = fs.readdirSync(tmp).filter(f => f.endsWith('.vtt'));
    if (vtts.length === 0) return null;
    const pick = vtts.find(f => f.includes('.en.')) ?? vtts.find(f => /\.zh/.test(f)) ?? vtts[0];
    const raw = fs.readFileSync(path.join(tmp, pick), 'utf-8');
    const text = raw.split('\n')
      .filter(l => !l.startsWith('WEBVTT') && !/^\d+$/.test(l) && !/[\d:.]+ --> [\d:.]+/.test(l) && l.trim())
      .join(' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    // 去重複行（auto-subs 常重複）
    const seen = new Set<string>(); const out: string[] = [];
    for (const w of text.split('. ')) { if (!seen.has(w)) { seen.add(w); out.push(w); } }
    const dedup = out.join('. ');
    return dedup.length > 200 ? dedup.slice(0, TRANSCRIPT_BUDGET) : null;
  } catch { return null; }
  finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

function fetchReadme(github: string): string | null {
  const m = github.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!m) return null;
  try {
    const out = execSync(`gh api repos/${m[1]}/${m[2].replace(/\.git$/, '')}/readme --jq '.content'`,
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    return Buffer.from(out.trim(), 'base64').toString('utf-8').slice(0, TRANSCRIPT_BUDGET) || null;
  } catch { return null; }
}

// ── 重生 prompt ────────────────────────────────────────────────────────────
function buildPrompt(data: any, body: string, source: string, sourceKind: string): string {
  const fm = ['title', 'date', 'category', 'tags', 'type', 'series', 'original_url', 'github', 'url']
    .filter(k => data[k] !== undefined)
    .map(k => `${k}: ${JSON.stringify(data[k])}`).join('\n');
  return `你是技術編輯。下面有一篇「舊文章」（由弱 LLM 從很少的素材生成，可能有腦補、簡體詞、過時或錯誤的數據），以及它的「真實原始素材」（${sourceKind}）。

請以**真實原始素材為事實依據**，用繁體中文（台灣用語）重寫這篇文章，輸出**完整的 .md 檔內容**（YAML frontmatter + 內文），只輸出檔案內容、不要任何其他說明、不要用 code fence 包整份。

規則：
- frontmatter 保留並沿用這些既有欄位（值可微調）：${['title','date','category','tags','type','series','original_url','github','url'].filter(k=>data[k]!==undefined).join('、')}
- 設 draft: false；新增 key_points（3 條短句，重點速覽）；title / tldr / description 可改寫得更準確
- **內文嚴格 grounded 在原始素材**：原素材沒有的數據、名稱、版本、價格，一律不要寫；修掉舊文裡與素材衝突的內容
- 結構清楚（開場 → 數個小節 → 必要時 Mermaid 圖 → 結尾），技術術語保留原文（RAG、embedding…）
- 文末 ## 參考資料 保留原始來源連結
- 若原始素材是逐字稿：寫成一篇有條理的技術文章／重點整理，不要逐字照抄、不要寫成訪談紀錄

=== 既有 frontmatter ===
${fm}

=== 舊文章內文（僅供主題參考，不可當事實來源）===
${body.slice(0, 4000)}

=== 真實原始素材（事實來源）===
${source}`;
}

function callClaude(prompt: string): string | null {
  // 禁用所有工具，逼 claude 純文字輸出（否則它會在 repo 裡用 Write 工具直接改檔，不可控）
  const res = spawnSync('claude',
    ['--print', '--dangerously-skip-permissions',
     '--disallowedTools', 'Write,Edit,Bash,NotebookEdit,Read,Glob,Grep,WebFetch,WebSearch,Task'],
    { input: prompt, encoding: 'utf-8', timeout: 300000, maxBuffer: 20 * 1024 * 1024 });
  if (res.status !== 0 || !res.stdout) {
    console.log(`\n      [debug] status=${res.status} signal=${res.signal} err=${res.error?.message ?? ''} stderr=${(res.stderr ?? '').slice(0, 200)} out=${(res.stdout ?? '').slice(0, 80)}`);
    return null;
  }
  let out = res.stdout.trim();
  out = out.replace(/^```(?:markdown|md)?\s*\n/, '').replace(/\n```\s*$/, '').trim();
  // 修補：claude 偶爾漏掉 frontmatter 開頭的 ---（直接從 title: 起頭，但後面有 closing ---）
  if (!out.startsWith('---') && /^[A-Za-z_][\w-]*:/.test(out) && /\n---\s*(\n|$)/.test(out)) {
    out = '---\n' + out;
  }
  if (!out.startsWith('---')) {
    console.log(`\n      [debug] 輸出不像 .md，開頭: ${out.slice(0, 120)}`);
    return null;
  }
  return out;
}

// ── 主流程 ────────────────────────────────────────────────────────────────
function inScope(): { id: string; file: string }[] {
  const led = loadLedger();
  const res: { id: string; file: string }[] = [];
  function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.md') && !e.name.endsWith('.en.md')) {
        const id = path.relative(POSTS_DIR, full).replace(/\.md$/, '');
        const it = led.items[id];
        if (!it) continue;                       // 不在清理範圍
        if (DONE_TRACKS.has(it.track)) continue; // 已處理
        res.push({ id, file: full });
      }
    }
  }
  if (fileArg) {
    const id = path.relative(POSTS_DIR, path.resolve(fileArg)).replace(/\.md$/, '');
    res.push({ id, file: path.resolve(fileArg) });
  } else walk(POSTS_DIR);
  return res;
}

function printStatus() {
  const led = loadLedger();
  const c: Record<string, number> = {};
  for (const v of Object.values(led.items)) { const t = v.track ?? '(unassigned)'; c[t] = (c[t] || 0) + 1; }
  console.log('\n📊 ledger 分軌：');
  for (const [k, v] of Object.entries(c).sort((a, b) => b[1] - a[1])) console.log(`   ${k}: ${v}`);
}

function main() {
  if (statusOnly) { printStatus(); return; }
  const scope = inScope();
  console.log(`待處理（unassigned）：${scope.length} 篇\n`);
  let done = 0, nosrc = 0, failed = 0, processed = 0;

  for (const { id, file } of scope) {
    if (processed >= limit) break;
    const led = loadLedger();
    const raw = fs.readFileSync(file, 'utf-8');
    const { data, content } = matter(raw);

    let source: string | null = null, kind = '';
    const ou = String(data.original_url || data.url || '');
    if (/youtu/.test(ou)) { kind = 'YouTube 逐字稿'; source = fetchTranscript(ou); }
    else if (data.github) { kind = 'GitHub README'; source = fetchReadme(String(data.github)); }

    process.stdout.write(`[${processed + 1}] ${id} … `);
    if (!source) {
      const track = /youtu/.test(ou) ? 'no-transcript' : 'no-source-other';
      led.items[id] = { ...(led.items[id] || { id }), track, checkedAt: new Date().toISOString() };
      saveLedger(led);
      console.log(`⏭️  無 source（${track}）`);
      nosrc++; processed++; continue;
    }

    const newMd = callClaude(buildPrompt(data, content, source, kind));
    if (!newMd) {
      led.items[id] = { ...(led.items[id] || { id }), track: 'regen-b-failed', failedAt: new Date().toISOString() };
      saveLedger(led);
      console.log('⚠️  claude 失敗');
      failed++; processed++; continue;
    }
    fs.writeFileSync(file, newMd.endsWith('\n') ? newMd : newMd + '\n');
    led.items[id] = { ...(led.items[id] || { id }), track: 'regen-b', sourceKind: kind, regenAt: new Date().toISOString() };
    saveLedger(led);
    console.log(`✅ 重生（${kind}）`);
    done++; processed++;
  }
  console.log(`\n本次：✅重生 ${done}　⏭️無source ${nosrc}　⚠️失敗 ${failed}`);
  printStatus();
}

main();
