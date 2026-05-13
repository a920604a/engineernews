## ADDED Requirements

### Requirement: Admin 後台顯示 Search Traces tab
Admin Dashboard SHALL 新增「Search Traces」tab，列出最近的 RAG 查詢記錄，預設顯示最新 50 筆，支援關鍵字過濾。

#### Scenario: 開啟 Search Traces tab
- **WHEN** Admin 使用者點擊「Search Traces」tab
- **THEN** 顯示最近 50 筆查詢，每筆顯示：查詢文字、時間、duration_ms、品質評分狀態

#### Scenario: 過濾查詢記錄
- **WHEN** Admin 使用者在搜尋框輸入關鍵字
- **THEN** 列表即時過濾，只顯示 query 欄位包含該關鍵字的記錄

### Requirement: 展開查看完整 trace
系統 SHALL 允許 Admin 展開任一查詢記錄，查看完整 LLM 回答與引用的 source chunks。

#### Scenario: 展開 trace 記錄
- **WHEN** Admin 使用者點擊某筆查詢記錄
- **THEN** 展開顯示：完整 LLM 回答（Markdown 渲染）、引用的 source 列表（標題 + 相似度分數 + 文章連結）

#### Scenario: trace 無 LLM 回答
- **WHEN** 展開的記錄 `llm_answer` 為 NULL（查詢失敗或舊記錄）
- **THEN** 顯示「無 trace 資料」提示，不報錯

### Requirement: 品質手動標記
系統 SHALL 允許 Admin 對每筆查詢標記品質（好 / 差），標記結果儲存至 D1 `quality_score` 欄位。

#### Scenario: 標記查詢為「好」
- **WHEN** Admin 點擊某筆記錄的 ✓ 按鈕
- **THEN** 呼叫 `PATCH /api/admin/search-traces/:id`，`quality_score` 更新為 1，按鈕狀態更新為已選取

#### Scenario: 取消品質標記
- **WHEN** Admin 點擊已標記的按鈕
- **THEN** `quality_score` 重設為 -1（未評分）

### Requirement: trace 查詢 API
系統 SHALL 提供 `GET /api/admin/search-traces` endpoint，需有效 `ADMIN_TOKEN` 才可存取，支援分頁與關鍵字查詢。

#### Scenario: 未攜帶有效 token 的請求
- **WHEN** 請求未包含有效 `Authorization: Bearer <ADMIN_TOKEN>`
- **THEN** 回傳 401 Unauthorized
