# 架構說明

## 整體架構

```
瀏覽器
  │
  ▼
Cloudflare Pages（邊緣節點）
  │
  ├── 靜態頁面（prerender）
  │     ├── /posts/[slug]
  │     ├── /tags/[tag]
  │     ├── /en/posts/[slug]
  │     └── /en/tags/[tag]
  │
  └── SSR 動態頁面
        ├── / (index)         ← getCollection()
        ├── /en/              ← getCollection()
        ├── /projects         ← getCollection()
        ├── /llms.txt         ← getCollection()
        └── /api/search       ← Vectorize + Workers AI
              │
              ├── Cloudflare D1（文章資料）
              └── Cloudflare Vectorize（向量索引）
```

## 資料流

### 發文流程

```
Markdown 檔案
  │
  ├── git push → GitHub Actions
  │     ├── astro build → Cloudflare Pages（靜態頁面）
  │     └── pnpm sync:prod
  │           ├── wrangler d1 → D1 posts 表
  │           ├── wrangler d1 → D1 post_chunks 表
  │           └── Workers AI → Vectorize（向量索引）
  │
  └── Astro Content Layer（build time）
        └── prerender 靜態路由
```

### 搜尋流程

```
用戶輸入查詢
  │
  ▼
/api/search (POST)
  │
  ├── Workers AI：查詢文字 → 向量
  │
  ├── Vectorize.query：找最相似的 chunks（topK=5）
  │
  └── 回傳：[{ slug, title, score }]
```

## 資料來源對照

| 頁面 | 資料來源 |
|------|----------|
| 首頁文章列表 | Astro Content Collections |
| 文章內容 | Astro Content Collections |
| 標籤頁 | Astro Content Collections |
| 語義搜尋結果 | Cloudflare Vectorize |
| D1 `posts` 表 | 供搜尋 API 補充詳細資訊 |

## D1 Schema

```sql
posts          — 文章主表（id, slug, title, category, tags, content...）
post_chunks    — 文章切塊（RAG 用，每塊 ≤1000 字）
doc_chunks     — 外部文件切塊（爬蟲用，預留）
```

## Content Collections Schema

```typescript
posts: {
  title, date, category, tags, lang,
  description?, tldr?, draft, pinned,
  type?, readingTime?, series?
}

projects: {
  title, description, tags,
  github?, url?, tag, pinned
}
```

## 環境變數

| 變數 | 用途 | 哪裡用 |
|------|------|--------|
| `CLOUDFLARE_ACCOUNT_ID` | API 認證 | sync, ingest |
| `CLOUDFLARE_API_TOKEN` | API 認證 | sync, ingest, CI |
| `DB` | D1 binding | runtime (搜尋 API) |
| `VECTORIZE` | Vectorize binding | runtime (搜尋 API) |
| `AI` | Workers AI binding | runtime (搜尋 API) |
