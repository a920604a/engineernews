import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const posts = await getCollection('posts', ({ data }) => !data.draft && data.lang === 'zh-TW');
  const sorted = posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'Engineer News',
    description: '捕捉工程對話中的精華，轉化為結構化的技術知識庫。',
    site: context.site ?? 'https://engineer-news.pages.dev',
    items: sorted.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.tldr ?? post.data.description ?? '',
      link: `/posts/${post.id}/`,
    })),
  });
};
