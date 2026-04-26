## ADDED Requirements

### Requirement: Global command center access
系統必須支援透過鍵盤快捷鍵 (⌘K / Ctrl+K) 隨時喚起全局指令中心。

#### Scenario: Opening the command center
- **WHEN** 使用者在任何頁面按下 ⌘K 或 Ctrl+K
- **THEN** 系統應顯示一個覆蓋全站的指令輸入框

### Requirement: Unified search and navigation
指令中心應整合 Pagefind 全文搜尋結果，並支援快速跳轉至首頁、分類頁或專案頁。

#### Scenario: Searching within command center
- **WHEN** 使用者在指令框輸入關鍵字
- **THEN** 系統即時顯示 Pagefind 的搜尋結果列表，並支援鍵盤導覽（上下鍵）

### Requirement: Visual feedback for commands
選中特定指令或搜尋結果時，系統必須提供明顯的視覺反饋（如背景色變化）。

#### Scenario: Keyboard navigation in results
- **WHEN** 使用者使用方向鍵切換搜尋結果
- **THEN** 被選中的項目應顯示特定的高亮樣式
