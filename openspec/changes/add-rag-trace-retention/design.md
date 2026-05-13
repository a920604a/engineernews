## Context

`/api/search` 是 RAG 搜尋 endpoint：embed query → Vectorize → 取 top-K chunks → qwen-14b SSE stream。回答以 `text/event-stream` 串流至前端，stream 結束時 server 側已持有完整回答文字。

目前 `search_logs` schema：
```sql
id, query, lang, vector_hits, keyword_hits, llm_ok, error, duration_ms, created_at
```

Cloudflare Workers 支援 `ctx.waitUntil(promise)` — 在 Response 回傳後繼續執行非同步工作，不阻塞 client。

## Goals / Non-Goals

**Goals:**
- stream 結束後非同步寫入 LLM 完整回答與 source chunks 至 D1
- Admin 後台新增 trace 瀏覽 tab，支援展開查看完整回答
- 支援手動品質標記（好 / 差 / 未評）

**Non-Goals:**
- 自動 LLM-as-judge 品質評分（人工標記足夠作為第一版）
- Trace 資料匯出（CSV、API）
- 修改 RAG 搜尋邏輯或 prompt

## Decisions

### D1: trace 寫入用 `ctx.waitUntil`，不阻塞串流

stream 結束時在 handler 內累積完整回答文字，在 `ctx.waitUntil` 中執行 D1 insert。

**理由**: trace 寫入失敗不應影響使用者搜尋體驗；Workers 平台原生支援此模式。

**替代方案**: 在 stream 過程中逐步寫入 → D1 write 次數多，且 stream 中途失敗難以處理。

### D2: 擴充 `search_logs` 而非新建 `search_traces` table

在現有 table 加欄位，避免 JOIN 複雜度。新欄位均為 nullable，舊記錄不受影響。

```sql
ALTER TABLE search_logs
  ADD COLUMN llm_answer TEXT,
  ADD COLUMN sources_json TEXT,   -- JSON array of {chunkId, title, score}
  ADD COLUMN quality_score INTEGER DEFAULT -1;  -- -1未評 0差 1好
```

**替代方案**: 新建 `search_traces` table + FK → 過度設計，目前量不需要正規化。

### D3: Admin trace 檢視為新 detail tab，複用現有 detail view 框架

AdminDashboard 已有 `DetailView` union type 與 tab 切換邏輯，新增 `'search-traces'` 成員即可。列表點擊後展開 modal 或 inline 顯示完整回答。

**品質標記**: 點擊 ✓ / ✗ 按鈕呼叫 `PATCH /api/admin/search-traces/:id`，更新 `quality_score`。

## Risks / Trade-offs

- **[D1 儲存增長]** LLM 回答平均 500 字，每日 50 次查詢 ≈ 25KB/day，可接受。可設定 30 天 TTL 清除舊 trace → 暫時不實作，留 TODO
- **[stream 中途失敗不寫 trace]** → 只在完整收到 `[DONE]` 後才寫入，部分回答不記錄
- **[sources_json schema 版本]** → 以 JSON string 存 D1，schema 變動無需 migration

## Migration Plan

1. 新增 `migrations/NNNN_search_logs_trace.sql`（ALTER TABLE）
2. 本機 `make d1-migrate` 驗證
3. 修改 `/api/search`，stream 結束後 `ctx.waitUntil` 寫入 trace
4. 新增 `/api/admin/search-traces` GET + PATCH endpoint
5. AdminDashboard 新增 tab
6. Production `make sync-prod`
