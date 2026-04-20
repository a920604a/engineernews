# 架構說明

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | Astro 5 + React（互動元件） |
| 邊緣執行 | Cloudflare Workers |
| 資料庫 | Cloudflare D1（SQLite） |
| 向量索引 | Cloudflare Vectorize |
| AI 推理 | Workers AI / 外部 LLM |

## 系統架構

```mermaid
graph TD
  subgraph Client
    Browser
  end

  subgraph Cloudflare
    Pages[Cloudflare Pages<br/>靜態 Astro 輸出]
    Workers[Cloudflare Workers<br/>API / LLM 入口]
    D1[(D1 SQLite<br/>posts / projects / chunks)]
    Vectorize[(Vectorize<br/>向量索引)]
    WorkersAI[Workers AI<br/>embedding / inference]
  end

  Browser -->|靜態頁面| Pages
  Browser -->|搜尋 / AI 查詢| Workers
  Workers -->|SQL 查詢| D1
  Workers -->|向量檢索| Vectorize
  Workers -->|embedding / LLM| WorkersAI
  Vectorize -.->|chunk metadata| D1
```

## 資料流

```mermaid
sequenceDiagram
  participant Dev as 開發者
  participant GH as GitHub Actions
  participant Pages as Cloudflare Pages
  participant Script as sync-to-d1.ts
  participant D1
  participant Vec as Vectorize

  Dev->>GH: git push main
  GH->>Pages: astro build + deploy
  GH->>Script: pnpm sync:prod
  Script->>D1: UPSERT posts / projects
  Script->>D1: DELETE + INSERT post_chunks
  Script->>Vec: vectorize insert (embeddings)
```

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
    TEXT created_at
    TEXT updated_at
  }
  post_chunks {
    TEXT id PK
    TEXT post_id FK
    INTEGER chunk_index
    TEXT content
    INTEGER token_count
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
    TEXT updated_at
  }
  doc_chunks {
    TEXT id PK
    TEXT source_url
    TEXT source_name
    INTEGER chunk_index
    TEXT content
    TEXT updated_at
  }

  posts ||--o{ post_chunks : "has"
```
