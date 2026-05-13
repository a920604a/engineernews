## 1. D1 Schema 擴充

- [x] 1.1 建立 `migrations/0008_search_logs_trace.sql`，ALTER TABLE 新增 `llm_answer`、`sources_json`、`quality_score` 欄位
- [x] 1.2 執行 `make d1-migrate` 驗證 migration 成功（本機 D1）

## 2. API 修改：trace 寫入

- [x] 2.1 修改 `src/pages/api/search.ts`：tee stream 捕捉 llmAnswer，同時累積 sources
- [x] 2.2 stream 收完後透過 `ctx.waitUntil` 非同步 INSERT log + UPDATE trace 欄位
- [x] 2.3 用 try/catch 包裝 trace 寫入，確保失敗不影響主流程，錯誤寫入 logger

## 3. Admin API：trace 查詢與標記

- [x] 3.1 建立 `src/pages/api/admin/search-traces.ts`，實作 `GET`：分頁查詢 search_logs（含 trace 欄位），支援 `q` 關鍵字參數
- [x] 3.2 同檔實作 `PATCH`：根據 `id` 更新 `quality_score`（驗證值必須為 -1、0、1）
- [x] 3.3 確認兩個 method 皆驗證 `ADMIN_TOKEN`，未授權回 401

## 4. AdminDashboard 新增 Search Traces Tab

- [x] 4.1 在 `AdminDashboard.tsx` 的 `DetailView` type 新增 `'search-traces'`
- [x] 4.2 新增 tab 按鈕與對應 fetch 邏輯（呼叫 `/api/admin/search-traces`）
- [x] 4.3 實作 trace 列表 UI：每筆顯示 query、時間、duration、品質狀態圖示
- [x] 4.4 實作關鍵字即時過濾（client-side filter）
- [x] 4.5 實作展開功能：點擊後 inline 顯示 `llm_answer`（Markdown 渲染）與 sources 列表
- [x] 4.6 實作品質標記按鈕（✓ / ✗），點擊後呼叫 PATCH endpoint 並更新本地狀態

## 5. 驗證

- [x] 5.1 本機測試：送出搜尋查詢，確認 search_logs 有 llm_answer 寫入（Admin → Search Traces tab 可見）
- [x] 5.2 確認 stream 中途取消時不寫入 trace（關閉 popup 或 F5）
- [x] 5.3 確認品質標記按鈕正常更新並持久化（重新整理 Admin 後仍顯示標記）
- [x] 5.4 確認舊 search_logs 記錄（llm_answer NULL）展開時顯示「無 trace 資料」
- [x] 5.5 執行 `make build` 確認 TypeScript 無錯誤
