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
): Promise<SearchSource[]> {
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

    const sources = await getRelevantSources(DB, VECTORIZE, vector, parsed.lang);
    const prompt = buildPrompt(parsed.query, parsed.lang, sources);
    const answerStream = await AI.run(CHAT_MODEL, {
      prompt,
      stream: true,
    });

    const headers = new Headers();
    headers.set('Content-Type', 'text/event-stream; charset=utf-8');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('x-rag-sources', JSON.stringify(sources));
    headers.set('x-rag-lang', parsed.lang);

    return new Response(answerStream as BodyInit, { headers });
  } catch (error) {
    console.error('Search API Error:', error);
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
