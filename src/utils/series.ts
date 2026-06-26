import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

type SeriesPost = CollectionEntry<'posts'>;

interface SeriesDefinition {
  slug: string;
  descriptions: Record<Lang, string>;
}

export interface SeriesSummary {
  name: string;
  slug: string;
  description: string;
  posts: SeriesPost[];
  count: number;
  latestDate: Date;
}

/**
 * Curated series metadata. The `name` here must exactly match the
 * `series.name` written in a post's frontmatter. Posts whose series has no
 * entry here still work — they fall back to an auto-generated slug + a generic
 * description (see `getSeriesMeta`).
 */
const SERIES_DEFINITIONS: Record<string, SeriesDefinition> = {
  'Kafka 為什麼這麼快': {
    slug: 'why-kafka-is-fast',
    descriptions: {
      'zh-TW': '兩篇拆解 Kafka 高效能的底層原理：從循序 I/O、Zero-Copy 到 partition 與 consumer group。',
      en: 'A two-part deep dive into what makes Kafka fast — from sequential I/O and zero-copy to partitions and consumer groups.',
    },
  },
  '系統設計 Mock 面試': {
    slug: 'system-design-mock',
    descriptions: {
      'zh-TW': '用 mock 面試的方式，從需求澄清、容量估算到架構取捨，實戰演練系統設計。',
      en: 'Mock-interview walkthroughs of system design — from requirements and capacity estimation to architecture tradeoffs.',
    },
  },
};

function slugifySeriesName(name: string): string {
  const asciiSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return asciiSlug || encodeURIComponent(name).toLowerCase();
}

export function getSeriesMeta(name: string) {
  const definition = SERIES_DEFINITIONS[name];
  return {
    name,
    slug: definition?.slug ?? slugifySeriesName(name),
    descriptions: definition?.descriptions ?? {
      'zh-TW': `${name} 系列文章`,
      en: `Posts in the ${name} series`,
    },
  };
}

export function getSeriesMetaBySlug(slug: string) {
  const matchedEntry = Object.entries(SERIES_DEFINITIONS).find(([, definition]) => definition.slug === slug);
  if (matchedEntry) {
    const [name] = matchedEntry;
    return getSeriesMeta(name);
  }
  return undefined;
}

export function getSeriesHref(name: string, lang: Lang): string {
  const { slug } = getSeriesMeta(name);
  return `${lang === 'en' ? '/en' : ''}/series/${slug}`;
}

/**
 * Group published posts of a given language by their series name, ordering
 * posts within a series by `series.order` (then date), and ordering series by
 * most-recently updated first.
 */
export async function getSeriesSummaries(lang: Lang, now = new Date()): Promise<SeriesSummary[]> {
  const posts = await getCollection('posts', ({ data }) =>
    !data.draft && data.lang === lang && Boolean(data.series) && data.date <= now,
  );

  const grouped = new Map<string, SeriesPost[]>();
  for (const post of posts) {
    const name = post.data.series!.name;
    const seriesPosts = grouped.get(name) ?? [];
    seriesPosts.push(post);
    grouped.set(name, seriesPosts);
  }

  return Array.from(grouped.entries())
    .map(([name, seriesPosts]) => {
      const orderedPosts = [...seriesPosts].sort((a, b) => {
        const orderDiff = (a.data.series?.order ?? 0) - (b.data.series?.order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return a.data.date.getTime() - b.data.date.getTime();
      });
      const meta = getSeriesMeta(name);
      return {
        name,
        slug: meta.slug,
        description: meta.descriptions[lang],
        posts: orderedPosts,
        count: orderedPosts.length,
        latestDate: orderedPosts[orderedPosts.length - 1]?.data.date ?? new Date(0),
      };
    })
    .sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());
}
