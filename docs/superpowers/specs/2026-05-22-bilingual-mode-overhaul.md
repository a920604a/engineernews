# Bilingual Mode Overhaul

**Date:** 2026-05-22  
**Status:** Approved

## Problem

Most English posts cannot use bilingual mode because it requires both `.en.tts-script.txt` and `.tts-script.txt` to exist. Currently only 19 of 64 English posts have English TTS scripts and 30 have Chinese TTS scripts. Additionally, the existing bilingual view is unstyled (plain `<p>` tags in `.prose`) and provides no paragraph-level alignment between the two columns.

## Goals

1. `tts-all` ensures both EN and ZH scripts are generated as a pair — no post left with only one side.
2. A paragraph alignment map (`.bilingual-map.json`) is generated via LLM so EN and ZH paragraphs can be linked precisely.
3. TTS scripts and bilingual maps move out of `src/content/posts/` into a dedicated `src/tts/` tree, keeping the posts directory containing only `.md` files.
4. The bilingual view is redesigned in a Podcast/lecture style with paragraph-level cross-column highlighting and glossary click cards.

## Data Layer

### Directory structure

```
src/tts/
  <category>/
    YYYY-MM-DD-<slug>.en.tts-script.txt   # English narration script
    YYYY-MM-DD-<slug>.tts-script.txt      # Chinese narration script
    YYYY-MM-DD-<slug>.bilingual-map.json  # Paragraph alignment map
```

### bilingual-map.json schema

```json
{
  "pairs": [
    { "en": 0, "zh": 0 },
    { "en": 1, "zh": 1 },
    { "en": [2, 3], "zh": [2] },
    { "en": 4, "zh": [3, 4] }
  ]
}
```

Each `pairs` entry maps one or more EN paragraph indices to one or more ZH paragraph indices. Paragraphs are 0-indexed; index is position in the array produced by splitting the script on `\n\n`.

Paragraphs that have no semantic counterpart in the other language are omitted from `pairs` — the UI simply does not highlight them.

### Migration

A one-time migration shell script moves existing `.tts-script.txt` files from `src/content/posts/` to the matching `src/tts/` path and removes the originals.

## Script Changes

### `tts-all.ts` — pair-based processing

Current behaviour: each `.md` file is processed independently.

New behaviour:

1. Scan `src/content/posts/` for `*.en.md` files (the canonical pair anchor).
2. For each EN post, resolve its ZH counterpart (`<base>.md`).
3. Derive the `src/tts/<category>/` output directory for the pair.
4. Generate EN script if missing (`generateTTSScript` with EN prompt, output to `src/tts/`).
5. Generate ZH script if missing (`generateTTSScript` with ZH prompt, output to `src/tts/`).
6. Generate `bilingual-map.json` if missing (`generateBilingualMap`).
7. Synthesize audio only for posts without `audio_url` (unchanged logic).

ZH-only posts (no `.en.md` counterpart) continue to be processed for audio synthesis only — no bilingual map is generated.

### `src/lib/tts.ts` — new function `generateBilingualMap`

```ts
generateBilingualMap(
  enScript: string,
  zhScript: string,
  outputPath: string
): Promise<void>
```

- Splits both scripts into paragraph arrays on `\n\n`.
- Builds an LLM prompt that presents both arrays (with indices) and requests a JSON alignment in the `bilingual-map.json` schema above.
- Calls Claude CLI (`spawnSync('claude', ['--print', '--dangerously-skip-permissions'])`) with the prompt.
- Parses the JSON from stdout, validates the schema, and writes to `outputPath`.
- Falls back gracefully: if LLM call fails or produces invalid JSON, writes an identity map (`{"pairs": [{"en":0,"zh":0},{"en":1,"zh":1},…]}` up to `min(enLen, zhLen)`).

### Output path helper

Add `getTTSDir(category: string): string` returning `path.join(process.cwd(), 'src/tts', category)` and `getTTSBasename(slug: string): string` (strips `.en` suffix from slug). Used throughout `tts-all.ts` and `tts.ts`.

## Astro Page Changes — `[...slug].astro`

In `getStaticPaths`:

- Script paths change from `src/content/posts/<base>.*` to `src/tts/<category>/<slug>.*`.
- Also read `bilingual-map.json` if it exists: `const alignmentMap = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf-8')) : null`.
- Pass `alignmentMap` as a prop.

`hasZh` condition is unchanged: bilingual toggle is enabled only when both `enScript` and `zhScript` exist.

## Component — `BilingualView.tsx`

Replace the inline `bilingual-wrapper` markup in `[...slug].astro` with a single React component:

```tsx
<BilingualView
  client:load
  enScript={enScript}
  zhScript={zhScript}
  alignmentMap={alignmentMap}
  active={bilingual}            // passed down from ReadingModeBar state
/>
```

`ReadingModeBar.tsx` continues to own the toggle state and passes `active` down, or the two components share state via a shared context/callback prop. The simpler approach: `BilingualView` is rendered at all times but CSS-hidden when `active` is false; `ReadingModeBar` adds/removes the `bilingual-on` class as it does today.

### EN column

- Header: `🇺🇸 English` label.
- Each paragraph rendered as `<p class="para-card" data-en-idx={i}>`.
- Glossary annotation applied via `applyGlossary()` (moved from `ReadingModeBar`, now runs when `active` becomes true).
- Hover on a `.para-card` → look up `alignmentMap.pairs` to find corresponding ZH indices → add `.zh-highlight` class to matching ZH para cards.

### ZH column

- Header: `🇹🇼 中文` label.
- Each paragraph rendered as `<p class="para-card" data-zh-idx={i}>`.
- Hover/highlight is driven by the EN column; ZH column paragraphs are passive.

### Paragraph card styles (Podcast / lecture)

```css
.para-card {
  font-size: 18px;
  line-height: 1.9;
  padding: 20px 24px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  transition: background 0.15s;
}

.para-card:hover,
.para-card.zh-highlight {
  background: var(--bg-secondary);
}
```

### Glossary click card (精讀模式)

Existing: hover shows a CSS `::after` tooltip with the one-line Chinese translation.

New: click on a `.gloss` span opens a floating card (`<div class="gloss-card">`) containing:

- Term in English (bold)
- Chinese translation (`glossary[term].zh`)
- Optional context note (`glossary[term].context`) — a short sentence explaining system-level relevance

The card is positioned relative to the clicked element, dismisses on outside click or `Escape`.

### `src/data/glossary.ts` — schema extension

```ts
export interface GlossEntry {
  zh: string;
  context?: string;
}

export const glossary: Record<string, GlossEntry> = {
  "latency": { zh: "延遲", context: "影響使用者感知速度的關鍵指標，通常以 p50/p99 衡量。" },
  ...
}
```

The hover tooltip continues to show only `entry.zh`. The click card shows both `zh` and `context`.

All existing usages of `glossary[term]` in `applyGlossary()` must be updated: `span.dataset.def = def` becomes `span.dataset.def = def.zh`. The CSS `content: attr(data-def)` tooltip is unchanged.

## Migration Script

```bash
#!/usr/bin/env bash
# migrate-tts-scripts.sh
# Moves existing .tts-script.txt files from src/content/posts/ to src/tts/
set -euo pipefail
find src/content/posts -name "*.tts-script.txt" | while read src; do
  rel="${src#src/content/posts/}"          # e.g. career/2026-04-27-slug.tts-script.txt
  cat_dir="src/tts/$(dirname "$rel")"
  mkdir -p "$cat_dir"
  mv "$src" "$cat_dir/$(basename "$rel")"
done
echo "Migration complete."
```

## Error Handling

- If `generateBilingualMap` LLM call fails: fall back to identity map, log warning.
- If `bilingual-map.json` is absent at runtime: UI skips cross-column highlighting, both columns still render.
- If ZH counterpart `.md` does not exist for an EN post: log warning, skip ZH script generation, bilingual toggle stays disabled for that post.

## Out of Scope

- Generating TTS audio for posts that already have `audio_url` (existing skip logic unchanged).
- Bilingual mode on ZH-only posts (no EN route to render into).
- Real-time re-alignment on script edits.
