## Why

目前的 AI 搜尋僅能進行語義檢索（顯示相似文章），而競爭對手已開始佈局 RAG 架構。為了超越競爭對手，我們需要將 `engineernews` 從「內容入口」進化為「工程決策大腦」，提供直接的解答、可追蹤的引用，並具備自動化的全球化能力。

## What Changes

- **後端 RAG 升級**：將 `/api/search` 從單純檢索擴展為「檢索 + 生成」架構。
- **引用歸因系統**：在 RAG 回答中精確標註來源連結。
- **多模態知識提取**：在 YouTube 爬蟲流程中加入 AI 分析，自動生成 Mermaid.js 架構圖表。
- **自動化 i18n 同步**：利用 Workers AI 自動翻譯文章摘要，實現中英雙語同步發布。

## Capabilities

### New Capabilities
- `conversational-search`: 提供基於 RAG 的對話式問答能力，支援引用歸因。
- `visual-knowledge-extraction`: 從非結構化內容中提取技術結構並生成 Mermaid 圖表。
- `automated-i18n-sync`: 自動化內容翻譯與雙語路由同步流程。

### Modified Capabilities
- `content-engine`: 調整以支援 Mermaid 圖表渲染與 i18n 欄位。

## Impact

- **API**: `src/pages/api/search.ts` 邏輯重構。
- **UI**: `src/components/Search.tsx` RAG 邏輯介接。
- **Scripts**: `scripts/crawl.ts` 與 `scripts/ingest.ts` 流程升級。
