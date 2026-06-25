# Glossary 升級 + Series 頁面 + About 頁面 — 移植計畫 TODO

> 目標：把競品 quidproquo（`github.com/vincentxuu/quidproquo`）的功能移植進本專案：
> 1. **Glossary 完整升級**（含 D1 點擊追蹤）— 從現有簡單 tooltip 升級成雙語互動詞彙卡
> 2. **Series 系列頁面** — `/series` 列表 + `/series/[slug]` 詳情
> 3. **About 頁面** — 仿 quidproquo `/about`，無縫整合 projects + certifications
>
> 斷線後從這份文件接手即可。每個 checkbox 完成就打勾。

## ✅ 進度（2026-06-25）
- **Series（task 5、6）已完成並通過 build**：`src/utils/series.ts` + `/series`、`/series/[slug]`（zh+en）+ 導覽列連結 + i18n keys。已標 3 個系列：**GitHub 開源週報**（5 篇，slug `github-trending`）、**Kafka 為什麼這麼快**（2 篇 `why-kafka-is-fast`）、**系統設計 Mock 面試**（3 篇 `system-design-mock`）。
- **About（task 7）已完成並通過 build**：`/about`、`/en/about`，含 bio、5 段經歷時間軸（Oomii 資深→Foxconn intern）、4 個精選作品、技能、依年份證照（含驗證連結）、聯絡。
- **Glossary（task 1–4）已完成並通過 build**：
  - `src/lib/glossary/terms.ts`：rich `GlossaryEntry`（雙語 definition/advanced/context/links/aliases）+ 12 個精選 rich 詞條（RAG、embedding、Vectorize、D1、LLM、token、AI Agent、MCP…），疊加在 188 筆 legacy 輕量詞條上。
  - frontmatter `glossary:`（`src/content.config.ts`）+ `applyGlossary` 升級（term+alias 比對、支援 per-article 詞彙）。
  - 互動卡片升級（zh + en slug 頁）：點詞 → `/api/glossary/explain`（Workers AI qwen + local fallback）+ 入門/進階切換 + reading links。
  - D1 追蹤：`migrations/0010_glossary_lookup_stats.sql`（已 apply 到 local）。
  - `scripts/check-glossary-coverage.mjs` + `pnpm check:glossary`（218 詞、316 篇、230 篇有 coverage）。
  - `.claude/skills/glossary-maintenance/SKILL.md`。
  - 註：`src/data/glossary.ts` 保留為 legacy 資料源；`BilingualView.tsx` 仍用舊卡片邏輯（未動，不影響）。
- 環境備註：本機預設 node v18（astro 需 ≥18.20.8）。要用 `nvm use v20.20.2` 跑 astro。先前 `node_modules` 缺 `react-markdown`，已 `pnpm install` 補上。SSR 模式（`output: 'server'`）→ 靜態頁要加 `export const prerender = true;`。

---

## 🚦 Commit / Push 前需要「你」手動做的事

> 程式我都寫好且過 build 了，但這幾件我做不了或不該替你決定：

1. **瀏覽器煙霧測試（最重要）** — 用 node 20 跑 `nvm use v20.20.2 && make dev`，然後：
   - 開任一篇 tech 文章，點技術詞 → 確認互動卡片跳出
   - 點卡片上的「入門 / 進階」→ 確認內容會切換
   - 確認有 **AI 解釋**出現（不是每次都 local fallback）→ 代表 `/api/glossary/explain` + Workers AI 真的通了（這支 API 我只過 build，**沒在 runtime 跑過**）
   - 開 `/series`、`/series/github-trending`、`/about`、`/en/about` 看排版
2. **檢視自動加的 series frontmatter（10 篇）** — 系列歸屬、order、`src/utils/series.ts` 裡 `SERIES_DEFINITIONS` 的描述，看你滿不滿意再 commit。
3. **node 版本** — 你之後 build/dev 都要先 `nvm use v20.20.2`（預設 node 18 會被 astro 擋）。可考慮加 `.nvmrc` 寫入 `20`。
4. **（這項是「部署時」，非 commit 前）** prod D1 migration：`make d1-migrate`（`--remote`，CI 沒有，要手動）。沒跑的話線上 glossary 查詢統計寫入會失敗，但有 try/catch → 卡片仍正常、只是不記錄統計。

不需要你做的（FYI）：`pnpm install` 我已跑過、lockfile 沒變；build 產物都 gitignored。

---

## 0. 背景與差異（已調查完成）

### 本專案現況
- Glossary 資料：`src/data/glossary.ts` — `Record<string, {zh, context}>`（英文詞 → 中文翻譯 + context）
- 標注邏輯：`src/lib/applyGlossary.ts` — client 端 TreeWalker，把首次出現的詞包成 `<span class="gloss" data-def data-term>`
- 卡片 UI：`src/pages/posts/[...slug].astro`
  - CSS 在 line ~452–520（`.gloss`, `.gloss-card`, `.gloss-card-term/zh/context`）
  - JS 在 line ~590–649（hover 顯示 `data-def`；click 顯示 `.gloss-card`，內容來自本地 `glossary[term]`）
- 也被引用於：`src/pages/en/posts/[...slug].astro`、`src/components/BilingualView.tsx`
- **Series schema 已存在**：`src/content.config.ts:31` 已有 `series: { name, order }`（optional），但目前 0 篇文章使用、也沒有 series 頁面

### 競品 quidproquo 的進階做法（要抄的目標）
- `src/lib/glossary/terms.ts`：豐富的 `GlossaryEntry`（term, aliases, definition, advanced, context, links + 全部 `_en` 變體）+ `DEFAULT_GLOSSARY_TERMS`
- per-article frontmatter `glossary`（單篇專屬詞彙）
- `src/pages/api/glossary/explain.ts`：POST 端點 — 記錄查詢到 D1 + AI 解釋（beginner/advanced 分層）+ local fallback
- `migrations/0006_glossary_lookup_stats.sql`：D1 追蹤表
- `scripts/check-glossary-coverage.mjs`：coverage 檢查腳本
- `.claude/skills/glossary-maintenance/SKILL.md`：維護 skill
- Series：`src/utils/series.ts` + `src/pages/series/index.astro` + `src/pages/series/[series].astro`

### ⚠️ 本專案 vs 競品的關鍵慣例差異（移植時要改）
| 項目 | 競品 | 本專案（要用這個） |
|---|---|---|
| 取 env | `import { env } from 'cloudflare:workers'` | `locals.runtime.env`（見 `src/pages/api/views.ts`） |
| LLM | LangChain `createModel`（Groq/OpenAI key） | **Workers AI**：`env.AI.run('@cf/qwen/qwen1.5-14b-chat-awq', ...)`（見 `src/pages/api/search.ts:354`） |
| Embedding | — | `@cf/baai/bge-m3` |
| D1 binding | `env.DB` | `env.DB`（相同，binding 名 `DB`，db name `engineer-news-db`） |
| PostCard prop | `slug=` | **`id=`**（本專案 PostCard 用 `id`，見 `src/components/PostCard.astro`） |
| i18n | `useTranslations` from `../../i18n/utils` | 本專案有 `src/i18n/utils.ts` + `src/i18n/ui.ts`（**尚未讀完，接手要先看**） |
| Layout | `PostLayout.astro` | 本專案只有 `src/layouts/BaseLayout.astro` |
| migrations 編號 | 到 0006 | 本專案到 `0009_interactions.sql` → **新檔用 `0010_`** |
| 內容查詢 | `getPublishedPosts()` from utils/content | **尚未確認本專案是否有 content util**，可能要直接用 `getCollection('posts')` + 自行過濾 draft（接手要先 grep `getCollection`） |
| gray-matter | 有裝 | 已裝 `^4.0.3`（coverage 腳本可用） |

---

## 1. Glossary：豐富雙語資料模型  〔task #1〕
- [ ] 建 `src/lib/glossary/terms.ts`，定義 `GlossaryEntry` interface（抄競品 + 額外保留本專案的 `zh` 翻譯欄位，因為本專案 tooltip 會顯示中文翻譯，是競品沒有的優點）
  ```ts
  export interface GlossaryLink { label: string; url: string }
  export interface GlossaryEntry {
    term: string
    aliases?: string[]
    zh?: string            // 保留本專案特色：中文翻譯短詞
    definition?: string
    advanced?: string
    context?: string
    links?: GlossaryLink[]
    definition_en?: string; advanced_en?: string; context_en?: string; links_en?: GlossaryLink[]
  }
  export const DEFAULT_GLOSSARY_TERMS: GlossaryEntry[] = [ ... ]
  export function findDefaultGlossaryEntry(term: string): GlossaryEntry | undefined { ... } // 比對 term + aliases，case-insensitive
  ```
- [ ] 寫一次性轉換腳本，把現有 `src/data/glossary.ts`（~100+ 筆 `{zh, context}`）轉成新格式：`{ term, zh, definition: context ?? zh, context }`
- [ ] 併入競品的 AI/RAG 相關條目（RAG, embedding, Vectorize, Cloudflare D1…，這些對本站也高度相關，可從競品 `src/lib/glossary/terms.ts` 直接抄）
- [ ] 決定是否保留舊 `src/data/glossary.ts`（建議：移除，改全部引用新 terms.ts；或讓舊檔 re-export 以免大改 import）

## 2. Glossary：per-article frontmatter + tooltip 升級  〔task #2〕
- [ ] `src/content.config.ts` 加 optional `glossary: z.array(...)`（單篇專屬詞彙，shape 同 `GlossaryEntry`）
- [ ] `src/lib/applyGlossary.ts` 改成讀新 terms（攤平 term + aliases 成查詢 map），維持 TreeWalker 包 span 邏輯；`data-def` 放快速翻譯（`zh ?? definition`）
- [ ] 升級 `src/pages/posts/[...slug].astro` 的 `.gloss-card`（CSS line ~487–520 + JS line ~590–649）：
  - 點擊時 POST `/api/glossary/explain`（帶 term, slug, context=該詞所在段落文字, level, seed=本地 entry）
  - 卡片顯示 definition + context + reading links，加 **beginner/advanced 切換**
  - hover 仍顯示 `data-def` 快速 tooltip
- [ ] 同步處理 `src/pages/en/posts/[...slug].astro`（英文版用 `_en` 欄位、level 文案英文）
- [ ] 確認 `src/components/BilingualView.tsx` 也跟著更新（它也 import applyGlossary）

## 3. Glossary：D1 點擊追蹤  〔task #3〕
- [ ] 新增 `migrations/0010_glossary_lookup_stats.sql`（抄競品 0006，PK `(term, slug, level)`）
  ```sql
  CREATE TABLE IF NOT EXISTS glossary_lookup_stats (
    term TEXT NOT NULL, slug TEXT NOT NULL DEFAULT '', level TEXT NOT NULL DEFAULT 'beginner',
    lookup_count INTEGER NOT NULL DEFAULT 0, last_context TEXT,
    first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (term, slug, level)
  );
  ```
- [ ] `make d1-migrate`（local）套用 migration
- [ ] 建 `src/pages/api/glossary/explain.ts`，**改寫成本專案慣例**：
  - env 用 `locals.runtime.env`（拿 `DB`, `AI`）
  - AI 解釋改用 `AI.run('@cf/qwen/qwen1.5-14b-chat-awq', { messages: [...] })`，prompt 要求只輸出 JSON（definition/context/reading）
  - `recordLookup()` upsert 進 `glossary_lookup_stats`（INSERT … ON CONFLICT DO UPDATE，抄競品）
  - local fallback：用 seed 或 `findDefaultGlossaryEntry(term)`，AI 失敗也能回（`.catch(() => null)`）
  - 回傳 `{ term, level, definition, context, reading, source: 'ai'|'local' }`

## 4. Glossary：coverage 腳本 + 維護 skill  〔task #4〕
- [ ] 抄 `scripts/check-glossary-coverage.mjs`（競品版幾乎可直用，已裝 gray-matter；確認 `DEFAULT_TERMS_FILE` 指向 `src/lib/glossary/terms.ts`）
- [ ] `package.json` 加 `"check:glossary": "node scripts/check-glossary-coverage.mjs"`
- [ ] 建 `.claude/skills/glossary-maintenance/SKILL.md`（抄競品，把路徑/指令換成本專案：`DEFAULT_GLOSSARY_TERMS`、`src/lib/glossary/terms.ts`、查詢 `glossary_lookup_stats`、`make d1-...` 或 wrangler d1 查詢指令）

## 5. Series：utils + index/detail 頁面  〔task #5〕
- [ ] 先確認本專案內容查詢方式：`grep -rn "getCollection" src/pages`，決定 series util 用 `getCollection('posts')` 自行過濾，還是有現成 helper
- [ ] 建 `src/utils/series.ts`（抄競品 `src/utils/series.ts`，調整 import）：
  - `SERIES_DEFINITIONS`（slug + 雙語描述）
  - `getSeriesMeta` / `getSeriesMetaBySlug` / `getSeriesHref` / `getSeriesSummaries`
  - schema 已相容（`post.data.series.name` / `.order`），分組排序邏輯可直接用
- [ ] 建 `src/pages/series/index.astro`（卡片列表：count + 最新日期 + 描述）用 `BaseLayout`
- [ ] 建 `src/pages/series/[series].astro`（`getStaticPaths` 列出系列，內文用 PostCard，**prop 用 `id=` 不是 `slug=`**）
- [ ] 英文版：`src/pages/en/series/index.astro` + `src/pages/en/series/[series].astro`
- [ ] 導覽列加「系列 / Series」連結（找 BaseLayout 或 nav 元件，與 分類/標籤 並列）
- [ ] i18n：`src/i18n/ui.ts` 加 `nav.series`、`series.posts`、`series.empty` 等 key

## 6. Series：把既有文章標進系列  〔task #6〕
- [ ] 掃既有 316 篇，找可成系列的群組（候選：AI 程式設計實戰 / system design mock / Qualcomm·edge AI / DeepSeek 系列…）
- [ ] 在這些文章 frontmatter 補 `series: { name, order }`
- [ ] 在 `SERIES_DEFINITIONS` 補對應 slug + 雙語描述
- [ ] **列清單給使用者確認後再寫入**（不要自動亂分組）

---

## 7. About 頁面：整合 projects + certifications  〔task #7〕

> 仿 quidproquo `https://quidproquo.cc/about/` 的版面（使用者指定：「排版若無法更好，就基於他的擴充」）。
> 資料來源（已蒐集，**勿杜撰**）：GitHub profile `github.com/a920604a/a920604a` README。
> 履歷站 `a920604a.github.io/self-reusme-website/` 是 React SPA，WebFetch 讀不到，資料以下方為準。

### quidproquo about 的版面結構（參考骨架）
個人簡介（角色 + 職涯故事弧線）→ 核心理念（3 條原則）→ 職涯時間軸（分階段含年份）→ 代表作品（含 tech stack + 連結）→ 技能分類 → 個人興趣 → 多管道聯絡。

### 要做的事
- [ ] 建 `src/pages/about.astro`（zh-TW）用 `BaseLayout`，版面照上面骨架
- [ ] 建 `src/pages/en/about.astro`（英文版）
- [ ] 導覽列加「關於 / About」連結（與 系列/分類/標籤 並列）
- [ ] **Projects 區**：用卡片（可重用 series 卡片或 PostCard 風格），每張含 名稱 + 描述 + tech stack chips + GitHub 連結
- [ ] **Certifications 區**：依年份分組（On-Going/2026 → 2022），每筆含名稱 + 發證單位 + 驗證連結
- [ ] 職涯時間軸 / bio：**目前 README 沒有公司/年資**，這段需使用者補（先放 placeholder 或省略；不要杜撰工作經歷）
- [ ] i18n key 補 `nav.about`

### 已蒐集資料（直接用，逐字）

**身分**：Tim / Yu-An Chen（陳昱安）· Taipei, Taiwan · Full-Stack Developer & Data Engineer
**Talk to me about**：Full Stack、Docker、Data Engineering
**焦點領域**：Full Stack（React / FastAPI / DB）、Data Engineering（ETL, Airflow, Prefect）、Cloud & DevOps（GCP, Docker, CI/CD, monitoring）、MLOps（training, experiment tracking, real-time inference）

**Key Projects（4 個主打）**
1. **GitHub Data Analytics Pipeline** — 用 GCP / Airflow / BigQuery 自動處理 GitHub Watch events，Streamlit dashboard 呈現開源趨勢。Tech: GCP, Airflow, BigQuery, Python, Streamlit, Terraform. Repo: `github.com/a920604a/gitHub-data-analytics`
2. **Stock Price Prediction with MLOps** — 完整 MLOps pipeline：自動 ETL、訓練、實驗追蹤、即時推論、監控、CI/CD。Tech: Prefect, MLflow, FastAPI, Prometheus, Grafana, PostgreSQL, ClickHouse, Docker Compose, GitHub Actions. Repo: `github.com/a920604a/stock-mlops`
3. **Arxiv Knowledge Assistant** — arXiv 論文檢索平台：每日 ingestion、向量檢索、LLM RAG、視覺化 dashboard、雙語 Q&A。Tech: FastAPI, Prefect, Qdrant, PostgreSQL, MinIO, React, Docker Compose, Prometheus, Grafana. Repo: `github.com/a920604a/llm-assistant`
4. **Clothing Recommendation Platform** — web scraping + ETL + Redis cache + FastAPI + React，依地區風格/色票/性別推薦穿搭。Repo: `github.com/a920604a/clothes-outfit`

**其他 Projects（次要，可放「更多」）**
- live-english-tutor `github.com/a920604a/live-english-tutor`
- AMD 黃斑部退化復健平台（C#/Unity）`github.com/a920604a/amd`
- monitoring_system `github.com/a920604a/monitoring_system`
- daodao-etl `github.com/a920604a/daodao-etl`
- My Business Card `github.com/a920604a/my-business-card`
- DaoDao 貢獻：daodao-ai-backend / daodao-admin-ui / daodao-storage（`github.com/daodaoedu/*`）

**Certifications（依年份，含驗證連結）**
- *On-Going / 2026*：AWS Certified Cloud Practitioner（Credly）、Associate Data Practitioner（Credly）、Google AI Professional Certificate（Coursera）
- *2025*：MLOps Zoomcamp、Data Engineering Zoomcamp、LLM Zoomcamp（皆 DataTalks Club）
- *2023*：GANs Specialization、Google Data Analytics、Data Science Fundamentals with Python and SQL、Accelerated CS Fundamentals（皆 Coursera）
- *2022*：Deep Learning Specialization、Python for Everybody（皆 Coursera）
- （連結見 `github.com/a920604a/a920604a` README 的 Certifications 區）

**聯絡 / 連結**
- GitHub `github.com/a920604a` · LinkedIn `linkedin.com/in/chen-yuan-2b4b7212b/` · Instagram `instagram.com/yuan3509/` · Blog（本站）`engineer-news.pages.dev` · 履歷站 `a920604a.github.io/self-reusme-website/` · Business card `github.com/a920604a/my-business-card`

> 💡 趣味連結：quidproquo 作者 Vincent Xu 也是 **DaoDao（島島阿學）** 創辦人，而你也貢獻過 `daodaoedu/*` repos——about 頁可不提，但是兩站的隱藏交集。

---

## 完成後驗證
- [ ] `make dev` 跑起來，開一篇文章點詞 → 出現升級後卡片、beginner/advanced 可切換
- [ ] D1 有寫入：`wrangler d1 execute engineer-news-db --local --command "SELECT * FROM glossary_lookup_stats LIMIT 5"`
- [ ] `/series` 與 `/series/<slug>` 正常顯示、PostCard 正常
- [ ] EN 路由 `/en/series` 正常
- [ ] `/about` 與 `/en/about` 正常：projects 卡片 + certifications 分年顯示 + 連結可點
- [ ] `make build` 通過（含 Pagefind）
- [ ] `pnpm check:glossary` 跑得出 coverage 報告

## 競品原始碼參考（用 gh api 取）
- `gh api repos/vincentxuu/quidproquo/contents/<path> --jq '.content' | base64 -d`
- 關鍵檔：`src/lib/glossary/terms.ts`、`src/pages/api/glossary/explain.ts`、`migrations/0006_glossary_lookup_stats.sql`、`scripts/check-glossary-coverage.mjs`、`src/utils/series.ts`、`src/pages/series/index.astro`、`src/pages/series/[series].astro`、`.claude/skills/glossary-maintenance/SKILL.md`
