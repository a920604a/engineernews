## ADDED Requirements

### Requirement: RAG-based answer generation
系統必須能夠根據檢索到的文章片段，生成一段整合後的回答。

#### Scenario: Successful answer generation
- **WHEN** 用戶在搜尋框輸入一個技術問題
- **THEN** 系統檢索相關片段並顯示一段由 AI 撰寫的摘要回答

### Requirement: Citation attribution
AI 生成的回答必須包含引用連結，點擊後導向原始文章。

#### Scenario: Clicking a citation
- **WHEN** 用戶點擊回答中的引用標記（如 [1]）
- **THEN** 系統將頁面導向對應的內容頁面

### Requirement: Streaming search results
搜尋結果與 AI 回答必須以流式 (Streaming) 方式呈現，以提昇使用者體驗。

#### Scenario: Progressive rendering
- **WHEN** 用戶開始搜尋
- **THEN** 系統逐字顯示 AI 回答，而不是等全部完成後才一次顯示
