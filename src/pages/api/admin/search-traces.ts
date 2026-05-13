import type { APIRoute } from 'astro';

type TraceRow = {
  id: number;
  query: string;
  lang: string;
  vector_hits: number;
  keyword_hits: number;
  llm_ok: number;
  duration_ms: number;
  llm_answer: string | null;
  sources_json: string | null;
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
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? '0'), 0);

  try {
    const rows = q
      ? await DB.prepare(
          `SELECT id, query, lang, vector_hits, keyword_hits, llm_ok, duration_ms,
                  llm_answer, sources_json, quality_score, created_at
           FROM search_logs WHERE query LIKE ?
           ORDER BY created_at DESC LIMIT ? OFFSET ?`
        ).bind(`%${q}%`, limit, offset).all<TraceRow>()
      : await DB.prepare(
          `SELECT id, query, lang, vector_hits, keyword_hits, llm_ok, duration_ms,
                  llm_answer, sources_json, quality_score, created_at
           FROM search_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`
        ).bind(limit, offset).all<TraceRow>();

    const total = await DB.prepare(
      q ? `SELECT COUNT(*) as n FROM search_logs WHERE query LIKE ?` : `SELECT COUNT(*) as n FROM search_logs`
    ).bind(...(q ? [`%${q}%`] : [])).first<{ n: number }>();

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
    await DB.prepare(`UPDATE search_logs SET quality_score = ? WHERE id = ?`).bind(score, id).run();
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
};
