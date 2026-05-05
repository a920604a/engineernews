---
title: "用 Astro + Cloudflare Workers 從零建立低摩擦平台"
date: 2026-04-20T13:38:46+08:00
category: "tech"
tags: ["astro", "cloudflare-workers", "cloudflare-pages", "deployment"]
lang: zh-TW
description: "實作指南：從空專案開始，用 Astro 建靜態前端、Cloudflare Workers / Pages 做後端與部署，減少開發摩擦的實作步驟與注意事項。"
tldr: "以 Astro 做內容與 UI，Cloudflare Workers 提供 API 與邊緣處理，Cloudflare Pages 做靜態部署；關鍵在於 routes、環境變數與 D1/KV 的運用。"
draft: false
pinned: true
audio_url: "/api/tts/r2/tts/tts_20260427_023715_983436.wav"
---

想建一個技術部落格或小型 demo 平台，但不想每次部署都跟複雜的後端環境搏鬥。這篇記錄我用 Astro + Cloudflare Workers 把一切變輕的過程。

## 為什麼是這個組合

市面上有很多靜態網站選項：Vercel、Netlify、Railway，各有所長。但如果需求是「輕量前端 + 少量動態 API + 全球邊緣部署 + 幾乎零維運成本」，Cloudflare 的整合度是最高的。

| | Cloudflare Pages + Workers | Vercel | Netlify |
|-|--------------------------|--------|---------|
| 邊緣執行 | Workers（V8 isolates） | Edge Functions（Node） | Edge Functions（Deno） |
| 資料庫 | D1（SQLite）、KV | 需外接 | 需外接 |
| 向量資料庫 | Vectorize（內建） | 需外接 | 需外接 |
| 免費方案 | 慷慨（Workers 10萬次/天） | 有限制 | 有限制 |
| Cold start | 幾乎無（isolate） | 有 | 有 |

選 Cloudflare 的代價是：它的 runtime 是 Workers（V8 isolates），不是完整的 Node.js，少數 npm 套件不相容。

## 整體架構

```mermaid
graph TB
  Browser["瀏覽器"]
  CF["Cloudflare Pages\n(靜態 CDN)"]
  Worker["Cloudflare Workers\n(SSR + API)"]
  D1["D1 (SQLite)"]
  KV["KV Store"]
  R2["R2 (Object Storage)"]
  AI["Workers AI"]

  Browser -- "靜態資源" --> CF
  Browser -- "API / SSR 請求" --> Worker
  Worker --> D1
  Worker --> KV
  Worker --> R2
  Worker --> AI
  CF -- "Pages Functions" --> Worker
```

Astro 使用 Cloudflare adapter 後，SSR 頁面和 API routes 都由 Workers 執行；靜態資源（JS、CSS、圖片）由 Pages CDN 快取分發。兩個角色分工明確，互不干擾。

## 從零開始

### 1. 初始化 Astro 專案

**工具：Astro** — 以靜態優先為核心的前端框架，搭配 `@astrojs/cloudflare` adapter 後，SSR 和 API routes 由 Workers 執行，靜態資源由 Pages CDN 快取。

```bash
pnpm create astro@latest my-site
cd my-site
pnpm add @astrojs/cloudflare
```

修改 `astro.config.mjs`：

```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    mode: 'directory',
    platformProxy: {
      enabled: true,
    },
  }),
});
```

`mode: 'directory'` 讓輸出結構對應 Cloudflare Pages Functions 的目錄格式。`platformProxy: { enabled: true }` 是本地開發時模擬 Cloudflare 環境的關鍵，沒有這個，`locals.runtime` 在本地會是 `undefined`。

若需要多語言路由（例如繁中為預設、英文走 `/en/*`），在同一份 config 加上：

```js
export default defineConfig({
  output: 'server',
  adapter: cloudflare({ mode: 'directory', platformProxy: { enabled: true } }),
  i18n: {
    defaultLocale: 'zh-TW',
    locales: ['zh-TW', 'en'],
    routing: { prefixDefaultLocale: false },
  },
});
```

### 2. 設定 wrangler.jsonc

**工具：wrangler** — Cloudflare 的 CLI 工具，負責本地開發模擬、D1 migration、部署。所有 Cloudflare 服務的 binding 在 `wrangler.jsonc` 集中管理。

```jsonc
{
  "name": "my-site",
  "compatibility_date": "2025-09-01",
  "pages_build_output_dir": "./dist",

  "d1_databases": [{
    "binding": "DB",
    "database_name": "my-site-db",
    "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  }],

  "kv_namespaces": [{
    "binding": "CACHE",
    "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }],

  "r2_buckets": [{
    "binding": "STORAGE",
    "bucket_name": "my-site-assets"
  }],

  "ai": {
    "binding": "AI"
  }
}
```

`binding` 是程式碼裡取用的名稱，例如 `env.DB`、`env.AI`。所有 Cloudflare 服務的 binding 都在這一個檔案管理，遷移和 review 都簡單很多。

若要使用部分 Node.js built-in（`crypto`、`buffer`、`stream`），在 `wrangler.jsonc` 加：

```jsonc
{
  "compatibility_flags": ["nodejs_compat"]
}
```

注意：`nodejs_compat` 不包含 `fs`、`path`、`child_process`。這些在 Workers runtime 完全不存在。

### 3. 在 API route 使用 bindings

**工具：TypeScript + Cloudflare Workers types** — `@cloudflare/workers-types` 提供所有 binding 的型別定義。

Astro 的 API route（`src/pages/api/count.ts`）：

```ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  const { DB } = locals.runtime.env;

  const result = await DB
    .prepare('SELECT count(*) as cnt FROM posts')
    .first<{ cnt: number }>();

  return Response.json({ count: result?.cnt ?? 0 });
};
```

`locals.runtime.env` 就是 Workers 的 `env` 物件，所有 wrangler.jsonc 裡的 bindings 都掛在這裡。Workers AI 也是同樣的取法：

```ts
const { AI } = locals.runtime.env;
const embedding = await AI.run('@cf/baai/bge-m3', {
  text: ['搜尋關鍵字'],
});
```

建議在 `src/env.d.ts` 宣告 `Env` interface，讓 `locals.runtime.env` 有型別：

```ts
// src/env.d.ts
type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  STORAGE: R2Bucket;
  AI: Ai;
  ADMIN_TOKEN: string;
}

declare namespace App {
  interface Locals extends Runtime {}
}
```

之後 `locals.runtime.env.DB` 就有完整型別，IDE autocomplete 會正確提示 D1 的方法。

### 4. 建立 D1 資料庫

**工具：D1** — Cloudflare 的 SQLite-compatible 邊緣資料庫。在 Workers 裡是本地呼叫，幾乎沒有連線延遲。Migration 用版本號前綴管理，方便追蹤 schema 演進。

```bash
# 建立 D1
wrangler d1 create my-site-db

# 本地跑遷移
wrangler d1 execute my-site-db --local --file=./migrations/0001_init.sql

# 遠端跑遷移
wrangler d1 execute my-site-db --remote --file=./migrations/0001_init.sql
```

遷移檔放 `migrations/` 目錄，用版本號前綴管理，讓 schema 的演進可以追蹤。

Migration 檔範例（`migrations/0001_init.sql`）：

```sql
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'zh-TW',
  tags TEXT,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
```

命名規則：`NNNN_description.sql`，數字前綴確保跑順序。

### 5. GitHub Actions 部署

**工具：GitHub Actions + wrangler-action** — push 到 main 自動觸發部署；非 main branch 自動產生 Preview URL，部署前可以在隔離環境確認效果。

`.github/workflows/deploy.yml`：

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - run: pnpm install
      - run: pnpm build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=my-site
```

一次 push 到 main 就觸發部署，全程不需要手動介入。Pages 每個 branch 都會產生獨立 Preview URL，方便在合入 main 前確認效果。

`CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` 需要在 GitHub repo 的 **Settings → Secrets and variables → Actions** 新增。

Token 需要的最低權限：
- Cloudflare Pages: Edit
- D1: Edit（若 workflow 裡跑 migration）

在 Cloudflare Dashboard → My Profile → API Tokens → Create Token 建立，選「Custom token」並只給需要的權限。

## 本地開發流程

```bash
# 啟動 dev server（含 Workers / D1 / KV 模擬）
pnpm dev
```

`@astrojs/cloudflare` 的 `platformProxy` 讓本地開發時可以直接用 `locals.runtime.env.DB`，不用 mock，跟生產環境行為一致。這是這個 adapter 最重要的開發體驗優勢。

## 幾個常見坑

**環境變數 vs Bindings 的區別**

**錯誤現象**：本地 `pnpm dev` 可以讀到 secret，部署後 `env.MY_SECRET` 是 `undefined`。  
**原因**：wrangler.jsonc 的 bindings（DB、KV、R2）和 Cloudflare Dashboard 的 Environment Variables 是兩個不同系統，本地 dev 用 `.dev.vars` 模擬 env vars，但兩者取值方式不互通。  
**解法**：secret（API token、密碼）放 Dashboard 的 Environment Variables，用 `env.MY_SECRET` 取；資料庫、KV、R2 放 wrangler.jsonc bindings，走 `env.DB` 等。`.dev.vars`（git ignore）放本地開發用的 secrets。

**Node.js API 不相容**

**錯誤現象**：某個 npm 套件 import 後，deploy 時報 `Cannot find module 'fs'`。  
**原因**：Workers runtime 是 V8 isolates，不是 Node.js，`fs`、`path`、`child_process` 完全不存在。  
**解法**：查 npm 套件是否有 Workers-compatible 版本；或啟用 `nodejs_compat` compatibility flag（支援 `crypto`、`buffer` 等，但不包含 `fs`）。

**D1 Preview 環境的資料污染**

**錯誤現象**：PR 的 Preview 環境跑測試後，production 的資料莫名被改動。  
**原因**：Pages 每個 branch 的 Preview 環境預設指向 `wrangler.jsonc` 裡的同一個 `database_id`，也就是 production 的 D1。Preview 環境的寫入會直接影響 production 資料。  
**解法**：在 Cloudflare Pages 專案設定 → Environment Variables，針對 Preview 環境覆寫 `database_id` 為獨立的 staging D1 database。或在測試資料用固定前綴（如 `test_`），方便清除。

**Isolate 的無狀態性**

**錯誤現象**：module-level 變數在第一次請求後被設定，但第二次請求時又變回初始值。  
**原因**：Workers V8 isolates 每次請求是獨立的執行環境，全域變數不會在請求之間持續。這跟傳統 Node.js server 不同。  
**解法**：需要跨請求共享的狀態（session、cache）放 KV 或 D1，不要靠 module-level 變數。

## 學到的事

- Cloudflare 的整合是它最大的賣點：D1、KV、R2、Vectorize、Workers AI 全部在同一個平台，不需要管多個服務的 credentials 和 IAM。
- `platformProxy: { enabled: true }` 別忘了開。沒有這個，本地開發時 `locals.runtime` 是 undefined，debug 很痛苦。
- Schema 在 build 時驗證：Astro content collections 的 Zod schema 讓 frontmatter 錯誤在本地就能抓到，不用等到 CI。
- 把敏感金鑰放在 Cloudflare Dashboard / GitHub Secrets，wrangler.jsonc 裡只放 binding name 和 resource ID，不放 secret。

## 參考資料

- [Astro 官方文件](https://docs.astro.build/)
- [Astro Cloudflare Adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Cloudflare Workers 文件](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文件](https://developers.cloudflare.com/d1/)
- [wrangler CLI 文件](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare Pages 文件](https://developers.cloudflare.com/pages/)
