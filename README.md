# Engineer News

技術決策即文件 — 將工程師的對話與筆記轉化為結構化、可搜尋的技術部落格，並自動從 YouTube 頻道爬取學習內容。

## 概覽

Astro + Cloudflare Pages/D1/Vectorize 架構的個人技術部落格，支援：

- Markdown 文章系統（frontmatter 驗證）
- 全文搜尋（`/search`，Pagefind 靜態索引）
- AI 語義搜尋（`/ai-search`，Vectorize + Workers AI embedding）
- 對話攝取（`pnpm ingest`）— 一行指令將工程對話轉成文章
- YouTube 爬蟲（每天自動）— 從 9 個頻道抓字幕、生成繁體中文摘要
- Cloudflare D1（儲存文章、projects、doc_chunks）
- Cloudflare Vectorize（向量索引）
- 多語系（繁體中文 / 英文）

## 快速開始

```bash
pnpm install
make dev        # 需要 Cloudflare 憑證（見下方環境設定）
```

## 寫文章

### 從對話 / 筆記攝取

```bash
# 互動模式（可修改標題）
pnpm ingest <conversation.txt>

# 全自動（跳過互動，自動 commit + push）
pnpm ingest <conversation.txt> --yes
```

push 後 GitHub Actions 自動部署並同步 D1。

### 手動撰寫

文章放在：`src/content/posts/<category>/YYYY-MM-DD-<slug>.md`

```bash
git add src/content/posts/<category>/YYYY-MM-DD-<slug>.md
git commit -m "post(<category>): <標題摘要>"
git push
```

frontmatter 格式與寫作規範：`docs/writing.md`

## 自動爬蟲

GitHub Actions 每天 UTC 02:00（台灣時間 10:00）自動執行，從 YouTube 頻道抓取最新影片字幕，用 Workers AI 生成繁體中文摘要，每次最多 3 篇，自動 commit + push。

來源設定：`scripts/sources.ts`（新增頻道只需加一筆設定）

## 環境設定

在 `.env` 設定（不提交 git）：

```env
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

## 常用指令

| 指令 | 說明 |
|------|------|
| `make dev` | 啟動本地開發伺服器 |
| `pnpm ingest <file> --yes` | 全自動攝取對話並發布 |
| `pnpm crawl:prod` | 手動觸發爬蟲 |
| `pnpm sync:prod` | 手動同步所有文章至 D1 + Vectorize |
| `make rebuild` | 重建 D1 表結構 + Vectorize index |
| `make d1-clear` | 清空 D1 資料（保留表結構） |

## 文件

- `docs/architecture.md` — 系統架構、資料流、D1 Schema
- `docs/deployment.md` — CI/CD 流程、Secrets 設定
- `docs/ingest.md` — 對話攝取與爬蟲工具詳解
- `docs/writing.md` — 文章格式、分類與 commit 規範
