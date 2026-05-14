# Tags Index Page — Design Spec

**Date:** 2026-05-15  
**Status:** Approved

## Problem

The project has individual tag pages (`/tags/[tag]`) but no index page listing all tags. Users cannot browse or discover tags without already knowing them. There can be hundreds of tags, so plain listing is not enough — filtering is required.

## Solution

Add a `/tags` index page (and `/en/tags` for English) with a client-side filterable chip grid, sorted by article count descending. Add a "標籤" nav link in the site header.

## Architecture

### New Files

- `src/pages/tags/index.astro` — zh-TW tags index
- `src/pages/en/tags/index.astro` — English tags index (filters `lang === 'en'`)

### Modified Files

- `src/layouts/BaseLayout.astro` — add "標籤" nav link pointing to `/tags` (EN: `/en/tags`)
- `src/i18n/ui.ts` — add `nav.tagIndex` key (`zh-TW: '標籤'`, `en: 'Tags'`)

## Page Structure

```
[ Hero Section ]
  eyebrow: "Tags"
  h1: 標籤索引
  subtitle: 共 N 個標籤

[ Filter Input ]
  <input> placeholder="篩選標籤..."

[ Tag Chip Grid ]
  chip: #astro [42]   chip: #llm [38]   chip: #cloudflare [31] ...
  (frequency-descending order)
  empty state: "找不到符合的標籤"
```

## Data

- Collected at build time via `getCollection('posts', ({ data }) => !data.draft && data.lang === 'zh-TW')`
- For each post, flatten `post.data.tags`, count occurrences per tag
- Sort by count descending
- Pass as `tagList: { tag: string; count: number }[]` to the template

## Components / Styling

- Chip: reuse global `.tag` class + a small inline count badge (style modeled on `.topic-count` from categories page)
- Filter: plain `<input>` in page-scoped `<style>`, native `<script>` does `toLowerCase().includes(query)` on each chip's `data-tag` attribute; non-matching chips get `display:none`
- Empty state: a `<p class="empty">` element toggled visible when all chips are hidden
- No external dependencies

## English Version

`/en/tags/index.astro` is identical except:
- filters `lang === 'en'`
- UI strings in English ("Tag Index", "Filter tags...", "N tags", "No matching tags")
- chip hrefs point to `/en/tags/[tag]`

## Nav

BaseLayout adds a second `nav-link` after the existing "主題" link:

```html
<a class="nav-link" href={isEn ? '/en/tags' : '/tags'}>{t('nav.tagIndex')}</a>
```

`ui.ts` additions:
```ts
'nav.tagIndex': '標籤'   // zh-TW
'nav.tagIndex': 'Tags'   // en
```

## Non-Goals

- No server-side search (all filtering is client-side)
- No pagination (all tags rendered at build time)
- No tag editing or management UI
