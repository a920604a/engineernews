export interface CrawlTarget {
  name: string;
  url: string;
  include: string[];
  maxPages: number;
}

export const crawlTargets: CrawlTarget[] = [
  {
    name: 'Cloudflare D1',
    url: 'https://developers.cloudflare.com/d1/',
    include: ['/d1/'],
    maxPages: 50,
  },
  {
    name: 'Cloudflare Workers',
    url: 'https://developers.cloudflare.com/workers/',
    include: ['/workers/'],
    maxPages: 80,
  },
  {
    name: 'Cloudflare Vectorize',
    url: 'https://developers.cloudflare.com/vectorize/',
    include: ['/vectorize/'],
    maxPages: 30,
  },
  {
    name: 'Astro Docs',
    url: 'https://docs.astro.build/en/getting-started/',
    include: ['/en/'],
    maxPages: 60,
  },
];

export const MAX_CHUNK_CHARS = 2000;
