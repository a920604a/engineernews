## Why

現有 `search_logs` 只記錄查詢的 metadata（duration、hit count、llm_ok flag），不保留 LLM 實際回答內容與使用的 source chunks，導致完全無法事後評估回答品質、診斷幻覺問題或改進 prompt。加入 trace 保留後，可定期抽查並量化 RAG 品質。

## What Changes

- 擴充 `search_logs` D1 schema：新增 `llm_answer`（LLM 完整回答）、`sources_json`（使用的 chunk 列表）、`query_embedding_ms`、`llm_ms` 欄位
- 新增 `/api/admin/search-traces` endpoint：分頁查詢 trace 記錄，支援按查詢關鍵字、日期範圍過濾
- 在 `AdminDashboard.tsx` 新增 Search Traces 詳細檢視 tab：列出最近查詢、展開查看完整 LLM 回答與引用的 sources
- 新增簡易 LLM 品質評分欄位 `quality_score`（-1 未評分 / 0 差 / 1 好），支援從 Admin 手動標記

## Capabilities

### New Capabilities

- `rag-trace-storage`: search_logs 擴充 schema，記錄 LLM 回答與 source chunks
- `rag-trace-viewer`: Admin 後台的 trace 瀏覽介面，含過濾、展開與品質標記功能

### Modified Capabilities

（無，/api/search endpoint 行為不變，僅在成功回答後額外寫入 trace 資料）

## Impact

- **D1 migration**: `migrations/` 新增一個 SQL，擴充 `search_logs` table
- **修改**: `src/pages/api/search.ts`（在 stream 結束後異步寫入 trace）
- **新增**: `src/pages/api/admin/search-traces.ts`
- **修改**: `src/components/AdminDashboard.tsx`（新增 Search Traces tab）
- **不影響**: RAG 搜尋效能（trace 寫入為非阻塞 waitUntil）、現有 search_logs 查詢
