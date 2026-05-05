## ADDED Requirements

### Requirement: Draft Posts Excluded from D1 Sync
`sync-to-d1.ts` SHALL 跳過所有 `draft` 欄位不為 `false` 的文章，這些文章不得進入 D1 `posts` 表、`doc_chunks` 表及 Vectorize 索引。

#### Scenario: draft 明確為 false
- **WHEN** 文章 frontmatter 包含 `draft: false`
- **THEN** 系統 SHALL 正常處理該文章並同步至 D1

#### Scenario: draft 為 true
- **WHEN** 文章 frontmatter 包含 `draft: true`
- **THEN** 系統 SHALL 跳過該文章，不寫入 D1 也不新增至 Vectorize

#### Scenario: draft 欄位缺失
- **WHEN** 文章 frontmatter 中不含 `draft` 欄位（`undefined`）
- **THEN** 系統 SHALL 視同草稿，跳過該文章，不同步至 D1

#### Scenario: draft guard 置於 hash 比對前
- **WHEN** 草稿文章的 content hash 發生變化
- **THEN** 系統 SHALL 跳過，不更新 hash 快取，不將其加入 `localIds`（確保 orphan cleanup 仍能刪除已移除的草稿向量）

### Requirement: Draft Posts Excluded from Vectorize
所有被 draft guard 跳過的文章，其對應的向量 SHALL 不被寫入 Vectorize `engineer-news-index`。

#### Scenario: 草稿文章重新 sync
- **WHEN** 一篇草稿文章（`draft: true`）在 sync 時 content 有更新
- **THEN** 系統 SHALL 不 upsert 新向量，也不刪除舊向量（舊向量清除由 `make rebuild` 負責）
