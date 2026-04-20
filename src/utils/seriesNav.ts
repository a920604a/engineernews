import type { CollectionEntry } from 'astro:content';

type Post = CollectionEntry<'posts'>;

export interface SeriesNav {
  name: string;
  current: number;
  total: number;
  prev?: { id: string; title: string };
  next?: { id: string; title: string };
}

export function getSeriesNav(post: Post, allPosts: Post[]): SeriesNav | undefined {
  if (!post.data.series) return undefined;

  const { name } = post.data.series;

  const seriesPosts = allPosts
    .filter((p) => p.data.series?.name === name && !p.data.draft)
    .sort((a, b) => (a.data.series!.order) - (b.data.series!.order));

  const idx = seriesPosts.findIndex((p) => p.id === post.id);
  if (idx === -1) return undefined;

  const prev = seriesPosts[idx - 1];
  const next = seriesPosts[idx + 1];

  return {
    name,
    current: idx + 1,
    total: seriesPosts.length,
    prev: prev ? { id: prev.id, title: prev.data.title } : undefined,
    next: next ? { id: next.id, title: next.data.title } : undefined,
  };
}
