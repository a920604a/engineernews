# 內容 Pipeline：Ingest、Crawl、Sync

---

## 內容來源

| 來源 | 工具 | 觸發方式 |
|------|------|---------|
| 工程對話 / 筆記 | `scripts/ingest.ts` | 手動執行 |
| YouTube 頻道 | `scripts/crawl.ts` | GitHub Actions cron 每 6 小時 |

---

## ingest.ts — 對話攝取

將工程對話或筆記轉為帶 metadata 的 Markdown 文章。

### 執行方式

```bash
pnpm ingest <conversation.txt>        # 互動模式，確認標題後手動 push
pnpm ingest <conversation.txt> --yes  # 全自動：AI 生成 + git commit + push
```

### 流程

```mermaid
sequenceDiagram
  participant Dev as 開發者
  participant Script as ingest.ts
  participant LLM as Workers AI<br/>llama-3.1-8b-instruct
  participant Git as git
  participant GHA as GitHub Actions

  Dev->>Script: pnpm ingest file.txt [--yes]
  Script->>Script: regex 脫敏<br/>(API keys / tokens / passwords)
  Script->>LLM: 對話文字 → 分析
  LLM-->>Script: { title, tldr, tags, category }

  alt --yes
    Script->>Git: git add + commit + push
  else 互動模式
    Script->>Dev: 確認/修改標題
    Dev->>Git: 手動 git add + push
  end

  Git->>GHA: 觸發 deploy.yml
```

### 脫敏規則

| Pattern | 替換 |
|---------|------|
| `sk-[a-zA-Z0-9]{20,}` | `[REDACTED_API_KEY]` |
| `Bearer [token]` | `Bearer [REDACTED]` |
| 32-64 位 hex | `[REDACTED_TOKEN]` |
| `password=xxx` / `api_key=xxx` | `[REDACTED]` |
| `https://user:pass@...` | `https://[REDACTED]@...` |

### 使用的 AI 模型

`@cf/meta/llama-3.1-8b-instruct` — 輸出 `{ title, tldr, tags, category }` JSON

---

## crawl.ts — YouTube 爬蟲

自動從 9 個 YouTube 頻道擷取最新技術影片，生成繁體中文摘要文章。

### 執行方式

```bash
pnpm crawl          # 本地（不寫 Vectorize）
pnpm crawl:prod     # 遠端（含 Vectorize embedding）
```

每次執行最多處理 **3 支**新影片。

### 流程

```mermaid
flowchart TD
  Cron["GitHub Actions cron<br/>0 */6 * * *"] --> Shuffle[隨機排序 9 個頻道]
  Shuffle --> Loop[for each 頻道]
  Loop --> List["yt-dlp 列出最新 5 支影片"]
  List --> Filter[過濾已處理（查 D1）]
  Filter --> Pick[取第 1 支新影片]
  Pick --> Sub["yt-dlp 下載字幕<br/>zh-TW > zh-Hant > zh > en"]
  Sub -->|有字幕| Trim[截斷至 4000 chars]
  Sub -->|無字幕| Fallback[title + description]
  Trim --> LLM["Workers AI llama-3.1-70b<br/>繁中摘要 + Mermaid 圖"]
  Fallback --> LLM
  LLM --> Validate{Mermaid 有效?}
  Validate -->|否| Fix["LLM 修正 Mermaid 語法"]
  Fix --> Write
  Validate -->|是| Write["寫入 posts/{category}/{videoId}.md"]
  Write --> Count{已達 3 支?}
  Count -->|否| Loop
  Count -->|是| Commit["git commit + push<br/>author: a920604a"]
  Commit --> Deploy[觸發 deploy.yml]
```

### 來源設定

頻道清單維護在 `scripts/sources.ts`（`SOURCES` 陣列，`enabled: true` 才會被爬取）。

### Crawled 文章 Frontmatter

```yaml
---
title: "LLM 生成"
date: "ISO 8601"
category: "tech|product|learning|career|life"
tags: [...]
lang: "zh-TW"
tldr: "一句話摘要"
draft: false
original_url: "https://youtube.com/watch?v=..."
type: "crawled"
---
```

---

## sync-to-d1.ts — 增量同步

將本地 Markdown 增量同步到 D1 + Vectorize。基於 SHA256 hash 避免重複 embedding。

### 執行方式

```bash
pnpm sync           # 同步至本地 D1（不寫 Vectorize）
pnpm sync:prod      # 同步至遠端 D1 + Vectorize（CI 自動觸發）
```

### 執行模式

| 模式 | 對象 | Orphan 清理 |
|------|------|------------|
| `--prod`（無 `--file`）| 全部 `.md` | 是 |
| `--prod --file=<path>` | 指定單篇 | **否**（避免誤判其他篇為孤立） |

### 流程

```mermaid
flowchart TD
  Start[sync-to-d1.ts --prod] --> FileArg{--file= 指定?}
  FileArg -->|是| Single[只處理指定檔案]
  FileArg -->|否| Walk[Walk src/content/posts/]
  Single --> LoadHashes[載入 D1 所有 id→content_hash]
  Walk --> LoadHashes
  LoadHashes --> Each{每個 .md}
  Each --> Hash[SHA256 全檔]
  Hash --> Same{hash 相同?}
  Same -->|是| Skip[跳過]
  Same -->|否| DelVec[刪除舊向量\nvectorize delete-vectors]
  DelVec --> Upsert["D1 UPSERT posts<br/>(含 content_hash, audio_url)"]
  Upsert --> Chunks[分割 chunks]
  Chunks --> EachChunk{每個 chunk}
  EachChunk --> D1Chunk[D1 INSERT doc_chunks]
  D1Chunk --> Embed["Workers AI bge-m3\ntext → float[384]"]
  Embed --> VecInsert["Vectorize insert"]
  VecInsert --> EachChunk
  EachChunk -->|完成| Each
  Each -->|完成| OrphanCheck{--file= ?}
  OrphanCheck -->|否| Orphan[清理孤立資料]
  OrphanCheck -->|是| Done[完成]
```

### Chunk ID 格式

```
post:{sha1(sourceId)[0:16]}-{chunkIndex}
```

範例：`post:abc123def456-0`、`post:abc123def456-1`

### 觸發條件（CI）

`deploy.yml` 在以下條件才執行 sync：
```
git diff HEAD~1 -- src/content/ scripts/sync-to-d1.ts
```
若無內容變動，跳過 sync 節省 API 費用。

---

## 指令速查

| 指令 | 說明 |
|------|------|
| `pnpm ingest <file>` | 互動模式攝取 |
| `pnpm ingest <file> --yes` | 全自動攝取 + push |
| `pnpm crawl` | 本地爬蟲 |
| `pnpm crawl:prod` | 遠端爬蟲（含向量） |
| `pnpm sync` | 同步至本地 D1 |
| `pnpm sync:prod` | 同步至遠端 D1 + Vectorize |
| `make fix-mermaid` | 掃描所有文章，修復 Mermaid 語法錯誤 |
| `make tts-all` | 批次合成所有未有 audio_url 的文章，存本地 R2 |
| `make tts-all-prod` | 同上，存遠端 R2，並直接 UPDATE D1 audio_url |
| `make tts-post FILE=...` | 單篇完整 pipeline：TTS → R2 → D1 audio_url → Vectorize |
