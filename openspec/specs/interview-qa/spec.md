## ADDED Requirements

### Requirement: AI 交互式 QA 介面
系統應提供一個基於 RAG 的對話框，讓用戶針對技術決策進行提問。

#### Scenario: 用戶詢問技術問題
- **WHEN** 用戶在 QA 框輸入「關於 D1 遷移的步驟是什麼？」
- **THEN** 系統應檢索 `post_chunks` 與 `Vectorize` 索引，並由 AI 彙整出精確答案。

### Requirement: 面試問題提取 (QA Mode)
當文章類別為 `interview` 時，系統應能自動提取其中的「問題」與「回答」對。

#### Scenario: 進入面試模式
- **WHEN** 用戶查看一篇面試相關文章
- **THEN** 系統應提供一個「隱藏/顯示答案」的按鈕，模擬面試情境。
