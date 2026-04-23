## ADDED Requirements

### Requirement: 孤立文章偵測
sync 結束後，系統 SHALL 比對本地 markdown 檔案集合與 D1 中的 id 集合，找出已刪除的文章。

#### Scenario: 偵測已刪除文章
- **WHEN** D1 中存在某 id，但本地 `src/content/posts/` 或 `src/content/projects/` 中已無對應檔案
- **THEN** 系統 SHALL 將該 id 標記為待清除

#### Scenario: 無孤立資料
- **WHEN** D1 與本地檔案完全一致
- **THEN** 系統 SHALL 不執行任何刪除操作，gracefully 結束

---

### Requirement: 孤立資料清除
系統 SHALL 清除孤立文章在 D1 與 Vectorize 中的所有相關資料。

#### Scenario: 清除 D1 孤立資料
- **WHEN** 某文章被標記為待清除
- **THEN** 系統 SHALL 依序執行：DELETE doc_chunks WHERE source_id=?，DELETE FROM posts/projects WHERE id=?

#### Scenario: 清除 Vectorize 孤立向量
- **WHEN** 某文章被標記為待清除且 isProd 為 true
- **THEN** 系統 SHALL 重建該文章的 chunk IDs（從 D1 查 chunk 數量），呼叫 vectorize delete
