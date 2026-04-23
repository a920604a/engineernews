## ADDED Requirements

### Requirement: Deploy 後自動同步 D1
GitHub Actions deploy pipeline SHALL 在每次 Cloudflare Pages 部署成功後，自動執行 `pnpm sync:prod`。

#### Scenario: push 觸發完整 pipeline
- **WHEN** 有 commit push 至 `main` branch
- **THEN** CI SHALL 依序執行：build → deploy Pages → sync:prod，三步驟全部完成才算成功

#### Scenario: sync:prod 失敗
- **WHEN** `sync:prod` 步驟回傳非零 exit code
- **THEN** CI job SHALL 標記為失敗，用戶可從 Actions log 查看錯誤，Pages 已部署的版本不受影響

---

### Requirement: D1 Sync 冪等性
`sync:prod` 執行 SHALL 為冪等操作，多次執行不產生重複資料。

#### Scenario: 重複執行 sync
- **WHEN** `sync:prod` 對同一批文章執行兩次
- **THEN** D1 中的資料 SHALL 與第二次執行後相同（ON CONFLICT DO UPDATE 保證）
