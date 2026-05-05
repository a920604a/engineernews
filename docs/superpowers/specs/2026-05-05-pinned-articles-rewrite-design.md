# Design: 三篇 Pinned 文章改寫

**日期**: 2026-05-05  
**目標**: 將三篇 `pinned: true` 文章從「太簡短」擴充為對新手和有經驗工程師都有價值的完整文章。

## 設計原則

- **目標讀者**：新手 + 有經驗工程師並重。先一段快速介紹工具本身，再聚焦設計決策理由。
- **改寫策略**：因文制宜（方案 B）— 每篇根據定位做不同擴充，不套統一模板。
- **語言**：繁體中文，保持原有 frontmatter 不變（`pinned: true`、`draft: false`、`audio_url` 等）。

---

## 文章 1：這個部落格用了哪些工具

**檔案**: `src/content/posts/tech/2026-04-20-this-blog-tooling.md`  
**現狀**: ~170 行，每個工具直接進入「我怎麼用它」，缺乏「它是什麼」的背景說明。  
**目標**: ~280-320 行

### 每個工具 section 套用以下結構

```
### 工具名稱

> 一句話：X 是什麼、解決什麼核心問題

為什麼選它（保留原有內容 + 擴充比較）

實際用法 + 程式碼範例（新增）
```

### 新增程式碼範例

| Section | 新增內容 |
|---------|---------|
| D1 | `migrations/0001_init.sql` schema 範例、`wrangler d1 execute` 本地/遠端指令 |
| Vectorize | `sync-to-d1.ts` 的 embedding + upsert 核心片段 |
| Workers AI | `AI.run('@cf/baai/bge-m3', ...)` 和 `AI.run('@cf/qwen/qwen1.5-14b-chat-awq', ...)` 呼叫範例 |
| R2 | OG 圖片 cache 邏輯片段（先查 R2 → miss 才跑 satori） |

### 「為什麼不用 X」段落擴充

- D1 vs PlanetScale/Supabase：補充連線延遲說明（本地呼叫 vs 跨服務 TCP）
- Workers AI vs OpenAI：補充繁中品質具體說明（qwen-14b 對繁中的優勢）
- Astro vs Next.js：補充 bundle size 比較和設定複雜度

---

## 文章 2：用 Astro + Cloudflare Workers 從零建立低摩擦平台

**檔案**: `src/content/posts/tech/2026-04-20-astro-cloudflare-workers-from-zero.md`  
**現狀**: ~220 行，步驟清楚，但每步直接進入操作，未介紹工具背景；「常見坑」偏點列。  
**目標**: ~320-360 行

### 每個步驟套用以下結構

```
### N. 步驟名稱

**工具：X** — 一句話說明 X 解決的問題

操作說明（保留原有）

程式碼範例（保留 + 擴充）
```

### 新增程式碼範例

| Step | 新增內容 |
|------|---------|
| Step 1 | `astro.config.mjs` 加入 `i18n` 設定範例 |
| Step 2 | `wrangler.jsonc` 補上 `nodejs_compat` compatibility flag 說明 |
| Step 3 | TypeScript `Env` interface 型別宣告 + `locals.runtime.env` 取型別寫法 |
| Step 4 | D1 migration SQL 範例 + 版本號命名規則說明 |
| Step 5 | GitHub Actions `secrets` 設定說明 |

### 「常見坑」擴充

每個坑改成三段式：**錯誤現象 → 原因 → 解法**（而非只有說明）。  
新增一個坑：**Preview 環境指向同一個 D1 的資料污染** — 展開成完整 debug 情境。

---

## 文章 3：對話即文件：用 Claude Code 把 Debug 過程直接變成文章

**檔案**: `src/content/posts/learning/2026-04-20-dialogue-as-doc-claude-code.md`  
**現狀**: ~40 行，每 section 只有 2-3 行 bullet，無工具介紹，無 prompt 範本。  
**目標**: ~180-220 行

### 結構（保留 debug 格式，每 section 大幅擴充）

**新增：文章開頭工具快速介紹段**
- Claude Code 是什麼（CLI + AI coding agent）
- `post` skill 是什麼（對話 → 結構化文章的自動化流程）
- `ingest.ts` 是什麼（輸入管線腳本）

**情境**（1 段 → 3-4 段）
- 具體描述多人協作 debug、跨天 chat thread 的雜亂樣貌

**問題**（3 點 → 每點展開 1 段）
- 補充具體範例：直接貼對話 vs 整理後的對比

**嘗試過程**（3 點 → 完整段落 + 失敗原因）
- 說明「只要求摘要」失敗的原因，改用範本後的差異

**解法**（3 點 → 完整操作流程 + prompt 範本）
- `make ingest FILE=...` 實際指令
- prompt 結構的程式碼區塊範例（輸入格式、輸出 frontmatter）
- 輸入對話片段 → 輸出 Markdown 文章的前後對比

**學到的事**（3 點 → 每點一段）
- 補充「自動化不能完全取代人工審查」的具體理由

---

## 實作順序

1. 文章 3（改幅最大，從 40 行到 180-220 行）
2. 文章 1（補工具介紹段落 + 程式碼範例）
3. 文章 2（補工具說明 + 擴充坑點）
