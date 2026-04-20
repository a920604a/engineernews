# 部署指南

## CI/CD 流程

每次推送到 `main` 自動觸發：

```mermaid
flowchart TD
  Push[git push main] --> Checkout
  Checkout --> Install[pnpm install]
  Install --> Build[pnpm build]
  Build --> Deploy[wrangler pages deploy dist]
  Deploy --> MigrationMark[標記 0001 為已套用<br/>INSERT OR IGNORE INTO d1_migrations]
  MigrationMark --> Migration[d1 migrations apply --remote]
  Migration --> Sync[pnpm sync:prod<br/>sync-to-d1.ts]
  Sync --> D1[(D1 posts / projects / chunks)]
  Sync --> Vec[(Vectorize embeddings)]
```

## 本地驗證

```bash
pnpm build          # 確認 build 無誤
pnpm sync           # 同步到本地 D1（不加 --prod）
pnpm preview        # 預覽靜態輸出
```

## Secrets 設定

在 GitHub repo → Settings → Secrets 加入：

| Secret | 說明 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token（需有 D1、Pages、Vectorize 權限） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

## 手動套用 Migration

```bash
# 本地
wrangler d1 migrations apply engineer-news-db --local

# 遠端
wrangler d1 migrations apply engineer-news-db --remote
```
