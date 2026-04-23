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
| 「深入介紹」、「deep dive」、「架構解析」 | `templates/tech-deep-dive.md` | `deep-dive` |
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
   - **case-study（有 GitHub URL）**：
     1. 先嘗試抓取 `https://raw.githubusercontent.com/<owner>/<repo>/main/README.md`
     2. 若失敗（404 / 空內容），fallback 改抓 `https://github.com/<owner>/<repo>`，從 HTML 萃取 README
     3. 若 main 失敗，改試 master 分支
     4. 從 README / 對話萃取：背景、挑戰、解法、成果、技術堆疊

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

6. **請使用者 review**：展示草稿，詢問是否修改

7. **確認後執行**：
   ```bash
   git add src/content/posts/<category>/YYYY-MM-DD-<slug>.md
   git commit -m "post(<category>): <title summary>"
   ```
