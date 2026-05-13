## 1. 安裝依賴

- [x] 1.1 安裝 `react-markdown` 與 `remark-gfm`：`pnpm add react-markdown remark-gfm`

## 2. 建立 ChatWidget 元件

- [x] 2.1 建立 `src/components/ChatWidget.tsx`，實作基本 UI 框架（輸入框、送出按鈕、訊息列表區域）
- [x] 2.2 實作 SSE stream 呼叫 `/api/search`，傳入 `{ query, lang }`，逐字累積回答文字
- [x] 2.3 實作 `AbortController`，於元件 unmount 或 popup 關閉時取消進行中的 fetch
- [x] 2.4 整合 `react-markdown` + `remark-gfm` 渲染 LLM 回答，透過自訂 `components.a` 保留 citation 連結邏輯
- [x] 2.5 實作 Suggested Questions：定義 `zh-TW` / `en` 各 4 題推薦問題常數，初始狀態渲染按鈕，點擊後自動送出
- [x] 2.6 實作推薦問題在首次對話後隱藏的邏輯

## 3. 建立 ChatFloating 元件

- [x] 3.1 建立 `src/components/ChatFloating.tsx`，實作浮動按鈕（右下角定位、z-index: 9999）
- [x] 3.2 實作 popup 開關狀態（`isOpen` state）與動畫（CSS transition）
- [x] 3.3 實作 Escape 鍵關閉 popup（`keydown` event listener）
- [x] 3.4 實作行動版 bottom sheet 樣式（螢幕寬度 < 640px 時切換 CSS class）
- [x] 3.5 確認與現有 ScrollToTop 按鈕的位置不衝突（調整各自的 bottom/right 值）

## 4. 整合至 BaseLayout

- [x] 4.1 在 `src/layouts/BaseLayout.astro` 引入 `ChatFloating` 並傳入 `lang` prop
- [x] 4.2 以 `client:load` 掛載 ChatFloating React island

## 5. 更新 Search.tsx 的 Markdown 渲染

- [x] 5.1 移除 `src/components/Search.tsx` 中的 `renderAnswer()` 函式
- [x] 5.2 改用 react-markdown 渲染搜尋結果，保留 citation 連結自訂 renderer
- [ ] 5.3 確認 `/ai-search` 頁面的渲染結果正確（本機測試）

## 6. 驗證

- [ ] 6.1 本機啟動 `make dev`，確認浮動按鈕在首頁、文章頁、分類頁正常顯示
- [ ] 6.2 確認點擊後 popup 展開，輸入問題可取得 RAG 回答（需本機 D1 + Vectorize 環境）
- [ ] 6.3 確認推薦問題按鈕正常顯示，點擊後自動送出並消失
- [ ] 6.4 確認回答中的 Markdown 格式（code block、清單）正確渲染
- [ ] 6.5 確認 citation 連結（`[1]`）可點擊並指向正確文章
- [ ] 6.6 確認行動版 bottom sheet 樣式（瀏覽器 DevTools 模擬）
- [ ] 6.7 確認 ESC 鍵可關閉 popup
- [x] 6.8 執行 `make build` 確認 TypeScript 無錯誤
