## ADDED Requirements

### Requirement: Automatic content translation
爬蟲獲取的內容必須自動翻譯為英文版。

#### Scenario: Generation of bilingual files
- **WHEN** 系統完成繁體中文摘要
- **THEN** 系統應同時在對應目錄生成 `.en.md` 結尾的英文翻譯版本

### Requirement: Synchronized publishing
中英文內容必須同步提交至 Git 倉庫。

#### Scenario: Single commit for bilingual content
- **WHEN** 執行 `crawl.ts`
- **THEN** 同一個 Commit 應包含中英文兩個版本的工作成果
