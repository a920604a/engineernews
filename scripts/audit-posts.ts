#!/usr/bin/env npx tsx
/**
 * scripts/audit-posts.ts
 * 統計所有文章的狀態：草稿、音檔、逐字稿、語言等
 * 用法: npx tsx scripts/audit-posts.ts [--json]
 *
 * 逐字稿定義：src/tts/<category>/<slug>.tts-script.txt (zh-TW)
 *            src/tts/<category>/<slug>.en.tts-script.txt (en)
 */

import fs from 'node:fs';
import path from 'node:path';

const POSTS_DIR = path.resolve('src/content/posts');
const TTS_DIR   = path.resolve('src/tts');

const args = process.argv.slice(2);
const outputJson = args.includes('--json');

// ── 建立逐字稿檔案 Set ────────────────────────────────────────
function buildScriptSet(): Set<string> {
  const set = new Set<string>();
  if (!fs.existsSync(TTS_DIR)) return set;
  for (const category of fs.readdirSync(TTS_DIR)) {
    const dir = path.join(TTS_DIR, category);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.tts-script.txt')) continue;
      const base = file.replace(/\.en\.tts-script\.txt$|\.tts-script\.txt$/, '');
      const isEn = file.includes('.en.tts-script.txt');
      set.add(`${category}/${base}/${isEn ? 'en' : 'zh-TW'}`);
    }
  }
  return set;
}

// ── Frontmatter parser ────────────────────────────────────────
interface PostMeta {
  file: string;
  slug: string;
  category: string;
  lang: string;
  title: string;
  date: string;
  isDraftFilename: boolean;
  draftField: boolean;
  isDraft: boolean;
  hasAudio: boolean;
  hasScript: boolean;
  audioUrl: string;
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)/);
    if (kv) result[kv[1].trim()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return result;
}

function scanPosts(scriptSet: Set<string>): PostMeta[] {
  const posts: PostMeta[] = [];
  const categories = fs.readdirSync(POSTS_DIR).filter(d =>
    fs.statSync(path.join(POSTS_DIR, d)).isDirectory()
  );
  for (const category of categories) {
    const dir = path.join(POSTS_DIR, category);
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const fm = parseFrontmatter(content);
      const isEn = file.endsWith('.en.md');
      const slug = file.replace(/\.en\.md$|\.md$/, '').replace(/^_/, '');
      const lang = fm.lang || (isEn ? 'en' : 'zh-TW');
      const isDraftFilename = file.startsWith('_');
      const draftField = fm.draft === 'true';
      posts.push({
        file: `src/content/posts/${category}/${file}`,
        slug, category, lang,
        title: fm.title || '(無標題)',
        date: fm.date?.slice(0, 10) || '',
        isDraftFilename, draftField,
        isDraft: isDraftFilename || draftField,
        hasAudio: !!fm.audio_url,
        hasScript: scriptSet.has(`${category}/${slug}/${lang}`),
        audioUrl: fm.audio_url || '',
      });
    }
  }
  return posts.sort((a, b) => a.date.localeCompare(b.date));
}

// ── 統計 ──────────────────────────────────────────────────────
const scriptSet  = buildScriptSet();
const posts      = scanPosts(scriptSet);
const zhPosts    = posts.filter(p => p.lang === 'zh-TW');
const enPosts    = posts.filter(p => p.lang === 'en');

function stats(all: PostMeta[]) {
  const drafts      = all.filter(p => p.isDraft);
  const published   = all.filter(p => !p.isDraft);
  const withScript  = published.filter(p => p.hasScript);
  const noScript    = published.filter(p => !p.hasScript);
  const withAudio   = published.filter(p => p.hasAudio);   // implies hasScript
  const scriptNoAudio = published.filter(p => p.hasScript && !p.hasAudio);
  return { all, drafts, published, withScript, noScript, withAudio, scriptNoAudio };
}

const zh = stats(zhPosts);
const en = stats(enPosts);

if (outputJson) {
  console.log(JSON.stringify({ zh, en }, null, 2));
  process.exit(0);
}

// ── 彙總表 ────────────────────────────────────────────────────
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';
const DIM   = '\x1b[2m';
const RED   = '\x1b[31m';
const GRN   = '\x1b[32m';
const YLW   = '\x1b[33m';
const BLU   = '\x1b[34m';
const MGT   = '\x1b[35m';
const CYN   = '\x1b[36m';

const COL_W = 10; // 數字欄寬

function row(indent: string, label: string, zh: number, en: number, color = '') {
  const labelCol = `${indent}${label}`.padEnd(20);
  const zhCol    = String(zh).padStart(COL_W);
  const enCol    = String(en).padStart(COL_W);
  console.log(`${color}  ${labelCol}${BLU}${zhCol}${RESET}${color}${MGT}${enCol}${RESET}`);
}

console.log(`\n${BOLD}Engineer News — 文章狀態稽核${RESET}  (${new Date().toLocaleDateString('zh-TW')})`);
console.log(`${DIM}逐字稿 = src/tts/**/*.tts-script.txt${RESET}\n`);

// header
const header = '  ' + ''.padEnd(20) + `${BOLD}${BLU}${'zh-TW'.padStart(COL_W)}${RESET}${BOLD}${MGT}${'en'.padStart(COL_W)}${RESET}`;
const divider = '  ' + '─'.repeat(20 + COL_W * 2);
// ── 草稿清單 ──────────────────────────────────────────────────
function printDraftList(drafts: PostMeta[], lang: 'zh-TW' | 'en') {
  if (drafts.length === 0) return;
  const color = lang === 'zh-TW' ? BLU : MGT;
  const label = lang === 'zh-TW' ? '繁體中文' : 'English';
  console.log(`\n${BOLD}${color}草稿清單 — ${label}${RESET}`);
  for (const p of drafts) {
    const reason = p.isDraftFilename ? `${YLW}_檔名${RESET}` : `${YLW}draft:true${RESET}`;
    console.log(`  ${reason}  ${DIM}${p.date}${RESET}  ${p.title.slice(0, 60)}`);
  }
}

// ── 待補音檔清單（有逐字稿但無音檔） ─────────────────────────
function printPendingAudio(list: PostMeta[], lang: 'zh-TW' | 'en') {
  if (list.length === 0) return;
  const color = lang === 'zh-TW' ? BLU : MGT;
  const label = lang === 'zh-TW' ? '繁體中文' : 'English';
  const ext   = lang === 'zh-TW' ? '.tts-script.txt' : '.en.tts-script.txt';
  console.log(`\n${BOLD}${color}待補音檔 — ${label}${RESET}  ${DIM}(有逐字稿、尚未 TTS)${RESET}`);
  for (const p of list) {
    console.log(`  ${DIM}${p.date}${RESET}  ${p.title.slice(0, 62)}`);
    console.log(`        ${DIM}src/tts/${p.category}/${p.slug}${ext}${RESET}`);
  }
}

// ── 待補逐字稿清單 ────────────────────────────────────────────
function printNoScript(list: PostMeta[], lang: 'zh-TW' | 'en') {
  if (list.length === 0) return;
  const color = lang === 'zh-TW' ? BLU : MGT;
  const label = lang === 'zh-TW' ? '繁體中文' : 'English';
  console.log(`\n${BOLD}${color}待補逐字稿 — ${label}${RESET}`);
  for (const p of list) {
    console.log(`  ${DIM}${p.date}${RESET}  ${p.title.slice(0, 62)}`);
  }
}

printDraftList(zh.drafts, 'zh-TW');
printDraftList(en.drafts, 'en');
printPendingAudio(zh.scriptNoAudio, 'zh-TW');
printPendingAudio(en.scriptNoAudio, 'en');
printNoScript(zh.noScript, 'zh-TW');
printNoScript(en.noScript, 'en');

// ── 彙總表（放最後，一眼看到） ───────────────────────────────
console.log(`\n${BOLD}── 彙總 ${'─'.repeat(34)}${RESET}`);
console.log(header);
console.log(divider);
row('', '總數',              zh.all.length,           en.all.length);
row('  ', '草稿',            zh.drafts.length,        en.drafts.length,        YLW);
row('  ', '已發佈',          zh.published.length,     en.published.length);
row('    ', '無逐字稿',      zh.noScript.length,      en.noScript.length,      RED);
row('    ', '有逐字稿',      zh.withScript.length,    en.withScript.length,    CYN);
row('      ', '無音檔',      zh.scriptNoAudio.length, en.scriptNoAudio.length, YLW);
row('      ', '有音檔 ✓',    zh.withAudio.length,     en.withAudio.length,     GRN);
console.log(divider);
console.log('');
