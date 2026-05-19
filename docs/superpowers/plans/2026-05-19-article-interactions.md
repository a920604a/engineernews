# Article Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-article reactions (❤️ 👍 💡 🔥), comments, and bookmarks to Engineer News using anonymous visitor sessions, D1 storage, and new API routes.

**Architecture:** Anonymous visitors get a UUID stored in `localStorage`, sent as `X-Visitor-ID` on every interaction API call. Three new D1 tables (`post_reactions`, `comments`, `bookmarks`) back the three features. Two new React components (`InteractionBar`, `CommentSection`) are injected into the article page above the tags section.

**Tech Stack:** Astro (server output), Cloudflare Workers, D1 (binding `DB`), React 18 (`client:visible`), TypeScript

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `migrations/0009_interactions.sql` | Create | 3 new tables + indexes |
| `src/lib/visitor.ts` | Create | Generate/read visitor UUID from localStorage |
| `src/pages/api/reactions.ts` | Create | GET counts + POST toggle emoji reaction |
| `src/pages/api/comments.ts` | Create | GET list + POST new comment (with rate limit) |
| `src/pages/api/bookmarks.ts` | Create | GET list + POST toggle bookmark |
| `src/pages/api/admin/comments/[id].ts` | Create | PATCH hidden toggle + DELETE for admin moderation |
| `src/components/InteractionBar.tsx` | Create | Reactions row + bookmark button, optimistic UI |
| `src/components/CommentSection.tsx` | Create | Collapsed comment list + submit form |
| `src/pages/bookmarks.astro` | Create | Personal bookmark list page at `/bookmarks` |
| `src/pages/posts/[...slug].astro` | Modify | Import + render InteractionBar and CommentSection |
| `src/components/AdminDashboard.tsx` | Modify | Add 'moderation' tab listing comments with hide/show |

---

## Task 1: Database Migration

**Files:**
- Create: `migrations/0009_interactions.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- migrations/0009_interactions.sql
CREATE TABLE IF NOT EXISTS post_reactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug   TEXT NOT NULL,
  visitor_id  TEXT NOT NULL,
  emoji       TEXT NOT NULL CHECK(emoji IN ('❤️','👍','💡','🔥')),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(post_slug, visitor_id)
);
CREATE INDEX IF NOT EXISTS idx_reactions_slug ON post_reactions(post_slug);

CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug   TEXT NOT NULL,
  visitor_id  TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '匿名',
  author_url  TEXT,
  body        TEXT NOT NULL,
  hidden      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(post_slug);

CREATE TABLE IF NOT EXISTS bookmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id  TEXT NOT NULL,
  post_slug   TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(visitor_id, post_slug)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_visitor ON bookmarks(visitor_id);
```

- [ ] **Step 2: Apply migration to local D1**

Run: `make d1-migrate`
Expected: output shows migration `0009_interactions.sql` applied successfully

- [ ] **Step 3: Verify tables exist**

Run: `npx wrangler d1 execute engineer-news-db --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('post_reactions','comments','bookmarks');"`
Expected: three rows returned

- [ ] **Step 4: Commit**

```bash
git add migrations/0009_interactions.sql
git commit -m "feat(db): add post_reactions, comments, bookmarks tables"
```

---

## Task 2: Visitor Utility

**Files:**
- Create: `src/lib/visitor.ts`

- [ ] **Step 1: Create visitor utility**

```typescript
// src/lib/visitor.ts
const KEY = 'visitor_id';

export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
```

- [ ] **Step 2: Manual smoke test**

Start `make dev`, open browser console on any article page, run:
```js
import('/src/lib/visitor.ts').then(m => console.log(m.getVisitorId()))
```
Expected: a UUID string like `"a1b2c3d4-..."`; refreshing returns the same value

- [ ] **Step 3: Commit**

```bash
git add src/lib/visitor.ts
git commit -m "feat: add visitor UUID utility for anonymous session tracking"
```

---

## Task 3: Reactions API

**Files:**
- Create: `src/pages/api/reactions.ts`

- [ ] **Step 1: Create reactions API**

```typescript
// src/pages/api/reactions.ts
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
```

- [ ] **Step 2: Smoke test GET (no reactions yet)**

Start `make dev`, then:
```bash
curl "http://localhost:4321/api/reactions?slug=tech/2026-05-19-test" \
  -H "X-Visitor-ID: test-visitor-123"
```
Expected: `{"counts":{"❤️":0,"👍":0,"💡":0,"🔥":0},"mine":null}`

- [ ] **Step 3: Smoke test POST (add reaction)**

```bash
curl -X POST http://localhost:4321/api/reactions \
  -H "Content-Type: application/json" \
  -H "X-Visitor-ID: test-visitor-123" \
  -d '{"slug":"tech/2026-05-19-test","emoji":"❤️"}'
```
Expected: `{"counts":{"❤️":1,"👍":0,"💡":0,"🔥":0},"mine":"❤️"}`

- [ ] **Step 4: Smoke test toggle off (same emoji)**

Run the same POST again.
Expected: `{"counts":{"❤️":0,"👍":0,"💡":0,"🔥":0},"mine":null}`

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/reactions.ts
git commit -m "feat(api): add /api/reactions GET/POST with toggle and dedup"
```

---

## Task 4: Comments API

**Files:**
- Create: `src/pages/api/comments.ts`

- [ ] **Step 1: Create comments API**

```typescript
// src/pages/api/comments.ts
import type { APIRoute } from 'astro';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return json({ comments: [] });

  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) return json({ error: 'Missing slug' }, 400);

  const rows = await DB.prepare(
    `SELECT id, author_name, author_url, body, created_at
     FROM comments
     WHERE post_slug = ? AND hidden = 0
     ORDER BY created_at ASC`
  ).bind(slug).all<{ id: number; author_name: string; author_url: string | null; body: string; created_at: number }>();

  return json({ comments: rows.results });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return json({ error: 'DB unavailable' }, 503);

  const visitorId = request.headers.get('X-Visitor-ID');
  if (!visitorId) return json({ error: 'Missing X-Visitor-ID' }, 400);

  const body = await request.json() as {
    slug?: string;
    body?: string;
    author_name?: string;
    author_url?: string;
  };

  if (!body.slug || !body.body) return json({ error: 'Missing slug or body' }, 400);
  if (body.body.length > 1000) return json({ error: 'Comment too long' }, 400);

  // Rate limit: max one comment per 60s per visitor
  const lastComment = await DB.prepare(
    `SELECT created_at FROM comments
     WHERE visitor_id = ? AND post_slug = ?
     ORDER BY created_at DESC LIMIT 1`
  ).bind(visitorId, body.slug).first<{ created_at: number }>();

  if (lastComment) {
    const elapsed = Math.floor(Date.now() / 1000) - lastComment.created_at;
    if (elapsed < 60) return json({ error: 'Rate limit: wait before posting again', retryAfter: 60 - elapsed }, 429);
  }

  const result = await DB.prepare(
    `INSERT INTO comments (post_slug, visitor_id, author_name, author_url, body)
     VALUES (?, ?, ?, ?, ?)
     RETURNING id, author_name, author_url, body, created_at`
  ).bind(
    body.slug,
    visitorId,
    body.author_name?.trim() || '匿名',
    body.author_url?.trim() || null,
    body.body.trim()
  ).first<{ id: number; author_name: string; author_url: string | null; body: string; created_at: number }>();

  return json({ comment: result }, 201);
};
```

- [ ] **Step 2: Smoke test GET (empty)**

```bash
curl "http://localhost:4321/api/comments?slug=tech/2026-05-19-test"
```
Expected: `{"comments":[]}`

- [ ] **Step 3: Smoke test POST**

```bash
curl -X POST http://localhost:4321/api/comments \
  -H "Content-Type: application/json" \
  -H "X-Visitor-ID: test-visitor-123" \
  -d '{"slug":"tech/2026-05-19-test","body":"這篇很棒！","author_name":"讀者A"}'
```
Expected: `{"comment":{"id":1,"author_name":"讀者A","author_url":null,"body":"這篇很棒！","created_at":<timestamp>}}`

- [ ] **Step 4: Smoke test rate limit**

Run POST again immediately.
Expected: `{"error":"Rate limit: wait before posting again","retryAfter":59}` with status 429

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/comments.ts
git commit -m "feat(api): add /api/comments GET/POST with 60s rate limit"
```

---

## Task 5: Bookmarks API

**Files:**
- Create: `src/pages/api/bookmarks.ts`

- [ ] **Step 1: Create bookmarks API**

```typescript
// src/pages/api/bookmarks.ts
import type { APIRoute } from 'astro';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return json({ slugs: [] });

  const visitorId = request.headers.get('X-Visitor-ID');
  if (!visitorId) return json({ error: 'Missing X-Visitor-ID' }, 400);

  const rows = await DB.prepare(
    'SELECT post_slug FROM bookmarks WHERE visitor_id = ? ORDER BY created_at DESC'
  ).bind(visitorId).all<{ post_slug: string }>();

  return json({ slugs: rows.results.map(r => r.post_slug) });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { DB } = locals.runtime.env;
  if (!DB) return json({ error: 'DB unavailable' }, 503);

  const visitorId = request.headers.get('X-Visitor-ID');
  if (!visitorId) return json({ error: 'Missing X-Visitor-ID' }, 400);

  const body = await request.json() as { slug?: string };
  if (!body.slug) return json({ error: 'Missing slug' }, 400);

  const existing = await DB.prepare(
    'SELECT id FROM bookmarks WHERE visitor_id = ? AND post_slug = ?'
  ).bind(visitorId, body.slug).first<{ id: number }>();

  if (existing) {
    await DB.prepare(
      'DELETE FROM bookmarks WHERE visitor_id = ? AND post_slug = ?'
    ).bind(visitorId, body.slug).run();
    return json({ bookmarked: false });
  } else {
    await DB.prepare(
      'INSERT INTO bookmarks (visitor_id, post_slug) VALUES (?, ?)'
    ).bind(visitorId, body.slug).run();
    return json({ bookmarked: true });
  }
};
```

- [ ] **Step 2: Smoke test toggle**

```bash
# Add bookmark
curl -X POST http://localhost:4321/api/bookmarks \
  -H "Content-Type: application/json" \
  -H "X-Visitor-ID: test-visitor-123" \
  -d '{"slug":"tech/2026-05-19-test"}'
```
Expected: `{"bookmarked":true}`

```bash
# Remove bookmark
curl -X POST http://localhost:4321/api/bookmarks \
  -H "Content-Type: application/json" \
  -H "X-Visitor-ID: test-visitor-123" \
  -d '{"slug":"tech/2026-05-19-test"}'
```
Expected: `{"bookmarked":false}`

```bash
# Get list
curl http://localhost:4321/api/bookmarks \
  -H "X-Visitor-ID: test-visitor-123"
```
Expected: `{"slugs":[]}` (after toggling off)

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/bookmarks.ts
git commit -m "feat(api): add /api/bookmarks GET/POST with toggle"
```

---

## Task 6: Admin Comments API

**Files:**
- Create: `src/pages/api/admin/comments/[id].ts`

- [ ] **Step 1: Create admin comments moderation endpoint**

```typescript
// src/pages/api/admin/comments/[id].ts
import type { APIRoute } from 'astro';

function requireAdmin(request: Request, adminToken: string | undefined): boolean {
  const token = new URL(request.url).searchParams.get('token');
  return !!adminToken && token === adminToken;
}

export const PATCH: APIRoute = async ({ request, locals, params }) => {
  const { DB, ADMIN_TOKEN } = locals.runtime.env as { DB: D1Database; ADMIN_TOKEN?: string };
  if (!requireAdmin(request, ADMIN_TOKEN)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) return Response.json({ error: 'Invalid id' }, { status: 400 });

  const body = await request.json() as { hidden?: number };
  if (body.hidden !== 0 && body.hidden !== 1) {
    return Response.json({ error: 'hidden must be 0 or 1' }, { status: 400 });
  }

  await DB.prepare('UPDATE comments SET hidden = ? WHERE id = ?').bind(body.hidden, id).run();
  return Response.json({ ok: true, id, hidden: body.hidden });
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const { DB, ADMIN_TOKEN } = locals.runtime.env as { DB: D1Database; ADMIN_TOKEN?: string };
  if (!requireAdmin(request, ADMIN_TOKEN)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = Number(params.id);
  if (!id) return Response.json({ error: 'Invalid id' }, { status: 400 });

  await DB.prepare('DELETE FROM comments WHERE id = ?').bind(id).run();
  return Response.json({ ok: true, id });
};
```

- [ ] **Step 2: Smoke test (unauthorized)**

```bash
curl -X PATCH http://localhost:4321/api/admin/comments/1 \
  -H "Content-Type: application/json" \
  -d '{"hidden":1}'
```
Expected: `{"error":"Unauthorized"}` with status 401

- [ ] **Step 3: Commit**

```bash
git add "src/pages/api/admin/comments/[id].ts"
git commit -m "feat(api): add admin comment moderation PATCH/DELETE endpoints"
```

---

## Task 7: InteractionBar Component

**Files:**
- Create: `src/components/InteractionBar.tsx`

- [ ] **Step 1: Create InteractionBar**

```tsx
// src/components/InteractionBar.tsx
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
    // Optimistic update
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
        <span style={{ fontSize: '16px' }}>{bookmarked ? '🔖' : '🔖'}</span>
        <span>{bookmarked ? '已書籤' : '書籤'}</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/InteractionBar.tsx
git commit -m "feat(ui): add InteractionBar with reactions and bookmark toggle"
```

---

## Task 8: CommentSection Component

**Files:**
- Create: `src/components/CommentSection.tsx`

- [ ] **Step 1: Create CommentSection**

```tsx
// src/components/CommentSection.tsx
import { useState, useEffect } from 'react';
import { getVisitorId } from '../lib/visitor';

interface Comment {
  id: number;
  author_name: string;
  author_url: string | null;
  body: string;
  created_at: number;
}

interface Props {
  slug: string;
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('zh-TW', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function CommentSection({ slug }: Props) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [count, setCount] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch comment count on mount (cheap query)
  useEffect(() => {
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(({ comments: c }: { comments: Comment[] }) => setCount(c.length))
      .catch(() => {});
  }, [slug]);

  function handleToggle() {
    if (!open && comments.length === 0) {
      setLoadingList(true);
      fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
        .then(r => r.json())
        .then(({ comments: c }: { comments: Comment[] }) => { setComments(c); setCount(c.length); setLoadingList(false); })
        .catch(() => setLoadingList(false));
    }
    setOpen(o => !o);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    const visitorId = getVisitorId();
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Visitor-ID': visitorId },
        body: JSON.stringify({ slug, body: body.trim(), author_name: name.trim() || undefined, author_url: url.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '留言失敗，請稍後再試');
      } else {
        setComments(prev => [...prev, data.comment]);
        setCount(c => c + 1);
        setBody('');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError('網路錯誤，請稍後再試');
    }
    setSubmitting(false);
  }

  return (
    <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '0.5px solid var(--separator)' }}>
      <button
        onClick={handleToggle}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--label-secondary)', fontSize: '14px', fontWeight: 600,
        }}
      >
        <span>💬 留言（{count}）</span>
        <span style={{ opacity: 0.5 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '20px' }}>
          {loadingList && <p style={{ color: 'var(--label-tertiary)', fontSize: '14px' }}>載入留言中⋯</p>}

          {comments.map(c => (
            <div key={c.id} style={{
              padding: '14px 0', borderBottom: '0.5px solid var(--separator)',
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', marginBottom: '6px' }}>
                {c.author_url
                  ? <a href={c.author_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: '14px', color: 'var(--accent)', textDecoration: 'none' }}>{c.author_name}</a>
                  : <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--label)' }}>{c.author_name}</span>
                }
                <span style={{ fontSize: '12px', color: 'var(--label-tertiary)' }}>{formatDate(c.created_at)}</span>
              </div>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: 'var(--label-secondary)', whiteSpace: 'pre-wrap' }}>{c.body}</p>
            </div>
          ))}

          {comments.length === 0 && !loadingList && (
            <p style={{ fontSize: '14px', color: 'var(--label-tertiary)', marginBottom: '20px' }}>還沒有留言，來當第一個！</p>
          )}

          <form onSubmit={handleSubmit} style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text" placeholder="名稱（選填）" value={name}
                onChange={e => setName(e.target.value)} maxLength={50}
                style={{ flex: 1, minWidth: '140px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--separator)', background: 'var(--bg-secondary)', color: 'var(--label)', fontSize: '14px' }}
              />
              <input
                type="url" placeholder="網址（選填）" value={url}
                onChange={e => setUrl(e.target.value)}
                style={{ flex: 1, minWidth: '140px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--separator)', background: 'var(--bg-secondary)', color: 'var(--label)', fontSize: '14px' }}
              />
            </div>
            <textarea
              placeholder="留言內容⋯（最多 1000 字）" value={body} required
              onChange={e => setBody(e.target.value)} maxLength={1000} rows={4}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--separator)', background: 'var(--bg-secondary)', color: 'var(--label)', fontSize: '14px', resize: 'vertical', fontFamily: 'inherit' }}
            />
            {error && <p style={{ color: '#e53e3e', fontSize: '13px', margin: 0 }}>{error}</p>}
            {success && <p style={{ color: '#38a169', fontSize: '13px', margin: 0 }}>留言成功！</p>}
            <button
              type="submit" disabled={submitting || !body.trim()}
              style={{
                alignSelf: 'flex-end', padding: '8px 20px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent)', color: '#fff', border: 'none', cursor: submitting ? 'wait' : 'pointer',
                fontSize: '14px', fontWeight: 600, opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? '送出中⋯' : '送出留言'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CommentSection.tsx
git commit -m "feat(ui): add CommentSection with lazy load and optimistic submit"
```

---

## Task 9: Wire Components into Article Page

**Files:**
- Modify: `src/pages/posts/[...slug].astro`

- [ ] **Step 1: Add imports at top of frontmatter (after existing imports)**

In `src/pages/posts/[...slug].astro`, add these two imports after the existing import block (around line 13):

```astro
import { InteractionBar } from '../../components/InteractionBar';
import { CommentSection } from '../../components/CommentSection';
```

- [ ] **Step 2: Add InteractionBar and CommentSection into article body**

Find the tags section (around line 149) — the `{post.data.tags.length > 0 && (` block. Insert `InteractionBar` and `CommentSection` directly **before** it:

```astro
    <!-- Interactions -->
    <InteractionBar client:visible slug={post.id} />
    <CommentSection client:visible slug={post.id} />
```

Result: the article body should have this order after the edit:
1. Series nav (top)
2. ToC (mobile)
3. Content
4. Prev/Next nav
5. Share panel (mobile)
6. **← InteractionBar** (new)
7. **← CommentSection** (new)
8. Tags
9. Related posts

- [ ] **Step 3: Verify in browser**

Run `make dev`, open any article. Confirm:
- Reaction buttons render with zero counts
- Clicking a reaction updates the count immediately (optimistic) and persists on reload
- Bookmark toggles state and persists on reload
- Comment section collapses/expands
- Submitting a comment shows it immediately

- [ ] **Step 4: Commit**

```bash
git add src/pages/posts/[...slug].astro
git commit -m "feat: wire InteractionBar and CommentSection into article page"
```

---

## Task 10: Bookmarks Page

**Files:**
- Create: `src/pages/bookmarks.astro`

- [ ] **Step 1: Create bookmarks page**

```astro
---
// src/pages/bookmarks.astro
import { getCollection } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import PostCard from '../components/PostCard.astro';

// This page is SSR (server output), visitor_id comes from header set by client-side JS
// We render a shell here; client-side JS fetches the slugs and filters posts
const allPosts = await getCollection('posts', ({ data }) => !data.draft && data.lang === 'zh-TW');
const postsJson = JSON.stringify(allPosts.map(p => ({
  id: p.id,
  title: p.data.title,
  date: p.data.date.toISOString(),
  category: p.data.category,
  tags: p.data.tags,
  tldr: p.data.tldr,
  description: p.data.description,
})));
---

<BaseLayout title="我的書籤" description="你儲存的文章">
  <div style="max-width:720px; margin:0 auto; padding:40px 24px;">
    <h1 style="font-size:28px; font-weight:900; margin:0 0 8px;">🔖 我的書籤</h1>
    <p style="color:var(--label-secondary); font-size:14px; margin:0 0 32px;">以下是你儲存的文章（儲存於此裝置）</p>
    <div id="bookmarks-list">
      <p style="color:var(--label-tertiary); font-size:14px;">載入中⋯</p>
    </div>
    <p id="bookmarks-empty" style="display:none; color:var(--label-tertiary); font-size:15px;">
      還沒有書籤。閱讀文章時點 🔖 即可儲存。
    </p>
  </div>
</BaseLayout>

<script define:vars={{ postsJson }}>
  const posts = JSON.parse(postsJson);
  const VISITOR_KEY = 'visitor_id';

  function getVisitorId() {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(VISITOR_KEY, id); }
    return id;
  }

  async function render() {
    const visitorId = getVisitorId();
    const list = document.getElementById('bookmarks-list');
    const empty = document.getElementById('bookmarks-empty');

    try {
      const res = await fetch('/api/bookmarks', { headers: { 'X-Visitor-ID': visitorId } });
      const { slugs } = await res.json();

      if (!slugs || slugs.length === 0) {
        list.style.display = 'none';
        empty.style.display = 'block';
        return;
      }

      const saved = posts.filter(p => slugs.includes(p.id));
      // Sort by bookmark order (slugs array is newest first)
      saved.sort((a, b) => slugs.indexOf(a.id) - slugs.indexOf(b.id));

      list.innerHTML = saved.map(p => `
        <a href="/posts/${p.id}" style="display:block; padding:16px; border:0.5px solid var(--separator); border-radius:var(--radius-md); margin-bottom:12px; text-decoration:none; background:var(--bg-secondary);">
          <div style="font-size:11px; color:var(--label-tertiary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:6px;">${p.category} · ${new Date(p.date).toLocaleDateString('zh-TW')}</div>
          <div style="font-size:17px; font-weight:700; color:var(--label); margin-bottom:6px;">${p.title}</div>
          ${p.tldr ? `<div style="font-size:14px; color:var(--label-secondary);">${p.tldr}</div>` : ''}
        </a>
      `).join('');
    } catch {
      list.innerHTML = '<p style="color:var(--label-tertiary);">載入失敗，請重整頁面。</p>';
    }
  }

  render();
</script>
```

- [ ] **Step 2: Verify bookmarks page**

Run `make dev`, go to `http://localhost:4321/bookmarks`.
- Before bookmarking anything: shows empty state
- After bookmarking an article: page shows the article card
- After removing bookmark on article page: refreshing `/bookmarks` removes it

- [ ] **Step 3: Commit**

```bash
git add src/pages/bookmarks.astro
git commit -m "feat: add /bookmarks page with client-side post list from visitor_id"
```

---

## Task 11: Admin Comment Moderation Tab

**Files:**
- Modify: `src/components/AdminDashboard.tsx`

- [ ] **Step 1: Add `CommentRow` type and `'moderation'` to `MainTab`**

Find the `type MainTab` line (around line 40) and the type definitions block. Add:

```typescript
// Add to type definitions (after existing types, before MainTab)
type CommentRow = { id: number; post_slug: string; author_name: string; body: string; hidden: number; created_at: string };
type CommentsData = { rows: CommentRow[]; total: number };
```

Change:
```typescript
type MainTab = 'overview' | 'content' | 'search' | 'infra' | 'system';
```
To:
```typescript
type MainTab = 'overview' | 'content' | 'search' | 'infra' | 'system' | 'moderation';
```

- [ ] **Step 2: Add ModerationTab component (add before the main AdminDashboard function)**

Find where other tab components are defined and add:

```typescript
function ModerationTab({ token }: { token: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);

  async function fetchComments() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comments-list?token=${token}`);
      const data: CommentsData = await res.json();
      setComments(data.rows ?? []);
    } catch {
      setComments([]);
    }
    setLoading(false);
  }

  useEffect(() => { fetchComments(); }, [token]);

  async function toggleHidden(id: number, currentHidden: number) {
    const newHidden = currentHidden === 1 ? 0 : 1;
    await fetch(`/api/admin/comments/${id}?token=${token}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden: newHidden }),
    });
    setComments(prev => prev.map(c => c.id === id ? { ...c, hidden: newHidden } : c));
  }

  async function deleteComment(id: number) {
    if (!confirm('確定刪除這則留言？')) return;
    await fetch(`/api/admin/comments/${id}?token=${token}`, { method: 'DELETE' });
    setComments(prev => prev.filter(c => c.id !== id));
  }

  const visible = showHidden ? comments : comments.filter(c => c.hidden === 0);

  if (loading) return <p style={{ color: 'var(--label-tertiary)', padding: '20px' }}>載入中⋯</p>;

  return (
    <div style={{ padding: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>共 {comments.length} 則留言（{comments.filter(c => c.hidden).length} 則已隱藏）</span>
        <label style={{ fontSize: '13px', color: 'var(--label-secondary)', cursor: 'pointer' }}>
          <input type="checkbox" checked={showHidden} onChange={e => setShowHidden(e.target.checked)} style={{ marginRight: '6px' }} />
          顯示已隱藏
        </label>
      </div>
      {visible.length === 0 && <p style={{ color: 'var(--label-tertiary)', fontSize: '14px' }}>沒有留言</p>}
      {visible.map(c => (
        <div key={c.id} style={{
          padding: '14px', marginBottom: '10px', borderRadius: 'var(--radius-sm)',
          border: '0.5px solid var(--separator)', background: c.hidden ? 'color-mix(in srgb, #e53e3e 8%, var(--bg-secondary))' : 'var(--bg-secondary)',
          opacity: c.hidden ? 0.6 : 1,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: 'var(--label-tertiary)', marginBottom: '6px' }}>
                <strong style={{ color: 'var(--label-secondary)' }}>{c.author_name}</strong>
                {' · '}
                <a href={`/posts/${c.post_slug}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{c.post_slug}</a>
                {' · '}{c.created_at}
                {c.hidden === 1 && <span style={{ color: '#e53e3e', marginLeft: '8px' }}>已隱藏</span>}
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--label)', whiteSpace: 'pre-wrap' }}>{c.body}</p>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button onClick={() => toggleHidden(c.id, c.hidden)}
                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px', border: '0.5px solid var(--separator)', background: 'var(--bg)', color: 'var(--label-secondary)', cursor: 'pointer' }}>
                {c.hidden ? '顯示' : '隱藏'}
              </button>
              <button onClick={() => deleteComment(c.id)}
                style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '4px', border: '0.5px solid #e53e3e', background: 'transparent', color: '#e53e3e', cursor: 'pointer' }}>
                刪除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Add admin comments-list endpoint**

Create `src/pages/api/admin/comments-list.ts`:

```typescript
// src/pages/api/admin/comments-list.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  const { DB, ADMIN_TOKEN } = locals.runtime.env as { DB: D1Database; ADMIN_TOKEN?: string };
  const token = new URL(request.url).searchParams.get('token');
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await DB.prepare(
    `SELECT id, post_slug, author_name, body, hidden, datetime(created_at, 'unixepoch') as created_at
     FROM comments ORDER BY created_at DESC LIMIT 500`
  ).all();

  return Response.json({ rows: rows.results, total: rows.results.length });
};
```

- [ ] **Step 4: Add 'moderation' tab to the nav and render**

In `AdminDashboard.tsx`, find where tabs are rendered in the nav (look for the `MainTab` tab buttons) and add:

```tsx
<button onClick={() => setTab('moderation')} style={tabStyle(tab === 'moderation')}>🗨️ 留言管理</button>
```

Find where tab content is rendered (the big `if (tab === ...)` block) and add:

```tsx
{tab === 'moderation' && <ModerationTab token={adminToken} />}
```

- [ ] **Step 5: Verify moderation tab**

Run `make dev`, go to `/admin`, log in with `dev-secret`. Click "留言管理" tab. Should show comment list (empty if no comments yet). Add a comment on an article, return to admin, verify it appears.

- [ ] **Step 6: Commit**

```bash
git add src/components/AdminDashboard.tsx src/pages/api/admin/comments-list.ts
git commit -m "feat(admin): add comment moderation tab with hide/delete"
```

---

## Done

After Task 11, verify end-to-end:

1. Open any article → see `InteractionBar` and `CommentSection`
2. Click a reaction → count updates, persists on reload
3. Click bookmark → saved, visible at `/bookmarks`
4. Submit a comment → appears immediately in list
5. Go to `/admin` → moderation tab shows the comment → hide it → comment disappears from public view

Then run `make build` to confirm production build succeeds.

```bash
git tag v-interactions-complete
```
