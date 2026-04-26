import type { APIRoute } from 'astro';
import { getPostUrl, type PostLang } from '../../lib/postPaths';

type SearchSource = {
  citation: number;
  postId: string;
  title: string;
  url: string;
  excerpt: string;
  score: number;
  lang: PostLang;
  category: string;
  chunkId: string;
};

type SearchBody = {
  query?: string;
  lang?: PostLang;
};

type VectorMatch = {
  id?: string;
  score?: number;
};

type ChunkRow = {
  chunk_id: string;
  source_id: string;
  source_type: string;
  chunk_index: number;
  content: string;
  title: string;
  category: string;
  lang: PostLang;
  description?: string | null;
  tldr?: string | null;
};

type SearchResult = {
  citation: number;
  postId: string;
  title: string;
  url: string;
  excerpt: string;
  score: number;
  lang: PostLang;
  category: string;
  chunkId: string;
};

const EMBEDDING_MODEL = '@cf/baai/bge-small-en-v1.5';
const CHAT_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const MAX_MATCHES = 8;
const MAX_SOURCES = 5;

function truncate(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function parseBody(body: SearchBody): { query: string; lang: PostLang } | null {
  const query = (body.query ?? '').trim();
  if (!query) return null;
  const lang = body.lang === 'en' ? 'en' : 'zh-TW';
  return { query, lang };
}

async function getRelevantSources(
  db: D1Database,
  vectorize: VectorizeIndex,
  queryEmbedding: number[],
  lang: PostLang
): Promise<SearchResult[]> {
  const matches = await vectorize.query(queryEmbedding, {
    topK: MAX_MATCHES,
    returnMetadata: false,
    returnValues: false,
  });

  const ids = matches.matches
    .map((match: VectorMatch) => match.id)
    .filter((id): id is string => Boolean(id));

  if (ids.length === 0) {
    return [];
  }

  const placeholders = ids.map(() => '?').join(', ');
  const rows = await db.prepare(`
    SELECT
      d.id AS chunk_id,
      d.source_id,
      d.source_type,
      d.chunk_index,
      d.content,
      p.title,
      p.category,
      p.lang,
      p.description,
      p.tldr
    FROM doc_chunks d
    JOIN posts p ON p.id = d.source_id
    WHERE d.id IN (${placeholders})
  `).bind(...ids).all<ChunkRow>();

  const rowMap = new Map(rows.results.map((row) => [row.chunk_id, row]));
  const scoreMap = new Map<string, number>();
  for (const match of matches.matches) {
    if (match.id && typeof match.score === 'number' && !scoreMap.has(match.id)) {
      scoreMap.set(match.id, match.score);
    }
  }

  const seenSources = new Set<string>();
  const sources: SearchSource[] = [];

  for (const id of ids) {
    const row = rowMap.get(id);
    if (!row) continue;
    if (row.lang !== lang) continue;
    if (seenSources.has(row.source_id)) continue;

    const sourceLang = row.lang;
    const citation = sources.length + 1;
    sources.push({
      citation,
      postId: row.source_id,
      title: row.title,
      url: getPostUrl(row.source_id, sourceLang),
      excerpt: truncate(row.content, 220),
      score: scoreMap.get(id) ?? 0,
      lang: sourceLang,
      category: row.category,
      chunkId: id,
    });
    seenSources.add(row.source_id);

    if (sources.length >= MAX_SOURCES) break;
  }

  return sources;
}

async function getKeywordSources(
  db: D1Database,
  query: string,
  lang: PostLang
): Promise<SearchResult[]> {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .slice(0, 4);

  if (terms.length === 0) {
    terms.push(query.toLowerCase());
  }

  const clauses = terms
    .map(() => '(lower(title) LIKE ? OR lower(content) LIKE ? OR lower(description) LIKE ? OR lower(tldr) LIKE ? OR lower(tags) LIKE ?)')
    .join(' OR ');

  const bindings = terms.flatMap((term) => {
    const pattern = `%${term}%`;
    return [pattern, pattern, pattern, pattern, pattern];
  });

  const rows = await db.prepare(`
    SELECT
      d.id AS chunk_id,
      d.source_id,
      d.source_type,
      d.chunk_index,
      d.content,
      p.title,
      p.category,
      p.lang,
      p.description,
      p.tldr,
      CASE
        WHEN lower(p.title) LIKE ? THEN 5
        WHEN lower(p.tldr) LIKE ? THEN 4
        WHEN lower(p.description) LIKE ? THEN 3
        WHEN lower(d.content) LIKE ? THEN 2
        ELSE 1
      END AS score_rank
    FROM doc_chunks d
    JOIN posts p ON p.id = d.source_id
    WHERE p.lang = ? AND (${clauses})
    GROUP BY d.source_id
    ORDER BY score_rank DESC, p.updated_at DESC, p.date DESC
    LIMIT 8
  `).bind(
    `%${query.toLowerCase()}%`,
    `%${query.toLowerCase()}%`,
    `%${query.toLowerCase()}%`,
    `%${query.toLowerCase()}%`,
    lang,
    ...bindings
  ).all<ChunkRow & { score_rank: number }>();

  const resultRows = rows.results ?? [];
  const sources: SearchResult[] = [];

  for (const row of resultRows) {
    const citation = sources.length + 1;
    sources.push({
      citation,
      postId: row.source_id,
      title: row.title,
      url: getPostUrl(row.source_id, row.lang),
      excerpt: truncate(row.content, 220),
      score: Math.max(0.2, Math.min(1, (row.score_rank ?? 1) / 5)),
      lang: row.lang,
      category: row.category,
      chunkId: row.chunk_id,
    });
  }

  return sources;
}

function buildFallbackAnswer(query: string, sources: SearchResult[], lang: PostLang) {
  if (sources.length === 0) {
    return lang === 'en'
      ? `No relevant results were found for "${query}".`
      : `沒有找到「${query}」的相關結果。`;
  }

  const lead = lang === 'en'
    ? `I found ${sources.length} related article(s) for "${query}".`
    : `我找到 ${sources.length} 篇和「${query}」相關的文章：`;
  const bullets = sources.map((source) => `- [${source.citation}] ${source.title}`);
  return [lead, ...bullets].join('\n');
}

function buildPrompt(query: string, lang: PostLang, sources: SearchSource[]) {
  const answerLang = lang === 'en' ? 'English' : 'Traditional Chinese (Taiwan)';
  const context = sources.length > 0
    ? sources.map((source) => {
        return [
          `[${source.citation}] ${source.title}`,
          `URL: ${source.url}`,
          `Category: ${source.category}`,
          `Excerpt: ${source.excerpt}`,
        ].join('\n');
      }).join('\n\n')
    : 'No relevant context was found in the article corpus.';

  return `You are Engineer News' retrieval-augmented search assistant.

Rules:
- Answer in ${answerLang}.
- Use only the provided context.
- Cite every factual claim with inline citations like [1] or [2].
- If the context is insufficient, say so clearly instead of guessing.
- Prefer concise, practical answers with a clear summary first.

Context:
${context}

Question:
${query}`;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const { AI, VECTORIZE, DB } = locals.runtime.env;
  const body = (await request.json()) as SearchBody;
  const parsed = parseBody(body);

  if (!parsed) {
    return new Response(JSON.stringify({ error: 'Missing query' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const embeddingResponse = await AI.run(EMBEDDING_MODEL, {
      text: parsed.query,
    });
    const vector = embeddingResponse.data[0];

    let sources = await getRelevantSources(DB, VECTORIZE, vector, parsed.lang);
    if (sources.length === 0) {
      sources = await getKeywordSources(DB, parsed.query, parsed.lang);
    }
    const prompt = buildPrompt(parsed.query, parsed.lang, sources);
    let answerStream: BodyInit;

    try {
      answerStream = await AI.run(CHAT_MODEL, {
        prompt,
        stream: true,
      });
    } catch (chatError) {
      console.error('Workers AI chat failed, using fallback answer:', chatError);
      answerStream = buildFallbackAnswer(parsed.query, sources, parsed.lang);
    }

    const headers = new Headers();
    headers.set('Content-Type', typeof answerStream === 'string'
      ? 'text/plain; charset=utf-8'
      : 'text/event-stream; charset=utf-8');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('x-rag-sources', JSON.stringify(sources));
    headers.set('x-rag-lang', parsed.lang);

    return new Response(answerStream as BodyInit, { headers });
  } catch (error) {
    console.error('Search API Error:', error);
    const fallback = buildFallbackAnswer(parsed.query, [], parsed.lang);
    return new Response(fallback, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'x-rag-sources': '[]',
        'x-rag-lang': parsed.lang,
      },
    });
  }
};
