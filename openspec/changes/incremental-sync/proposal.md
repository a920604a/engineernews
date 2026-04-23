## Why

目前 `sync:prod` 每次都對所有文章重跑 D1 UPSERT 與 Vectorize embedding，不管內容有無改動。隨著文章數量增加（加上每天自動爬蟲），CI 執行時間與 API 費用會線性成長。另外，刪除的文章會永遠殘留在 D1 與 Vectorize，造成資料不一致。

## What Changes

- **content hash 增量跳過**：sync 前先比對 SHA256，內容沒變的文章直接跳過，不碰 D1 也不碰 Vectorize
- **Vectorize 舊向量清除**：文章內容更新時，先刪除舊 chunk 向量再 insert 新向量，解決 index 越來越髒的問題
- **孤立資料清除**：sync 結束後比對本地檔案與 D1 記錄的差集，刪除已不存在的文章及其 chunks / 向量
- **D1 migration**：`posts` 與 `projects` 表各加一欄 `content_hash TEXT`

## Capabilities

### New Capabilities

- `incremental-sync`: 基於 content hash 的增量同步，只處理新增或更新的文章
- `orphan-cleanup`: sync 結束後自動清除 D1 與 Vectorize 中已刪除文章的殘留資料

### Modified Capabilities

- `ci-d1-sync`: sync:prod 行為從「全量重跑」改為「增量 + 清除」，執行時間大幅縮短

## Impact

- **修改檔案**：`scripts/sync-to-d1.ts`
- **新增檔案**：`migrations/000X_add_content_hash.sql`
- **首次執行**：migration 後第一次 sync 仍為全量（所有 hash 為 NULL），之後才增量
- **Vectorize**：改動文章時會先 delete 舊向量，解決孤立向量問題
- **無破壞性變更**：`content_hash` 為 optional 欄位，舊資料不受影響
