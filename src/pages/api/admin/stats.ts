import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

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

type ContentStats = {
  draft_true: number;
  draft_false: number;
  published_with_audio: number;
};

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

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
         ORDER BY last_updated DESC`
      ).all<{ source_id: string; title: string; category: string; lang: string; chunk_count: number; last_updated: string }>();
      return rows.results;
    });
    return Response.json(result);
  }

  if (view === 'page-views') {
    const result = await safe(async () => {
      const rows = await env.DB.prepare(
        `SELECT pv.slug, pv.count, pv.updated_at, p.title,
                SUM(CASE WHEN r.emoji = '❤️' THEN 1 ELSE 0 END) AS r_heart,
                SUM(CASE WHEN r.emoji = '👍' THEN 1 ELSE 0 END) AS r_thumb,
                SUM(CASE WHEN r.emoji = '💡' THEN 1 ELSE 0 END) AS r_idea,
                SUM(CASE WHEN r.emoji = '🔥' THEN 1 ELSE 0 END) AS r_fire,
                COUNT(r.id) AS r_total
         FROM page_views pv
         LEFT JOIN post_reactions r ON r.post_slug = pv.slug
         LEFT JOIN posts p ON p.id = pv.slug
         GROUP BY pv.slug
         ORDER BY r_total DESC, pv.count DESC
         LIMIT 60`
      ).all<{ slug: string; count: number; updated_at: string; title: string | null; r_heart: number; r_thumb: number; r_idea: number; r_fire: number; r_total: number }>();
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
    const limit = clampInt(url.searchParams.get('limit'), 50, 10, 100);
    const offset = clampInt(url.searchParams.get('offset'), 0, 0, 100000);
    const result = await safe(async () => {
      let whereSql = '';
      const conditions: string[] = [];
      const bindings: (string | number)[] = [];
      if (source) { conditions.push('source = ?'); bindings.push(source); }
      if (level)  { conditions.push('level = ?');  bindings.push(level); }
      if (conditions.length) whereSql = ` WHERE ${conditions.join(' AND ')}`;

      const totalRow = await env.DB.prepare(`SELECT COUNT(*) as count FROM logs${whereSql}`)
        .bind(...bindings)
        .first<{ count: number }>();

      const rows = await env.DB.prepare(
        `SELECT id, level, source, message, data, created_at
         FROM logs${whereSql}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      ).bind(...bindings, limit, offset)
        .all<{ id: number; level: string; source: string; message: string; data: string | null; created_at: string }>();

      return {
        rows: rows.results,
        total: totalRow?.count ?? 0,
        limit,
        offset,
      };
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

  if (view === 'settings') {
    if (request.method === 'POST') {
      const result = await safe(async () => {
        const body = await request.json() as Record<string, string>;
        const statements = Object.entries(body).map(([key, value]) => 
          env.DB.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now")) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').bind(key, value)
        );
        await env.DB.batch(statements);
        return { success: true };
      });
      return Response.json(result);
    } else {
      const result = await safe(async () => {
        const rows = await env.DB.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
        const settings: Record<string, string> = {};
        for (const row of rows.results) {
          settings[row.key] = row.value;
        }
        return settings;
      });
      return Response.json(result);
    }
  }

  // ── Overview (single batched call for main dashboard) ─────────────────────

  const [d1Result, r2Result, postsResult, contentStatsResult, vectorizeResult] = await Promise.allSettled([
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
    safe(async (): Promise<ContentStats> => {
      const posts = await getCollection('posts');
      return posts.reduce(
        (stats, post) => {
          if (post.data.draft === true) {
            stats.draft_true += 1;
          } else {
            stats.draft_false += 1;
            if (typeof post.data.audio_url === 'string' && post.data.audio_url.trim().length > 0) {
              stats.published_with_audio += 1;
            }
          }
          return stats;
        },
        { draft_true: 0, draft_false: 0, published_with_audio: 0 }
      );
    }),
    // Actual Vectorize index stats (real vector count, for drift detection)
    safe(async () => {
      const desc = await (env.VECTORIZE as unknown as { describe: () => Promise<Record<string, unknown>> }).describe();
      const vectorCount = (desc.vectorCount ?? desc.vectorsCount ?? desc.count) as number | undefined;
      return {
        vector_count: typeof vectorCount === 'number' ? vectorCount : null,
        processed_up_to: (desc.processedUpToDatetime ?? null) as string | null,
      };
    }),
  ]);

  const settle = <T>(r: PromiseSettledResult<SafeResult<T>>): SafeResult<T> =>
    r.status === 'fulfilled' ? r.value : { data: null, error: (r.reason as Error)?.message ?? 'unknown' };

  const d1 = settle(d1Result);
  const r2 = settle(r2Result);
  const posts = settle(postsResult);
  const content_stats = settle(contentStatsResult);
  const vecIndex = settle(vectorizeResult);

  // Coverage: a post with 0 chunks is NOT represented in Vectorize.
  const postRows = posts.data ?? [];
  const uncovered = postRows.filter(p => Number(p.chunk_count) === 0);
  const coverage = {
    total_posts: postRows.length,
    covered: postRows.length - uncovered.length,
    uncovered: uncovered.length,
    uncovered_posts: uncovered.slice(0, 50).map(p => ({ id: p.id, title: p.title, lang: p.lang })),
  };
  const chunkCount = d1.data?.doc_chunks ?? null;
  const vectorCount = vecIndex.data?.vector_count ?? null;

  return Response.json({
    d1,
    r2,
    vectorize: {
      data: {
        chunk_count: chunkCount,
        vector_count: vectorCount,
        // >0 → orphan vectors in Vectorize; <0 → chunks missing from Vectorize
        drift: (typeof vectorCount === 'number' && typeof chunkCount === 'number') ? vectorCount - chunkCount : null,
        processed_up_to: vecIndex.data?.processed_up_to ?? null,
        coverage,
        embedding_model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMS,
        index_name: VECTORIZE_INDEX,
        metadata_indexes: ['lang'],
      },
      error: vecIndex.error ?? d1.error,
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
    content_stats,
  });
};
export const POST = GET;
