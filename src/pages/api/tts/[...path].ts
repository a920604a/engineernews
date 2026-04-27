import type { APIRoute } from 'astro';

const TTS_API_URL = process.env.TTS_API_URL || 'http://localhost:8008';

export const ALL: APIRoute = async ({ request, params, locals }) => {
  const path = params.path;
  const url = new URL(request.url);
  const searchParams = url.searchParams.toString();
  
  // 1. 處理 R2 檔案存取: /api/tts/r2/[filename]
  if (path?.startsWith('r2/')) {
    const key = path.replace('r2/', '');
    const OG_IMAGES = locals.runtime?.env?.OG_IMAGES;
    if (!OG_IMAGES) return new Response('R2 not configured', { status: 500 });

    const object = await OG_IMAGES.get(key);
    if (!object) return new Response('Not found', { status: 404 });

    const ext = key.split('.').pop() ?? '';
    const contentTypeMap: Record<string, string> = {
      mp3: 'audio/mpeg', wav: 'audio/wav', srt: 'text/plain',
    };
    const ct = contentTypeMap[ext] ?? 'application/octet-stream';

    const data = await object.arrayBuffer();
    return new Response(data, {
      headers: {
        'Content-Type': ct,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  // 2. 處理遠端 API 代理: /api/tts/... 與 /api/history/...
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
