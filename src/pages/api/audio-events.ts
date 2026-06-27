import type { APIRoute } from 'astro';

type AudioEvent = 'play' | 'progress' | 'complete';
const VALID_EVENTS: AudioEvent[] = ['play', 'progress', 'complete'];
const VALID_MILESTONES = [25, 50, 75];

// POST /api/audio-events
// body: { slug, lang?, event: 'play'|'progress'|'complete', milestone?, session_id? }
// 火後不理（fire-and-forget）：失敗一律回 { ok:true }，不影響播放體驗。
export const POST: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return new Response(JSON.stringify({ ok: false }), { status: 200 });

  try {
    const { slug, lang, event, milestone, session_id } = await request.json();

    if (!slug || !VALID_EVENTS.includes(event)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid payload' }), { status: 400 });
    }
    const safeMilestone =
      event === 'progress' && VALID_MILESTONES.includes(milestone) ? milestone : null;

    await DB.prepare(`
      INSERT INTO audio_events (slug, lang, event, milestone, session_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      slug,
      typeof lang === 'string' ? lang : null,
      event,
      safeMilestone,
      typeof session_id === 'string' ? session_id.slice(0, 64) : null,
    ).run();

    return new Response(JSON.stringify({ ok: true }));
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }
};
