## ADDED Requirements

### Requirement: 術語使用一致性掃描
系統 SHALL 提供 `scripts/check-glossary.ts`，掃描 `src/content/posts/` 下所有 `.md` 文章，對 `glossary.yaml` 中每個術語統計使用情況，並輸出 Markdown 報告。

#### Scenario: 執行一致性檢查
- **WHEN** 執行 `make check-glossary`
- **THEN** 腳本輸出 `glossary-report.md`，列出每個術語的：出現次數、標準譯法使用次數、非標準變體列表與出現位置（文章標題 + 行號）

#### Scenario: 術語完全一致
- **WHEN** 某術語在所有文章中皆使用標準譯法
- **THEN** 報告中該條目標記為 ✓，不列出變體

#### Scenario: 術語存在不一致
- **WHEN** 某術語出現非標準變體（如 `embedding` 標準為「嵌入向量」，但文章中出現「嵌入」）
- **THEN** 報告列出非標準變體、出現次數、所在文章名稱

### Requirement: 掃描結果不修改原始文章
`check-glossary.ts` SHALL 為唯讀操作，不自動修改任何 `.md` 文章內容。

#### Scenario: 執行掃描後檔案狀態
- **WHEN** `make check-glossary` 執行完畢
- **THEN** `src/content/posts/` 下所有 `.md` 檔案的 mtime 與內容不變，只有 `glossary-report.md` 被建立或更新
