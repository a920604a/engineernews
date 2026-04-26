import type { APIRoute } from 'astro';

const TTS_API_URL = process.env.TTS_API_URL || 'http://localhost:8008';

export const ALL: APIRoute = async ({ request, params }) => {
  const path = params.path;
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  
  // 支援 /api/tts/... 與 /api/history/...
  const isHistory = path?.startsWith('history');
  const targetUrl = isHistory 
    ? `${TTS_API_URL}/api/${path}${searchParams ? '?' + searchParams : ''}`
    : `${TTS_API_URL}/api/tts/${path}${searchParams ? '?' + searchParams : ''}`;

  try {
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('referer');

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined,
      redirect: 'follow',
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`TTS Proxy Error (${targetUrl}):`, error);
    return new Response(JSON.stringify({ detail: 'TTS Proxy Error', error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
