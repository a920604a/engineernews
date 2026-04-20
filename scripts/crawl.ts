import { runCrawlSync } from '../src/lib/crawl/sync';

const DB_NAME = 'engineer-news-db';
const isProd = process.argv.includes('--prod');
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

console.log(`🚀 Starting doc crawl (${isProd ? 'remote' : 'local'})...`);

const results = await runCrawlSync(DB_NAME, isProd, ACCOUNT_ID, API_TOKEN);

console.log('\n📊 Summary:');
for (const r of results) {
  if (r.error) {
    console.log(`  ✗ ${r.target}: ${r.error}`);
  } else {
    console.log(`  ✓ ${r.target}: ${r.pages} pages, ${r.chunks} chunks`);
  }
}
