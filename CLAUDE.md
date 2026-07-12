# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Engineer News** is a bilingual (繁體中文 / English) personal technical blog built on Astro + Cloudflare Workers. Its core mission is manual content ingestion — converting engineering conversations and notes into structured, searchable Technical Chinese articles. The tagline is "技術決策即文件" (Technical decisions as documentation).

## Common Commands

### Development
```bash
make dev              # Start local dev server
make build            # Build + Pagefind indexing
pnpm preview          # Preview production build locally
```

### Data Sync
```bash
make sync             # Sync content to local D1
make sync-prod        # Sync content to remote D1 + Vectorize (production)
make rebuild          # Full rebuild: D1 tables + Vectorize index
make d1-migrate       # Apply pending SQL migrations
```

### Content Pipelines
```bash
make ingest FILE=...  # Ingest conversation/notes file → Markdown post
make tts-all          # Generate TTS audio for all posts without audio
make tts-post FILE=...# Generate TTS for a specific post
make fix-mermaid      # Auto-fix Mermaid diagram syntax errors in posts
```

### Remote Triggers (GitHub Actions)
```bash
make remote-deploy    # Trigger GitHub Actions deploy workflow
```

## Architecture

### Content Flow
```
Conversation / notes
  → scripts/ingest.ts (LLM extraction + Markdown generation)
  → git commit + push
  → GitHub Actions deploy.yml
      → Astro build + Pagefind index
      → scripts/sync-to-d1.ts (chunk text → bge-m3 embeddings → D1 + Vectorize)
      → Cloudflare Pages deploy
```

### Key Layers

**Frontend** (`src/pages/`, `src/components/`): Astro SSR pages. Default language is `zh-TW` (no URL prefix); English routes use `/en/*`. Post files: `src/content/posts/<category>/YYYY-MM-DD-<slug>.md` (zh-TW) and `.en.md` (English).

**API Routes** (`src/pages/api/`):
- `/api/search` — RAG search: embed query → Vectorize → doc_chunks → qwen-14b stream
- `/api/views` — Page view tracking (D1)
- `/api/og/[...path]` — Dynamic OG image generation (satori + R2 cache)
- `/api/tts/[...path]` — TTS audio streaming from R2
- `/api/admin/*` — Protected admin routes (requires `ADMIN_TOKEN`)

**Scripts** (`scripts/`):
- `ingest.ts` — Redacts secrets, calls llama-3.1-8b for metadata, writes frontmatter + content
- `sync-to-d1.ts` — Scans `.md` files, splits into chunks, embeds via bge-m3, upserts to D1 + Vectorize
- `tts-all.ts` — Synthesizes audio, uploads to R2, updates post frontmatter with `audio_url`
- `fix-mermaid.ts` — Validates and LLM-repairs broken Mermaid blocks

**Storage** (Cloudflare):
- **D1** (SQLite): `posts`, `projects`, `doc_chunks`, `page_views`, `logs`, `search_logs`, `settings`
- **Vectorize**: `engineer-news-index` (384-dim cosine, bge-m3)
- **R2**: OG images and TTS audio (`engineer-news-og-images/og-images/` and `tts/`)
- **Workers AI**: bge-m3 (embed), qwen-14b (RAG chat), llama-3.1-8b (ingest metadata)

**Config files**:
- `astro.config.mjs` — Astro + Cloudflare adapter + i18n routing
- `wrangler.jsonc` — Cloudflare bindings (D1, R2, Vectorize, Workers AI)
- `src/content.config.ts` — Zod schema for post frontmatter
- `migrations/*.sql` — D1 schema migrations

## Writing Posts

### File location
```
src/content/posts/<category>/YYYY-MM-DD-<slug>.md
```
Slug must be English kebab-case. Categories: `tech` / `product` / `learning` / `creative` / `life`.

### Frontmatter
```yaml
---
title: ""           # required
date: YYYY-MM-DD    # required
category: ""        # required; one of the 5 categories above
tags: []            # required; lowercase kebab-case
lang: zh-TW         # required; zh-TW or en
description: ""     # optional; SEO meta
tldr: ""            # optional; one-line summary (strongly recommended for tech)
draft: false        # optional; hides post when true
---
```

### Article structure templates

**tech (bug/debugging):** `## TL;DR` → `## 情境` → `## 問題` → `## 嘗試過程` → `## 解法` → `## 為什麼會這樣` → `## 學到的事`

**tech (tool/concept intro):** Opening para, then: design philosophy, comparison with alternatives, use cases, code examples, tradeoffs. Target 1000–2000 words.

For `tech` / `learning` / `product` categories and posts with `ai` / `policy` / `education` / `marketing` tags, always include `## 參考資料` with relevant links.

### Commit format
```
post(<category>): <title summary>
```
Example: `post(tech): Cloudflare D1 batch timeout 踩坑記錄`

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `CLOUDFLARE_API_TOKEN` | D1 + Workers AI access |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |
| `ADMIN_TOKEN` | Protects `/api/admin/*` routes (default: `dev-secret`) |
| `TTS_API_URL` | External TTS service (optional; falls back to Workers AI) |

## CI/CD

- **deploy.yml** — Triggered on push; builds Astro, runs `sync-to-d1.ts`, deploys to Cloudflare Pages
- **fix-mermaid.yml** — Manual trigger to repair broken Mermaid diagrams
