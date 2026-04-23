## ADDED Requirements

### Requirement: 非互動模式（--yes flag）
`ingest` 腳本 SHALL 支援 `--yes` flag，跳過所有 readline 互動，全程自動執行。

#### Scenario: 使用 --yes 執行
- **WHEN** 執行 `pnpm ingest <file> --yes`
- **THEN** 系統 SHALL 直接採用 AI 生成的 title，不等待用戶輸入，完整執行後自動 commit 並 push

#### Scenario: 不使用 --yes 執行（向下相容）
- **WHEN** 執行 `pnpm ingest <file>`（無 --yes）
- **THEN** 行為 SHALL 與原先相同，保留 readline 互動確認標題

---

### Requirement: 自動 git commit/push
在 `--yes` 模式下，ingest 腳本 SHALL 於文章生成後自動執行 git commit 與 push。

#### Scenario: 成功自動 commit
- **WHEN** `--yes` 模式下文章寫入成功
- **THEN** 系統 SHALL 執行 `git add <outputPath>`、`git commit -m "post: add <slug>"`、`git push`

#### Scenario: git push 失敗
- **WHEN** push 發生錯誤（如 remote 衝突）
- **THEN** 系統 SHALL 輸出錯誤訊息，文章檔案保留，不刪除已生成內容
