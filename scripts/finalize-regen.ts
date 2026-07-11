/**
 * 收尾 regen-b 文章：翻英 → sync D1 → TTS → sync。逐步驟記 ledger，可中斷續跑、分批。
 * 只處理 ledger track='regen-b' 的文章。glossary 留最後另做一張總表（不在此）。
 *
 * ledger 每篇加：enAt（翻好）、ttsAt（音頻好）。兩者都有 = finalized。
 *
 * 用法（需 set -a; . ./.env; set +a；Node ≥ 20；Edge TTS server 要在跑）：
 *   tsx scripts/finalize-regen.ts --status
 *   tsx scripts/finalize-regen.ts --limit=3
 *   tsx scripts/finalize-regen.ts --file=src/content/posts/x.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, execSync } from 'node:child_process';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const LEDGER = path.join(process.cwd(), 'opus-regen-ledger.json');

const statusOnly = process.argv.includes('--status');
const noTts = process.argv.includes('--no-tts');   // 只翻英、不做 TTS（TTS 押後清快取重做）
const fileArg = process.argv.find(a => a.startsWith('--file='))?.slice(7);
const limitArg = process.argv.find(a => a.startsWith('--limit='))?.slice(8);
const limit = limitArg ? parseInt(limitArg, 10) : Infinity;

const load = () => JSON.parse(fs.readFileSync(LEDGER, 'utf-8'));
const save = (l: any) => { l.updatedAt = new Date().toISOString(); fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2)); };

const TRANSLATE_RULES = `You are translating a Traditional-Chinese technical blog post into English for a bilingual dev blog. Output ONLY the complete .en.md file content (YAML frontmatter + body), nothing else, no code fence around the whole thing. Start directly with the frontmatter --- line.
Frontmatter: set lang: en; translate title/tldr/description/key_points to natural technically-precise English; keep date/category/tags/type/pinned/series(keep series.name EXACTLY)/order/original_url/github/url/audio_url unchanged; keep draft: false; drop zh-only keys.
Body: natural fluent English, first-person voice preserved; keep ALL Markdown/code/Mermaid/links/tables verbatim; keep technical terms in original (RAG, embedding, token, agent...); translate "## 參考資料" to "## References", other Chinese headings to English.`;

function translate(zhFile: string, enFile: string): boolean {
  const zh = fs.readFileSync(zhFile, 'utf-8');
  const res = spawnSync('claude',
    ['--print', '--dangerously-skip-permissions',
     '--disallowedTools', 'Write,Edit,Bash,NotebookEdit,Read,Glob,Grep,WebFetch,WebSearch,Task'],
    { input: `${TRANSLATE_RULES}\n\n=== ARTICLE (zh) ===\n${zh}`, encoding: 'utf-8', timeout: 300000, maxBuffer: 20 * 1024 * 1024 });
  if (res.status !== 0 || !res.stdout) { console.log(`      ⚠️ 翻譯失敗: ${res.signal ?? res.status} ${(res.stderr ?? '').slice(0, 120)}`); return false; }
  let out = res.stdout.trim().replace(/^```(?:markdown|md)?\s*\n/, '').replace(/\n```\s*$/, '').trim();
  if (!out.startsWith('---') && /^[A-Za-z_][\w-]*:/.test(out) && /\n---\s*(\n|$)/.test(out)) out = '---\n' + out;
  if (!out.startsWith('---')) { console.log(`      ⚠️ 翻譯輸出不像 .md`); return false; }
  fs.writeFileSync(enFile, out.endsWith('\n') ? out : out + '\n');
  return true;
}

function sh(cmd: string): boolean {
  try { execSync(cmd, { stdio: ['ignore', 'ignore', 'pipe'], timeout: 600000 }); return true; }
  catch (e: any) { console.log(`      ⚠️ ${cmd.split(' ').slice(-2).join(' ')} 失敗: ${(e.stderr?.toString?.() ?? e.message ?? '').slice(0, 120)}`); return false; }
}

function main() {
  const led = load();
  const ids = Object.entries(led.items)
    .filter(([, v]: any) => v.track === 'regen-b')
    .map(([id]) => id);

  const pending = ids.filter(id => {
    if (fileArg) return path.join(POSTS_DIR, id + '.md') === path.resolve(fileArg);
    const it = led.items[id];
    if (noTts) return !it.enAt;   // 只翻英模式：只挑還沒翻的
    return !(it.enAt && it.ttsAt);
  }).sort((a, b) => {
    // 已翻英、只缺 TTS 的排前面（先把文章徹底收尾，再翻新的）
    const ra = led.items[a].enAt ? 0 : 1;
    const rb = led.items[b].enAt ? 0 : 1;
    return ra - rb;
  });

  if (statusOnly) {
    const en = ids.filter(id => led.items[id].enAt).length;
    const tts = ids.filter(id => led.items[id].ttsAt).length;
    console.log(`regen-b: ${ids.length}　已翻英: ${en}　已 TTS: ${tts}　完全收尾: ${ids.filter(id => led.items[id].enAt && led.items[id].ttsAt).length}`);
    return;
  }

  console.log(`待收尾: ${pending.length} 篇\n`);
  let processed = 0, enN = 0, ttsN = 0;
  for (const id of pending) {
    if (processed >= limit) break;
    const zhFile = path.join(POSTS_DIR, id + '.md');
    const enFile = zhFile.replace(/\.md$/, '.en.md');
    if (!fs.existsSync(zhFile)) continue;
    const it = led.items[id];
    console.log(`[${processed + 1}] ${id}`);

    // 1) 翻英
    if (!it.enAt) {
      if (!fs.existsSync(enFile)) { if (!translate(zhFile, enFile)) { processed++; continue; } }
      sh(`npx tsx scripts/sync-to-d1.ts --prod --file="${zhFile}"`);
      sh(`npx tsx scripts/sync-to-d1.ts --prod --file="${enFile}"`);
      it.enAt = new Date().toISOString(); save(led);
      console.log(`      ✅ 翻英 + sync`); enN++;
    }

    if (noTts) { processed++; continue; }   // 只翻英模式

    // 2) TTS（tts-all 產中英音檔並回寫 audio_url）。不管 tts-all 退出碼——
    //    Edge 偶爾瞬斷會讓它非零退出但音檔其實已生；以 zh+en 都有 audio_url 為準。
    if (it.enAt && !it.ttsAt) {
      // Edge 扛不住 EN→ZH 連續兩個合成請求，第二個常「無回應」。重試最多 3 次：
      // 已生的音檔會被快取跳過，只有缺的那個 lang 單獨重打 → 就會過。
      let zhAudio = false, enAudio = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        sh(`npx tsx scripts/tts-all.ts --prod --file="${zhFile}"`);
        zhAudio = /^audio_url:/m.test(fs.readFileSync(zhFile, 'utf-8'));
        enAudio = fs.existsSync(enFile) && /^audio_url:/m.test(fs.readFileSync(enFile, 'utf-8'));
        if (zhAudio && enAudio) break;
      }
      if (zhAudio && enAudio) {
        sh(`npx tsx scripts/sync-to-d1.ts --prod --file="${zhFile}"`);
        sh(`npx tsx scripts/sync-to-d1.ts --prod --file="${enFile}"`);
        it.ttsAt = new Date().toISOString(); save(led);
        console.log(`      ✅ TTS + sync`); ttsN++;
      } else console.log(`      ⚠️ TTS 未齊（zh=${zhAudio} en=${enAudio}），留待重試`);
    }
    processed++;
  }
  console.log(`\n本次：翻英 ${enN}　TTS ${ttsN}　處理 ${processed}`);
}

main();
