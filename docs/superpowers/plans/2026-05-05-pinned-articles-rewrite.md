# Pinned Articles Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將三篇 `pinned: true` 文章從過短擴充為對新手與有經驗工程師都有價值的完整文章，方式為加入工具快速介紹段落與具體程式碼範例。

**Architecture:** 每篇文章獨立修改，不共用邏輯。改寫順序：Article 3（最大幅度）→ Article 1 → Article 2。所有 frontmatter 保持不變（`pinned: true`、`draft: false`、`audio_url` 不動）。

**Tech Stack:** Markdown、Astro Content Collections、Cloudflare D1 / Vectorize / Workers AI / R2

---

## Task 1：改寫 Article 3 — 對話即文件

**Files:**
- Modify: `src/content/posts/learning/2026-04-20-dialogue-as-doc-claude-code.md`

- [ ] **Step 1：確認現有內容行數**

  ```bash
  wc -l src/content/posts/learning/2026-04-20-dialogue-as-doc-claude-code.md
  ```
  Expected: ~43 行

- [ ] **Step 2：在 frontmatter 後、`## 情境` 前插入工具快速介紹段**

  在第 13 行（`## 情境` 上方）插入：

  ```markdown
  **Claude Code** 是 Anthropic 的 CLI 工具，讓開發者直接在終端機與 Claude 協作寫程式和文件。它支援「skill」擴充點 — 可自訂工作流程腳本。本站使用的 `post` skill 把對話或筆記輸入轉成結構化 Markdown 文章；底層的 `ingest.ts` 腳本負責偵測敏感資訊、呼叫 LLM 萃取 metadata，最終輸出帶完整 frontmatter 的文章檔案。
  ```

- [ ] **Step 3：展開 `## 情境` section（1 段 → 3-4 段）**

  將現有的情境段落替換為：

  ```markdown
  ## 情境

  多人協作 debug 時，對話往往是這樣的：

  ```
  [10:32] @alice: 我的 D1 查詢一直 timeout，用的是 wrangler 2.x
  [10:33] @bob: 貼一下 error log？
  [10:34] @alice: Error: D1_EXEC_ERROR: Error in line 1: ...SQLITE_BUSY
  [10:35] @alice: 我已經加了 retry 但還是不行
  [10:47] @bob: 你有沒有用 batch()？
  [10:51] @alice: 沒有，應該要嗎
  [10:52] @bob: 試試看，我上次也中過這個
  [11:08] @alice: batch() 可以了！但 insert 還是偶爾掛
  ```

  一個跨越 40 分鐘、穿插程式碼片段和錯誤訊息的 thread，對當事人來說是解謎過程，對後來的讀者來說是一堆雜訊。把這個直接貼到部落格？完全不可讀。

  更麻煩的是，這類對話通常夾帶敏感資訊：API token、內部 URL、staging 環境的 database ID。直接公開會是安全問題。

  目標是把這個對話變成一篇「D1 SQLITE_BUSY 錯誤與 batch() 解法」的完整技術文章，不需要人工重寫全文。
  ```

- [ ] **Step 4：展開 `## 問題` section（3 bullet → 3 段）**

  將現有問題段落替換為：

  ```markdown
  ## 問題

  **訊息雜亂**：對話按時間排列，不按邏輯結構排列。「嘗試了什麼」、「為什麼失敗」、「最終解法」散落在各處，讀者需要自己拼湊。原始 thread 50 行，真正有用的資訊可能只有 10 行。

  **隱私與敏感資訊**：工程對話幾乎都包含不該公開的內容 — 公司內部 URL、staging 環境 credentials、log 裡的 user ID。發佈前需要逐一移除，手動做容易漏。

  **表述需要精簡與補足**：對話語言是給懂 context 的同事看的，縮寫、省略、只有內部人懂的前提都很正常。變成文章需要補背景、理清邏輯、加結論 — 這是大量編輯工作。
  ```

- [ ] **Step 5：展開 `## 嘗試過程` section（3 bullet → 完整段落 + 失敗原因）**

  將現有嘗試段落替換為：

  ```markdown
  ## 嘗試過程

  最直覺的做法：把整個對話扔給 Claude，要求「做摘要」和「列步驟」。結果很快就遇到問題：模型傾向自由敘述，輸出的是一段散文，不是可以直接貼進部落格的結構化文章。同樣的對話跑兩次，輸出格式不一致；有時段落順序不同，有時某個關鍵錯誤訊息被略掉。

  第二次嘗試：改用 Claude Code 的範本輸出，在 prompt 前置加上明確的欄位要求（背景、問題、嘗試、解法、教訓）和格式規則（Markdown、程式碼用 fenced block、敏感詞列表）。這次輸出結構一致了，但仍需要人工補充「為什麼會這樣」的解釋段落 — 模型只描述了 *什麼* 發生，沒有解釋 *為什麼*。

  最終做法：分兩段處理。先用 `make ingest` 跑 `ingest.ts` 自動處理敏感詞遮蔽和基礎 metadata 萃取，再人工補充「為什麼會這樣」和「學到的事」兩個段落。自動化處理機械性工作，人工保留需要判斷的部分。
  ```

- [ ] **Step 6：展開 `## 解法` section（3 bullet → 完整流程 + prompt 範本 + 前後對比）**

  將現有解法段落替換為：

  ```markdown
  ## 解法

  ### Step 1：整理輸入檔案

  把對話複製到純文字檔，去除平台 metadata（Slack 的 reaction、已讀標記等），保留時間戳和發言者標記。存成 `debug-session.txt`。

  ### Step 2：執行 ingest

  ```bash
  make ingest FILE=debug-session.txt
  ```

  `ingest.ts` 做三件事：
  1. 掃描並遮蔽敏感資訊（API token、內部 URL pattern、database ID 格式）
  2. 呼叫 `llama-3.1-8b` 萃取 title、tags、tldr、description，輸出為 YAML frontmatter
  3. 根據文章類型（bug/debugging）套用段落範本，要求模型輸出完整 Markdown 結構

  prompt 核心結構（`ingest.ts` 內部）：

  ```
  你是一個技術部落格編輯。以下是一段工程對話，
  請輸出一篇結構完整的繁中技術文章，格式如下：

  ---
  title: ""
  date: <今天>
  category: "tech"
  tags: []
  lang: zh-TW
  tldr: ""
  description: ""
  draft: false
  ---

  ## TL;DR
  ## 情境
  ## 問題
  ## 嘗試過程
  ## 解法
  ## 為什麼會這樣
  ## 學到的事

  規則：
  - 程式碼用 fenced code block 並標語言
  - 敏感資訊已遮蔽，不要還原
  - 「為什麼會這樣」必須解釋根本原因，不只描述現象
  ```

  ### Step 3：人工審查與補充

  輸出的文章通常 80% 可用。需要人工補充的部分：
  - 「為什麼會這樣」的技術深度（模型傾向描述現象而非根因）
  - 特定錯誤訊息的引用（模型有時會略過關鍵的 stack trace）
  - 結論的判斷（什麼時候該用 batch()、什麼時候不用）

  ### 輸入 → 輸出對比

  **輸入（原始對話片段）：**
  ```
  [10:34] @alice: Error: D1_EXEC_ERROR: SQLITE_BUSY
  [10:52] @bob: 試試看 batch()
  [11:08] @alice: batch() 可以了
  ```

  **輸出（ingest 後的對應段落）：**
  ```markdown
  ## 解法

  改用 `DB.batch()` 把多個 statement 合併為單一交易：

  ​```ts
  await DB.batch([
    DB.prepare('INSERT INTO logs ...').bind(...),
    DB.prepare('UPDATE posts ...').bind(...),
  ]);
  ​```

  batch() 把多個操作包成原子交易，避免並發寫入時的鎖爭用。
  ```
  ```

- [ ] **Step 7：展開 `## 學到的事` section（3 bullet → 每點一段）**

  將現有學到的事替換為：

  ```markdown
  ## 學到的事

  **Prompt 輸出格式要明確指定**：要求「輸出 Markdown」不夠，需要指定段落標題、程式碼格式規則、哪些欄位必填。格式越明確，後處理工作越少。

  **自動化是加速器，不是替代**：`ingest.ts` 處理的是機械性工作 — 格式化、敏感詞遮蔽、metadata 萃取。判斷性工作（技術根因解釋、結論的正確性）仍然需要人工確認。把自動化當成「草稿生成器」而不是「一鍵發佈」，品質會好很多。

  **保留原始對話的索引**：輸出文章後不要刪掉原始 `debug-session.txt`。幾個月後回頭看，原始時間戳和對話脈絡經常能提供文章裡沒有的上下文。
  ```

- [ ] **Step 8：確認行數符合目標**

  ```bash
  wc -l src/content/posts/learning/2026-04-20-dialogue-as-doc-claude-code.md
  ```
  Expected: 180-220 行

- [ ] **Step 9：Commit**

  ```bash
  git add src/content/posts/learning/2026-04-20-dialogue-as-doc-claude-code.md
  git commit -m "post(learning): 擴充對話即文件文章，加入完整工具介紹與 prompt 範本"
  ```

---

## Task 2：改寫 Article 1 — 這個部落格用了哪些工具

**Files:**
- Modify: `src/content/posts/tech/2026-04-20-this-blog-tooling.md`

- [ ] **Step 1：確認現有行數**

  ```bash
  wc -l src/content/posts/tech/2026-04-20-this-blog-tooling.md
  ```
  Expected: ~172 行

- [ ] **Step 2：在「## 前端：Astro」section 開頭加工具介紹行**

  在 `## 前端：Astro` 標題後的第一行，插入：

  ```markdown
  > **Astro** 是以「內容優先」為設計哲學的前端框架。預設輸出純靜態 HTML，只在需要互動的元件注入 JavaScript（Island Architecture）。特別適合文章、文件類網站。
  ```

- [ ] **Step 3：在「## 部署：Cloudflare Pages + Workers」加工具介紹**

  在 `## 部署：Cloudflare Pages + Workers` 標題後插入：

  ```markdown
  > **Cloudflare Pages** 是靜態資源的 CDN 托管服務，每次 git push 自動部署並產生 Preview URL。**Cloudflare Workers** 是跑在 V8 isolates 上的邊緣運算平台，負責動態請求（API routes、SSR）。兩者合用，靜態與動態各司其職。
  ```

- [ ] **Step 4：在「## 資料庫：D1」加工具介紹 + migration 範例**

  在 `## 資料庫：D1（SQLite on the edge）` 標題後插入：

  ```markdown
  > **D1** 是 Cloudflare 的 SQLite-compatible 邊緣資料庫。在 Workers 裡直接呼叫，無 connection pool、無 TCP overhead；查詢延遲極低。

  ```

  在 D1 section 的 table 後、「D1 的限制」段落前，插入 migration 範例：

  ```markdown
  Migration 檔案放 `migrations/` 目錄，版本號前綴管理：

  ```sql
  -- migrations/0001_init.sql
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'zh-TW',
    tags TEXT,
    description TEXT,
    tldr TEXT
  );

  CREATE TABLE IF NOT EXISTS doc_chunks (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL
  );
  ```

  ```bash
  # 本地跑 migration
  wrangler d1 execute my-site-db --local --file=migrations/0001_init.sql

  # 遠端跑 migration
  wrangler d1 execute my-site-db --remote --file=migrations/0001_init.sql
  ```
  ```

- [ ] **Step 5：在「## 向量搜尋：Vectorize + Workers AI」加工具介紹 + embedding upsert 範例**

  在 `## 向量搜尋：Vectorize + Workers AI` 標題後插入：

  ```markdown
  > **Vectorize** 是 Cloudflare 的向量資料庫服務，直接掛在 Workers 上，不需要外部 API。**Workers AI** 提供多個內建模型，其中 `bge-m3` 負責生成文字 embedding，`qwen-14b` 負責 RAG 回答生成。
  ```

  在 sequenceDiagram 後插入 embedding upsert 的實際程式碼片段：

  ```markdown
  `sync-to-d1.ts` 核心片段：

  ```ts
  // 1. 呼叫 bge-m3 生成 embedding
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_TOKEN}` },
      body: JSON.stringify({ text: chunkContent }),
    }
  );
  const { result } = await res.json();
  const vector = result?.data?.[0]; // number[384]

  // 2. 寫入 Vectorize（NDJSON 格式批次 insert）
  // wrangler vectorize insert engineer-news-index --file=vectors.ndjson
  ```
  ```

- [ ] **Step 6：在「## 物件儲存：R2」加工具介紹 + cache 邏輯片段**

  在 `## 物件儲存：R2` 標題後插入：

  ```markdown
  > **R2** 是 Cloudflare 的物件儲存服務，API 相容 S3，但沒有流量費用（egress free）。適合儲存大型靜態資產：圖片、音訊。
  ```

  在「OG 圖片」段落後插入：

  ```markdown
  OG 圖片 cache 邏輯（`src/pages/api/og/[...slug].ts`）：

  ```ts
  const { OG_IMAGES } = locals.runtime.env;

  // 先查 R2 cache
  const cached = OG_IMAGES ? await OG_IMAGES.get(cacheKey) : null;
  if (cached) {
    return new Response(await cached.arrayBuffer(), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' },
    });
  }

  // miss：跑 satori 生成，再寫回 R2
  const png = await renderToPng(createShareCardNode({ post }), fontData);
  await OG_IMAGES.put(cacheKey, png);
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
  ```
  ```

- [ ] **Step 7：在「## AI 模型：Workers AI」加工具介紹 + AI.run 範例**

  在 `## AI 模型：Workers AI` 標題後插入：

  ```markdown
  > **Workers AI** 是 Cloudflare 的推論平台，提供多個開源模型的 serverless 呼叫，直接從 Workers 用 `env.AI.run()` 調用，不需要管 API key 或速率限制。
  ```

  在模型 table 後插入：

  ```markdown
  在 Workers / API route 裡呼叫的範例：

  ```ts
  const { AI } = locals.runtime.env;

  // embedding（用於向量搜尋）
  const { data } = await AI.run('@cf/baai/bge-m3', { text: [query] });
  const queryVector = data[0]; // number[384]

  // RAG 回答（串流）
  const stream = await AI.run('@cf/qwen/qwen1.5-14b-chat-awq', {
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userQuery },
    ],
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
  ```
  ```

- [ ] **Step 8：確認行數符合目標**

  ```bash
  wc -l src/content/posts/tech/2026-04-20-this-blog-tooling.md
  ```
  Expected: 280-320 行

- [ ] **Step 9：Commit**

  ```bash
  git add src/content/posts/tech/2026-04-20-this-blog-tooling.md
  git commit -m "post(tech): 擴充部落格工具文章，加入工具介紹段落與程式碼範例"
  ```

---

## Task 3：改寫 Article 2 — 用 Astro + Cloudflare Workers 從零建立

**Files:**
- Modify: `src/content/posts/tech/2026-04-20-astro-cloudflare-workers-from-zero.md`

- [ ] **Step 1：確認現有行數**

  ```bash
  wc -l src/content/posts/tech/2026-04-20-astro-cloudflare-workers-from-zero.md
  ```
  Expected: ~224 行

- [ ] **Step 2：在 Step 1「初始化 Astro 專案」加工具一行介紹**

  在 `### 1. 初始化 Astro 專案` 後插入：

  ```markdown
  **工具：Astro** — 以靜態優先為核心的前端框架，搭配 `@astrojs/cloudflare` adapter 後，SSR 和 API routes 由 Workers 執行，靜態資源由 Pages CDN 快取。
  ```

  在現有 `astro.config.mjs` code block 後，補充 i18n 設定範例：

  ```markdown
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
  ```

- [ ] **Step 3：在 Step 2「設定 wrangler.jsonc」加工具一行介紹**

  在 `### 2. 設定 wrangler.jsonc` 後插入：

  ```markdown
  **工具：wrangler** — Cloudflare 的 CLI 工具，負責本地開發模擬、D1 migration、部署。所有 Cloudflare 服務的 binding 在 `wrangler.jsonc` 集中管理。
  ```

  在現有 wrangler.jsonc code block 後補充 `nodejs_compat` 說明：

  ```markdown
  若要使用部分 Node.js built-in（`crypto`、`buffer`、`stream`），在 `wrangler.jsonc` 加：

  ```jsonc
  {
    "compatibility_flags": ["nodejs_compat"]
  }
  ```

  注意：`nodejs_compat` 不包含 `fs`、`path`、`child_process`。這些在 Workers runtime 完全不存在。
  ```

- [ ] **Step 4：在 Step 3「在 API route 使用 bindings」加 TypeScript 型別宣告**

  在 `### 3. 在 API route 使用 bindings` 後插入：

  ```markdown
  **工具：TypeScript + Cloudflare Workers types** — `@cloudflare/workers-types` 提供所有 binding 的型別定義。
  ```

  在現有 API route 範例後補充型別宣告：

  ```markdown
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
  ```

- [ ] **Step 5：在 Step 4「建立 D1 資料庫」加工具一行介紹**

  在 `### 4. 建立 D1 資料庫` 後插入：

  ```markdown
  **工具：D1** — Cloudflare 的 SQLite-compatible 邊緣資料庫。在 Workers 裡是本地呼叫，幾乎沒有連線延遲。Migration 用版本號前綴管理，方便追蹤 schema 演進。
  ```

  在現有 migration 指令後補充 SQL 範例：

  ```markdown
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
  ```

- [ ] **Step 6：在 Step 5「GitHub Actions 部署」加工具一行介紹 + secrets 說明**

  在 `### 5. GitHub Actions 部署` 後插入：

  ```markdown
  **工具：GitHub Actions + wrangler-action** — push 到 main 自動觸發部署；非 main branch 自動產生 Preview URL，部署前可以在隔離環境確認效果。
  ```

  在現有 workflow YAML 後補充 secrets 設定說明：

  ```markdown
  `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` 需要在 GitHub repo 的 **Settings → Secrets and variables → Actions** 新增。

  Token 需要的最低權限：
  - Cloudflare Pages: Edit
  - D1: Edit（若 workflow 裡跑 migration）

  在 Cloudflare Dashboard → My Profile → API Tokens → Create Token 建立，選「Custom token」並只給需要的權限。
  ```

- [ ] **Step 7：擴充「常見坑」section — 改為三段式格式**

  將現有「## 幾個常見坑」section 的每個坑，從說明式改為「錯誤現象 → 原因 → 解法」格式，並新增 D1 Preview 污染的完整 debug 情境：

  現有坑結構保留，每個坑在說明前加：

  **坑 1（環境變數 vs Bindings）：**
  ```markdown
  **錯誤現象**：本地 `pnpm dev` 可以讀到 secret，部署後 `env.MY_SECRET` 是 `undefined`。
  **原因**：wrangler.jsonc 的 bindings（DB、KV、R2）和 Cloudflare Dashboard 的 Environment Variables 是兩個不同系統，本地 dev 用 `.dev.vars` 模擬 env vars，但兩者取值方式不互通。
  **解法**：secret（API token、密碼）放 Dashboard 的 Environment Variables，用 `env.MY_SECRET` 取；資料庫、KV、R2 放 wrangler.jsonc bindings，走 `env.DB` 等。`.dev.vars`（git ignore）放本地開發用的 secrets。
  ```

  **坑 2（Node.js API 不相容）：**
  ```markdown
  **錯誤現象**：某個 npm 套件 import 後，deploy 時報 `Cannot find module 'fs'`。
  **原因**：Workers runtime 是 V8 isolates，不是 Node.js，`fs`、`path`、`child_process` 完全不存在。
  **解法**：查 npm 套件是否有 Workers-compatible 版本；或啟用 `nodejs_compat` compatibility flag（支援 `crypto`、`buffer` 等，但不包含 `fs`）。
  ```

  **坑 3（D1 Preview 環境資料污染）：**
  ```markdown
  **錯誤現象**：PR 的 Preview 環境跑測試後，production 的資料莫名被改動。
  **原因**：Pages 每個 branch 的 Preview 環境預設指向 `wrangler.jsonc` 裡的同一個 `database_id`，也就是 production 的 D1。Preview 環境的寫入會直接影響 production 資料。
  **解法**：在 Cloudflare Pages 專案設定 → Environment Variables，針對 Preview 環境覆寫 `database_id` 為獨立的 staging D1 database。或在測試資料用固定前綴（如 `test_`），方便清除。
  ```

  **坑 4（Isolate 無狀態性）：**
  ```markdown
  **錯誤現象**：module-level 變數在第一次請求後被設定，但第二次請求時又變回初始值。
  **原因**：Workers V8 isolates 每次請求是獨立的執行環境，全域變數不會在請求之間持續。這跟傳統 Node.js server 不同。
  **解法**：需要跨請求共享的狀態（session、cache）放 KV 或 D1，不要靠 module-level 變數。
  ```

- [ ] **Step 8：確認行數符合目標**

  ```bash
  wc -l src/content/posts/tech/2026-04-20-astro-cloudflare-workers-from-zero.md
  ```
  Expected: 320-360 行

- [ ] **Step 9：Commit**

  ```bash
  git add src/content/posts/tech/2026-04-20-astro-cloudflare-workers-from-zero.md
  git commit -m "post(tech): 擴充 Astro + Cloudflare 從零建立文章，補工具介紹與坑點說明"
  ```

---

## 驗收標準

| 文章 | 原始行數 | 目標行數 | 新增內容 |
|------|---------|---------|---------|
| dialogue-as-doc | ~43 | 180-220 | 工具介紹、完整段落、prompt 範本、前後對比 |
| this-blog-tooling | ~172 | 280-320 | 每工具一行介紹 + 程式碼範例 |
| astro-from-zero | ~224 | 320-360 | 每步驟工具一行 + TypeScript 型別 + 坑點三段式 |
