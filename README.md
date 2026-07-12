# Engineer News

技術決策即文件 — 將工程師的對話與筆記轉化為結構化、可搜尋的技術部落格。

## 概覽

Astro + Cloudflare Pages Functions/D1/Vectorize 架構的個人技術部落格，支援：

- Markdown 文章系統（frontmatter 驗證）
- 全文搜尋（`/search`，Pagefind 靜態索引）
- AI 語義搜尋（`/ai-search`，Vectorize + Workers AI embedding）
- 對話攝取（`pnpm ingest`）— 一行指令將工程對話轉成文章
- 文章 TTS（Edge TTS 優先，Workers AI fallback，R2 快取）
- Review/Admin API（`/review`、`/admin`，需 `ADMIN_TOKEN`）
- Cloudflare D1（儲存文章、chunks、views、search/logs、settings）
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

## 環境設定

在 `.env` 設定（不提交 git）：

```env
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
TTS_API_URL=http://localhost:8008  # 選填；未設定時使用預設本機 TTS URL / Workers AI fallback
```

Cloudflare Pages 端另需設定：

- `ADMIN_TOKEN`：`/review` 與 `/api/admin/*` 使用
- `GITHUB_TOKEN`：Admin API 透過 GitHub Contents API 儲存、發布、刪除文章時使用
- `GITHUB_OWNER` / `GITHUB_REPO`：預設在 `wrangler.jsonc` 為 `a920604a` / `engineernews`

## 常用指令

| 指令 | 說明 |
|------|------|
| `make dev` | 啟動本地開發伺服器 |
| `pnpm ingest <file> --yes` | 全自動攝取對話並發布 |
| `pnpm sync:prod` | 手動同步所有文章至 D1 + Vectorize |
| `make rebuild` | 重建 D1 表結構 + Vectorize index |
| `make d1-clear` | 清空 D1 資料（保留表結構） |
| `make tts-all-prod` | 批次補齊文章 `audio_url`，上傳遠端 R2 |
| `make remote-deploy` | 透過 GitHub CLI 觸發遠端部署 workflow |

## 文件

- `docs/architecture.md` — 系統架構、資料流、D1 Schema
- `docs/deployment.md` — CI/CD 流程、Secrets 設定
- `docs/ingest.md` — 對話攝取工具詳解
- `docs/writing.md` — 文章格式、分類與 commit 規範
