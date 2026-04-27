import type { APIRoute } from 'astro';

export const PATCH: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) return new Response(JSON.stringify({ error: 'DB not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  let body: { slug: string; audio_url: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { slug, audio_url } = body;
  if (!slug || !audio_url) {
    return new Response(JSON.stringify({ error: 'slug and audio_url required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  await db.prepare('UPDATE posts SET audio_url = ? WHERE slug = ?').bind(audio_url, slug).run();

  db.prepare('INSERT INTO logs (level, source, message, created_at) VALUES (?, ?, ?, datetime("now"))')
    .bind('info', 'tts/update-audio', `audio_url saved to D1: slug=${slug} url=${audio_url}`)
    .run().catch(() => {});

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
