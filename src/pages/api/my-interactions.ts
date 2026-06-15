import type { APIRoute } from 'astro';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return json({ bookmarks: [], reactions: [] });

  const visitorId = request.headers.get('X-Visitor-ID');
  if (!visitorId) return json({ error: 'Missing X-Visitor-ID' }, 400);

  const [bookmarkRows, reactionRows] = await Promise.all([
    DB.prepare(
      'SELECT post_slug FROM bookmarks WHERE visitor_id = ? ORDER BY created_at DESC'
    ).bind(visitorId).all<{ post_slug: string }>(),
    DB.prepare(
      'SELECT post_slug, emoji FROM post_reactions WHERE visitor_id = ? ORDER BY created_at DESC'
    ).bind(visitorId).all<{ post_slug: string; emoji: string }>(),
  ]);

  return json({
    bookmarks: bookmarkRows.results.map(r => r.post_slug),
    reactions: reactionRows.results.map(r => ({ slug: r.post_slug, emoji: r.emoji })),
  });
};
