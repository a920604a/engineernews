## Why

開發者目前沒有任何可視化介面來追蹤 AI search pipeline 的健康狀態、查看 D1/R2/Vectorize 的資料概況、或診斷 sync 流程是否正確執行；所有除錯都依賴 Cloudflare Dashboard + wrangler CLI，摩擦力高。集中一個 `/admin` 頁面可讓開發者在幾秒內了解整個 infra 狀態。

## What Changes

- 新增 `/admin` 路由（受保護，需要 secret token）
- 新增 `/api/admin/*` API endpoints，聚合 D1、R2、Vectorize 的統計數據
- Admin UI 顯示以下 pipeline 面板：
  - **AI Search Pipeline**：vectorize index 向量數、embedding model、最近搜尋 latency（若有 log）
  - **Search / Keyword**：D1 `doc_chunks` 數量、posts 數量、lang 分布
  - **Post Timeline**：所有文章列表（date、title、lang、category、draft status、是否有向量）
  - **D1 Overview**：各 table row count（posts、doc_chunks）、schema 版本
  - **R2 Overview**：OG images bucket 物件數、總 size
  - **Vectorize Overview**：index dimension、向量總數、metadata fields
  - **Infra Config**：目前使用的 embedding model、chat model、compatibility date

## Capabilities

### New Capabilities
- `admin-ui`: 受保護的開發者觀測介面，整合 D1/R2/Vectorize 統計與 pipeline 狀態面板

### Modified Capabilities
<!-- 無現有 spec 需要更動 -->

## Impact

- **新增檔案**：`src/pages/admin/index.astro`、`src/pages/api/admin/stats.ts`、`src/components/AdminDashboard.tsx`
- **wrangler.jsonc**：admin API 需要 D1、R2、Vectorize、AI 綁定（已存在）
- **安全性**：`/admin` 用 `ADMIN_TOKEN` env var 做 bearer token 驗證，避免暴露 infra 數據
- **Dependencies**：無新 npm 套件，使用現有 Cloudflare bindings
