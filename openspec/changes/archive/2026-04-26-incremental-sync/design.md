## Context

`sync-to-d1.ts` 目前掃描所有 markdown 後，對每篇文章：UPSERT D1、刪除舊 chunks、重切段、算 embedding、insert Vectorize。Vectorize 沒有刪除舊向量，造成 index 累積冗余資料。D1 也沒有比對機制，每次全量重跑。

## Goals / Non-Goals

**Goals**
- 內容未改動的文章完全跳過（D1 + Vectorize 都不碰）
- 文章更新時正確刪除舊 Vectorize 向量
- 文章刪除時清除 D1 records 與 Vectorize 向量
- 維持冪等性（多次執行結果相同）

**Non-Goals**
- 變更 D1 schema（posts/projects 結構）以外的欄位
- 實作 Vectorize 版本控制
- 處理 git history（不依賴 git diff，純內容比對）

## Decisions

### 1. Hash 策略：SHA256 of raw file content

**選擇**：`createHash('sha256').update(rawFileContent).digest('hex')`

**理由**：對整個檔案內容（含 frontmatter）做 hash，任何改動（包括 metadata）都會偵測到。不用 mtime（git checkout 後 mtime 不可靠）、不用 git diff（local sync 也要能用）。

---

### 2. Batch query D1 取得現有 hash（不逐筆查）

**選擇**：sync 開始時一次查出所有 `id + content_hash`，存成 Map，之後 O(1) 比對。

**理由**：避免 N 次 wrangler 呼叫（每次 ~1 秒），改成 1 次查詢。

```typescript
const existing = new Map<string, string>(); // id → content_hash
// SELECT id, content_hash FROM posts
```

---

### 3. Vectorize 舊向量刪除：重建 chunk IDs

**選擇**：改動文章時，先從 D1 查舊 chunk 數量，重建 chunk IDs，呼叫 `vectorize delete`。

```typescript
const oldCount = getChunkCount(sourceId, sourceType); // query D1
const oldIds = Array.from({ length: oldCount }, (_, i) =>
  `${sourceType}:${sourceHash}-${i}`
);
execSync(`wrangler vectorize delete ${VECTOR_INDEX} --ids=${oldIds.join(',')}`);
```

**理由**：chunk ID 格式固定（`type:hash16-index`），可重建，不需額外儲存。

---

### 4. 孤立資料偵測：本地集合 diff D1 集合

**選擇**：sync 結束後，比較「本地所有 md 檔的 id 集合」與「D1 現有 id 集合」，差集即為已刪除。

```
D1 ids - local ids = 需清除的 ids
```

**理由**：簡單可靠，不依賴 git。每次 sync 都執行，保持 D1 乾淨。

---

### 5. content_hash 欄位加在 posts / projects，不加在 doc_chunks

**理由**：比對單位是「文章」不是「chunk」，一篇文章的任何改動都重跑所有 chunks，不需要 per-chunk hash。

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| 首次 migration 後全量跑一次 | 預期行為，記錄在文件 |
| vectorize delete API 若失敗，舊向量殘留 | 冪等設計：下次改動時再刪，不影響正確性 |
| wrangler vectorize delete 指令格式需確認 | 實作前驗證 CLI flags |

## Migration Plan

1. 新增 migration SQL（`content_hash TEXT`）
2. 修改 sync-to-d1.ts（hash 比對 + 孤立清除）
3. 執行 `wrangler d1 migrations apply --remote`（CI 已自動跑）
4. 下次 push 觸發全量 sync（首次），之後增量

Rollback：移除 hash 比對邏輯即可退回全量模式，schema 欄位保留無害。

## Open Questions

- `wrangler vectorize delete` 的確切 flag（`--ids` 還是 `--vector-ids`）？實作時查 CLI help 確認。
