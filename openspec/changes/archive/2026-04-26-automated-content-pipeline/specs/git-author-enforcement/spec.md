## ADDED Requirements

### Requirement: 本地 commit Co-Author 清除
`.git/hooks/commit-msg` hook SHALL 自動移除 commit message 中所有 `Co-Authored-By:` 行。

#### Scenario: Claude Code 產生 commit 時
- **WHEN** git commit 執行且 message 含 `Co-Authored-By: Claude ...` 行
- **THEN** hook SHALL 從 message 中剔除該行，最終 commit 僅保留 `a920604a` 為 author

#### Scenario: 正常 commit（無 co-author）
- **WHEN** commit message 不含 `Co-Authored-By:` 行
- **THEN** hook SHALL 不修改 message，直接通過

---

### Requirement: CI commit author 鎖定
GitHub Actions 中所有 git commit SHALL 使用 `a920604a` 作為 author name 與 email。

#### Scenario: crawl workflow 產生 commit
- **WHEN** crawl.yml 執行並有新文章需要 commit
- **THEN** git config SHALL 設定為 `user.name=a920604a`、`user.email=a920604a@gmail.com`，所有 commit 的 author 為 `a920604a`
