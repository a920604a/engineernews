# 部署指南

## 前置需求

- [Cloudflare 帳號](https://cloudflare.com)
- Node.js 20+
- pnpm

## 第一次部署（手動設定）

### 1. 取得 Cloudflare 憑證

| 項目 | 位置 |
|------|------|
| Account ID | Dashboard 右側 sidebar |
| API Token | My Profile → API Tokens → Create Token → `Edit Cloudflare Workers` |

填入 `.dev.vars`（本機用，勿 commit）：

```
CLOUDFLARE_ACCOUNT_ID=xxxxx
CLOUDFLARE_API_TOKEN=xxxxx
```

### 2. 建立 D1 資料庫

```bash
wrangler d1 create engineer-news-db
```

輸出的 `database_id` 填入 `wrangler.jsonc`。

跑 migration：

```bash
wrangler d1 execute engineer-news-db --remote --file=migrations/0001_initial.sql
```

### 3. 建立 Vectorize 索引

```bash
wrangler vectorize create engineer-news-index --dimensions=384 --metric=cosine
```

### 4. 建立 Cloudflare Pages 專案

```bash
pnpm build
wrangler pages deploy dist --project-name=engineer-news
```

### 5. 設定 GitHub Secrets

GitHub repo → Settings → Secrets → Actions：

| Secret | 值 |
|--------|-----|
| `CLOUDFLARE_API_TOKEN` | 你的 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | 你的 Account ID |

設定完成後，每次 push 到 `main` 即自動部署。

## 日常部署流程

```bash
# 新增或修改文章後
git add .
git commit -m "add: 文章標題"
git push
# CI/CD 自動處理 build → deploy → sync D1
```

## CI/CD 流程說明

`.github/workflows/deploy.yml` 依序執行：

1. `pnpm build` — 編譯 Astro
2. `wrangler pages deploy dist` — 部署到 Cloudflare Pages
3. `pnpm sync:prod` — 同步 Markdown 到 D1 + Vectorize
