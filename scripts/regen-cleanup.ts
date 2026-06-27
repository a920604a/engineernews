/**
 * Opus 4.8 重生前置：清理 date < cutoff 的舊文章。
 *
 * 每篇文章：
 *   1. 設 draft: true（.md + .en.md，可逆、先讓站上下架）
 *   2. 刪 D1 / Vectorize / R2（OG + TTS）/ 本地 OG PNG —— 保留 .md（--keep-md）
 *   3. 寫進 ledger（opus-regen-ledger.json），逐篇即存，可中斷續跑
 *
 * 這是大工程（~135 篇），跨天分批跑。ledger 是唯一真相來源。
 *
 * 用法（需先 `set -a; . ./.env; set +a` 載入 CLOUDFLARE 憑證、且 Node ≥ 20）：
 *   tsx scripts/regen-cleanup.ts --status            # 只看進度，不動任何東西
 *   tsx scripts/regen-cleanup.ts --draft-only        # 只做第 1 步（全部設 draft:true），不刪
 *   tsx scripts/regen-cleanup.ts --dry-run --limit=1 # 預覽一篇會刪什麼（不變動）
 *   tsx scripts/regen-cleanup.ts --limit=10          # 實際處理 10 篇（draft + 刪除）
 *   tsx scripts/regen-cleanup.ts                     # 處理所有剩餘篇（會跑很久）
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import matter from 'gray-matter';

const CUTOFF = '2026-06-20';                          // date < CUTOFF 才在範圍內
const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const LEDGER = path.join(process.cwd(), 'opus-regen-ledger.json');

const statusOnly = process.argv.includes('--status');
const draftOnly = process.argv.includes('--draft-only');
const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find(a => a.startsWith('--limit='))?.slice(8);
const limit = limitArg ? parseInt(limitArg, 10) : Infinity;

interface LedgerItem {
  id: string;
  draftSet: boolean;
  deleted: boolean;
  draftAt?: string;
  deletedAt?: string;
  error?: string;
}
interface Ledger { cutoff: string; updatedAt: string; items: Record<string, LedgerItem>; }

function loadLedger(): Ledger {
  if (fs.existsSync(LEDGER)) return JSON.parse(fs.readFileSync(LEDGER, 'utf-8'));
  return { cutoff: CUTOFF, updatedAt: new Date().toISOString(), items: {} };
}
function saveLedger(l: Ledger) {
  l.updatedAt = new Date().toISOString();
  fs.writeFileSync(LEDGER, JSON.stringify(l, null, 2));
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

// 取文章日期（YYYY-MM-DD）。優先用檔名前綴（最可靠，所有貼文都是 YYYY-MM-DD-slug），
// 退而求其次才看 frontmatter（注意：未加引號的 date 會被 gray-matter 解析成 Date 物件）。
function getDate(file: string, data: Record<string, unknown>): string {
  const m = path.basename(file).match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = data.date;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d ?? '').slice(0, 10);
}

// 範圍內的「中文主檔」（不含 .en.md），date < CUTOFF
function inScopeMainFiles(): { id: string; file: string }[] {
  const res: { id: string; file: string }[] = [];
  for (const file of walk(POSTS_DIR).sort()) {
    if (file.endsWith('.en.md')) continue;
    const { data } = matter(fs.readFileSync(file, 'utf-8'));
    const d = getDate(file, data);
    if (d && d < CUTOFF) res.push({ id: path.relative(POSTS_DIR, file).replace(/\.md$/, ''), file });
  }
  return res;
}

function setDraftTrue(file: string): boolean {
  if (!fs.existsSync(file)) return false;
  let raw = fs.readFileSync(file, 'utf-8');
  if (/^draft:\s*true\s*$/m.test(raw)) return true;              // 已是 true
  if (/^draft:\s*.*$/m.test(raw)) raw = raw.replace(/^draft:\s*.*$/m, 'draft: true');
  else {                                                          // 沒有 draft 行 → 插入到 frontmatter 結尾
    const closingIdx = raw.indexOf('\n---', 4);
    raw = raw.slice(0, closingIdx) + '\ndraft: true' + raw.slice(closingIdx);
  }
  fs.writeFileSync(file, raw);
  return true;
}

function deleteDerived(mainFile: string): void {
  // 復用 delete-post.ts（--keep-md 保留 markdown），對遠端 prod 執行
  const flags = ['--file=' + mainFile, '--prod', '--keep-md'];
  if (!dryRun) flags.push('--yes');
  execSync(`npx tsx scripts/delete-post.ts ${flags.join(' ')}`, { stdio: 'inherit' });
}

function printStatus(ledger: Ledger, scope: { id: string }[]) {
  const total = scope.length;
  const draftDone = scope.filter(s => ledger.items[s.id]?.draftSet).length;
  const delDone = scope.filter(s => ledger.items[s.id]?.deleted).length;
  const errored = scope.filter(s => ledger.items[s.id]?.error).length;
  console.log(`\n📊 Opus 重生清理進度（cutoff < ${CUTOFF}）`);
  console.log(`   範圍文章: ${total}`);
  console.log(`   已設 draft:true : ${draftDone}/${total}`);
  console.log(`   已刪除衍生資料  : ${delDone}/${total}`);
  console.log(`   有錯誤待處理    : ${errored}`);
  console.log(`   ledger: ${path.relative(process.cwd(), LEDGER)}`);
  if (errored) {
    console.log('\n   ⚠️  錯誤清單：');
    for (const s of scope) {
      const it = ledger.items[s.id];
      if (it?.error) console.log(`     - ${s.id}: ${it.error}`);
    }
  }
}

function main() {
  const scope = inScopeMainFiles();
  const ledger = loadLedger();

  if (statusOnly) { printStatus(ledger, scope); return; }

  let processed = 0;
  for (const { id, file } of scope) {
    if (processed >= limit) break;
    const it = ledger.items[id] ?? { id, draftSet: false, deleted: false };

    // 已完成（draft + deleted）→ 跳過
    if (it.draftSet && (draftOnly || it.deleted)) { ledger.items[id] = it; continue; }

    console.log(`\n━━ [${processed + 1}] ${id} ━━`);
    try {
      // 1) draft: true（zh + en）
      if (!it.draftSet) {
        const enFile = file.replace(/\.md$/, '.en.md');
        setDraftTrue(file);
        if (fs.existsSync(enFile)) setDraftTrue(enFile);
        it.draftSet = true;
        it.draftAt = new Date().toISOString();
        console.log('  ✅ draft:true（zh' + (fs.existsSync(enFile) ? ' + en' : '') + '）');
      }

      // 2) 刪衍生資料（保留 md）
      if (!draftOnly && !it.deleted) {
        deleteDerived(file);
        if (!dryRun) {
          it.deleted = true;
          it.deletedAt = new Date().toISOString();
        }
      }
      delete it.error;
    } catch (e) {
      it.error = (e as Error).message?.slice(0, 200) ?? String(e);
      console.warn(`  ⚠️  失敗：${it.error}`);
    }

    ledger.items[id] = it;
    saveLedger(ledger);   // 逐篇即存，可中斷續跑
    processed++;
  }

  printStatus(ledger, scope);
  console.log(`\n本次處理 ${processed} 篇。`);
}

main();
