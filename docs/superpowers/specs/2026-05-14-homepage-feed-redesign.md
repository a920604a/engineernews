# Homepage Feed Redesign

**Date:** 2026-05-14
**Status:** Approved

## Problem

With 82+ posts (growing daily via crawl), the homepage renders the entire feed, causing information overload for both new visitors and returning users.

## Goal

Make the homepage useful in 5 seconds:
- New visitor: understand what this blog covers
- Returning user: quickly navigate to the right category or find recent posts

## Design

### Page Structure (new order)

```
① Hero
② Search
③ Category Grid  ← moved up, now the primary navigation element
④ Latest 8 Posts ← hard-capped, unified feed
   └─ Footer link: "所有 {N} 篇 →" → /categories
```

### Changes to `src/pages/index.astro`

**Add constant at top:**
```ts
const POSTS_LIMIT = 8;
```

**Remove:**
- `featuredPost` / `secondaryPinned` special-case logic
- `featured={true}` large card treatment
- `feed-divider` "最新文章" label (redundant)
- Separate pinned posts section on homepage (pinned data stays in frontmatter, just not rendered separately)

**Modify:**
- Move Category Grid section above the posts feed
- Replace `feedPosts.map(...)` with `latestPosts.slice(0, POSTS_LIMIT).map(...)`
- Section kicker: "最新文章" with right-side link: "所有 {allPosts.length} 篇 →"

### What stays unchanged

- Category Grid cards (style, content, colors)
- PostCard component
- Search component
- Hero copy
- All other pages (`/categories`, `/posts/*`, `/en/*`)

## Out of Scope

- Interactive tab filtering (deferred)
- Pagination on homepage (use /categories for that)
- Changes to English homepage (`/en/index.astro`) — apply separately if desired
