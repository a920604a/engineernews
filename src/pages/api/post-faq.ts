import type { APIRoute } from 'astro';

export const prerender = false;

type PublicRow = {
  id: number;
  query: string;
  answer: string;
  lang: string;
  created_at: string;
};

export const GET: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  const url = new URL(request.url);
  const postId = url.searchParams.get('post_id')?.trim() ?? '';
  const lang = url.searchParams.get('lang') ?? 'zh-TW';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '20'), 50);

  if (!postId) {
    return Response.json({ rows: [] });
  }

  try {
    const rows = await DB.prepare(
      `SELECT id, query, answer, lang, created_at
       FROM post_qa
       WHERE post_id = ? AND lang = ? AND quality_score = 1 AND answer IS NOT NULL AND answer != ''
       ORDER BY created_at DESC
       LIMIT ?`
    ).bind(postId, lang, limit).all<PublicRow>();

    return new Response(JSON.stringify({ rows: rows.results ?? [] }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    return Response.json({ rows: [], error: String(err) }, { status: 500 });
  }
};
