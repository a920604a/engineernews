import type { APIRoute } from 'astro';
import { getPostUrl, type PostLang } from '../../lib/postPaths';
import { createLogger } from '../../lib/logger';

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
  postId?: string;  // 有值時：限定只問這一篇（「問這篇」功能），只用本文 chunks 當 context
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

const EMBEDDING_MODEL = '@cf/baai/bge-m3';
const CHAT_MODEL = '@cf/qwen/qwen1.5-14b-chat-awq';
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
    returnMetadata: 'none',
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
    WHERE d.id IN (${placeholders}) AND p.lang = ?
  `).bind(...ids, lang).all<ChunkRow>();

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
    .map(() => '(lower(p.title) LIKE ? OR lower(d.content) LIKE ? OR lower(p.description) LIKE ? OR lower(p.tldr) LIKE ? OR lower(p.tags) LIKE ?)')
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
    ORDER BY score_rank DESC, p.updated_at DESC, p.created_at DESC
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

// 「問這篇」：抓單篇文章的全部 chunks（依序），組成 context。單篇夠小，整篇塞進去即可。
const ARTICLE_CONTEXT_BUDGET = 7000;

async function getArticleContext(
  db: D1Database,
  postId: string
): Promise<{ title: string; url: string; lang: PostLang; category: string; content: string } | null> {
  const rows = await db.prepare(`
    SELECT d.content, d.chunk_index, p.title, p.category, p.lang
    FROM doc_chunks d
    JOIN posts p ON p.id = d.source_id
    WHERE d.source_id = ?
    ORDER BY d.chunk_index ASC
  `).bind(postId).all<{ content: string; chunk_index: number; title: string; category: string; lang: PostLang }>();

  const results = rows.results ?? [];
  if (results.length === 0) return null;

  let content = '';
  for (const row of results) {
    if (content.length >= ARTICLE_CONTEXT_BUDGET) break;
    content += row.content + '\n\n';
  }

  const first = results[0];
  return {
    title: first.title,
    url: getPostUrl(postId, first.lang),
    lang: first.lang,
    category: first.category,
    content: content.slice(0, ARTICLE_CONTEXT_BUDGET).trim(),
  };
}

function buildArticlePrompt(query: string, lang: PostLang, article: { title: string; content: string }) {
  const answerLang = lang === 'en' ? 'English' : 'Traditional Chinese (Taiwan)';
  return `You are an assistant that answers questions about ONE specific article.

Rules:
- Answer in ${answerLang}.
- Use ONLY the content of the article below. Do not use outside knowledge.
- If the article does not contain the answer, say so plainly (e.g. "這篇文章沒有提到這個" / "The article doesn't cover this") and, if helpful, point to the closest related point it does make.
- Be concise and practical. Lead with a direct answer.

Article title: ${article.title}

Article content:
${article.content}

Question:
${query}`;
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

async function writeLog(
  db: D1Database,
  log: { query: string; lang: string; vectorHits: number; keywordHits: number; llmOk: boolean; error?: string; durationMs: number }
): Promise<number | null> {
  try {
    const result = await db.prepare(
      `INSERT INTO search_logs (query, lang, vector_hits, keyword_hits, llm_ok, error, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
    ).bind(log.query, log.lang, log.vectorHits, log.keywordHits, log.llmOk ? 1 : 0, log.error ?? null, log.durationMs).first<{ id: number }>();
    return result?.id ?? null;
  } catch {
    return null;
  }
}

async function writeTrace(
  db: D1Database,
  logId: number,
  llmAnswer: string,
  sources: SearchSource[]
): Promise<void> {
  try {
    await db.prepare(
      `UPDATE search_logs SET llm_answer = ?, sources_json = ? WHERE id = ?`
    ).bind(llmAnswer, JSON.stringify(sources), logId).run();
  } catch {
    // non-critical, ignore
  }
}

function parseSseChunk(chunk: Uint8Array): string {
  const text = new TextDecoder().decode(chunk);
  let result = '';
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (!data || data === '[DONE]') continue;
    try {
      const parsed = JSON.parse(data);
      const content = parsed?.response ?? parsed?.choices?.[0]?.delta?.content ?? '';
      if (content) result += content;
    } catch { /* ignore */ }
  }
  return result;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const { AI, VECTORIZE, DB } = locals.runtime.env;
  const ctx = locals.runtime.ctx;
  const log = createLogger(DB, 'api/search');
  const body = (await request.json()) as SearchBody;
  const parsed = parseBody(body);

  if (!parsed) {
    return new Response(JSON.stringify({ error: 'Missing query' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const t0 = Date.now();
  let vectorHits = 0;
  let keywordHits = 0;
  let llmOk = false;

  // ── 「問這篇」：限定單篇，只用本文 chunks 當 context，跳過全站向量檢索 ──
  if (typeof body.postId === 'string' && body.postId.trim()) {
    const postId = body.postId.trim();
    try {
      log.info('ask-this-post started', { postId, query: parsed.query });
      const article = await getArticleContext(DB, postId);

      if (!article) {
        const msg = parsed.lang === 'en'
          ? "This article isn't indexed yet, so I can't answer questions about it."
          : '這篇文章還沒被索引，暫時無法針對它回答。';
        return new Response(msg, {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
        });
      }

      const source: SearchSource = {
        citation: 1, postId, title: article.title, url: article.url,
        excerpt: truncate(article.content, 220), score: 1,
        lang: article.lang, category: article.category, chunkId: postId,
      };
      const prompt = buildArticlePrompt(parsed.query, parsed.lang, article);
      const answerStream = await AI.run(CHAT_MODEL, {
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });

      const headers = new Headers();
      headers.set('Content-Type', 'text/event-stream; charset=utf-8');
      headers.set('Cache-Control', 'no-cache, no-transform');
      headers.set('x-rag-sources', JSON.stringify([source]));
      headers.set('x-rag-lang', parsed.lang);
      return new Response(answerStream as BodyInit, { headers });
    } catch (error) {
      log.error('ask-this-post failed', error);
      const msg = parsed.lang === 'en'
        ? 'Sorry, something went wrong answering that. Please try again.'
        : '抱歉，回答時出了點問題，請再試一次。';
      return new Response(msg, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' },
      });
    }
  }

  try {
    log.info('search started', { query: parsed.query, lang: parsed.lang });

    const embeddingResponse = await AI.run(EMBEDDING_MODEL, { text: parsed.query });
    const vector = embeddingResponse.data[0];

    let sources = await getRelevantSources(DB, VECTORIZE, vector, parsed.lang);
    vectorHits = sources.length;
    log.debug('vector search', { hits: vectorHits });

    if (sources.length === 0) {
      sources = await getKeywordSources(DB, parsed.query, parsed.lang);
      keywordHits = sources.length;
      log.debug('keyword fallback', { hits: keywordHits });
    }

    const prompt = buildPrompt(parsed.query, parsed.lang, sources);
    let answerStream: BodyInit;
    let contentType: string;

    try {
      answerStream = await AI.run(CHAT_MODEL, {
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });
      llmOk = true;
      contentType = 'text/event-stream; charset=utf-8';
    } catch (chatError) {
      log.error('Workers AI chat failed', chatError);
      answerStream = buildFallbackAnswer(parsed.query, sources, parsed.lang);
      contentType = 'text/plain; charset=utf-8';
    }

    const durationMs = Date.now() - t0;
    log.info('search done', { vectorHits, keywordHits, llmOk, durationMs });

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('x-rag-sources', JSON.stringify(sources));
    headers.set('x-rag-lang', parsed.lang);

    // For SSE streams: tee to capture trace; for fallback text: skip trace
    if (llmOk && answerStream instanceof ReadableStream) {
      const [clientStream, traceStream] = (answerStream as ReadableStream<Uint8Array>).tee();

      ctx.waitUntil((async () => {
        const logId = await writeLog(DB, { query: parsed.query, lang: parsed.lang, vectorHits, keywordHits, llmOk, durationMs });
        if (logId === null) return;

        const reader = traceStream.getReader();
        let accumulated = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += parseSseChunk(value);
          }
        } catch { /* stream cancelled — no trace */ return; }
        finally { reader.releaseLock(); }

        if (accumulated) {
          await writeTrace(DB, logId, accumulated, sources);
        }
      })());

      return new Response(clientStream, { headers });
    }

    // Fallback (plain text or AI error): log without trace
    void writeLog(DB, { query: parsed.query, lang: parsed.lang, vectorHits, keywordHits, llmOk, durationMs });
    return new Response(answerStream as BodyInit, { headers });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error('search failed', errMsg);
    void writeLog(DB, { query: parsed.query, lang: parsed.lang, vectorHits, keywordHits, llmOk, error: errMsg, durationMs: Date.now() - t0 });

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
