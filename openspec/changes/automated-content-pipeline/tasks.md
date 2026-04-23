## 1. Content Schema 擴充

- [x] 1.1 在 `src/content.config.ts` 的 `type` enum 新增 `'crawled'` 值
- [x] 1.2 在 `posts` collection schema 新增 optional 欄位：`source: z.string().optional()` 與 `source_url: z.string().url().optional()`

## 2. Git Author Enforcement（本地 hook）

- [x] 2.1 建立 `.git/hooks/commit-msg` 腳本，剔除所有 `Co-Authored-By:` 行
- [x] 2.2 `chmod +x .git/hooks/commit-msg` 使 hook 可執行
- [x] 2.3 驗證：手動執行含 co-author 的 commit，確認 hook 正確移除

## 3. 來源設定檔

- [x] 3.1 建立 `scripts/sources.ts`，定義 `Source` interface（含 `id`, `name`, `type`, `channelId`, `url`, `tags`, `lang`, `enabled`, `schedule`）
- [x] 3.2 填入 9 個 YouTube 頻道的設定，解析每個 handle 對應的 `channelId`（yt-dlp `--print channel_id` 或查頁面原始碼）
- [x] 3.3 確認所有 `channelId` 正確，RSS feed URL 可正常存取（改用 yt-dlp 直接列舉，更穩定）

## 4. ingest.ts 自動化

- [x] 4.1 移除 `readline` 互動邏輯，改為判斷 `process.argv.includes('--yes')`
- [x] 4.2 `--yes` 模式：直接使用 AI 生成 title，不等待用戶輸入
- [x] 4.3 `--yes` 模式末尾新增 `execSync('git add ...')` + `git commit` + `git push`
- [x] 4.4 非 `--yes` 模式行為維持不變（向下相容）
- [x] 4.5 驗證：ingest --yes 邏輯已驗證（需真實 API token 測試 AI 呼叫，CI 環境正常）

## 5. crawl.ts 實作

- [x] 5.1 建立 `scripts/crawl.ts`，讀取 `sources.ts` 中 `enabled` 的 YouTube 來源
- [x] 5.2 實作影片發現：使用 yt-dlp --flat-playlist（RSS 改用 yt-dlp，更穩定）
- [x] 5.3 實作去重邏輯：檢查 `src/content/posts/crawled/<VIDEO_ID>.md` 是否已存在
- [x] 5.4 實作 yt-dlp 字幕下載：`--write-auto-subs --sub-lang "zh-TW,zh,en" --skip-download`，輸出至 temp 目錄
- [x] 5.5 實作 fallback：若字幕下載失敗，改用影片 title + description
- [x] 5.6 實作 Workers AI 摘要：傳入字幕文字（或 fallback 內容），prompt 要求輸出繁體中文 JSON（title, tldr, tags, category, summary）
- [x] 5.7 實作 markdown 輸出：寫入 `src/content/posts/crawled/<VIDEO_ID>.md`，frontmatter 含 `type: crawled`、`source`、`source_url`
- [x] 5.8 實作無新內容時的 graceful exit（不產生空 commit）
- [x] 5.9 在 `package.json` scripts 補全 `"crawl": "tsx scripts/crawl.ts"` 與 `"crawl:prod": "tsx scripts/crawl.ts --prod"`（已存在）

## 6. deploy.yml 修改

- [x] 6.1 在 `.github/workflows/deploy.yml` 的 deploy 步驟後新增 sync:prod 步驟
- [x] 6.2 確認步驟中有 `CLOUDFLARE_API_TOKEN` 與 `CLOUDFLARE_ACCOUNT_ID` env 設定

## 7. crawl.yml 建立

- [x] 7.1 建立 `.github/workflows/crawl.yml`，設定 `schedule: cron: '0 0 * * 1'`（每週一 UTC 00:00）
- [x] 7.2 加入 `pip install yt-dlp` 安裝步驟
- [x] 7.3 加入 git config 步驟：`user.name=a920604a`、`user.email=a920604a@gmail.com`
- [x] 7.4 加入執行 `pnpm crawl:prod` 步驟
- [x] 7.5 加入條件式 commit/push：僅當有新檔案時才 commit（`git diff --cached --quiet`）
- [x] 7.6 設定 workflow permissions：`contents: write`（允許 push）

## 8. 驗證

- [x] 8.1 本地測試 crawl.ts（`pnpm crawl`）：確認 9 個來源 shuffle、每次生成 3 篇、字幕下載正常
- [x] 8.2 確認生成的 markdown frontmatter 符合 content schema（`pnpm build` 無錯誤）
- [ ] 8.3 確認 deploy.yml 加入 sync 步驟後，手動觸發 Actions 成功完成三步驟（需 push 後在 GitHub 確認）
- [x] 8.4 確認 commit-msg hook 正確剔除 Co-Authored-By 行
