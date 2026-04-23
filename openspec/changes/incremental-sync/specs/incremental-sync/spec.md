## ADDED Requirements

### Requirement: Content Hash 比對
系統 SHALL 在 sync 開始時一次查詢所有現有文章的 `content_hash`，與本地檔案的 SHA256 比對，內容未改動的文章 SHALL 完全跳過。

#### Scenario: 文章內容未改動
- **WHEN** sync 執行且某文章的 SHA256 與 D1 的 `content_hash` 相同
- **THEN** 該文章 SHALL 跳過所有操作（D1 UPSERT、chunk 重建、Vectorize）

#### Scenario: 文章內容已更新
- **WHEN** sync 執行且某文章的 SHA256 與 D1 的 `content_hash` 不同
- **THEN** 系統 SHALL 執行完整 UPSERT、重建 chunks、更新 Vectorize，並儲存新的 `content_hash`

#### Scenario: 新增文章
- **WHEN** sync 執行且某文章在 D1 中不存在（hash 為 NULL）
- **THEN** 系統 SHALL 執行完整 UPSERT 並儲存 `content_hash`

---

### Requirement: Vectorize 舊向量清除
文章內容更新時，系統 SHALL 先刪除 Vectorize 中的舊向量，再 insert 新向量。

#### Scenario: 文章更新時清除舊向量
- **WHEN** 某文章的 content hash 改變
- **THEN** 系統 SHALL 根據舊 chunk 數量重建舊 chunk IDs，呼叫 vectorize delete，再 insert 新向量

#### Scenario: vectorize delete 失敗
- **WHEN** vectorize delete API 呼叫失敗
- **THEN** 系統 SHALL 記錄警告但繼續執行，不中斷整體 sync

---

### Requirement: D1 Schema — content_hash 欄位
`posts` 與 `projects` 表 SHALL 各新增 `content_hash TEXT` 欄位（nullable）。

#### Scenario: Migration 執行
- **WHEN** migration 套用至 D1
- **THEN** `posts.content_hash` 與 `projects.content_hash` 欄位存在，現有資料的值為 NULL

#### Scenario: 首次 sync（migration 後）
- **WHEN** 所有 content_hash 為 NULL
- **THEN** 所有文章 SHALL 視為「已更新」，執行完整 sync
