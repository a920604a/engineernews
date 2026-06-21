/**
 * 徹底刪除一篇文章：本地 Markdown、D1、Vectorize、R2（OG 圖 + TTS 音檔）。
 *
 * 用法：
 *   npx tsx scripts/delete-post.ts --file=src/content/posts/tech/2026-06-22-slug.md           # dry-run（只列出將刪除的項目）
 *   npx tsx scripts/delete-post.ts --file=src/content/posts/tech/2026-06-22-slug.md --prod     # 對遠端執行，仍為 dry-run
 *   npx tsx scripts/delete-post.ts --file=src/content/posts/tech/2026-06-22-slug.md --prod --yes  # 實際刪除
 *
 * 也可用文章 id（相對 posts/ 的路徑，不含 .md）：
 *   npx tsx scripts/delete-post.ts --id=tech/2026-06-22-slug --prod --yes
 *
 * 安全機制：
 *   - 預設為 dry-run，只有加上 --yes 才會真的刪除。
 *   - --prod 才會操作遠端 D1 / Vectorize / R2；否則只動本地 D1 與本地檔案。
 *   - 會自動連同英文版（.en.md）一起刪除。
 */

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const PUBLIC_OG_DIR = path.join(process.cwd(), 'public/og');
const DB_NAME = 'engineer-news-db';
const VECTOR_INDEX = 'engineer-news-index';
const R2_BUCKET = 'engineer-news-og-images';

const isProd = process.argv.includes('--prod');
const confirmed = process.argv.includes('--yes');
const remoteFlag = isProd ? '--remote' : '--local';
const fileArg = process.argv.find(a => a.startsWith('--file='))?.slice(7);
const idArg = process.argv.find(a => a.startsWith('--id='))?.slice(5);

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

// ── 工具函式 ────────────────────────────────────────────────────────────────

function esc(s: string) {
  return s.replace(/'/g, "''");
}

// 與 sync-to-d1.ts 完全一致的向量 id 計算方式
function sourceHash(sourceId: string): string {
  return createHash('sha1').update(sourceId).digest('hex').slice(0, 16);
}

// 將 .en / en 後綴移除，得到前端（Astro v5）使用的正規化 id
function normalizeEnglishPostId(postId: string): string {
  return postId.replace(/\.en$/, '').replace(/en$/, '');
}

function runSql(statements: string[]) {
  if (statements.length === 0) return;
  const tmp = path.join(process.cwd(), `.tmp_del_${Date.now()}.sql`);
  fs.writeFileSync(tmp, statements.join('\n'));
  try {
    execSync(`wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${tmp} --yes`, { stdio: 'inherit' });
  } finally {
    fs.unlinkSync(tmp);
  }
}

function querySql<T = any>(sql: string): T[] {
  const tmp = path.join(process.cwd(), `.tmp_delq_${Date.now()}.sql`);
  fs.writeFileSync(tmp, sql);
  try {
    const out = execSync(
      `wrangler d1 execute ${DB_NAME} ${remoteFlag} --file=${tmp} --yes --json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'inherit'] }
    );
    return JSON.parse(out)?.[0]?.results ?? [];
  } catch {
    return [];
  } finally {
    fs.unlinkSync(tmp);
  }
}

function deleteVectors(ids: string[], batchSize = 500) {
  if (!isProd || ids.length === 0) return;
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    try {
      execSync(
        `wrangler vectorize delete-vectors ${VECTOR_INDEX} --ids ${chunk.join(' ')} --force`,
        { stdio: 'inherit' }
      );
    } catch (e) {
      console.warn(`  ⚠️  vectorize delete-vectors 失敗（忽略）：${(e as Error).message}`);
    }
  }
}

function deleteFromR2(r2Key: string) {
  console.log(`  🗑️  R2: ${r2Key}`);
  if (!isProd) {
    console.log('     ⚠️  非 --prod，跳過遠端 R2 刪除');
    return;
  }
  if (!ACCOUNT_ID || !API_TOKEN) throw new Error('缺少 CLOUDFLARE_ACCOUNT_ID 或 CLOUDFLARE_API_TOKEN');
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${encodeURI(r2Key)}`;
  try {
    execSync(`curl -sf -X DELETE "${url}" -H "Authorization: Bearer ${API_TOKEN}"`, { stdio: 'inherit' });
  } catch {
    console.warn(`     ⚠️  R2 刪除失敗（可能已不存在）：${r2Key}`);
  }
}

// ── 解析目標文章 ────────────────────────────────────────────────────────────

interface PostTarget {
  id: string;          // 例：tech/2026-06-22-slug 或 tech/2026-06-22-slug.en
  filePath: string;    // 絕對路徑
  lang: 'zh-TW' | 'en';
  audioUrl?: string;
}

function resolveTargets(): PostTarget[] {
  let mainFile: string;
  if (fileArg) {
    mainFile = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  } else if (idArg) {
    mainFile = path.join(POSTS_DIR, `${idArg}.md`);
  } else {
    console.error('❌ 請指定 --file=... 或 --id=...');
    process.exit(1);
  }

  if (!mainFile.endsWith('.md') || mainFile.endsWith('.en.md')) {
    // 一律以「中文主檔」為入口，英文版自動帶入
    if (mainFile.endsWith('.en.md')) mainFile = mainFile.replace(/\.en\.md$/, '.md');
  }

  const targets: PostTarget[] = [];
  const candidates: Array<{ file: string; lang: 'zh-TW' | 'en' }> = [
    { file: mainFile, lang: 'zh-TW' },
    { file: mainFile.replace(/\.md$/, '.en.md'), lang: 'en' },
  ];

  for (const { file, lang } of candidates) {
    if (!fs.existsSync(file)) continue;
    const id = path.relative(POSTS_DIR, file).replace(/\.md$/, '');
    const { data } = matter(fs.readFileSync(file, 'utf-8'));
    targets.push({ id, filePath: file, lang, audioUrl: data.audio_url });
  }

  if (targets.length === 0) {
    console.error(`❌ 找不到文章檔案：${mainFile}`);
    process.exit(1);
  }
  return targets;
}

// ── 主流程 ──────────────────────────────────────────────────────────────────

function main() {
  const targets = resolveTargets();

  console.log(`\n🎯 將刪除 ${targets.length} 個檔案（${isProd ? '遠端 prod' : '本地 local'}）：`);
  for (const t of targets) console.log(`   - [${t.lang}] ${t.id}`);

  if (!confirmed) {
    console.log('\n🔸 這是 DRY-RUN。以下為將執行的動作（加 --yes 才會真的刪除）：\n');
  }

  for (const t of targets) {
    console.log(`\n── 處理 [${t.lang}] ${t.id} ──`);
    const sql: string[] = [];

    // 1) Vectorize：先從 D1 查出 chunk id，再刪向量
    const chunkRows = isProd
      ? querySql<{ id: string }>(
          `SELECT id FROM doc_chunks WHERE source_id='${esc(t.id)}' AND source_type='post';`
        )
      : [];
    if (chunkRows.length > 0) {
      console.log(`  🧹 Vectorize: ${chunkRows.length} 個向量`);
      if (confirmed) deleteVectors(chunkRows.map(r => r.id));
    }

    // 2) D1：doc_chunks + posts + 互動資料
    //    互動表（page_views/reactions/comments/bookmarks）由前端以 Astro post.id 寫入，
    //    對英文版可能是「去 .en、轉小寫」的形式，故兩種 key 都刪。
    const interactionKeys = Array.from(new Set([
      t.id,
      normalizeEnglishPostId(t.id).toLowerCase(),
    ]));
    const inClause = interactionKeys.map(k => `'${esc(k)}'`).join(',');

    sql.push(`DELETE FROM doc_chunks WHERE source_id='${esc(t.id)}' AND source_type='post';`);
    sql.push(`DELETE FROM posts WHERE id='${esc(t.id)}';`);
    sql.push(`DELETE FROM page_views WHERE slug IN (${inClause});`);
    sql.push(`DELETE FROM post_reactions WHERE post_slug IN (${inClause});`);
    sql.push(`DELETE FROM comments WHERE post_slug IN (${inClause});`);
    sql.push(`DELETE FROM bookmarks WHERE post_slug IN (${inClause});`);

    console.log(`  🗄️  D1: doc_chunks / posts / page_views / post_reactions / comments / bookmarks`);
    if (confirmed) runSql(sql);

    // 3) R2 OG 圖（API 動態快取）
    const ogKey = t.lang === 'en'
      ? `en/posts/${normalizeEnglishPostId(t.id)}`
      : `posts/${t.id}`;
    if (confirmed) deleteFromR2(ogKey);
    else console.log(`  🗑️  R2 OG: ${ogKey}`);

    // 4) R2 TTS 音檔
    if (t.audioUrl) {
      const ttsKey = t.audioUrl.replace(/^\/api\/tts\/r2\//, '');
      if (confirmed) deleteFromR2(ttsKey);
      else console.log(`  🗑️  R2 TTS: ${ttsKey}`);
    }

    // 5) 本地 public/og PNG（generate-og.ts 產物）
    const localOg = path.join(PUBLIC_OG_DIR, `posts-${t.id.replace(/\//g, '-')}.png`);
    if (fs.existsSync(localOg)) {
      console.log(`  🗑️  本地 OG: ${path.relative(process.cwd(), localOg)}`);
      if (confirmed) fs.unlinkSync(localOg);
    }

    // 6) 本地 Markdown
    console.log(`  🗑️  本地檔案: ${path.relative(process.cwd(), t.filePath)}`);
    if (confirmed) fs.unlinkSync(t.filePath);
  }

  if (confirmed) {
    console.log('\n✅ 刪除完成。');
    if (!isProd) console.log('   提醒：本次為 local 模式，遠端 prod 資料未變動。加 --prod 才會清除線上資料。');
  } else {
    console.log('\n🔸 DRY-RUN 結束，未做任何變動。確認無誤後加上 --yes 執行。');
  }
}

main();
