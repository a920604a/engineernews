## MODIFIED Requirements

### Requirement: Deploy 後自動同步 D1
GitHub Actions deploy pipeline SHALL 在每次 Cloudflare Pages 部署成功後，自動執行 `pnpm sync:prod`。sync:prod 的行為為增量模式：只處理新增或更新的文章，並清除已刪除文章的殘留資料。

#### Scenario: push 觸發完整 pipeline（增量模式）
- **WHEN** 有 commit push 至 `main` branch
- **THEN** CI SHALL 依序執行：build → deploy Pages → sync:prod，其中 sync:prod SHALL 只處理內容有改動的文章

#### Scenario: sync:prod 失敗
- **WHEN** `sync:prod` 步驟回傳非零 exit code
- **THEN** CI job SHALL 標記為失敗，Pages 已部署的版本不受影響

---

### Requirement: D1 Sync 冪等性
`sync:prod` 執行 SHALL 為冪等操作，多次執行結果相同。

#### Scenario: 重複執行 sync（增量模式）
- **WHEN** `sync:prod` 對同一批未改動文章執行兩次
- **THEN** 第二次執行 SHALL 跳過所有文章，D1 與 Vectorize 不發生任何寫入
