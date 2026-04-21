---
name: post
description: Convert a conversation, notes, or experience into a structured post for quidproquo.cc
---

# post skill

把任何內容（解決問題的過程、攀岩心得、電影感想、咖啡筆記...）轉換成結構化的文章，存到 `src/content/posts/<category>/`。

## 觸發方式與模板對應

| 使用者說 | 模板 |
|---------|------|
| 「寫成文章」、「記錄一下」、「write post」 | `templates/tech-post.md`（踩坑/問題解決） |
| 「寫成介紹文」、「寫成深入介紹」、「deep dive」 | `templates/tech-deep-dive.md`（工具/技術/架構介紹） |
| creative / life 類 | `templates/general-post.md` |

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

**主題標籤**（原本是 category，現降為 tag）：
`ai` / `marketing` / `design` / `film` / `anime` / `coffee` / `surf` / `travel` / `career` / `policy` / `education`

**技術標籤**：依文章內容選用（如 `astro`、`cloudflare`、`llm`、`react`、`docker` 等）

> 一篇文章通常會有 1 個 category + 1-5 個 tags。例如：AI 介紹文 → `category: learning`，`tags: [ai, llm]`

## 執行步驟

1. **判斷分類**：根據內容從上表選擇最適合的 category，並挑選相關 tags
2. **選擇模板**：依觸發方式對應上表，不猜測
3. **收集資訊**：從對話或筆記提取關鍵內容
4. **產生檔案**：
   - 遵守 `references/writing-guide.md`
   - 欄位說明見 `references/frontmatter-schema.md`
   - 檔名：`YYYY-MM-DD-<slug>.md`（slug 用英文 kebab-case）
   - 存到 `src/content/posts/<category>/`
   - 如果文章引用工具、框架、官方文件、論文、版本資訊、數據比較或外部說法，文末必須補 `## 參考資料`
   - `tech` / `learning` / `product` 類，以及帶有 `ai` / `policy` / `education` / `marketing` tag 的文章，預設要附參考資料
5. **請使用者 review**：展示草稿，詢問是否修改
6. **確認後執行**：
   ```bash
   git add src/content/posts/<category>/YYYY-MM-DD-<slug>.md
   git commit -m "post(<category>): <title summary>"
   ```
