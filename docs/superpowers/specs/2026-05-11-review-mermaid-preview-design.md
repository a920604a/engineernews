# Review Page Mermaid Preview — Design

**Date:** 2026-05-11  
**Scope:** `src/pages/review.astro` only  
**Status:** Approved

## Problem

The review page editor uses `marked.parse()` to render a live Markdown preview. Mermaid code blocks (` ```mermaid `) are output as `<pre><code class="language-mermaid">` — plain HTML that no renderer transforms into diagrams. The page does not load Mermaid at all, so diagrams never render.

`BaseLayout.astro` has full Mermaid support (CDN + init + zoom toolbar), but `review.astro` is a standalone HTML page that does not inherit it.

## Chosen Approach

Inline all Mermaid support directly in `review.astro`, following its existing self-contained pattern (all dependencies from CDN, all logic in one `<script>` block).

## Architecture

### 1. CDN Load (`<head>`)

Add Mermaid CDN immediately after the existing `marked` CDN tag:

```html
<script src="https://cdn.jsdelivr.net/npm/mermaid@10.4.0/dist/mermaid.min.js"></script>
```

Version pinned to `10.4.0` — same as `BaseLayout.astro`.

Initialize once at page load:

```js
if (window.mermaid) {
  var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark';
  mermaid.initialize({ startOnLoad: false, theme });
}
```

### 2. `renderMermaidInEl(container)`

Called after every `marked.parse()` preview update. Steps:

1. Query `pre > code.language-mermaid` inside `container`
2. For each match: extract text, create `<div class="mermaid">`, insert after `<pre>`, hide `<pre>`
3. Collect all `.mermaid` divs in container, call `mermaid.run({ nodes })`
4. After run resolves: call `addMermaidZoom(el)` on each node

Guard at top: `if (!window.mermaid) return;` — fails silently if CDN not loaded.

### 3. `addMermaidZoom(el)`

Wraps rendered Mermaid SVG with zoom/pan UI. Ported from `BaseLayout.astro`:

- `.mermaid-wrap` — outer container
- `.mermaid-toolbar` — `+` / `−` / reset / fullscreen buttons
- `.mermaid-viewport` — overflow-hidden pan surface (height: 340px in preview panes)
- SVG zoom via attribute resize (`width`/`height`), pan via CSS `translate`
- Wheel zoom (cursor-centred), drag-to-pan via Pointer Events API
- Fullscreen via `requestFullscreen()` on `.mermaid-wrap`

Skip if element already inside `.mermaid-wrap` (idempotent guard).

### 4. `debounce(fn, delay)`

Standard debounce utility, delay = 500ms. Applied only to `renderMermaidInEl` calls — `marked.parse()` preview updates remain synchronous (instant text feedback).

### 5. Integration Points

**Fullscreen editor** (`#fs-preview`):

```js
// existing
function renderPreview(markdown) {
  fsPreview.innerHTML = marked.parse(markdown);
  debouncedRenderMermaid(fsPreview);  // ← add
}
```

**Inline card preview** (`.preview-pane`):

```js
// existing
const updatePreview = () => {
  previewPane.innerHTML = marked.parse(bodyTextarea.value);
  debouncedRenderMermaid(previewPane);  // ← add
};
```

Both use the same `debouncedRenderMermaid` instance.

## CSS

Added to the end of `review.astro`'s `<style>` block. Uses existing CSS variables (`--line`, `--surface`, `--surface-subtle`, `--glass`, `--text`) so it inherits all themes automatically.

```css
.mermaid-wrap { position: relative; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; margin: 1rem 0; background: var(--surface); }
.mermaid-toolbar { display: flex; gap: 4px; padding: 6px 10px; border-bottom: 1px solid var(--line); background: var(--surface-subtle); }
.mermaid-zoom-btn { width: 28px; height: 28px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); color: var(--text); cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center; }
.mermaid-zoom-btn:hover { background: var(--glass); }
.mermaid-viewport { overflow: hidden; cursor: grab; padding: 16px; min-height: 120px; height: 340px; }
.mermaid-viewport:active { cursor: grabbing; }
.mermaid-wrap:fullscreen, .mermaid-wrap:-webkit-full-screen { display: flex; flex-direction: column; background: var(--bg); border-radius: 0; border: none; }
.mermaid-wrap:fullscreen .mermaid-viewport, .mermaid-wrap:-webkit-full-screen .mermaid-viewport { flex: 1; overflow: auto; }
```

## Error Handling

| Scenario | Behaviour |
|---|---|
| Mermaid CDN not loaded | `renderMermaidInEl` returns early; code block shown as-is |
| Invalid/incomplete Mermaid syntax | Mermaid renders its own error message in the div |
| No Mermaid blocks in document | Helper finds nothing, returns immediately |
| Re-render (user keeps typing) | `innerHTML` reset clears old `.mermaid-wrap`; next debounce rebuilds cleanly |

## Files Changed

| File | Change |
|---|---|
| `src/pages/review.astro` | Add CDN tag, CSS, `debounce`, `renderMermaidInEl`, `addMermaidZoom`, patch `renderPreview` and `updatePreview` |

No other files are modified.
