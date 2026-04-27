import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  const OG_IMAGES = locals.runtime?.env?.OG_IMAGES;
  if (!OG_IMAGES) {
    return new Response(JSON.stringify({ error: 'R2 not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contentType = request.headers.get('content-type') ?? '';

  // Mode 1: upload pre-synthesized audio binary directly
  if (contentType.includes('audio/')) {
    const ext = contentType.includes('mpeg') ? 'mp3' : 'wav';
    const slug = new URL(request.url).searchParams.get('slug');
    const filename = slug ? `${slug}.${ext}` : `${Date.now()}.${ext}`;
    const key = `tts/${filename}`;

    // Return existing R2 file if already cached
    const existing = await OG_IMAGES.head(key);
    if (existing) {
      return new Response(
        JSON.stringify({ audio_url: `/api/tts/r2/${key}`, srt_url: '' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await request.arrayBuffer();
    await OG_IMAGES.put(key, audioBuffer, {
      httpMetadata: { contentType },
    });
    return new Response(
      JSON.stringify({ audio_url: `/api/tts/r2/${key}`, srt_url: '' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Mode 2: synthesize via TTS API then store to R2
  let body: { text: string; voice?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { text, voice } = body;
  if (!text) {
    return new Response(JSON.stringify({ error: 'text is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const TTS_API_URL = (locals.runtime?.env?.TTS_API_URL as string | undefined) || 'http://localhost:8008';

  let synthesizeRes: Response;
  try {
    synthesizeRes = await fetch(`${TTS_API_URL}/api/tts/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'TTS API unreachable', detail: String(e) }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!synthesizeRes.ok) {
    const err = await synthesizeRes.json().catch(() => ({})) as any;
    return new Response(JSON.stringify({ error: 'TTS synthesis failed', detail: err.detail ?? synthesizeRes.statusText }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ttsResult = await synthesizeRes.json() as { audio_url: string; srt_url: string };
  const apiBase = TTS_API_URL.replace(/\/$/, '');

  const audioFilename = ttsResult.audio_url.split('/').pop()!;
  const r2AudioKey = `tts/${audioFilename}`;

  const audioRes = await fetch(`${apiBase}${ttsResult.audio_url}`);
  if (!audioRes.ok) {
    return new Response(JSON.stringify({ error: 'Failed to download audio from TTS API' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await OG_IMAGES.put(r2AudioKey, await audioRes.arrayBuffer(), {
    httpMetadata: { contentType: 'audio/wav' },
  });

  let r2SrtKey = '';
  try {
    const srtFilename = ttsResult.srt_url.split('/').pop()!;
    r2SrtKey = `tts/${srtFilename}`;
    const srtRes = await fetch(`${apiBase}${ttsResult.srt_url}`);
    if (srtRes.ok) {
      await OG_IMAGES.put(r2SrtKey, await srtRes.arrayBuffer(), {
        httpMetadata: { contentType: 'text/plain' },
      });
    }
  } catch {
    // SRT 失敗不影響音檔
  }

  return new Response(
    JSON.stringify({
      audio_url: `/api/tts/r2/${r2AudioKey}`,
      srt_url: r2SrtKey ? `/api/tts/r2/${r2SrtKey}` : '',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
