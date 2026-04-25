## Context

目前 `engineernews` 具備基礎的語義搜尋能力，但缺乏對檢索內容的整合與解釋。用戶需要點進文章自行閱讀才能獲得答案。而競爭對手已開始實作更直覺的問答模式。此外，YouTube 字幕雖然提供了資訊，但缺乏視覺化呈現，且目前的 i18n 流程仍依賴人工。

## Goals / Non-Goals

**Goals:**
- 在 `/api/search` 實作 RAG (Retrieval-Augmented Generation) 流程。
- 支援流式 (Streaming) 的 AI 回答輸出。
- 在 `crawl.ts` 中自動生成技術圖表 (Mermaid.js)。
- 建立全自動的中英雙語摘要同步機制。

**Non-Goals:**
- 重構搜尋 UI 或實作指揮中心（由 post-ui-visual-polish 負責）。
- 實作多輪對話 (Chat History)。
- 修改 D1 Schema 結構。

## Decisions

### 1. RAG 流程：Two-Step Generation
**決定**：先透過 `VECTORIZE` 取得最相關片段，再將片段與問題餵給 `@cf/meta/llama-3.1-8b-instruct`。
**理由**：降低幻覺並支援引用功能。

### 2. 流式輸出 (Streaming)
**決定**：後端採用 Web Streams API 轉發 Workers AI 的輸出。
**理由**：提昇感知速度。

### 3. 自動化視覺化：Mermaid Extraction
**決定**：在 `crawl.ts` 中加入 Prompt 提取 Mermaid 語法結構。
**理由**：極大提昇技術內容的掃視效率。

### 4. i18n 同步
**決定**：在摘要生成後立即翻譯為英文版本。
**理由**：保證雙語內容同步率。

## Risks / Trade-offs

- **[Risk] AI 幻覺** → **Mitigation**: System Prompt 限制 AI 只能根據 Context 回答。
- **[Risk] Mermaid 語法錯誤** → **Mitigation**: 強調語法正確性並預設 fallback。
