import type { APIRoute } from 'astro';

type D1 = { prepare: (sql: string) => { bind: (...args: any[]) => { run: () => Promise<any> } } };

function log(db: D1 | undefined, level: 'info' | 'warn' | 'error', message: string) {
  db?.prepare('INSERT INTO logs (level, source, message, created_at) VALUES (?, ?, ?, datetime("now"))')
    .bind(level, 'tts/cache', message).run().catch(() => {});
}

export const POST: APIRoute = async ({ request, locals }) => {
  const OG_IMAGES = locals.runtime?.env?.OG_IMAGES;
  const db = locals.runtime?.env?.DB as D1 | undefined;

  if (!OG_IMAGES) {
    log(db, 'error', 'R2 not configured');
    return new Response(JSON.stringify({ error: 'R2 not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const contentType = request.headers.get('content-type') ?? '';

  // Mode 1: upload pre-synthesized audio binary directly
  if (contentType.includes('audio/')) {
    const slug = new URL(request.url).searchParams.get('slug');
    const filename = slug ? `${slug}.wav` : `${Date.now()}.wav`;
    const key = `tts/${filename}`;

    const existing = await OG_IMAGES.head(key);
    if (existing) {
      log(db, 'info', `cache hit (R2 already exists): ${key}`);
      return new Response(
        JSON.stringify({ audio_url: `/api/tts/r2/${key}`, srt_url: '' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await request.arrayBuffer();
    await OG_IMAGES.put(key, audioBuffer, { httpMetadata: { contentType } });
    log(db, 'info', `uploaded binary to R2: ${key} (${audioBuffer.byteLength} bytes)`);
    return new Response(
      JSON.stringify({ audio_url: `/api/tts/r2/${key}`, srt_url: '' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Mode 2: synthesize via TTS API then store to R2
  let body: { text: string; voice?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { text, voice, slug } = body;
  if (!text) {
    return new Response(JSON.stringify({ error: 'text is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const TTS_API_URL = (locals.runtime?.env?.TTS_API_URL as string | undefined) || 'http://localhost:8008';
  log(db, 'info', `synthesize start: slug=${slug ?? 'unknown'} voice=${voice ?? 'default'} textLen=${text.length}`);

  let synthesizeRes: Response;
  try {
    synthesizeRes = await fetch(`${TTS_API_URL}/api/tts/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
  } catch (e) {
    log(db, 'error', `TTS API unreachable: ${String(e)}`);
    return new Response(JSON.stringify({ error: 'TTS API unreachable', detail: String(e) }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!synthesizeRes.ok) {
    const err = await synthesizeRes.json().catch(() => ({})) as any;
    log(db, 'error', `TTS synthesis failed: ${synthesizeRes.status} ${err.detail ?? synthesizeRes.statusText}`);
    return new Response(JSON.stringify({ error: 'TTS synthesis failed', detail: err.detail ?? synthesizeRes.statusText }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ttsResult = await synthesizeRes.json() as { audio_url: string; srt_url: string };
  log(db, 'info', `synthesize done: ${ttsResult.audio_url}`);

  const apiBase = TTS_API_URL.replace(/\/$/, '');
  const originalFilename = ttsResult.audio_url.split('/').pop()!;
  const audioFilename = slug ? `${slug}.wav` : originalFilename;
  const r2AudioKey = `tts/${audioFilename}`;

  const audioRes = await fetch(`${apiBase}${ttsResult.audio_url}`);
  if (!audioRes.ok) {
    log(db, 'error', `failed to download audio from TTS server: ${audioRes.status}`);
    return new Response(JSON.stringify({ error: 'Failed to download audio from TTS API' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const audioBuffer = await audioRes.arrayBuffer();
  await OG_IMAGES.put(r2AudioKey, audioBuffer, { httpMetadata: { contentType: 'audio/wav' } });
  log(db, 'info', `uploaded to R2: ${r2AudioKey} (${audioBuffer.byteLength} bytes)`);

  return new Response(
    JSON.stringify({ audio_url: `/api/tts/r2/${r2AudioKey}`, srt_url: '' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
