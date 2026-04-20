import { crawlTargets, type CrawlTarget } from './config';
import { htmlToText, chunkText } from './chunker';

export interface CrawlResult {
  target: string;
  pages: number;
  chunks: number;
  error?: string;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'EngineerNews-Crawler/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractLinks(html: string, base: string, include: string[]): string[] {
  const baseUrl = new URL(base);
  const links = new Set<string>();
  const matches = html.matchAll(/href="([^"]+)"/g);

  for (const [, href] of matches) {
    try {
      const url = new URL(href, base);
      if (url.hostname !== baseUrl.hostname) continue;
      if (!include.some((p) => url.pathname.startsWith(p))) continue;
      url.hash = '';
      links.add(url.toString());
    } catch {}
  }

  return [...links];
}

export async function crawlTarget(target: CrawlTarget): Promise<{ url: string; chunks: string[] }[]> {
  const visited = new Set<string>();
  const queue = [target.url];
  const results: { url: string; chunks: string[] }[] = [];

  while (queue.length > 0 && visited.size < target.maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    const html = await fetchPage(url);
    if (!html) continue;

    const text = htmlToText(html);
    const chunks = chunkText(text);
    if (chunks.length > 0) results.push({ url, chunks });

    const links = extractLinks(html, url, target.include);
    for (const link of links) {
      if (!visited.has(link)) queue.push(link);
    }
  }

  return results;
}

export async function runCrawlSync(
  dbName: string,
  isProd: boolean,
  accountId?: string,
  apiToken?: string,
): Promise<CrawlResult[]> {
  const { execSync } = await import('node:child_process');
  const fs = await import('node:fs');
  const path = await import('node:path');
  const remoteFlag = isProd ? '--remote' : '--local';

  const results: CrawlResult[] = [];

  for (const target of crawlTargets) {
    console.log(`\n🕷  Crawling: ${target.name} (max ${target.maxPages} pages)`);
    try {
      const pages = await crawlTarget(target);
      let totalChunks = 0;

      for (const { url, chunks } of pages) {
        // delete old chunks for this URL
        execSync(
          `wrangler d1 execute ${dbName} ${remoteFlag} --command="DELETE FROM doc_chunks WHERE source_url='${url}'" --yes`,
          { stdio: 'pipe' }
        );

        for (let i = 0; i < chunks.length; i++) {
          const id = `${encodeURIComponent(url)}-${i}`;
          const escaped = chunks[i].replace(/'/g, "''");
          const sql = `INSERT INTO doc_chunks (id, source_url, source_name, chunk_index, content) VALUES ('${id}','${url}','${target.name}',${i},'${escaped}') ON CONFLICT(id) DO UPDATE SET content=excluded.content`;
          const tmpFile = path.join(process.cwd(), `.tmp_crawl_${i}.sql`);
          fs.writeFileSync(tmpFile, sql);
          execSync(`wrangler d1 execute ${dbName} ${remoteFlag} --file=${tmpFile} --yes`, { stdio: 'pipe' });
          fs.unlinkSync(tmpFile);
          totalChunks++;
        }
      }

      console.log(`   ✓ ${pages.length} pages, ${totalChunks} chunks`);
      results.push({ target: target.name, pages: pages.length, chunks: totalChunks });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`   ✗ ${msg}`);
      results.push({ target: target.name, pages: 0, chunks: 0, error: msg });
    }
  }

  return results;
}
