## Why

engineernews 的文章靠 LLM 各自翻譯術語，同一個技術概念在不同文章可能有不同譯法（如「embedding」可能出現「嵌入」「向量嵌入」「embeddings」等）。隨著文章量增加，術語不一致會降低 RAG 搜尋精度（向量相似度受詞彙變異影響），也損害讀者體驗。

## What Changes

- 新增 `glossary.yaml`：核心術語對照表（英文 → 繁體中文標準譯法 + 說明），可手動維護
- 新增 `scripts/check-glossary.ts`：掃描所有 `.md` 文章，統計各術語出現頻率及譯法，輸出不一致報告
- 更新 `scripts/ingest.ts` prompt：注入 glossary 作為翻譯參考，要求 LLM 使用標準譯法
- 更新 `scripts/crawl.ts` prompt：同上，爬蟲生成摘要時遵循 glossary

## Capabilities

### New Capabilities

- `glossary-definition`: 術語對照表的格式規範與維護方式（`glossary.yaml`）
- `glossary-coverage-check`: 掃描腳本，檢查文章術語使用一致性並產生報告

### Modified Capabilities

- `conversation-ingestion`: ingest prompt 新增 glossary 注入，要求翻譯遵循標準術語

## Impact

- **新增**: `glossary.yaml`（根目錄）
- **新增**: `scripts/check-glossary.ts`
- **修改**: `scripts/ingest.ts`（prompt 注入 glossary 片段）
- **修改**: `scripts/crawl.ts`（同上）
- **修改**: `Makefile`（新增 `make check-glossary` 指令）
- **不影響**: 現有文章內容（腳本只檢查，不自動修改）
