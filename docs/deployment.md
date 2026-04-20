# 部署指南

本專案採用 GitHub Actions + Cloudflare Pages 自動部署。基本流程：

1. 在本地完成更動並推送到 main
2. CI 會執行 build 並部署到 Cloudflare Pages

快速檢查：

```bash
pnpm build
# 在本地 build 成功代表大致能部署
```

若需使用 Wrangler 部署 Workers，請參考 wrangler.jsonc 設定並登入 Cloudflare。

