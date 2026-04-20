## ADDED Requirements

### Requirement: 對話日誌解析 (Conversation Log Parsing)
系統應提供一個 CLI 工具來解析 Claude Code 等工程對話日誌。

#### Scenario: 解析日誌文件
- **WHEN** 執行 CLI 工具並提供日誌文件路徑
- **THEN** 它應提取文字內容並識別其中的程式碼塊。

### Requirement: 文章生成 (Article Generation)
系統應利用 LLM 將原始對話日誌轉換為敘事性的技術文章。

#### Scenario: 從日誌生成文章
- **WHEN** CLI 工具處理完畢
- **THEN** 它應輸出一個包含 YAML Frontmatter 的 Markdown 檔案，且格式符合 Astro 要求。
