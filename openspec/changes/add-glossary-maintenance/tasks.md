## 1. 建立 glossary.yaml 初稿

- [ ] 1.1 手動建立 `glossary.yaml` 根目錄，填入初始 30 條核心術語（embedding、inference、fine-tuning、RAG、vector、attention、transformer、token 等常見 AI/工程術語）
- [ ] 1.2 驗證 YAML 格式正確（每條有 `en`、`zh` 欄位）

## 2. 實作 check-glossary.ts

- [ ] 2.1 建立 `scripts/check-glossary.ts`，讀取 `glossary.yaml`（使用 `js-yaml`）
- [ ] 2.2 實作文章掃描：遞迴讀取 `src/content/posts/**/*.md`，逐條術語搜尋出現次數與變體
- [ ] 2.3 實作報告生成：輸出 `glossary-report.md`（術語 → 標準譯法出現次數 / 非標準變體列表 + 文章位置）
- [ ] 2.4 在 `Makefile` 新增 `check-glossary` target：`npx tsx scripts/check-glossary.ts`

## 3. 實作 init-glossary 輔助腳本

- [ ] 3.1 在 `scripts/check-glossary.ts` 新增 `--init` flag：掃描文章中出現 5 次以上的英文技術術語，輸出 `glossary.draft.yaml`（不覆蓋 `glossary.yaml`）
- [ ] 3.2 在 `Makefile` 新增 `init-glossary` target

## 4. 更新 ingest.ts prompt

- [ ] 4.1 在 `scripts/ingest.ts` 新增 `buildGlossaryPrompt()` 函式：讀取 `glossary.yaml`，生成條列格式術語提示字串
- [ ] 4.2 將 glossary 提示注入現有 system prompt（metadata 生成與文章內容生成兩處）
- [ ] 4.3 本機測試：`make ingest FILE=test.md`，確認生成文章的術語符合 glossary

## 5. 更新 crawl.ts prompt

- [ ] 5.1 在 `scripts/crawl.ts` 引入同一 `buildGlossaryPrompt()` 函式（從共用 utils 匯出）
- [ ] 5.2 注入摘要生成 prompt
- [ ] 5.3 本機測試：`make crawl`（dry-run 模式），確認輸出術語符合 glossary

## 6. 驗證

- [ ] 6.1 執行 `make check-glossary`，確認 `glossary-report.md` 生成且可讀
- [ ] 6.2 確認 `check-glossary.ts` 唯讀（`git status` 顯示 `src/content/posts/` 無修改）
- [ ] 6.3 執行 `make init-glossary`，確認 `glossary.draft.yaml` 生成（不覆蓋 `glossary.yaml`）
- [ ] 6.4 執行 `make build` 確認 TypeScript 無錯誤
