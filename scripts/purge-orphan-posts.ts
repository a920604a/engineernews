/**
 * 清除「孤兒 D1 posts」：D1 裡存在、但本地已無對應 .md 的文章列
 * （多為過去爬蟲產的亂碼 slug，刪/改名後 D1 列殘留）。
 *
 * delete-post.ts 靠本地檔案路徑驅動，對「無檔案」的孤兒無效，故另寫此腳本，
 * 改以 D1 查詢 + id 驅動。清除：Vectorize 向量、D1（posts/doc_chunks/互動表）、R2（OG/TTS）。
 *
 * 用法（需 set -a; . ./.env; set +a 載入憑證、Node ≥ 20）：
 *   tsx scripts/purge-orphan-posts.ts            # dry-run：列出孤兒，不刪
 *   tsx scripts/purge-orphan-posts.ts --yes      # 實際刪除
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

const DB_NAME = 'engineer-news-db';
const VECTOR_INDEX = 'engineer-news-index';
const R2_BUCKET = 'engineer-news-og-images';
const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const MAX_INDEX = 31;
const VEC_BATCH = 50;
const confirmed = process.argv.includes('--yes');

function esc(s: string) { return s.replace(/'/g, "''"); }
function sourceHash(id: string) { return createHash('sha1').update(id).digest('hex').slice(0, 16); }
function normalizeEnglishPostId(id: string) { return id.replace(/\.en$/, '').replace(/en$/, ''); }

function queryAllPosts(): { id: string; lang: string; audio_url: string | null }[] {
  const out = execSync(
    `wrangler d1 execute ${DB_NAME} --remote --command ${JSON.stringify('SELECT id, lang, audio_url FROM posts;')} --yes --json`,
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
  );
  const i = out.indexOf('[');
  if (i < 0) return [];
  // raw_decode：只取第一個 JSON 值
  const dec = JSON.parse(out.slice(i, out.lastIndexOf(']') + 1));
  return dec?.[0]?.results ?? [];
}

function runSqlFile(statements: string[]) {
  if (statements.length === 0) return;
  const tmp = path.join(process.cwd(), `.tmp_orphan_${Date.now()}.sql`);
  fs.writeFileSync(tmp, statements.join('\n'));
  try {
    execSync(`wrangler d1 execute ${DB_NAME} --remote --file=${tmp} --yes`, { stdio: 'inherit' });
  } finally {
    fs.unlinkSync(tmp);
  }
}

function deleteVectors(ids: string[]) {
  for (let i = 0; i < ids.length; i += VEC_BATCH) {
    const chunk = ids.slice(i, i + VEC_BATCH);
    try {
      execSync(`wrangler vectorize delete-vectors ${VECTOR_INDEX} --ids ${chunk.join(' ')}`,
        { stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (e: any) {
      console.warn(`  ⚠️  向量批次失敗：${(e.stderr?.toString?.() ?? e.message).slice(0, 120)}`);
    }
  }
}

function deleteFromR2(key: string) {
  if (!ACCOUNT_ID || !API_TOKEN) throw new Error('缺少 CLOUDFLARE 憑證');
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${encodeURI(key)}`;
  try { execSync(`curl -sf -X DELETE "${url}" -H "Authorization: Bearer ${API_TOKEN}"`, { stdio: 'ignore' }); }
  catch { /* 可能不存在，忽略 */ }
}

function main() {
  const all = queryAllPosts();
  const orphans = all.filter(r => !fs.existsSync(path.join(POSTS_DIR, `${r.id}.md`)));

  console.log(`D1 posts 總數: ${all.length}`);
  console.log(`孤兒（無本地 .md）: ${orphans.length}\n`);
  for (const o of orphans) console.log(`  [${o.lang}] ${o.id}${o.audio_url ? '  🔊' : ''}`);

  if (!confirmed) {
    console.log(`\n🔸 DRY-RUN，未刪除。確認後加 --yes 執行。`);
    return;
  }
  if (orphans.length === 0) return;

  // 1) Vectorize：用確定性公式重算 id（D1 chunk 即將刪除，先算好）
  console.log(`\n🧹 刪除向量…`);
  const vecIds: string[] = [];
  for (const o of orphans) {
    const h = sourceHash(o.id);
    for (let i = 0; i <= MAX_INDEX; i++) vecIds.push(`post:${h}-${i}`);
  }
  deleteVectors(vecIds);

  // 2) D1：所有孤兒的 doc_chunks/posts/互動表，一次送出
  console.log(`🗄️  刪除 D1 列…`);
  const sql: string[] = [];
  for (const o of orphans) {
    const keys = Array.from(new Set([o.id, normalizeEnglishPostId(o.id).toLowerCase()]));
    const inClause = keys.map(k => `'${esc(k)}'`).join(',');
    sql.push(`DELETE FROM doc_chunks WHERE source_id='${esc(o.id)}' AND source_type='post';`);
    sql.push(`DELETE FROM posts WHERE id='${esc(o.id)}';`);
    sql.push(`DELETE FROM page_views WHERE slug IN (${inClause});`);
    sql.push(`DELETE FROM post_reactions WHERE post_slug IN (${inClause});`);
    sql.push(`DELETE FROM comments WHERE post_slug IN (${inClause});`);
    sql.push(`DELETE FROM bookmarks WHERE post_slug IN (${inClause});`);
  }
  runSqlFile(sql);

  // 3) R2：OG + TTS
  console.log(`🗑️  刪除 R2…`);
  for (const o of orphans) {
    const ogKey = o.lang === 'en' ? `en/posts/${normalizeEnglishPostId(o.id)}` : `posts/${o.id}`;
    deleteFromR2(ogKey);
    if (o.audio_url) deleteFromR2(o.audio_url.replace(/^\/api\/tts\/r2\//, ''));
  }

  console.log(`\n✅ 完成：清除 ${orphans.length} 筆孤兒 posts。`);
}

main();
