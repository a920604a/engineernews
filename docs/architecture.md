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
  subgraph Client[瀏覽器]
    Browser[使用者]
  end

  subgraph CF[Cloudflare]
    subgraph Frontend[前端靜態 Hosting]
      Pages[Cloudflare Pages<br/>Astro 靜態輸出<br/>HTML / CSS / JS]
    end

    subgraph Backend[API 後端]
      Workers[Cloudflare Workers<br/>src/pages/api/*.ts]
    end

    subgraph Storage[資料儲存]
      D1[(Cloudflare D1<br/>SQLite<br/>posts / projects / doc_chunks)]
    end

    subgraph VectorSearch[語義搜尋]
      Vectorize[(Cloudflare Vectorize<br/>向量索引)]
    end

    subgraph AI[AI 推理]
      BGE[Workers AI<br/>bge-small-en-v1.5<br/>文字 → 向量 Embedding]
    end
  end

  Browser -->|瀏覽頁面| Pages
  Browser -->|/api/search 語義搜尋| Workers
  Workers -->|查詢文章 / chunks| D1
  Workers -->|向量相似度搜尋| Vectorize
  Workers -->|將 query 轉成向量| BGE
  Vectorize -.->|chunk 對應 metadata| D1
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
  Script->>D1: DELETE + INSERT doc_chunks
  Script->>Vec: vectorize insert (embeddings)
```

## 搜尋功能

網站提供兩種搜尋，入口分別在 `/search` 和 `/ai-search`：

| | `/search` | `/ai-search` |
|---|---|---|
| 技術 | Pagefind（靜態全文索引） | Vectorize（語義向量搜尋） |
| 運作方式 | build time 建立索引，純前端 JS 比對關鍵字 | 即時呼叫 `/api/search` → embedding → 向量相似度 |
| 需要 Workers | 否（prerender） | 是 |
| 搜尋能力 | 關鍵字完全比對 | 語義理解（同義詞、概念相近） |

`/api/search` 流程：

```
用戶輸入
  → Workers AI bge-small-en-v1.5（embedding）
  → Vectorize.query()（top-5 相似 chunks）
  → 回傳文章 slug / title / score
```

> 注意：這是語義搜尋（Semantic Search），不是 RAG。結果為文章列表，不會由 LLM 生成回答。

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
  chunks {
    TEXT id PK
    TEXT source_id
    TEXT source_type
    INTEGER chunk_index
    TEXT content
    INTEGER token_count
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

  posts ||--o{ chunks : "source_type=post"
  projects ||--o{ chunks : "source_type=project"
```
