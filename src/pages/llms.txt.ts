import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const posts = await getCollection('posts', ({ data }) => !data.draft && data.lang === 'zh-TW');
  const sorted = posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const lines = [
    '# Engineer News',
    '> 捕捉工程對話中的精華，轉化為結構化的技術知識庫。',
    '',
    '## 文章',
    '',
    ...sorted.map((post) =>
      `- [${post.data.title}](/posts/${post.id}): ${post.data.tldr || post.data.description || ''}`
    ),
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
