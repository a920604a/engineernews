## Context

目前專案是 Astro + Cloudflare Pages/D1/Vectorize 架構，內容以 markdown 存放於 `src/content/posts/`，透過 `sync-to-d1.ts` 同步至 D1。現有 GitHub Actions 只處理 build + deploy，D1 sync 完全手動。`ingest.ts` 含 readline 互動，無法串接自動化流程。`crawl.ts` 尚未建立。

## Goals / Non-Goals

**Goals**
- 一行指令完成 ingest → commit → push
- 每次 push 自動觸發 D1 sync（不需手動）
- 排程從 YouTube 頻道抓字幕、生成繁體中文摘要並自動 commit
- 所有 git commit（本地 + CI）author 固定為 `a920604a`

**Non-Goals**
- 下載影片檔案（僅抓字幕）
- 爬取 YouTube 以外的來源（本 PR 範圍）
- 修改現有 D1 schema（posts/doc_chunks/projects 不動）
- 實作前端爬蟲文章的特殊顯示邏輯

## Decisions

### 1. 字幕取得：yt-dlp over YouTube Data API

**選擇**：`yt-dlp --write-auto-subs --sub-lang "zh-TW,zh,en" --skip-download`

**理由**：YouTube Data API caption 下載需要 OAuth，非常複雜。yt-dlp 是開源工具，支援自動字幕，在 GitHub Actions 一行 `pip install yt-dlp` 即可使用，無 quota 限制。

**Fallback**：若影片無字幕（yt-dlp 無輸出），改用影片 title + description 做摘要（淺層，但不失敗）。

---

### 2. 新影片發現：RSS over YouTube Data API

**選擇**：`https://www.youtube.com/feeds/videos.xml?channel_id=XXX`

**理由**：完全免費，無需 API key，每個 YouTube 頻道都有公開 RSS。每次 crawl 只取最新 5 支影片（RSS 預設回傳 15 筆），避免重複處理。

**重複過濾**：檢查 `src/content/posts/crawled/<VIDEO_ID>.md` 是否已存在，存在則跳過。

**Channel ID 取得**：Channel handle → ID 需一次性解析（yt-dlp 或手動），結果硬編碼在 `sources.ts` 中。

---

### 3. AI 摘要：Cloudflare Workers AI（同現有 ingest）

**選擇**：`@cf/meta/llama-3.1-8b-instruct`，同 `ingest.ts` 現有做法。

**Prompt 設計**：
```
你是台灣工程師的學習助手。以下是 YouTube 影片字幕，請輸出繁體中文 JSON：
{
  "title": "20字以內的標題",
  "tldr": "50字以內摘要",
  "tags": ["tag1","tag2","tag3"],
  "category": "tech|career|learning|tool|other",
  "summary": "300-500字的詳細繁體中文摘要"
}
```

**理由**：重用現有 API token，無額外成本，輸出中文符合用戶需求。

---

### 4. Git author 鎖定策略

**本地 commit**：`.git/hooks/commit-msg` hook，剔除 `Co-Authored-By:` 行。

**CI commit（GitHub Actions）**：
```yaml
- name: Configure git
  run: |
    git config user.name "a920604a"
    git config user.email "a920604a@gmail.com"
```
明確覆蓋 Actions 預設的 `github-actions[bot]`。

**為何不用 `GIT_AUTHOR_NAME` env var**：git config 方式更持久、對所有 git 指令生效，不需每個步驟重複設定。

---

### 5. 爬蟲存放位置：`src/content/posts/crawled/` 子目錄

**選擇**：`src/content/posts/crawled/<VIDEO_ID>.md`

**理由**：
- 現有 `sync-to-d1.ts` 的 `walkMdFiles` 會遞迴掃描子目錄，不需修改 sync 邏輯
- 路徑即去重 key（VIDEO_ID 為唯一識別）
- 可透過路徑區分人工策展 vs 自動爬取

---

### 6. ingest 自動 commit/push

**選擇**：在 `ingest.ts` 末尾新增：
```typescript
execSync(`git add "${outputPath}"`);
execSync(`git commit -m "crawl: add ${slug}"`);
execSync('git push');
```
只在 `--yes` flag 時執行，避免影響現有手動流程。

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| yt-dlp 被 YouTube 限速或 block | 每週頻率低，每次只取少量影片，風險極低 |
| 字幕品質差（自動字幕錯誤多） | AI 摘要容錯性高，少量錯誤不影響整體 |
| Workers AI token 費用 | 每週處理量少（< 50 支影片），用量極低 |
| CI commit 觸發 deploy loop | crawl workflow push → deploy.yml 觸發是預期行為，不是 loop |
| 爬蟲文章混入主列表 | `type: crawled` 欄位預留，前端可後續過濾 |

## Migration Plan

1. 新增 `content.config.ts` schema 欄位（向下相容，optional）
2. 建立 `scripts/sources.ts`（純設定，無副作用）
3. 建立 `scripts/crawl.ts`
4. 修改 `scripts/ingest.ts`（加 `--yes` flag，不破壞現有行為）
5. 修改 `.github/workflows/deploy.yml`（加 sync 步驟）
6. 新增 `.github/workflows/crawl.yml`
7. 新增 `.git/hooks/commit-msg`（本地，不進 git）

Rollback：移除 crawl.yml / 還原 deploy.yml 即可，無 schema 破壞。

## Open Questions

- 每個頻道的 YouTube Channel ID 需要一次性查詢並填入 `sources.ts`（實作時處理）
- 爬蟲文章是否要在前端顯示特殊標記（"來源：YouTube"）？目前 Non-Goal，schema 已預留
