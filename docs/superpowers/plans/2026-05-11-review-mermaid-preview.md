# Review Page Mermaid Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live Mermaid diagram rendering with zoom toolbar to the review page's Markdown preview panes (both inline card preview and fullscreen editor).

**Architecture:** Load Mermaid CDN in `<head>` alongside `marked`, add three utility functions (`debounce`, `addMermaidZoom`, `renderMermaidInEl`) to the existing inline `<script>`, then patch the two preview update functions to call Mermaid after each `marked.parse()` with a 500ms debounce.

**Tech Stack:** Mermaid 10.4.0 (CDN), existing `marked@14` (CDN), vanilla JS, Astro (static file, no SSR logic changed)

---

## File Map

| File | Change |
|---|---|
| `src/pages/review.astro` | Add CDN tag in `<head>`, add CSS in `<style>`, add utilities + wiring in `<script>` |

---

### Task 1: Add Mermaid CDN and CSS

**Files:**
- Modify: `src/pages/review.astro`

- [ ] **Step 1: Add Mermaid CDN tag**

  In `review.astro` line 467, after the `marked` CDN script tag:

  ```html
  <script src="https://cdn.jsdelivr.net/npm/marked@14/marked.min.js"></script>
  ```

  Add immediately below it:

  ```html
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.4.0/dist/mermaid.min.js"></script>
  ```

- [ ] **Step 2: Add CSS for zoom toolbar**

  Find the closing `</style>` tag (around line 466). Add the following block just before it:

  ```css
  /* ── Mermaid zoom wrapper ── */
  .mermaid-wrap { position: relative; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; margin: 1rem 0; background: var(--surface); }
  .mermaid-toolbar { display: flex; gap: 4px; padding: 6px 10px; border-bottom: 1px solid var(--line); background: var(--surface-subtle); }
  .mermaid-zoom-btn { width: 28px; height: 28px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); color: var(--text); cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
  .mermaid-zoom-btn:hover { background: var(--glass); }
  .mermaid-viewport { overflow: hidden; cursor: grab; padding: 16px; min-height: 120px; height: 340px; }
  .mermaid-viewport:active { cursor: grabbing; }
  .mermaid-wrap:fullscreen,
  .mermaid-wrap:-webkit-full-screen { display: flex; flex-direction: column; background: var(--bg); border-radius: 0; border: none; }
  .mermaid-wrap:fullscreen .mermaid-viewport,
  .mermaid-wrap:-webkit-full-screen .mermaid-viewport { flex: 1; overflow: auto; }
  ```

- [ ] **Step 3: Verify dev server starts clean**

  ```bash
  make dev
  ```

  Open `http://localhost:4321/review` in a browser. Expected: page loads, no console errors about Mermaid or marked.

- [ ] **Step 4: Commit**

  ```bash
  git add src/pages/review.astro
  git commit -m "feat(review): add Mermaid CDN and zoom toolbar CSS"
  ```

---

### Task 2: Add utility functions

**Files:**
- Modify: `src/pages/review.astro`

These three functions go inside the existing `<script>` block (around line 658), immediately after the theme picker IIFE ends (around line 682) and before the `// ── Session ──` comment.

- [ ] **Step 1: Add `debounce` utility**

  ```js
  function debounce(fn, delay) {
    var t;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, delay);
    };
  }
  ```

- [ ] **Step 2: Initialize Mermaid**

  Immediately after the `debounce` function:

  ```js
  if (window.mermaid) {
    var mermaidTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'default' : 'dark';
    mermaid.initialize({ startOnLoad: false, theme: mermaidTheme });
  }
  ```

- [ ] **Step 3: Add `addMermaidZoom(el)`**

  ```js
  function addMermaidZoom(el) {
    if (el.closest('.mermaid-wrap')) return;

    var wrap = document.createElement('div');
    wrap.className = 'mermaid-wrap';

    var toolbar = document.createElement('div');
    toolbar.className = 'mermaid-toolbar';
    toolbar.innerHTML =
      '<button class="mermaid-zoom-btn" data-action="in" title="Zoom in">+</button>' +
      '<button class="mermaid-zoom-btn" data-action="out" title="Zoom out">−</button>' +
      '<button class="mermaid-zoom-btn" data-action="reset" title="Reset" style="font-size:11px">⊙</button>' +
      '<button class="mermaid-zoom-btn" data-action="fullscreen" title="Fullscreen" style="margin-left:auto;font-size:13px">⛶</button>';

    var vp = document.createElement('div');
    vp.className = 'mermaid-viewport';

    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(toolbar);
    wrap.appendChild(vp);
    vp.appendChild(el);

    var svg = null, baseW = 0, baseH = 0;
    var scale = 1, tx = 0, ty = 0;

    function initSvg() {
      svg = el.querySelector('svg');
      if (!svg) return;
      baseW = parseFloat(svg.getAttribute('width')) || svg.getBoundingClientRect().width;
      baseH = parseFloat(svg.getAttribute('height')) || svg.getBoundingClientRect().height;
      svg.style.maxWidth = 'none';
    }

    function apply() {
      if (svg && baseW) {
        svg.setAttribute('width', baseW * scale);
        svg.setAttribute('height', baseH * scale);
      }
      el.style.transform = 'translate(' + tx + 'px,' + ty + 'px)';
    }

    function fitAndCenter() {
      initSvg();
      var pad = 32;
      var vpW = vp.clientWidth - pad;
      var vpH = vp.clientHeight - pad;
      scale = 1;
      tx = Math.max(0, (vpW - baseW) / 2);
      ty = Math.max(0, (vpH - baseH) / 2);
      apply();
    }
    requestAnimationFrame(fitAndCenter);

    var fsBtn = toolbar.querySelector('[data-action="fullscreen"]');
    document.addEventListener('fullscreenchange', function () {
      var isFs = document.fullscreenElement === wrap;
      fsBtn.textContent = isFs ? '✕' : '⛶';
      fsBtn.title = isFs ? 'Exit fullscreen' : 'Fullscreen';
      if (isFs) requestAnimationFrame(fitAndCenter);
    });

    toolbar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.dataset.action;
      if (action === 'reset') { scale = 1; fitAndCenter(); return; }
      if (action === 'fullscreen') {
        if (!document.fullscreenElement) wrap.requestFullscreen && wrap.requestFullscreen();
        else document.exitFullscreen && document.exitFullscreen();
        return;
      }
      var newScale = action === 'in' ? Math.min(scale * 1.3, 8) : Math.max(scale / 1.3, 0.1);
      var cx = vp.clientWidth / 2 - 16;
      var cy = vp.clientHeight / 2 - 16;
      tx = cx - (cx - tx) * (newScale / scale);
      ty = cy - (cy - ty) * (newScale / scale);
      scale = newScale;
      apply();
    });

    vp.addEventListener('wheel', function (e) {
      e.preventDefault();
      var rect = vp.getBoundingClientRect();
      var mx = e.clientX - rect.left - 16;
      var my = e.clientY - rect.top - 16;
      var factor = e.deltaY < 0 ? 1.12 : 0.88;
      var newScale = Math.max(0.1, Math.min(8, scale * factor));
      tx = mx - (mx - tx) * (newScale / scale);
      ty = my - (my - ty) * (newScale / scale);
      scale = newScale;
      apply();
    }, { passive: false });

    var dragging = false, sx, sy, stx, sty;
    vp.addEventListener('pointerdown', function (e) {
      dragging = true; sx = e.clientX; sy = e.clientY; stx = tx; sty = ty;
      vp.setPointerCapture(e.pointerId);
    });
    vp.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      tx = stx + e.clientX - sx;
      ty = sty + e.clientY - sy;
      apply();
    });
    vp.addEventListener('pointerup', function () { dragging = false; });
  }
  ```

- [ ] **Step 4: Add `renderMermaidInEl(container)`**

  ```js
  function renderMermaidInEl(container) {
    if (!window.mermaid) return;
    var nodes = container.querySelectorAll('pre > code.language-mermaid, pre > code.lang-mermaid');
    if (!nodes.length) return;

    var mermaidEls = [];
    nodes.forEach(function (node) {
      var pre = node.parentElement;
      var text = pre.textContent || '';
      var div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = text;
      pre.parentNode.insertBefore(div, pre.nextSibling);
      pre.style.display = 'none';
      mermaidEls.push(div);
    });

    mermaid.run({ nodes: mermaidEls }).then(function () {
      mermaidEls.forEach(addMermaidZoom);
    }).catch(function (e) {
      console.error('mermaid render error', e);
    });
  }
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/review.astro
  git commit -m "feat(review): add debounce, renderMermaidInEl, addMermaidZoom utilities"
  ```

---

### Task 3: Wire up and verify

**Files:**
- Modify: `src/pages/review.astro`

- [ ] **Step 1: Create shared debounced instance**

  After the `renderMermaidInEl` function (still in the same `<script>` block, before the `// ── Fullscreen editor ──` section), add:

  ```js
  var debouncedRenderMermaid = debounce(renderMermaidInEl, 500);
  ```

- [ ] **Step 2: Patch `renderPreview` (fullscreen editor)**

  Find the existing `renderPreview` function (around line 795):

  ```js
  function renderPreview(markdown) {
    fsPreview.innerHTML = marked.parse(markdown);
  }
  ```

  Replace with:

  ```js
  function renderPreview(markdown) {
    fsPreview.innerHTML = marked.parse(markdown);
    debouncedRenderMermaid(fsPreview);
  }
  ```

- [ ] **Step 3: Patch `updatePreview` (inline card preview)**

  Find `updatePreview` inside `loadDraftIntoForm` (around line 979):

  ```js
  const updatePreview = () => { previewPane.innerHTML = marked.parse(bodyTextarea.value); };
  ```

  Replace with:

  ```js
  const updatePreview = () => {
    previewPane.innerHTML = marked.parse(bodyTextarea.value);
    debouncedRenderMermaid(previewPane);
  };
  ```

- [ ] **Step 4: Manual smoke test**

  Start the dev server:
  ```bash
  make dev
  ```

  1. Open `http://localhost:4321/review`, enter admin token
  2. Click **寫作** on any draft to open the fullscreen editor
  3. Paste this Mermaid block into the textarea:
     ```
     ```mermaid
     graph TD
       A[Start] --> B{Decision}
       B -->|Yes| C[Do it]
       B -->|No| D[Skip]
     ```
     ```
  4. Wait ~500ms after stopping typing

  **Expected:**
  - A rendered diagram appears in the right-hand preview pane
  - A toolbar with `+`, `−`, `⊙`, `⛶` buttons appears above it
  - `+` / `−` zoom in/out, `⊙` resets, `⛶` enters fullscreen
  - Drag inside the viewport pans the diagram
  - Scroll wheel zooms toward cursor
  - Non-Mermaid content (headings, code, lists) still renders normally

- [ ] **Step 5: Commit**

  ```bash
  git add src/pages/review.astro
  git commit -m "feat(review): wire up live Mermaid rendering with debounce in preview panes"
  ```
