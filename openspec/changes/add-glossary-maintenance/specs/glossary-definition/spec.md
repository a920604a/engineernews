## ADDED Requirements

### Requirement: glossary.yaml 格式規範
系統 SHALL 在專案根目錄維護 `glossary.yaml`，定義核心技術術語的標準繁體中文譯法，格式須為機器可讀。

#### Scenario: 讀取 glossary 條目
- **WHEN** 腳本讀取 `glossary.yaml`
- **THEN** 每個條目包含 `en`（英文術語）、`zh`（標準繁體中文譯法）兩個必填欄位；`note` 為選填說明

#### Scenario: 缺少必填欄位
- **WHEN** glossary.yaml 中某條目缺少 `en` 或 `zh`
- **THEN** check-glossary.ts 執行時報錯並列出問題條目，不繼續掃描

### Requirement: Glossary 初稿自動生成
系統 SHALL 提供從現有文章抽取高頻術語作為 glossary 初稿的能力，降低冷啟動成本。

#### Scenario: 執行初稿生成
- **WHEN** 執行 `make init-glossary`
- **THEN** 腳本掃描所有 `.md` 文章，抽取出現 5 次以上的英文技術術語，輸出待確認的 YAML 草稿至 `glossary.draft.yaml`（不覆蓋現有 `glossary.yaml`）
