---
name: post
description: Convert a conversation, notes, experience, or GitHub project into a structured post for engineer-news
---

# post skill

把任何內容（解決問題的過程、專案介紹、概念解說、電影感想...）轉換成結構化的文章，存到 `src/content/posts/<category>/`。

## 觸發方式與模板對應

| 使用者說 | 模板 | type 值 |
|---------|------|---------|
| 「寫成文章」、「踩坑」、「debug」 | `templates/tech-post.md` | `debug` |
| 「深入介紹」、「深入研究」、「deep dive」、「架構解析」 | `templates/tech-deep-dive.md` | `deep-dive` |
| 「怎麼做」、「步驟」、「how to」 | `templates/tech-post.md` | `how-to` |
| 「X 個工具」、「清單」、「listicle」 | `templates/tech-post.md` | `listicle` |
| 「什麼是」、「解釋」、「explainer」 | `templates/tech-deep-dive.md` | `explainer` |
| 「我做了一個專案」、「case study」、「作品集」、GitHub URL | `templates/case-study.md` | `case-study` |
| 「比較」、「vs」、「A 還是 B」 | `templates/tech-post.md` | `comparison` |
| 「研究」、「數據」、「調查」 | `templates/tech-deep-dive.md` | `research` |
| 「時事」、「新聞」、「newsjacking」 | `templates/tech-post.md` | `newsjacking` |
| creative / life 類 | `templates/general-post.md` | （不設 type） |

## 支援的分類（Category）

`tech` / `product` / `learning` / `creative` / `life`

| Category | 適用內容 |
|----------|---------|
| `tech` | 技術問題解決、工具介紹、架構設計、工程實踐 |
| `product` | 產品設計、用戶體驗、功能開發、市場策略 |
| `learning` | 概念解說、知識整理、AI/教育/政策/研究主題 |
| `creative` | 電影、動漫、音樂、設計、衝浪、咖啡、旅遊 |
| `life` | 日常記錄、職涯、個人反思 |

## 推薦 Tags

**主題標籤**：
`ai` / `marketing` / `design` / `film` / `anime` / `coffee` / `surf` / `travel` / `career` / `policy` / `education`

**技術標籤**：依文章內容選用（如 `astro`、`cloudflare`、`llm`、`react`、`docker` 等）

> 一篇文章通常會有 1 個 category + 1-5 個 tags。例如：AI 介紹文 → `category: learning`，`tags: [ai, llm]`

## 執行步驟

1. **判斷觸發類型**：對照上方表格，確認模板與 type 值

2. **收集資訊**：
   - 一般文章：從對話或筆記提取關鍵內容
   - **有 GitHub URL 的工具 / case-study**：README 是起點，不是終點

     **第一層：README**
     1. 先嘗試抓取 `https://raw.githubusercontent.com/<owner>/<repo>/main/README.md`
     2. 若失敗（404 / 空內容），fallback 改抓 `https://github.com/<owner>/<repo>`，從 HTML 萃取 README
     3. 若 main 失敗，改試 master 分支

     **第二層：深挖文件（README 讀完後必做）**
     - 檢查是否有 `docs/`、`wiki`、官方網站、changelog / RELEASES
     - 抓取時給 WebFetch 明確的問題，例如「OAuth refresh 機制、部署選項、已知限制、2024 以後的 breaking changes」——WebFetch 用小模型摘要，prompt 越具體，細節越不會被丟掉
     - 重點抓：設計哲學、與替代方案的差異、適用與不適用情境、時效性資訊（deprecation、provider 下架、版本異動）

     **第三層：交叉驗證**
     - 搜尋是否有其他文章、討論串已介紹過這個工具
     - 比對對方涵蓋的細節，確認自己沒有遺漏重要功能或限制
     - 若找到更豐富的資訊來源，以它為準，補進草稿

     **從資料萃取：** 背景、核心功能、設計哲學、與替代方案比較、適用情境、限制與注意事項、技術堆疊

3. **判斷分類**：根據內容從上表選擇最適合的 category，並挑選相關 tags

4. **評估視覺需求**：主動判斷是否需要圖解（不等用戶要求），參考 `references/writing-guide.md` 的「視覺輔助原則」
   - 有流程 / 步驟 / 決策分支 → Mermaid flowchart
   - 有元件互動 / 服務呼叫 → Mermaid sequenceDiagram
   - 有架構 / 模組關係 → Mermaid graph
   - **case-study 必須包含：架構圖 + 流程圖（優先沿用 README 現有 Mermaid，沒有才自行生成）**
   - `creative` / `life` 類、短文（< 500 字）→ 跳過

5. **產生檔案**：
   - 遵守 `references/writing-guide.md`
   - 欄位說明見 `references/frontmatter-schema.md`
   - 檔名：`YYYY-MM-DD-<slug>.md`（slug 用英文 kebab-case）
   - 存到 `src/content/posts/<category>/`
   - case-study 必須填入 `github` 欄位（若有 URL）
   - 如果文章引用工具、框架、官方文件、論文、版本資訊、數據比較或外部說法，文末必須補 `## 參考資料`
   - `tech` / `learning` / `product` 類，以及帶有 `ai` / `policy` / `education` / `marketing` tag 的文章，預設要附參考資料

6. **產生英文版（預設必做，雙語成對）**：
   - 本站是雙語站，每篇文章預設要有 zh-TW 與 English 兩份,成對存在
   - 英文版檔名：`YYYY-MM-DD-<slug>.en.md`(slug 與中文版相同),放在同一個 category 目錄
   - frontmatter 規則:
     - `lang: "en"`
     - `title` / `tldr` / `description` 翻成英文(自然英文,不要逐字直譯)
     - `date` / `category` / `tags` / `type` / `github` / `url` 與中文版一致
     - 英文版 frontmatter 的值習慣加雙引號(對齊既有 `.en.md` 檔)
   - 正文翻成自然、道地的英文;Mermaid 圖中的中文標籤也要一併翻成英文
   - 參考資料連結維持不變
   - 例外:使用者明確說「只要中文」或文章屬於極短的 `life` / `creative` 隨筆時,可跳過並告知

7. **偵測 glossary 術語候選（預設必做）**：
   本站雙語對照檢視會對「英文欄」自動標記術語、hover 顯示解釋（資料源 `src/data/glossary.ts`，比對英文小寫詞，見 `src/components/BilingualView.tsx` 的 `applyGlossary`）。寫完英文版後，從中挑出值得收錄的新術語：
   - **來源**：只掃 `.en.md` 內文（跳過 frontmatter、code/pre、連結 `[]()`、標題 `#`——對齊 `applyGlossary` 的排除規則，否則加了也不會被標記）
   - **選詞標準（嚴格）**：只收「不解釋一般工程師會看不懂」的硬核專業術語；**排除**常見詞（api、json、cache、server 這類）、產品/品牌/公司名、過長片語。**每篇上限 5–8 個，寧缺勿濫，沒有合適的就不加**
   - **去重**：先讀 `src/data/glossary.ts`，比對既有 key（不分大小寫），已存在的不要重複提
   - **必須真的出現在英文版內文**，否則 hover 永遠不會觸發
   - 每個候選產出三欄：`key`（文章中出現的英文詞，存小寫）、`zh`（繁中翻譯）、`context`（一句繁中情境說明，對齊既有寫法，約 20–40 字）
   - 整理成表格，**留到下一步 review 一起給使用者勾選，先不要寫檔**

8. **請使用者 review**：展示中英兩份草稿，以及上一步的 glossary 術語候選表，詢問是否修改、哪些術語要收錄

9. **確認後執行**：
   - 將使用者勾選的術語寫入 `src/data/glossary.ts`：插入到語意最接近的分類註解區塊下（系統設計 / API / 儲存快取 / 安全 / 開發流程 / 容器雲端 / AI ML / 職場英文），對齊既有 `"term": { zh: "…", context: "…" },` 格式；使用者全不選則略過此檔
   ```bash
   git add src/content/posts/<category>/YYYY-MM-DD-<slug>.md \
           src/content/posts/<category>/YYYY-MM-DD-<slug>.en.md \
           src/data/glossary.ts
   git commit -m "post(<category>): <title summary>"
   ```

10. **產生語音（TTS，預設必做）**：
   - 用 Makefile 既有目標,**只需指定中文版檔案**——`tts-all.ts` 會自動一併處理同名的 `.en.md`(一次跑出中英兩個音檔):
     ```bash
     make tts-post FILE=src/content/posts/<category>/YYYY-MM-DD-<slug>.md
     ```
   - 這個目標跑完整 pipeline：合成語音 → 上傳 R2 → 回寫兩份 frontmatter 的 `audio_url` → sync 遠端 D1 + Vectorize（用 `--prod`，會寫生產環境）
   - **Node 版本雷點**：`tts-post` 內部會呼叫 `wrangler`，需要 Node ≥ 20。Makefile 第一行寫死的 `v20.20.2` 路徑可能已不存在而 fall back 到 v18 導致 `wrangler d1 execute` 失敗。若最後一步 sync 報「Wrangler requires at least Node.js v20」，改用 homebrew 的新版 node 重跑 sync：
     ```bash
     export PATH="/opt/homebrew/bin:$PATH"; set -a; . ./.env; set +a
     npx tsx scripts/sync-to-d1.ts --prod --file=src/content/posts/<category>/YYYY-MM-DD-<slug>.md
     ```
   - 跑完確認兩份 frontmatter 都已被回寫 `audio_url`；若有改動,記得再 commit 一次
   - 例外:使用者明確說「先不要語音」時可跳過
