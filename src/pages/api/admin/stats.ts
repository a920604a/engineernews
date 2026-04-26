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

export const GET: APIRoute = async ({ request, locals }) => {
  const { DB, OG_IMAGES, ADMIN_TOKEN } = locals.runtime.env as {
    DB: D1Database;
    OG_IMAGES: R2Bucket;
    ADMIN_TOKEN?: string;
    [key: string]: unknown;
  };

  if (!ADMIN_TOKEN) {
    return Response.json({ error: 'Admin not configured' }, { status: 401 });
  }

  const token = new URL(request.url).searchParams.get('token');
  if (token !== ADMIN_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [d1Result, r2Result, postsResult] = await Promise.allSettled([
    safe(async () => {
      const [counts, langDist] = await Promise.all([
        DB.batch([
          DB.prepare('SELECT COUNT(*) as count FROM posts'),
          DB.prepare('SELECT COUNT(*) as count FROM doc_chunks'),
          DB.prepare('SELECT COUNT(*) as count FROM projects'),
          DB.prepare('SELECT COUNT(*) as count FROM page_views'),
        ]),
        DB.prepare(`SELECT lang, COUNT(*) as count FROM posts GROUP BY lang`).all<{ lang: string; count: number }>(),
      ]);
      return {
        posts: (counts[0].results[0] as { count: number }).count,
        doc_chunks: (counts[1].results[0] as { count: number }).count,
        projects: (counts[2].results[0] as { count: number }).count,
        page_views: (counts[3].results[0] as { count: number }).count,
        lang_distribution: langDist.results,
      };
    }),
    safe(async () => {
      const list = await OG_IMAGES.list({ limit: 1000 });
      return {
        count: list.objects.length,
        truncated: list.truncated,
      };
    }),
    safe(async () => {
      const rows = await DB.prepare(
        `SELECT p.id, p.title, p.category, p.lang, p.created_at, p.updated_at,
                COUNT(d.id) as chunk_count
         FROM posts p
         LEFT JOIN doc_chunks d ON d.source_id = p.id AND d.source_type = 'post'
         GROUP BY p.id
         ORDER BY p.created_at DESC`
      ).all<{
        id: string;
        title: string;
        category: string;
        lang: string;
        created_at: string;
        updated_at: string;
        chunk_count: number;
      }>();
      return rows.results;
    }),
  ]);

  const settle = <T>(r: PromiseSettledResult<SafeResult<T>>) =>
    r.status === 'fulfilled' ? r.value : { data: null, error: (r.reason as Error)?.message ?? 'unknown' };

  const d1 = settle(d1Result);
  const r2 = settle(r2Result);
  const posts = settle(postsResult);

  const vectorize = {
    data: {
      chunk_count: d1.data?.doc_chunks ?? null,
      embedding_model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMS,
      index_name: VECTORIZE_INDEX,
    },
    error: d1.error,
  };

  const config = {
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
  };

  return Response.json({ d1, r2, vectorize, config, posts });
};
