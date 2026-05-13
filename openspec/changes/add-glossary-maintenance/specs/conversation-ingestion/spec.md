## MODIFIED Requirements

### Requirement: 文章生成 (Article Generation)
系統應利用 LLM 將原始對話日誌轉換為敘事性的技術文章，且生成過程 SHALL 遵循 `glossary.yaml` 中定義的標準術語譯法。

#### Scenario: 從日誌生成文章
- **WHEN** CLI 工具處理完畢
- **THEN** 它應輸出一個包含 YAML Frontmatter 的 Markdown 檔案，且格式符合 Astro 要求。

#### Scenario: 術語使用符合 glossary
- **WHEN** LLM 生成的文章包含 glossary.yaml 中列出的術語
- **THEN** 該術語的繁體中文譯法與 glossary.yaml 標準譯法一致（允許 ±10% 不符合率，因 LLM 為軟性約束）
