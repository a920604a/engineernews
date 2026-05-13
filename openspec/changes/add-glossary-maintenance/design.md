## Context

`scripts/ingest.ts` 用 llama-3.1-8b 從對話/筆記生成文章 frontmatter 與內容；`scripts/crawl.ts` 用 llama-3.1-70b 從 YouTube transcript 生成繁體中文摘要。兩者皆透過 prompt 控制輸出，目前 prompt 無術語約束。

文章以 `.md` 存放於 `src/content/posts/<category>/`，術語出現於正文。目前無統一術語定義。

## Goals / Non-Goals

**Goals:**
- 定義 `glossary.yaml` 格式，維護核心術語對照表（初始約 30-50 條）
- `scripts/check-glossary.ts` 掃描所有 `.md`，輸出術語使用報告（頻率 + 變體）
- ingest.ts 和 crawl.ts prompt 注入 glossary 片段，要求 LLM 遵循標準譯法

**Non-Goals:**
- 自動修改現有文章術語（僅檢查，不改寫）
- 多語言 glossary（只做繁體中文標準譯法）
- Glossary Web UI（純 CLI + YAML）

## Decisions

### D1: `glossary.yaml` 放根目錄，結構簡單扁平

```yaml
terms:
  - en: embedding
    zh: 嵌入向量
    note: 避免用「嵌入」（太短）或「向量嵌入」（冗餘）
  - en: inference
    zh: 推論
    note: 不用「推理」（推理偏向邏輯推斷語意）
```

**理由**: YAML 易於手動維護，且可直接在 TypeScript 用 `js-yaml` 讀取注入 prompt。

### D2: check-glossary.ts 輸出 Markdown 報告

掃描所有 `.md` 文章，對每個 glossary 條目：計算出現次數、列出上下文片段、標記英文未翻譯的使用。輸出 `glossary-report.md`（不 commit，僅本機查看）。

**替代方案**: 輸出 JSON → Markdown 更容易人工閱讀，報告用完即棄。

### D3: Prompt 注入採「條列提示」而非全文 glossary

只將標準譯法以條列注入 prompt，不附 note 欄位（避免 token 浪費）：

```
以下術語請使用標準繁體中文譯法：
- embedding → 嵌入向量
- inference → 推論
- fine-tuning → 微調
（共 N 條）
```

**理由**: 全量 glossary 注入可能超過 context 限制；條列格式 LLM 遵循率高。

## Risks / Trade-offs

- **[Glossary 初始建立成本]** → 提供腳本自動從現有文章抽取高頻術語作為初稿，降低冷啟動成本
- **[LLM 不完全遵循]** → glossary 注入是軟性約束，不能保證 100% 一致；check script 持續監控
- **[Glossary 版本漂移]** → 手動維護的 YAML 可能過時；接受，定期 `make check-glossary` 重新評估

## Migration Plan

1. 建立 `glossary.yaml` 初稿（從現有文章抽取高頻術語）
2. 實作 `scripts/check-glossary.ts`
3. 更新 `scripts/ingest.ts` prompt
4. 更新 `scripts/crawl.ts` prompt
5. 新增 `Makefile` target `check-glossary`
6. 驗證：用 `make ingest FILE=test.txt` 確認新文章術語符合 glossary
