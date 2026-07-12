# 內容 Pipeline：Ingest、Sync

---

## 內容來源

| 來源 | 工具 | 觸發方式 |
|------|------|---------|
| 工程對話 / 筆記 | `scripts/ingest.ts` | 手動執行 |

---

## ingest.ts — 對話攝取

將工程對話或筆記轉為帶 metadata 的 Markdown 文章。`--yes` 模式會建立 `draft: false` 文章，並嘗試預合成 TTS 後寫入 `audio_url`。

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
  Script->>Script: 產生 Markdown frontmatter<br/>draft: false
  Script->>Script: TTS 預合成（可失敗略過）

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

## sync-to-d1.ts — 增量同步

將本地 Markdown 增量同步到 D1 + Vectorize。基於 SHA256 hash 避免重複 embedding，且只同步 `draft: false` 的文章。

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
  Each --> Draft{draft !== false?}
  Draft -->|是| DraftSkip[跳過草稿]
  Draft -->|否| Hash[SHA256 全檔]
  Hash --> Same{hash 相同?}
  Same -->|是| Skip[跳過]
  Same -->|否| DelVec[刪除舊向量\nvectorize delete-vectors]
  DelVec --> Upsert["D1 UPSERT posts<br/>(含 content_hash, audio_url)"]
  Upsert --> Chunks[分割 chunks]
  Chunks --> EachChunk{每個 chunk}
  EachChunk --> D1Chunk[D1 INSERT doc_chunks]
  D1Chunk --> Embed["Workers AI bge-m3\ntext → float[1024]"]
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
| `pnpm sync` | 同步至本地 D1 |
| `pnpm sync:prod` | 同步至遠端 D1 + Vectorize |
| `make fix-mermaid` | 掃描所有文章，修復 Mermaid 語法錯誤 |
| `make tts-all` | 批次合成所有未有 audio_url 的文章，存本地 R2 |
| `make tts-all-prod` | 同上，存遠端 R2，並直接 UPDATE D1 audio_url |
| `make tts-post FILE=...` | 單篇完整 pipeline：TTS → R2 → D1 audio_url → Vectorize |
