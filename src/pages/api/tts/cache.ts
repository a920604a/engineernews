import type { APIRoute } from 'astro';

type D1 = { prepare: (sql: string) => { bind: (...args: any[]) => { run: () => Promise<any> } } };

function log(db: D1 | undefined, level: 'info' | 'warn' | 'error', message: string) {
  db?.prepare('INSERT INTO logs (level, source, message, created_at) VALUES (?, ?, ?, datetime("now"))')
    .bind(level, 'tts/cache', message).run().catch(() => {});
}

async function checkEdgeTTSHealth(baseUrl: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${baseUrl}/api/tts/voices`, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function synthesizeCFAI(
  ai: any,
  text: string,
  lang: string
): Promise<ArrayBuffer> {
  const isEnglish = lang === 'en' || lang.startsWith('en-');
  const model = isEnglish ? '@cf/deepgram/aura-2-en' : '@cf/myshell-ai/melotts';
  const params = isEnglish
    ? { text, encoding: 'mp3' }
    : { prompt: text, lang: 'zh' };

  const result = await ai.run(model, params);

  if (result instanceof ArrayBuffer) return result;
  if (result?.audio && typeof result.audio === 'string') {
    const bin = atob(result.audio);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }
  throw new Error('Unexpected CF AI response format');
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

  // Mode 2: synthesize then store to R2 (Edge TTS with CF AI fallback)
  let body: { text: string; voice?: string; slug?: string; lang?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { text, voice, slug, lang = 'zh' } = body;
  if (!text) {
    return new Response(JSON.stringify({ error: 'text is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const TTS_API_URL = (locals.runtime?.env?.TTS_API_URL as string | undefined) || 'http://localhost:8008';
  log(db, 'info', `synthesize start: slug=${slug ?? 'unknown'} lang=${lang} textLen=${text.length}`);

  const edgeHealthy = await checkEdgeTTSHealth(TTS_API_URL);

  if (edgeHealthy) {
    // Edge TTS path (existing flow)
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
    log(db, 'info', `edge tts synthesize done: ${ttsResult.audio_url}`);

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
  }

  // CF AI fallback path
  const ai = locals.runtime?.env?.AI;
  if (!ai) {
    log(db, 'error', 'Edge TTS unavailable and AI binding not configured');
    return new Response(JSON.stringify({ error: 'TTS service unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    log(db, 'info', `cf ai fallback: lang=${lang}`);
    const audioBuffer = await synthesizeCFAI(ai, text, lang);
    const r2Key = `tts/${slug ?? Date.now()}.mp3`;
    await OG_IMAGES.put(r2Key, audioBuffer, { httpMetadata: { contentType: 'audio/mpeg' } });
    log(db, 'info', `cf ai uploaded to R2: ${r2Key} (${audioBuffer.byteLength} bytes)`);

    return new Response(
      JSON.stringify({ audio_url: `/api/tts/r2/${r2Key}`, srt_url: '' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    log(db, 'error', `CF AI synthesis failed: ${String(e)}`);
    return new Response(JSON.stringify({ error: 'TTS synthesis failed', detail: String(e) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
