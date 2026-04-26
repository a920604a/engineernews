import type { APIRoute } from 'astro';

const EMBEDDING_MODEL = '@cf/baai/bge-m3';
const EMBEDDING_DIMS = 1024;
const CHAT_MODEL = '@cf/qwen/qwen1.5-14b-chat-awq';
const VECTOR_TOP_K = 8;
const MAX_SOURCES = 5;
const VECTORIZE_INDEX = 'engineer-news-index';
const D1_DATABASE = 'engineer-news-db';
const R2_BUCKET = 'engineer-news-og-images';
const COMPAT_DATE = '2024-04-01';

type SafeResult<T> = { data: T; error: null } | { data: null; error: string };

async function safe<T>(fn: () => Promise<T>): Promise<SafeResult<T>> {
  try {
    return { data: await fn(), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

function auth(request: Request, adminToken: string | undefined): Response | null {
  if (!adminToken) return Response.json({ error: 'Admin not configured' }, { status: 401 });
  const token = new URL(request.url).searchParams.get('token');
  if (token !== adminToken) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env as {
    DB: D1Database;
    OG_IMAGES: R2Bucket;
    ADMIN_TOKEN?: string;
    [k: string]: unknown;
  };

  const deny = auth(request, env.ADMIN_TOKEN);
  if (deny) return deny;

  const url = new URL(request.url);
  const view = url.searchParams.get('view') ?? 'overview';

  // ── Detail / lazy views ───────────────────────────────────────────────────

  if (view === 'r2-objects') {
    const result = await safe(async () => {
      const objects: { key: string; size: number; uploaded: string }[] = [];
      let cursor: string | undefined;
      do {
        const list = await env.OG_IMAGES.list({ limit: 1000, cursor });
        for (const obj of list.objects) {
          objects.push({ key: obj.key, size: obj.size, uploaded: obj.uploaded.toISOString() });
        }
        cursor = list.truncated ? list.cursor : undefined;
      } while (cursor && objects.length < 5000);
      return objects;
    });
    return Response.json(result);
  }

  if (view === 'chunks-by-post') {
    const result = await safe(async () => {
      const rows = await env.DB.prepare(
        `SELECT d.source_id, p.title, p.category, p.lang,
                COUNT(*) as chunk_count,
                MAX(d.updated_at) as last_updated
         FROM doc_chunks d
         JOIN posts p ON p.id = d.source_id
         GROUP BY d.source_id
         ORDER BY chunk_count DESC`
      ).all<{ source_id: string; title: string; category: string; lang: string; chunk_count: number; last_updated: string }>();
      return rows.results;
    });
    return Response.json(result);
  }

  if (view === 'page-views') {
    const result = await safe(async () => {
      const rows = await env.DB.prepare(
        `SELECT slug, count, updated_at FROM page_views ORDER BY count DESC LIMIT 50`
      ).all<{ slug: string; count: number; updated_at: string }>();
      return rows.results;
    });
    return Response.json(result);
  }

  if (view === 'search-logs') {
    const result = await safe(async () => {
      const rows = await env.DB.prepare(
        `SELECT id, query, lang, vector_hits, keyword_hits, llm_ok, error, duration_ms, created_at
         FROM search_logs ORDER BY created_at DESC LIMIT 100`
      ).all<{ id: number; query: string; lang: string; vector_hits: number; keyword_hits: number; llm_ok: number; error: string | null; duration_ms: number; created_at: string }>();
      return rows.results;
    });
    return Response.json(result);
  }

  if (view === 'logs') {
    const source = url.searchParams.get('source') ?? null;
    const level  = url.searchParams.get('level')  ?? null;
    const result = await safe(async () => {
      let sql = `SELECT id, level, source, message, data, created_at FROM logs`;
      const conditions: string[] = [];
      const bindings: string[] = [];
      if (source) { conditions.push('source = ?'); bindings.push(source); }
      if (level)  { conditions.push('level = ?');  bindings.push(level); }
      if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
      sql += ` ORDER BY created_at DESC LIMIT 200`;
      const rows = await env.DB.prepare(sql).bind(...bindings)
        .all<{ id: number; level: string; source: string; message: string; data: string | null; created_at: string }>();
      return rows.results;
    });
    return Response.json(result);
  }

  if (view === 'log-sources') {
    const result = await safe(async () => {
      const rows = await env.DB.prepare(
        `SELECT source, COUNT(*) as count FROM logs GROUP BY source ORDER BY count DESC`
      ).all<{ source: string; count: number }>();
      return rows.results;
    });
    return Response.json(result);
  }

  // ── Overview (single batched call for main dashboard) ─────────────────────

  const [d1Result, r2Result, postsResult] = await Promise.allSettled([
    safe(async () => {
      const [counts, langDist, catDist, recentPosts, postsTrend, searchTrend, searchStats, pageViewsTop] = await Promise.all([
        env.DB.batch([
          env.DB.prepare('SELECT COUNT(*) as count FROM posts'),
          env.DB.prepare('SELECT COUNT(*) as count FROM doc_chunks'),
          env.DB.prepare('SELECT COUNT(*) as count FROM projects'),
          env.DB.prepare('SELECT COUNT(*) as count FROM page_views'),
          env.DB.prepare('SELECT COUNT(*) as count FROM search_logs'),
        ]),
        env.DB.prepare('SELECT lang, COUNT(*) as count FROM posts GROUP BY lang')
          .all<{ lang: string; count: number }>(),
        env.DB.prepare('SELECT category, COUNT(*) as count FROM posts GROUP BY category ORDER BY count DESC')
          .all<{ category: string; count: number }>(),
        env.DB.prepare('SELECT id, title, category, lang, created_at FROM posts ORDER BY created_at DESC LIMIT 5')
          .all<{ id: string; title: string; category: string; lang: string; created_at: string }>(),
        // Posts per day last 30 days
        env.DB.prepare(
          `SELECT date(created_at) as date, COUNT(*) as count
           FROM posts WHERE created_at >= datetime('now', '-30 days')
           GROUP BY date(created_at) ORDER BY date ASC`
        ).all<{ date: string; count: number }>(),
        // Search queries per hour last 24h
        env.DB.prepare(
          `SELECT strftime('%H:00', created_at) as hour,
                  COUNT(*) as total,
                  SUM(llm_ok) as ok,
                  CAST(AVG(duration_ms) AS INTEGER) as avg_ms
           FROM search_logs
           WHERE created_at >= datetime('now', '-24 hours')
           GROUP BY strftime('%H', created_at) ORDER BY hour ASC`
        ).all<{ hour: string; total: number; ok: number; avg_ms: number }>(),
        // Search summary last 7 days
        env.DB.prepare(
          `SELECT COUNT(*) as total,
                  SUM(llm_ok) as llm_ok,
                  SUM(CASE WHEN vector_hits > 0 THEN 1 ELSE 0 END) as vec_ok,
                  CAST(AVG(duration_ms) AS INTEGER) as avg_ms,
                  SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as errors
           FROM search_logs WHERE created_at >= datetime('now', '-7 days')`
        ).first<{ total: number; llm_ok: number; vec_ok: number; avg_ms: number; errors: number }>(),
        // Top page views
        env.DB.prepare('SELECT slug, count FROM page_views ORDER BY count DESC LIMIT 10')
          .all<{ slug: string; count: number }>(),
      ]);

      return {
        posts: (counts[0].results[0] as { count: number }).count,
        doc_chunks: (counts[1].results[0] as { count: number }).count,
        projects: (counts[2].results[0] as { count: number }).count,
        page_views: (counts[3].results[0] as { count: number }).count,
        search_logs: (counts[4].results[0] as { count: number }).count,
        lang_distribution: langDist.results,
        category_distribution: catDist.results,
        recent_posts: recentPosts.results,
        posts_trend: postsTrend.results,
        search_trend: searchTrend.results,
        search_stats: searchStats ?? { total: 0, llm_ok: 0, vec_ok: 0, avg_ms: 0, errors: 0 },
        page_views_top: pageViewsTop.results,
      };
    }),
    safe(async () => {
      const list = await env.OG_IMAGES.list({ limit: 1000 });
      return { count: list.objects.length, truncated: list.truncated };
    }),
    safe(async () => {
      const rows = await env.DB.prepare(
        `SELECT p.id, p.title, p.category, p.lang, p.created_at, p.updated_at,
                COUNT(d.id) as chunk_count
         FROM posts p
         LEFT JOIN doc_chunks d ON d.source_id = p.id AND d.source_type = 'post'
         GROUP BY p.id
         ORDER BY p.created_at DESC`
      ).all<{ id: string; title: string; category: string; lang: string; created_at: string; updated_at: string; chunk_count: number }>();
      return rows.results;
    }),
  ]);

  const settle = <T>(r: PromiseSettledResult<SafeResult<T>>): SafeResult<T> =>
    r.status === 'fulfilled' ? r.value : { data: null, error: (r.reason as Error)?.message ?? 'unknown' };

  const d1 = settle(d1Result);
  const r2 = settle(r2Result);
  const posts = settle(postsResult);

  return Response.json({
    d1,
    r2,
    vectorize: {
      data: {
        chunk_count: d1.data?.doc_chunks ?? null,
        embedding_model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMS,
        index_name: VECTORIZE_INDEX,
        metadata_indexes: ['lang'],
      },
      error: d1.error,
    },
    config: {
      data: {
        embedding_model: EMBEDDING_MODEL,
        embedding_dims: EMBEDDING_DIMS,
        chat_model: CHAT_MODEL,
        vector_top_k: VECTOR_TOP_K,
        max_sources: MAX_SOURCES,
        vectorize_index: VECTORIZE_INDEX,
        d1_database: D1_DATABASE,
        r2_bucket: R2_BUCKET,
        compatibility_date: COMPAT_DATE,
        astro_output: 'server',
      },
      error: null,
    },
    posts,
  });
};
