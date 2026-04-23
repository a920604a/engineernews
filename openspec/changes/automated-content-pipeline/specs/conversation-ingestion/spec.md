## MODIFIED Requirements

### Requirement: 文章生成（Article Generation）
系統 SHALL 利用 LLM 將原始對話日誌轉換為敘事性的技術文章。支援互動模式（預設）與非互動模式（`--yes` flag）。

#### Scenario: 從日誌生成文章（互動模式）
- **WHEN** CLI 工具處理完畢且未使用 `--yes` flag
- **THEN** 它 SHALL 輸出一個包含 YAML Frontmatter 的 Markdown 檔案，且格式符合 Astro 要求，並等待用戶確認或修改標題

#### Scenario: 從日誌生成文章（非互動模式）
- **WHEN** CLI 工具處理完畢且使用了 `--yes` flag
- **THEN** 它 SHALL 直接採用 AI 生成的標題，輸出 Markdown 檔案，不等待任何用戶輸入，並自動執行 git commit + push
