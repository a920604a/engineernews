## Context

現有 RAG 問答入口為獨立頁面 `/ai-search`（`src/pages/ai-search.astro` + `src/components/Search.tsx`），使用 `/api/search` endpoint 進行 Vectorize 向量搜尋 + qwen-14b 串流回答。使用者需主動導頁才能使用，阻斷閱讀流程。

`BaseLayout.astro` 是所有頁面的共用 shell，是注入全域 UI 元件的最佳位置。

## Goals / Non-Goals

**Goals:**
- 在所有頁面右下角新增常駐浮動聊天按鈕
- 點擊按鈕展開 popup，可直接使用 RAG 問答（複用 `/api/search`）
- 初始狀態顯示推薦問題，降低使用門檻
- LLM 回答支援 Markdown 格式渲染（code block、表格、清單）
- 現有 `/ai-search` 頁面保持不變

**Non-Goals:**
- 跨頁面的對話歷史持久化（session 內無狀態，每次 popup 開啟為新對話）
- 修改 `/api/search` 後端邏輯
- 多輪對話 context 傳遞給 LLM（維持現有單問單答模式）
- 行動版以外的 UX 差異（維持一套 UI）

## Decisions

### D1: 複用 `/api/search` 不新增後端路由

ChatWidget 直接呼叫現有 `/api/search`，傳入 `{ query, lang }` 並接收 SSE stream。

**理由**: 後端已穩定，避免引入重複邏輯；且現有 endpoint 已處理 Vectorize + LLM 串流，功能完整。

**替代方案**: 新增 `/api/chat` 支援多輪對話 → 超出本次範圍，留作未來迭代。

### D2: ChatFloating 為獨立 React 元件，注入 BaseLayout

`ChatFloating.tsx` 作為 React island（`client:load`）掛載於 `BaseLayout.astro` 底部，管理 popup 開關狀態與動畫。`ChatWidget.tsx` 為 popup 內容，由 ChatFloating 條件渲染。

**理由**: Astro island 架構符合現有模式（Search.tsx 同為 React island）；不影響 SSR 靜態部分的效能。

**替代方案**: 用純 CSS + `<dialog>` 實作 → Markdown 渲染與 SSE stream 處理需要 React，維持一致性較佳。

### D3: 引入 react-markdown + remark-gfm

答案渲染改用 `react-markdown`，citation 連結（`[1]`）透過自訂 `components.a` renderer 處理，保留現有連結邏輯。

**理由**: 現有 `renderAnswer()` 用正則切割字串，不處理 Markdown 語法，LLM 若輸出 code block 或表格會原文顯示，影響可讀性。

**替代方案**: 繼續用自訂 parser 擴充支援更多語法 → 維護成本高，react-markdown 為標準解法。

**Bundle 影響**: react-markdown + remark-gfm ≈ 50KB gzipped，可接受；Search.tsx 本身已是 React island，不影響非 chat 頁面。

### D4: Suggested Questions 為靜態設定，中英分版

推薦問題以常數陣列定義在 `ChatWidget.tsx`，按 `lang` prop 切換中英版本，各 4 題，聚焦在部落格常見主題（AI、架構決策、工具比較）。

**理由**: 動態從後端抓推薦問題需要額外 API，靜態版本足夠且易於調整。

## Risks / Trade-offs

- **[z-index 衝突]** → 浮動按鈕 z-index 設 9999，並在 popup 開啟時加 `overflow: hidden` 至 body，避免捲動衝突
- **[行動版 popup 尺寸]** → popup 在小螢幕改為近全螢幕（bottom sheet 風格），透過 CSS media query 處理
- **[SSE stream 在 popup 關閉時未取消]** → ChatWidget unmount 時呼叫 `controller.abort()` 取消 fetch
- **[react-markdown XSS]** → react-markdown 預設 sanitize HTML，無需額外處理；禁用 `dangerouslyAllowHtml`

## Migration Plan

1. 安裝 `react-markdown` + `remark-gfm`
2. 新增 `ChatFloating.tsx` + `ChatWidget.tsx`
3. 修改 `BaseLayout.astro` 注入 ChatFloating
4. 更新 `Search.tsx` 的 `renderAnswer()` 改用 react-markdown（`/ai-search` 頁也同步受益）
5. 無 rollback 風險：浮動元件為加法，不影響現有功能

## Open Questions

- 推薦問題的具體題目是否需要用戶確認？（目前設計為可隨時修改的靜態常數）
- popup 是否應記住上次對話內容直到頁面重新載入？（目前設計為每次開啟清空）
