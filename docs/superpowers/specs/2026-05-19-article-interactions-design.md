# Article Interactions — Design Spec

**Date:** 2026-05-19  
**Goal:** Add per-article engagement features (reactions, comments, bookmarks) to Engineer News  
**Priority order:** Phase A (this spec) → Phase B (newsletter + reading progress) → Phase C (GitHub OAuth reader accounts)

---

## Goals

- **個人品牌 (A):** Give visitors a way to express engagement without friction
- **社群成長 (B):** Build lightweight social proof and return-visit motivation
- **自己用 (C):** Personal bookmark system accessible across articles

---

## Architecture Overview

All three features share a single **anonymous session** mechanism:

```
First visit → generate visitor_id (UUID) → store in localStorage
            → sync to HttpOnly Cookie (for API reads)
API calls   → read visitor_id from Cookie for dedup
```

No login required. visitor_id is device-bound (acceptable tradeoff for lightweight interactions).

### New D1 Tables

```
post_reactions  — emoji reactions (one per visitor per post, toggleable)
comments        — anonymous comments (optional name + URL)
bookmarks       — saved posts (per visitor)
```

### New API Routes

```
/api/reactions   GET / POST
/api/comments    GET / POST
/api/bookmarks   GET / POST
/api/admin/comments/[id]  PATCH / DELETE  (extends existing admin)
```

---

## Data Model

```sql
CREATE TABLE post_reactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug   TEXT NOT NULL,
  visitor_id  TEXT NOT NULL,
  emoji       TEXT NOT NULL CHECK(emoji IN ('❤️','👍','💡','🔥')),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(post_slug, visitor_id)
);
CREATE INDEX idx_reactions_slug ON post_reactions(post_slug);

CREATE TABLE comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug   TEXT NOT NULL,
  visitor_id  TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '匿名',
  author_url  TEXT,
  body        TEXT NOT NULL,
  hidden      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX idx_comments_slug ON comments(post_slug);

CREATE TABLE bookmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id  TEXT NOT NULL,
  post_slug   TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(visitor_id, post_slug)
);
CREATE INDEX idx_bookmarks_visitor ON bookmarks(visitor_id);
```

**Key decisions:**
- `UNIQUE(post_slug, visitor_id)` on reactions: DB-level dedup, toggle via `INSERT OR REPLACE`
- `comments.hidden`: soft-delete for admin moderation, no data loss
- `bookmarks` indexed by `visitor_id` for fast personal list queries

---

## API Contracts

### `/api/reactions`

```
GET  ?slug=xxx
→ { counts: { '❤️': 3, '👍': 1, '💡': 0, '🔥': 2 }, mine: '👍' | null }

POST { slug: string, emoji: '❤️'|'👍'|'💡'|'🔥' }
→ toggle: same emoji = remove; different emoji = replace
→ { counts: {...}, mine: string | null }
```

### `/api/comments`

```
GET  ?slug=xxx
→ { comments: [{ id, author_name, author_url, body, created_at }] }
  (hidden=1 rows excluded)

POST { slug, body, author_name?, author_url? }
→ rate limit: same visitor_id, last comment < 60s → 429
→ body max 1000 chars
→ { comment: { id, author_name, body, created_at } }
```

### `/api/bookmarks`

```
GET  (visitor_id read from Cookie)
→ { slugs: ['tech/2026-05-19-...', ...] }

POST { slug: string }
→ toggle (visitor_id read from Cookie)
→ { bookmarked: boolean }
```

### Admin Extensions

```
PATCH  /api/admin/comments/[id]   { hidden: 0|1 }
DELETE /api/admin/comments/[id]
```

Both require existing `ADMIN_TOKEN` header check.

---

## Anti-Abuse

| Vector | Mitigation |
|---|---|
| Reaction spam | `UNIQUE(post_slug, visitor_id)` in DB |
| Comment spam | 60s rate limit per visitor_id in DB; 1000 char limit |
| Fake visitor_id | Cookie is HttpOnly; frontend cannot forge it after init |
| Mass bookmarks | No limit needed (only affects own view) |

No external rate-limit service needed; D1 query is sufficient at current scale.

---

## UI Components

### `InteractionBar.tsx` (React, `client:visible`)

Placed in article page **above the tags section**.

```
┌─────────────────────────────────────────────────┐
│  ❤️ 12   👍 5   💡 3   🔥 8          🔖 書籤   │
└─────────────────────────────────────────────────┘
```

- Reaction buttons: scale bounce animation on click, optimistic UI count update
- Bookmark button: heartbeat animation on toggle; also appears in desktop sidebar below TTS player
- Fetches on mount; shows skeleton while loading

### `CommentSection.tsx` (React, `client:visible`)

Placed below `InteractionBar`, collapsed by default.

```
┌─────────────────────────────────────────────────┐
│  💬 留言（3）                          [展開 ▾] │
│  ─────────────────────────────────────────────  │
│  匿名  ·  2026-05-19 14:32                      │
│  這篇寫得很清楚...                               │
│  ─────────────────────────────────────────────  │
│  名稱（選填）______  URL（選填）______           │
│  [          留言內容（最多 1000 字）        ]    │
│                                    [送出留言]   │
└─────────────────────────────────────────────────┘
```

- Lazy loads comment list on expand
- Submit shows optimistic new comment immediately, confirms on API success
- Error state: inline message under form (no modal)

### `BookmarksPage.astro` — `/bookmarks`

New page. Reads `visitor_id` from Cookie → calls `/api/bookmarks` → renders list of saved posts using existing `PostCard` component. Empty state: "還沒有書籤，閱讀文章時點 🔖 即可儲存。"

---

## File Changes Summary

| File | Action |
|---|---|
| `migrations/NNNN_interactions.sql` | New: 3 tables + indexes |
| `src/pages/api/reactions.ts` | New |
| `src/pages/api/comments.ts` | New |
| `src/pages/api/bookmarks.ts` | New |
| `src/pages/api/admin/comments/[id].ts` | New |
| `src/components/InteractionBar.tsx` | New |
| `src/components/CommentSection.tsx` | New |
| `src/pages/bookmarks.astro` | New |
| `src/pages/posts/[...slug].astro` | Edit: add InteractionBar + CommentSection |
| `src/components/AdminDashboard.tsx` | Edit: add comment moderation tab |

---

## Out of Scope (Phase B / C)

- Email newsletter subscription
- Reading progress persistence
- GitHub OAuth reader accounts
- Personalized recommendations
- Comment threading / replies
