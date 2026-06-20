/**
 * Reset audio for all posts matching a given date prefix.
 * Usage: npx tsx scripts/reset-audio-by-date.ts --date=2026-04-29 --prod
 *
 * Steps:
 *   1. Delete audio files from R2
 *   2. Set audio_url = NULL in D1
 *   3. Remove audio_url from local markdown frontmatter
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import matter from 'gray-matter';
import { R2_BUCKET_NAME } from '../src/lib/tts';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const isProd = process.argv.includes('--prod');
const dateArg = process.argv.find(a => a.startsWith('--date='))?.slice(7);

if (!dateArg) {
  console.error('❌ 請指定 --date=YYYY-MM-DD');
  process.exit(1);
}

function getAllPosts(): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(POSTS_DIR, { recursive: true }) as Iterable<string>) {
    if (entry.endsWith('.md')) results.push(path.join(POSTS_DIR, entry));
  }
  return results;
}

function clearAudioUrlFromFrontmatter(filePath: string): void {
  let raw = fs.readFileSync(filePath, 'utf-8');
  if (!/^audio_url:/m.test(raw)) return;
  raw = raw.replace(/^audio_url:.*\n?/m, '');
  fs.writeFileSync(filePath, raw);
}

function deleteFromR2(r2Key: string): void {
  console.log(`  🗑️  刪除 R2: ${r2Key}`);
  try {
    if (isProd) {
      const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      const apiToken = process.env.CLOUDFLARE_API_TOKEN;
      if (!accountId || !apiToken) throw new Error('缺少 CLOUDFLARE_ACCOUNT_ID 或 CLOUDFLARE_API_TOKEN');
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${R2_BUCKET_NAME}/objects/${r2Key}`;
      execSync(`curl -sf -X DELETE "${url}" -H "Authorization: Bearer ${apiToken}"`, { stdio: 'inherit' });
    } else {
      console.log(`  ⚠️  local 模式跳過 R2 刪除 (wrangler 需要 Node.js v20+)`);
    }
  } catch {
    console.warn(`  ⚠️  R2 刪除失敗（可能已不存在）: ${r2Key}`);
  }
}

function clearD1AudioUrl(slug: string): void {
  console.log(`  📝 清除 D1 audio_url: ${slug}`);
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) throw new Error('缺少 CLOUDFLARE_ACCOUNT_ID 或 CLOUDFLARE_API_TOKEN');
  const dbId = '0bec497e-9de7-4069-bc90-7d0da0f72e9a';
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`;
  const body = JSON.stringify({ sql: `UPDATE posts SET audio_url=NULL WHERE slug=?`, params: [slug] });
  execSync(
    `curl -sf -X POST "${url}" -H "Authorization: Bearer ${apiToken}" -H "Content-Type: application/json" -d '${body.replace(/'/g, "'\\''")}'`,
    { stdio: 'inherit' }
  );
}

async function main() {
  const posts = getAllPosts().filter(p => path.basename(p).startsWith(dateArg!));

  if (posts.length === 0) {
    console.log(`⚠️  找不到 ${dateArg} 的文章`);
    return;
  }

  console.log(`🔍 找到 ${posts.length} 篇 ${dateArg} 的文章`);

  for (const filePath of posts) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(raw);
    const slug = path.basename(filePath, '.md');

    if (!data.audio_url) {
      console.log(`  ⏭️  跳過（無 audio_url）: ${slug}`);
      continue;
    }

    console.log(`\n🎯 處理: ${slug}`);

    // 從 audio_url 推導 R2 key，例如 /api/tts/r2/tts/xxx.mp3 → tts/xxx.mp3
    const r2Key = (data.audio_url as string).replace(/^\/api\/tts\/r2\//, '');
    deleteFromR2(r2Key);

    if (isProd) {
      clearD1AudioUrl(slug);
    }

    clearAudioUrlFromFrontmatter(filePath);
    console.log(`  ✅ 完成: ${slug}`);
  }

  console.log('\n✅ 全部清除完成，可執行 make tts-all-prod 重新生成。');
}

main().catch(console.error);
