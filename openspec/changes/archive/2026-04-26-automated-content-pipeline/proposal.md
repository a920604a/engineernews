## Why

目前內容發布流程需要大量手動步驟（ingest 互動確認、手動 git commit/push、手動 sync D1），且沒有機制自動從外部來源（YouTube 頻道）抓取學習內容。隨著訂閱頻道增加，維護成本不斷上升，需要一套自動化流水線降低人工介入。

## What Changes

- **ingest 腳本**：移除 readline 互動，支援 `--yes` flag 全自動執行；完成後自動 git commit + push（author 鎖定為 `a920604a`）
- **GitHub Actions deploy pipeline**：在現有 build + deploy 後新增 `sync:prod` 步驟，確保 D1 永遠與 Pages 同步
- **YouTube 爬蟲腳本**（`scripts/crawl.ts`）：從設定檔中的頻道 RSS 取得新影片，用 yt-dlp 下載字幕，經 Workers AI 生成繁體中文摘要，輸出至 `src/content/posts/crawled/`
- **GitHub Actions crawl workflow**（`crawl.yml`）：排程每週執行爬蟲，自動 commit + push（author: `a920604a`）
- **content schema**：`type` 欄位新增 `crawled` 值；新增 `source`、`source_url` 欄位供來源追蹤
- **來源設定檔**（`scripts/sources.ts`）：可擴充的頻道清單，目前收錄 9 個台灣工程 / 學習 YouTube 頻道
- **Git hook**（`commit-msg`）：剔除 `Co-Authored-By` 行，確保所有 local commit 只保留 `a920604a` 為 author

## Capabilities

### New Capabilities

- `youtube-crawl`: 從 YouTube 頻道 RSS 抓取新影片、下載字幕、AI 摘要為繁體中文 markdown，自動 commit/push
- `automated-ingest`: ingest 腳本全自動化（無互動），完成後自動 commit/push
- `ci-d1-sync`: CI/CD pipeline 在每次 deploy 後自動執行 D1 sync
- `git-author-enforcement`: commit-msg hook 確保所有 commit author 為 `a920604a`

### Modified Capabilities

- `conversation-ingestion`: 新增 `--yes` flag 移除互動環節，新增 auto commit/push 行為

## Impact

- **新增檔案**：`scripts/crawl.ts`、`scripts/sources.ts`、`.github/workflows/crawl.yml`、`.git/hooks/commit-msg`
- **修改檔案**：`scripts/ingest.ts`、`.github/workflows/deploy.yml`、`src/content.config.ts`
- **外部相依**：`yt-dlp`（Python，GitHub Actions 安裝）、Cloudflare Workers AI（已有 token）
- **無破壞性變更**：現有 posts 結構與 D1 schema 不變，`type` 欄位為 optional
