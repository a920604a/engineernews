import type { APIRoute } from 'astro';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return json({ comments: [] });

  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) return json({ error: 'Missing slug' }, 400);

  const rows = await DB.prepare(
    `SELECT id, author_name, author_url, body, created_at
     FROM comments
     WHERE post_slug = ? AND hidden = 0
     ORDER BY created_at ASC`
  ).bind(slug).all<{ id: number; author_name: string; author_url: string | null; body: string; created_at: number }>();

  return json({ comments: rows.results });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return json({ error: 'DB unavailable' }, 503);

  const visitorId = request.headers.get('X-Visitor-ID');
  if (!visitorId) return json({ error: 'Missing X-Visitor-ID' }, 400);

  const body = await request.json() as {
    slug?: string;
    body?: string;
    author_name?: string;
    author_url?: string;
  };

  if (!body.slug || !body.body) return json({ error: 'Missing slug or body' }, 400);
  if (body.body.length > 1000) return json({ error: 'Comment too long' }, 400);

  // Rate limit: max one comment per 60s per visitor
  const lastComment = await DB.prepare(
    `SELECT created_at FROM comments
     WHERE visitor_id = ? AND post_slug = ?
     ORDER BY created_at DESC LIMIT 1`
  ).bind(visitorId, body.slug).first<{ created_at: number }>();

  if (lastComment) {
    const elapsed = Math.floor(Date.now() / 1000) - lastComment.created_at;
    if (elapsed < 60) return json({ error: 'Rate limit: wait before posting again', retryAfter: 60 - elapsed }, 429);
  }

  const result = await DB.prepare(
    `INSERT INTO comments (post_slug, visitor_id, author_name, author_url, body)
     VALUES (?, ?, ?, ?, ?)
     RETURNING id, author_name, author_url, body, created_at`
  ).bind(
    body.slug,
    visitorId,
    body.author_name?.trim() || '匿名',
    body.author_url?.trim() || null,
    body.body.trim()
  ).first<{ id: number; author_name: string; author_url: string | null; body: string; created_at: number }>();

  return json({ comment: result }, 201);
};
