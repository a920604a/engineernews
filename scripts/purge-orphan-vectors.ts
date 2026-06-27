/**
 * 清除孤兒向量：regen-cleanup 刪了 D1/R2，但 delete-post.ts 的 querySql 用 --file
 * 在新版 wrangler 下拿不到 chunk id，導致 Vectorize 向量沒被刪。
 *
 * 此腳本不依賴 D1（已刪）：用與 sync-to-d1.ts 一致的確定性公式重算向量 id
 *   post:<sha1(source_id)[:16]>-<chunk_index>
 * 對每個 source_id 枚舉 index 0..MAX_INDEX（實測單篇最多 16 個 chunk，這裡用 31 留餘裕），
 * 批次刪除。刪不存在的 id 是 no-op，安全。
 *
 * 用法（需 set -a; . ./.env; set +a 載入憑證、Node ≥ 20）：
 *   tsx scripts/purge-orphan-vectors.ts --dry-run   # 只列出將刪除的 id 數
 *   tsx scripts/purge-orphan-vectors.ts             # 實際刪除
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const VECTOR_INDEX = 'engineer-news-index';
const LEDGER = path.join(process.cwd(), 'opus-regen-ledger.json');
const MAX_INDEX = 31;          // 實測單篇最多 16 chunks，留兩倍餘裕
const BATCH = 50;             // wrangler vectorize delete-vectors 單次 id 數有上限，保守取 50
const dryRun = process.argv.includes('--dry-run');

function sourceHash(sourceId: string): string {
  return createHash('sha1').update(sourceId).digest('hex').slice(0, 16);
}

function main() {
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf-8'));
  const deletedIds: string[] = Object.values(ledger.items)
    .filter((it: any) => it.deleted)
    .map((it: any) => it.id);

  // 每篇文章有 zh 主檔 + 可能的 .en 版，兩個 source_id 都要清
  const sourceIds: string[] = [];
  for (const id of deletedIds) {
    sourceIds.push(id);
    sourceIds.push(`${id}.en`);
  }

  // 重算所有候選向量 id
  const vectorIds: string[] = [];
  for (const sid of sourceIds) {
    const h = sourceHash(sid);
    for (let i = 0; i <= MAX_INDEX; i++) vectorIds.push(`post:${h}-${i}`);
  }

  console.log(`已刪文章: ${deletedIds.length}（含 .en 共 ${sourceIds.length} 個 source_id）`);
  console.log(`候選向量 id: ${vectorIds.length}（每 source × ${MAX_INDEX + 1} index）`);

  if (dryRun) {
    console.log('\n🔸 DRY-RUN，未刪除。');
    return;
  }

  let batches = 0;
  for (let i = 0; i < vectorIds.length; i += BATCH) {
    const chunk = vectorIds.slice(i, i + BATCH);
    try {
      execSync(
        `wrangler vectorize delete-vectors ${VECTOR_INDEX} --ids ${chunk.join(' ')}`,
        { stdio: ['ignore', 'ignore', 'pipe'] }
      );
      batches++;
      process.stdout.write(`\r  已送出批次 ${batches} （${Math.min(i + BATCH, vectorIds.length)}/${vectorIds.length}）`);
    } catch (e: any) {
      const stderr = (e.stderr?.toString?.() ?? '').trim().split('\n').slice(0, 2).join(' ');
      console.warn(`\n  ⚠️  批次 @${i} 失敗：${stderr || e.message}`);
    }
  }
  console.log(`\n✅ 完成，共送出 ${batches} 批刪除。`);
}

main();
