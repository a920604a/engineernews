# 架構說明

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | Astro 5 + React（互動元件） |
| 邊緣執行 | Cloudflare Workers |
| 資料庫 | Cloudflare D1（SQLite） |
| 向量索引 | Cloudflare Vectorize |
| AI 推理 | Cloudflare Workers AI |

## 系統架構

```mermaid
graph TD
  subgraph Client[瀏覽器]
    Browser[使用者]
  end

  subgraph CF[Cloudflare]
    subgraph Frontend[靜態 Hosting]
      Pages[Cloudflare Pages\nAstro 靜態輸出]
    end

    subgraph Backend[API 後端]
      Workers[Cloudflare Workers\nsrc/pages/api/*.ts]
    end

    subgraph Storage[資料儲存]
      D1[(Cloudflare D1\nposts / projects / doc_chunks)]
    end

    subgraph VectorSearch[語義搜尋]
      Vectorize[(Cloudflare Vectorize\n向量索引)]
    end

    subgraph AI[AI 推理]
      BGE[Workers AI\nbge-small-en-v1.5\nembedding]
      LLM[Workers AI\nllama-3.1-8b-instruct\ningest / crawl 摘要]
    end
  end

  Browser -->|瀏覽頁面| Pages
  Browser -->|/api/search| Workers
  Workers -->|查詢文章| D1
  Workers -->|向量相似度搜尋| Vectorize
  Workers -->|query → 向量| BGE
  Vectorize -.->|chunk metadata| D1
```

## 內容資料流

### 手動攝取（ingest）

```mermaid
sequenceDiagram
  participant Dev as 開發者
  participant Ingest as ingest.ts
  participant LLM as Workers AI (llama)
  participant Git as git
  participant GH as GitHub Actions
  participant Pages as Cloudflare Pages
  participant Sync as sync-to-d1.ts
  participant D1

  Dev->>Ingest: pnpm ingest file.txt --yes
  Ingest->>LLM: 對話文字
  LLM-->>Ingest: title / tldr / tags / category
  Ingest->>Git: git commit + push
  Git->>GH: 觸發 deploy.yml
  GH->>Pages: astro build + deploy
  GH->>Sync: pnpm sync:prod
  Sync->>D1: UPSERT posts + doc_chunks
```

### 自動爬蟲（crawl）

```mermaid
sequenceDiagram
  participant Cron as GitHub Actions cron
  participant Crawl as crawl.ts
  participant YT as yt-dlp
  participant LLM as Workers AI (llama)
  participant Git as git
  participant GH as GitHub Actions
  participant D1

  Cron->>Crawl: 每天 UTC 02:00
  loop 最多 3 支影片
    Crawl->>YT: 列出新影片 + 下載字幕
    YT-->>Crawl: 字幕文字（或 fallback）
    Crawl->>LLM: 字幕 → 繁體中文摘要 (Follow post skill)
    LLM-->>Crawl: title / tldr / tags / summary / mermaid
    Crawl->>Git: 寫入 posts/crawled/YYYY-MM-DD-slug.md
  end
  Git->>GH: git commit + push
  GH->>GH: 手動觸發 deploy.yml (gh workflow run)
  GH->>GH: 觸發 deploy.yml → Pages + D1 sync
```

## 搜尋功能

| | `/search` | `/ai-search` |
|---|---|---|
| 技術 | Pagefind（靜態全文索引） | Vectorize（語義向量搜尋） |
| 運作方式 | build time 建立索引，純前端 JS 比對 | 即時呼叫 `/api/search` → embedding → 向量相似度 |
| 增量更新 | N/A | 基於 `content_hash` 的增量同步 (SHA256) |
| 需要 Workers | 否 | 是 |

## D1 Schema

```mermaid
erDiagram
  posts {
    TEXT id PK
    TEXT slug
    TEXT title
    TEXT category
    TEXT lang
    TEXT description
    TEXT tldr
    TEXT content
    TEXT tags
    TEXT source
    TEXT source_url
    TEXT content_hash
    TEXT created_at
    TEXT updated_at
  }
  projects {
    TEXT id PK
    TEXT title
    TEXT description
    TEXT tags
    TEXT github
    TEXT url
    TEXT tag
    INTEGER pinned
    TEXT content
    TEXT content_hash
    TEXT updated_at
  }
  doc_chunks {
    TEXT id PK
    TEXT source_id
    TEXT source_type
    INTEGER chunk_index
    TEXT content
    INTEGER token_count
    TEXT updated_at
  }
```
  posts ||--o{ doc_chunks : "source_type=post"
  projects ||--o{ doc_chunks : "source_type=project"
```

## 文章類型

| type | 說明 | 來源 |
|------|------|------|
| `debug` | 踩坑記錄 | 手動 ingest |
| `deep-dive` | 技術深度介紹 | 手動 ingest |
| `guide` | 操作指南 | 手動 ingest |
| `project` | 專案介紹 | 手動 ingest |
| `crawled` | 自動爬取（YouTube） | crawl.ts 自動生成 |
