/**
 * 預熱 OG 圖：逐篇打 /api/og 端點，觸發即時生成並快取進 R2。
 *
 * 背景：站上的 OG 圖（社群分享卡 + 文章頁 hero 背景）由 `/api/og/[...slug].ts`
 * 「按需生成 + 快取 R2」。沒人開過頁面 → R2 沒有該圖（admin R2 OG 顯示偏低、
 * 首次分享要等即時生成）。此腳本對每篇 draft:false 文章主動 GET 一次 OG URL，
 * 把 R2 快取一次補滿。冪等：重跑只是再打一次（端點命中既有快取直接回傳）。
 *
 * 注意：打的是「已部署的網站」，不是本地 dev。所以要先 push/deploy，新文章才存在。
 *
 * 用法：
 *   tsx scripts/prewarm-og.ts --dry-run                       # 只列出要打的 URL
 *   tsx scripts/prewarm-og.ts                                 # 對 production 預熱
 *   tsx scripts/prewarm-og.ts --base=https://engineer-news.pages.dev
 *   tsx scripts/prewarm-og.ts --file=src/content/posts/tech/xxx.md   # 單篇
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const DEFAULT_BASE = 'https://engineer-news.pages.dev';
const base = (process.argv.find(a => a.startsWith('--base='))?.slice(7) ?? DEFAULT_BASE).replace(/\/$/, '');
const dryRun = process.argv.includes('--dry-run');
const fileArg = process.argv.find(a => a.startsWith('--file='))?.slice(7);
const SITE_OG = `${base}/api/og/site.png`;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

// 由檔案路徑推出 OG URL（對齊 delete-post.ts 的 R2 key 規則）
function ogUrl(file: string): string {
  const rel = path.relative(POSTS_DIR, file);
  if (rel.endsWith('.en.md')) {
    const id = rel.replace(/\.en\.md$/, '');           // tech/2026-..-slug
    return `${base}/api/og/en/posts/${id}.png`;
  }
  const id = rel.replace(/\.md$/, '');
  return `${base}/api/og/posts/${id}.png`;
}

async function main() {
  const files = (fileArg ? [path.resolve(fileArg)] : walk(POSTS_DIR))
    .filter(f => {
      const { data } = matter(fs.readFileSync(f, 'utf-8'));
      return data.draft === false;                      // 只預熱已發佈的
    });

  const urls = [SITE_OG, ...files.map(ogUrl)];
  console.log(`Base: ${base}`);
  console.log(`已發佈文章: ${files.length}　預熱 URL（含 site）: ${urls.length}\n`);

  if (dryRun) {
    urls.forEach(u => console.log('  ' + u));
    console.log('\n🔸 DRY-RUN，未發送請求。');
    return;
  }

  let ok = 0, fail = 0;
  for (const u of urls) {
    try {
      const res = await fetch(u, { method: 'GET' });
      if (res.ok) { ok++; process.stdout.write(`\r  ✅ ${ok}  ❌ ${fail}  （${u.slice(base.length)}）            `); }
      else { fail++; console.warn(`\n  ⚠️  ${res.status} ${u}`); }
    } catch (e) {
      fail++; console.warn(`\n  ⚠️  ${(e as Error).message} ${u}`);
    }
  }
  console.log(`\n\n✅ 完成：成功 ${ok}　失敗 ${fail}`);
}

main();
