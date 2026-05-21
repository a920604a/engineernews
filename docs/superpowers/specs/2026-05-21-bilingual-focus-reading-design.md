# Bilingual Toggle + Focus Reading Mode — Design Spec

**Date:** 2026-05-21  
**Scope:** English article pages (`/en/posts/[slug]`)  
**Goal:** Help the user practice English reading/listening by offering a side-by-side Chinese/English view and a hover-definition focus reading mode.

---

## Overview

Two independent toggles added to English article pages:

| Feature | Trigger | Effect |
|---------|---------|--------|
| **Bilingual** | `⇄ Bilingual` button | Splits article into left (EN) / right (ZH) columns |
| **Focus** | `📖 Focus` button | Marks key vocabulary with hover Chinese definitions |

Both can be on or off independently. State is local to the page (no persistence needed).

---

## Architecture

### Data Layer

`getStaticPaths` in `src/pages/en/posts/[...slug].astro` is extended to look up the corresponding zh-TW post (same slug, `lang === 'zh-TW'`) and pass it as `zhPost` prop.

```ts
// in getStaticPaths
const zhPost = allPosts.find(
  p => p.data.lang === 'zh-TW' && normalizeSlug(p.id) === normalizeSlug(post.id)
);
return { params, props: { post, allPosts, zhPost } };
```

Both `<Content />` components are rendered into the HTML at build time. The zh column is hidden by default; CSS class toggling reveals it.

### Glossary

File: `src/data/glossary.ts`

```ts
export const glossary: Record<string, string> = {
  "distributed system": "分散式系統",
  "latency": "延遲",
  // ~150-200 entries
};
```

Covers four domains:
- General software engineering (latency, throughput, idempotent…)
- AI/ML (embedding, fine-tuning, inference, RAG…)
- System design (eventual consistency, sharding, circuit breaker…)
- Workplace English (stakeholder, bandwidth, alignment, deliverable…)

---

## Components

### `ReadingModeBar.tsx` (new, client React component)

Placed directly above `.prose` inside `.article-body`. Manages both toggle states with `useState`.

On toggle, adds/removes CSS classes on the nearest `.article-grid` ancestor:
- `bilingual-on` — activates two-column layout
- `focus-on` — activates glossary highlighting

The component receives a `hasZh: boolean` prop; if `false`, the Bilingual button is disabled with a tooltip ("No Chinese version available").

---

## Bilingual Layout

### Desktop (≥ 1140px)

When `bilingual-on` is active, `.article-grid` switches from its sidebar layout to a two-column prose layout:

```
┌──────────────────────┬──────────────────────┐
│   English prose      │   中文對照            │
│   (left column)      │   (right column)     │
└──────────────────────┴──────────────────────┘
```

- Both columns share the same scroll container (no JS scroll sync needed).
- The original sidebar (TTS player + TOC) is moved to above the right column via CSS `order` reordering.
- Column widths: `1fr 1fr`, gap `40px`.

### Mobile (< 1140px)

Bilingual button is disabled. Tapping it shows a brief toast: "Side-by-side view is available on larger screens."

### zh Column Styling

- Same `.prose` styles as the English column.
- Slightly muted label at top: `中文版` in `var(--label-tertiary)`.
- No interactive features (no glossary highlighting, no TTS).

---

## Focus Reading Mode

### Activation

When `focus-on` is toggled on, a one-time JS routine runs on `.prose` (English column only):

1. `TreeWalker` walks all `TEXT_NODE` children of `.prose`.
2. Skips nodes inside `<code>`, `<pre>`, `<a>`, `<h1>`–`<h6>`.
3. For each text node, builds a regex from all glossary keys (sorted longest-first to avoid partial matches).
4. On match: replaces text node with a document fragment containing `<span class="gloss" data-def="{定義}">{term}</span>` and surrounding text.
5. Only the **first occurrence** of each term is marked (avoids visual noise).

When toggled off: all `.gloss` spans are unwrapped back to plain text nodes.

### Tooltip (pure CSS)

```css
.gloss {
  border-bottom: 1px dashed var(--accent);
  cursor: help;
  position: relative;
}
.gloss::after {
  content: attr(data-def);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-secondary);
  border: 0.5px solid var(--separator);
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 12px;
  color: var(--label);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 100;
}
.gloss:hover::after {
  opacity: 1;
}
```

---

## File Changes

| File | Change |
|------|--------|
| `src/pages/en/posts/[...slug].astro` | Add `zhPost` prop lookup in `getStaticPaths`; render zh `<Content />` in a hidden div; add `ReadingModeBar` |
| `src/components/ReadingModeBar.tsx` | New component — two toggle buttons, manages CSS class on `.article-grid` |
| `src/data/glossary.ts` | New file — ~150–200 term dictionary |
| `src/styles/reading-modes.css` (or inline in slug.astro) | Bilingual layout CSS + `.gloss` tooltip CSS |

---

## Out of Scope

- Scroll sync via JS (not needed — shared scroll container handles it)
- Persisting mode preference across pages
- Mobile bilingual support
- Auto-generating glossary via LLM (manual curation only for v1)
- Marking glossary terms in the zh column
