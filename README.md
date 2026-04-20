# Engineer News

> 技術決策即文件 — 將工程師的對話紀錄轉化為結構化技術知識庫。

## 概覽

Engineer News 是一個部署在 Cloudflare 邊緣網路上的個人技術部落格平台，特色是 AI 語義搜尋與對話攝取工具，讓你把每天和 Claude / GPT 的工程對話直接轉成可搜尋的技術文件。

## 技術棧

| 層級 | 技術 |
|------|------|
| 框架 | [Astro 5](https://astro.build) (SSR) |
| 部署 | [Cloudflare Pages](https://pages.cloudflare.com) |
| 資料庫 | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) |
| 向量搜尋 | [Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/) |
| AI 推論 | [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) |
| UI 元件 | React + Astro |

## 功能

- **文章系統** — Markdown 撰寫，支援 frontmatter schema 驗證
- **AI 語義搜尋** — 使用 Vectorize + `bge-small-en-v1.5` 做向量搜尋
- **對話攝取工具** — 一行指令把對話紀錄轉成文章
- **作品集頁面** — `/projects` 展示 Side Projects
- **雙語支援** — 繁體中文（`/`）與英文（`/en/`）
- **AI-ready** — 自動產生 `llms.txt` 與 JSON-LD 結構化資料
- **CI/CD** — push 到 `main` 自動部署

## 快速開始

### 本地開發

```bash
# 安裝依賴
pnpm install

# 啟動開發伺服器
pnpm dev
```

### 新增文章

在 `src/content/posts/` 建立 `.md` 檔案：

```markdown
---
title: "文章標題"
date: "2026-04-20"
category: "tech"
tags: ["astro", "cloudflare"]
lang: "zh-TW"
tldr: "一句話摘要"
draft: false
---

文章內容...
```

或使用對話攝取工具（詳見 [docs/ingest.md](docs/ingest.md)）。

### 部署

push 到 `main` 即自動觸發 CI/CD：

```bash
git add .
git commit -m "add post"
git push
```

## 專案結構

```
.
├── src/
│   ├── content/
│   │   ├── posts/          # 技術文章 (Markdown)
│   │   └── projects/       # 作品集資料 (Markdown)
│   ├── pages/
│   │   ├── index.astro     # 首頁（繁中）
│   │   ├── posts/          # 文章路由
│   │   ├── tags/           # 標籤路由
│   │   ├── projects.astro  # 作品集頁面
│   │   ├── en/             # 英文版路由
│   │   ├── api/search.ts   # 向量搜尋 API
│   │   └── llms.txt.ts     # AI 爬取端點
│   ├── components/
│   │   └── Search.tsx      # 搜尋元件
│   └── layouts/
│       └── BaseLayout.astro
├── scripts/
│   ├── ingest.ts           # 對話攝取工具
│   └── sync-to-d1.ts       # 同步 Markdown → D1 + Vectorize
├── migrations/
│   └── 0001_initial.sql    # D1 schema
└── .github/workflows/
    └── deploy.yml          # CI/CD
```

## 文件

- [部署指南](docs/deployment.md)
- [撰寫文章](docs/writing.md)
- [對話攝取工具](docs/ingest.md)
- [架構說明](docs/architecture.md)
