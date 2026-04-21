import type { APIRoute } from 'astro';

// GET /api/views?slug=xxx  → { count: N }
export const GET: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return new Response(JSON.stringify({ count: 0 }));

  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  if (!slug) return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 });

  try {
    const row = await DB.prepare('SELECT count FROM page_views WHERE slug = ?').bind(slug).first<{ count: number }>();
    return new Response(JSON.stringify({ count: row?.count ?? 0 }));
  } catch {
    return new Response(JSON.stringify({ count: 0 }));
  }
};

// POST /api/views  body: { slug }  → { count: N }
export const POST: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return new Response(JSON.stringify({ count: 0 }));

  const { slug } = await request.json();
  if (!slug) return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 });

  try {
    await DB.prepare(`
      INSERT INTO page_views (slug, count, updated_at)
      VALUES (?, 1, datetime('now'))
      ON CONFLICT(slug) DO UPDATE SET
        count = count + 1,
        updated_at = datetime('now')
    `).bind(slug).run();

    const row = await DB.prepare('SELECT count FROM page_views WHERE slug = ?').bind(slug).first<{ count: number }>();
    return new Response(JSON.stringify({ count: row?.count ?? 1 }));
  } catch {
    return new Response(JSON.stringify({ count: 0 }));
  }
};
