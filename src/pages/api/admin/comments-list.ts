import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  const { DB, ADMIN_TOKEN } = locals.runtime.env as { DB: D1Database; ADMIN_TOKEN?: string };
  const token = new URL(request.url).searchParams.get('token');
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await DB.prepare(
    `SELECT id, post_slug, author_name, body, hidden, datetime(created_at, 'unixepoch') as created_at
     FROM comments ORDER BY created_at DESC LIMIT 500`
  ).all();

  return Response.json({ rows: rows.results, total: rows.results.length });
};
