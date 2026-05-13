## Why

engineernews 的 RAG 搜尋功能需要跳頁至 `/ai-search` 才能使用，入口隱蔽、摩擦高，導致使用率偏低。使用者在閱讀文章時若有疑問，必須中斷閱讀流程才能發問，且回到文章後失去上下文。對標 quidproquo 的 ChatFloating 設計，在不改變現有 `/ai-search` 頁面的前提下，新增常駐浮動入口，讓 RAG 問答隨時可用。

## What Changes

- 新增 `ChatFloating` 元件：右下角常駐浮動按鈕，點擊後展開 popup 聊天視窗
- 新增 `ChatWidget` 元件：popup 內的完整對話介面，複用現有 `/api/search` RAG endpoint
- 新增 Suggested Questions：初始狀態顯示 4 個推薦問題，引導使用者發問
- 升級 Answer 渲染：引入 `react-markdown` + `remark-gfm`，取代現有自訂 `renderAnswer()` 純文字解析，支援 code block、表格、清單等 Markdown 格式
- 整合至 `BaseLayout.astro`：所有頁面（含文章頁、首頁、分類頁）自動顯示浮動按鈕

## Capabilities

### New Capabilities

- `chat-floating-widget`: 浮動聊天按鈕 + popup 視窗容器，管理開關狀態與定位邏輯
- `chat-suggested-questions`: 初始推薦問題清單，點擊後填入輸入框並自動送出
- `chat-markdown-rendering`: LLM 回答的 Markdown 渲染層，支援 GFM 語法與 citation 連結

### Modified Capabilities

- `ai-readiness`: ChatWidget 使用現有 `/api/search` endpoint，不修改 API 行為，但 chat UI 新增對話歷史（多輪問答），需確認現有 endpoint 是否支援 context 傳遞或維持無狀態

## Impact

- **新增元件**: `src/components/ChatFloating.tsx`, `src/components/ChatWidget.tsx`
- **修改**: `src/layouts/BaseLayout.astro`（注入 ChatFloating）
- **修改**: `src/components/Search.tsx`（Answer 渲染改用 react-markdown，維持 citation 連結邏輯）
- **新增依賴**: `react-markdown`, `remark-gfm`
- **不影響**: `/api/search` endpoint、D1、Vectorize、TTS、現有 `/ai-search` 頁面
