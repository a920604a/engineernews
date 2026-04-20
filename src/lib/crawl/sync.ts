import { type CrawlTarget } from './config';
import { htmlToText, chunkText } from './chunker';

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
