# Design: Crawl vs Manual Post Draft Distinction

**Date:** 2026-05-04
**Status:** Approved

## Problem

All posts currently default to `draft: false`, meaning crawl-generated articles (auto-summarised from YouTube, unreviewed) appear on the homepage alongside hand-crafted posts. Crawled posts have lower trustworthiness and should be hidden until manually reviewed.

## Identification Rule

A post is **crawl-generated** if and only if a corresponding `.en.md` file exists for the same slug.

- `2026-04-27-ALruCKQQ_pw.md` + `2026-04-27-ALruCKQQ_pw.en.md` → both are crawl-generated → `draft: true`
- `2026-04-20-this-blog-tooling.md` (no `.en.md` counterpart) → manual → `draft: false`

## Changes

### 1. One-time migration script (`scripts/set-crawl-drafts.ts`)

Scans all `.md` files under `src/content/posts/`:
- Builds a set of all slugs that have a `.en.md` counterpart
- For crawl pairs: sets `draft: true` in both `.md` and `.en.md`
- For manual-only `.md`: sets `draft: false` (ensures consistent state)

### 2. `scripts/crawl.ts`

Lines 693 and 728: change `draft: false` → `draft: true` so future crawl-generated posts are hidden by default.

### 3. `post` skill

Ensure the frontmatter template in the post skill outputs `draft: false`, so posts generated via `/post` are published immediately.

## Invariants

- Reviewing a crawled post = manually set `draft: false` in its frontmatter
- No new schema fields; `draft` is the sole control knob
- `.en.md` presence remains the canonical signal for crawl origin
