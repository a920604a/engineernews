## ADDED Requirements

### Requirement: RAG 查詢 trace 非同步寫入
系統 SHALL 在每次 RAG 搜尋完整回答後，非同步將 LLM 回答全文與使用的 source chunks 寫入 D1，不阻塞串流回應。

#### Scenario: 成功完成 RAG 搜尋
- **WHEN** `/api/search` 串流回答完整送出（收到 `[DONE]`）
- **THEN** 系統透過 `ctx.waitUntil` 非同步將 `llm_answer`、`sources_json`、`query_embedding_ms`、`llm_ms` 寫入 `search_logs` 對應記錄

#### Scenario: RAG 搜尋中途失敗
- **WHEN** LLM 串流在 `[DONE]` 前中斷
- **THEN** 不寫入 trace（`llm_answer` 保持 NULL），`llm_ok` 欄位記錄為 false

#### Scenario: trace 寫入失敗
- **WHEN** D1 寫入操作拋出 exception
- **THEN** 錯誤被 catch 並 log，不影響已送出的搜尋回應

### Requirement: search_logs schema 擴充
D1 `search_logs` table SHALL 新增以下欄位，現有記錄不受影響（欄位為 nullable）：
- `llm_answer TEXT` — LLM 完整回答文字
- `sources_json TEXT` — JSON array，每項含 `{chunkId, title, score, url}`
- `quality_score INTEGER DEFAULT -1` — -1 未評分、0 差、1 好

#### Scenario: 舊 search_logs 記錄查詢
- **WHEN** 查詢 ALTER TABLE 前的舊記錄
- **THEN** `llm_answer`、`sources_json` 為 NULL，`quality_score` 為 -1，不報錯
