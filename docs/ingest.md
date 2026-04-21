# 對話攝取與 Sync 工具

## 工作流程

```mermaid
flowchart LR
  Conv[對話 / 筆記] --> Ingest[scripts/ingest.ts<br/>產生 Markdown + frontmatter]
  Ingest --> MD[src/content/posts/category/date-slug.md]
  MD --> Review[人工 review / 編輯]
  Review --> Commit[git commit + push]
  Commit --> CI[GitHub Actions]
  CI --> Sync[scripts/sync-to-d1.ts]
  Sync --> D1[(D1: posts, doc_chunks)]
  Sync --> Vec[(Vectorize: embeddings)]
```

## ingest.ts 用到的 AI Model

`pnpm ingest` 會呼叫 **Cloudflare Workers AI** 的 `@cf/meta/llama-3.1-8b-instruct`（LLM），將對話內容分析成結構化 metadata：

```
對話文字 → Llama-3.1-8b → { title, tldr, tags, category }
```

這是 build-time 的內容生成工具，與 runtime 搜尋的 embedding model（`bge-small-en-v1.5`）完全獨立。

需設定環境變數：
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

## sync-to-d1.ts 邏輯

```mermaid
flowchart TD
  Start[main] --> SyncPosts[syncPosts]
  Start --> SyncProjects[syncProjects]

  SyncPosts --> Walk[walkMdFiles 遞迴讀取<br/>src/content/posts/**/*.md]
  Walk --> UpsertPost[UPSERT posts]
  UpsertPost --> DeleteChunks[DELETE 舊 post_chunks]
  DeleteChunks --> ChunkLoop[for each chunk]
  ChunkLoop --> InsertChunk[INSERT post_chunks]
  ChunkLoop --> Embed{isProd?}
  Embed -->|yes| GetEmbed[Workers AI embedding]
  GetEmbed --> VecInsert[vectorize insert]
  Embed -->|no| Skip[skip]

  SyncProjects --> WalkP[walkMdFiles<br/>src/content/projects/*.md]
  WalkP --> UpsertProject[UPSERT projects]
```

## 指令

```bash
# 本地 sync（開發用）
pnpm sync

# 遠端 sync（含 Vectorize）
pnpm sync:prod

# 攝取對話草稿
pnpm ingest

# 爬取外部文件到 doc_chunks
pnpm crawl
pnpm crawl:prod
```
