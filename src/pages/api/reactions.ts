import type { APIRoute } from 'astro';

const EMOJIS = ['❤️', '👍', '💡', '🔥'] as const;
type Emoji = typeof EMOJIS[number];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return json({ counts: {}, mine: null });

  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) return json({ error: 'Missing slug' }, 400);

  const visitorId = request.headers.get('X-Visitor-ID') ?? '';

  const rows = await DB.prepare(
    'SELECT emoji, COUNT(*) as count FROM post_reactions WHERE post_slug = ? GROUP BY emoji'
  ).bind(slug).all<{ emoji: string; count: number }>();

  const counts: Record<string, number> = Object.fromEntries(EMOJIS.map(e => [e, 0]));
  for (const row of rows.results) counts[row.emoji] = row.count;

  let mine: string | null = null;
  if (visitorId) {
    const existing = await DB.prepare(
      'SELECT emoji FROM post_reactions WHERE post_slug = ? AND visitor_id = ?'
    ).bind(slug, visitorId).first<{ emoji: string }>();
    mine = existing?.emoji ?? null;
  }

  return json({ counts, mine });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return json({ error: 'DB unavailable' }, 503);

  const visitorId = request.headers.get('X-Visitor-ID');
  if (!visitorId) return json({ error: 'Missing X-Visitor-ID' }, 400);

  const body = await request.json() as { slug?: string; emoji?: string };
  const { slug, emoji } = body;
  if (!slug || !emoji) return json({ error: 'Missing slug or emoji' }, 400);
  if (!(EMOJIS as readonly string[]).includes(emoji)) return json({ error: 'Invalid emoji' }, 400);

  const existing = await DB.prepare(
    'SELECT emoji FROM post_reactions WHERE post_slug = ? AND visitor_id = ?'
  ).bind(slug, visitorId).first<{ emoji: string }>();

  if (existing?.emoji === emoji) {
    await DB.prepare(
      'DELETE FROM post_reactions WHERE post_slug = ? AND visitor_id = ?'
    ).bind(slug, visitorId).run();
  } else {
    await DB.prepare(
      'INSERT OR REPLACE INTO post_reactions (post_slug, visitor_id, emoji) VALUES (?, ?, ?)'
    ).bind(slug, visitorId, emoji).run();
  }

  const rows = await DB.prepare(
    'SELECT emoji, COUNT(*) as count FROM post_reactions WHERE post_slug = ? GROUP BY emoji'
  ).bind(slug).all<{ emoji: string; count: number }>();

  const counts: Record<string, number> = Object.fromEntries(EMOJIS.map(e => [e, 0]));
  for (const row of rows.results) counts[row.emoji] = row.count;

  const mine = existing?.emoji === emoji
    ? null
    : emoji;

  return json({ counts, mine });
};
