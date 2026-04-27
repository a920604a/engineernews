import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, locals }) => {
  const slug = url.searchParams.get('slug');
  if (!slug) return new Response(JSON.stringify({ audio_url: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const db = locals.runtime?.env?.DB;
  if (!db) return new Response(JSON.stringify({ audio_url: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const row = await db.prepare('SELECT audio_url FROM posts WHERE slug = ?').bind(slug).first<{ audio_url: string | null }>();

  return new Response(JSON.stringify({ audio_url: row?.audio_url ?? null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
