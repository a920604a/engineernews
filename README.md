# Engineer News

技術決策即文件 — 將工程師的對話與筆記轉化為結構化、可搜尋的技術部落格。

## 概覽

Engineer News 是以 Astro + Cloudflare Workers 為基礎的個人技術部落格，支援 Markdown 撰寫、AI 語義搜尋（Vectorize）、以及把對話自動轉成文章的 ingest 工具。

## 主要功能

- Markdown 文章系統（frontmatter 驗證）
- AI 語義搜尋（Vectorize）
- 對話攝取（scripts/ingest.ts）
- Cloudflare D1（儲存文章與向量索引）
- 多語系（繁體中文 / 英文）

## 快速開始

```bash
pnpm install
pnpm dev
```

本地開發後，修改或新增文章後執行：

```bash
git add .
git commit -m "post(<category>): <標題摘要>"
git push
```

推到 main 會觸發 CI/CD 自動部署。

## 寫文章與內容規範

文章放在：`src/content/posts/<category>/YYYY-MM-DD-<slug>.md`

frontmatter 範例與寫作規範請參考：docs/writing.md

## 文件

- docs/architecture.md — 架構說明
- docs/deployment.md — 部署與 CI/CD
- docs/ingest.md — 對話攝取工具與同步流程
- docs/writing.md — 文章格式、分類與 commit 規範

## 資料管理（D1 + Vectorize）

### 環境設定

在 `.env` 設定（不提交 git）：

```env
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

### 全量重建 + 同步

```bash
make rebuild      # 重建 D1 表結構 + 重建 Vectorize index
make sync-prod    # 同步所有 markdown → D1 + Vectorize
```

### 常用指令

| 指令 | 說明 |
|------|------|
| `make install` | 安裝依賴 |
| `make dev` | 啟動本地開發伺服器 |
| `make d1-clear` | 清空 D1 資料（保留表結構） |
| `make d1-rebuild` | DROP + 重建 D1 表結構 |
| `make vec-rebuild` | 刪除 + 重建 Vectorize index |
| `make rebuild` | `d1-rebuild` + `vec-rebuild` |
| `make sync` | 同步至本地 D1 |
| `make sync-prod` | 同步至遠端 D1 + Vectorize |

> **注意**：所有 `make` 指令皆操作 Cloudflare 遠端資源，執行前請確認。

## 開發者指引

- commit 標題: `post(<category>): <標題摘要>`（新文章）
- 保持 docs/ 與 README.md 的內容一致，README 用做快速導覽。

## 參考

查看 docs/ 下的詳細指南以取得進階設定與部署細節。

