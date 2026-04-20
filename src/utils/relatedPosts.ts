import type { CollectionEntry } from 'astro:content';

type Post = CollectionEntry<'posts'>;

export function getRelatedPosts(post: Post, allPosts: Post[], max = 3): Post[] {
  if (!post.data.tags?.length) return [];

  const tagSet = new Set(post.data.tags);

  return allPosts
    .filter((p) => p.id !== post.id && p.data.lang === post.data.lang && !p.data.draft)
    .map((p) => ({
      post: p,
      overlap: p.data.tags.filter((t) => tagSet.has(t)).length,
    }))
    .filter(({ overlap }) => overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || b.post.data.date.valueOf() - a.post.data.date.valueOf())
    .slice(0, max)
    .map(({ post }) => post);
}
