import type { APIRoute } from 'astro';

type PostQaRow = {
  id: number;
  post_id: string;
  lang: string;
  query: string;
  answer: string | null;
  sources_json: string | null;
  llm_ok: number;
  error: string | null;
  duration_ms: number | null;
  quality_score: number;
  created_at: string;
};

function auth(request: Request, adminToken: string | undefined): Response | null {
  if (!adminToken) return Response.json({ error: 'Admin not configured' }, { status: 401 });
  const token = new URL(request.url).searchParams.get('token');
  if (token !== adminToken) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

export const GET: APIRoute = async ({ request, locals }) => {
  const { DB, ADMIN_TOKEN } = locals.runtime.env;
  const denied = auth(request, ADMIN_TOKEN);
  if (denied) return denied;

  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? '';
  const postId = url.searchParams.get('post_id') ?? '';
  const scoreParam = url.searchParams.get('score');
  const score = scoreParam === '-1' || scoreParam === '0' || scoreParam === '1' ? Number(scoreParam) : null;
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? '0'), 0);

  const where: string[] = [];
  const args: unknown[] = [];
  if (q) { where.push('query LIKE ?'); args.push(`%${q}%`); }
  if (postId) { where.push('post_id = ?'); args.push(postId); }
  if (score !== null) { where.push('quality_score = ?'); args.push(score); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const rows = await DB.prepare(
      `SELECT id, post_id, lang, query, answer, sources_json, llm_ok, error, duration_ms,
              quality_score, created_at
       FROM post_qa ${whereSql}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...args, limit, offset).all<PostQaRow>();

    const total = await DB.prepare(
      `SELECT COUNT(*) as n FROM post_qa ${whereSql}`
    ).bind(...args).first<{ n: number }>();

    return Response.json({ rows: rows.results, total: total?.n ?? 0, limit, offset });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const { DB, ADMIN_TOKEN } = locals.runtime.env;
  const denied = auth(request, ADMIN_TOKEN);
  if (denied) return denied;

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  let body: { quality_score?: number };
  try {
    body = await request.json() as { quality_score?: number };
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const score = body.quality_score;
  if (score !== -1 && score !== 0 && score !== 1) {
    return Response.json({ error: 'quality_score must be -1, 0, or 1' }, { status: 400 });
  }

  try {
    await DB.prepare(`UPDATE post_qa SET quality_score = ? WHERE id = ?`).bind(score, id).run();
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const { DB, ADMIN_TOKEN } = locals.runtime.env;
  const denied = auth(request, ADMIN_TOKEN);
  if (denied) return denied;

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  try {
    await DB.prepare(`DELETE FROM post_qa WHERE id = ?`).bind(id).run();
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
};
