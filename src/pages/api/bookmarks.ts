import type { APIRoute } from 'astro';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return json({ slugs: [] });

  const visitorId = request.headers.get('X-Visitor-ID');
  if (!visitorId) return json({ error: 'Missing X-Visitor-ID' }, 400);

  const rows = await DB.prepare(
    'SELECT post_slug FROM bookmarks WHERE visitor_id = ? ORDER BY created_at DESC'
  ).bind(visitorId).all<{ post_slug: string }>();

  return json({ slugs: rows.results.map(r => r.post_slug) });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return json({ error: 'DB unavailable' }, 503);

  const visitorId = request.headers.get('X-Visitor-ID');
  if (!visitorId) return json({ error: 'Missing X-Visitor-ID' }, 400);

  const body = await request.json() as { slug?: string };
  if (!body.slug) return json({ error: 'Missing slug' }, 400);

  const existing = await DB.prepare(
    'SELECT id FROM bookmarks WHERE visitor_id = ? AND post_slug = ?'
  ).bind(visitorId, body.slug).first<{ id: number }>();

  if (existing) {
    await DB.prepare(
      'DELETE FROM bookmarks WHERE visitor_id = ? AND post_slug = ?'
    ).bind(visitorId, body.slug).run();
    return json({ bookmarked: false });
  } else {
    await DB.prepare(
      'INSERT INTO bookmarks (visitor_id, post_slug) VALUES (?, ?)'
    ).bind(visitorId, body.slug).run();
    return json({ bookmarked: true });
  }
};
