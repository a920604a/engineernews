import { useState, useEffect } from 'react';
import { getVisitorId } from '../lib/visitor';

const EMOJIS = ['❤️', '👍', '💡', '🔥'] as const;
type Emoji = typeof EMOJIS[number];

interface Props {
  slug: string;
  isBookmarked?: boolean;
}

export function InteractionBar({ slug, isBookmarked: initialBookmarked = false }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>(Object.fromEntries(EMOJIS.map(e => [e, 0])));
  const [mine, setMine] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState<string | null>(null);

  useEffect(() => {
    const visitorId = getVisitorId();
    fetch(`/api/reactions?slug=${encodeURIComponent(slug)}`, {
      headers: { 'X-Visitor-ID': visitorId },
    })
      .then(r => r.json())
      .then(({ counts: c, mine: m }) => { setCounts(c); setMine(m); setLoading(false); })
      .catch(() => setLoading(false));

    fetch('/api/bookmarks', { headers: { 'X-Visitor-ID': visitorId } })
      .then(r => r.json())
      .then(({ slugs }: { slugs: string[] }) => setBookmarked(slugs.includes(slug)))
      .catch(() => {});
  }, [slug]);

  async function handleReaction(emoji: Emoji) {
    const visitorId = getVisitorId();
    const prevCounts = { ...counts };
    const prevMine = mine;
    const removing = mine === emoji;
    setCounts(c => ({ ...c, [emoji]: c[emoji] + (removing ? -1 : 1), ...(mine && mine !== emoji ? { [mine]: c[mine] - 1 } : {}) }));
    setMine(removing ? null : emoji);
    setAnimating(emoji);
    setTimeout(() => setAnimating(null), 400);

    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Visitor-ID': visitorId },
        body: JSON.stringify({ slug, emoji }),
      });
      const data = await res.json();
      setCounts(data.counts);
      setMine(data.mine);
    } catch {
      setCounts(prevCounts);
      setMine(prevMine);
    }
  }

  async function handleBookmark() {
    const visitorId = getVisitorId();
    const prev = bookmarked;
    setBookmarked(!bookmarked);
    try {
      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Visitor-ID': visitorId },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      setBookmarked(data.bookmarked);
    } catch {
      setBookmarked(prev);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', gap: '8px', padding: '16px 0', opacity: 0.4 }}>
        {EMOJIS.map(e => <div key={e} style={{ width: '64px', height: '36px', borderRadius: '18px', background: 'var(--bg-secondary)' }} />)}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 0', flexWrap: 'wrap' }}>
      {EMOJIS.map(emoji => (
        <button
          key={emoji}
          onClick={() => handleReaction(emoji)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '18px', border: '0.5px solid',
            borderColor: mine === emoji ? 'var(--accent)' : 'var(--separator)',
            background: mine === emoji ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--bg-secondary)',
            color: 'var(--label)', cursor: 'pointer', fontSize: '15px', fontVariantNumeric: 'tabular-nums',
            transition: 'all 0.15s ease',
            transform: animating === emoji ? 'scale(1.2)' : 'scale(1)',
          }}
        >
          <span>{emoji}</span>
          <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>{counts[emoji]}</span>
        </button>
      ))}
      <button
        onClick={handleBookmark}
        title={bookmarked ? '移除書籤' : '加入書籤'}
        style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 14px', borderRadius: '18px', border: '0.5px solid',
          borderColor: bookmarked ? 'var(--accent)' : 'var(--separator)',
          background: bookmarked ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--bg-secondary)',
          color: bookmarked ? 'var(--accent)' : 'var(--label-secondary)',
          cursor: 'pointer', fontSize: '14px',
          transition: 'all 0.2s ease',
        }}
      >
        <span style={{ fontSize: '16px' }}>🔖</span>
        <span>{bookmarked ? '已書籤' : '書籤'}</span>
      </button>
    </div>
  );
}
