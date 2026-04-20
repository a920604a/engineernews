import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const { AI, VECTORIZE, DB } = locals.runtime.env;
  const { query } = await request.json();

  if (!query) {
    return new Response(JSON.stringify({ error: 'Missing query' }), { status: 400 });
  }

  try {
    // 1. 將用戶的問題轉換為向量 (Embedding)
    const embeddingResponse = await AI.run('@cf/baai/bge-small-en-v1.5', {
      text: query,
    });
    const vector = embeddingResponse.data[0];

    // 2. 在 Vectorize 中搜尋語義最接近的文章片段
    const matches = await VECTORIZE.query(vector, {
      topK: 5,
      returnValues: false,
      returnMetadata: true,
    });

    // 3. 整理結果並從 D1 補齊文章資訊（如果需要更詳細內容）
    const results = matches.matches.map((match) => ({
      score: match.score,
      postId: match.metadata?.post_id,
      slug: match.metadata?.slug,
      title: match.metadata?.title,
      // 片段內容可以從 D1 的 post_chunks 抓取，這裡先回傳元數據
    }));

    return new Response(JSON.stringify({ results }));
  } catch (e) {
    console.error('Search API Error:', e);
    return new Response(JSON.stringify({ error: 'Search failed' }), { status: 500 });
  }
};
