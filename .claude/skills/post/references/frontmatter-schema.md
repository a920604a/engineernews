# Frontmatter 欄位說明

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| title | string | ✅ | 文章標題 |
| date | date | ✅ | 撰寫日期，格式 YYYY-MM-DD |
| category | string | ✅ | 主分類，從 5 個選一（見下方） |
| tags | string[] | ✅ | 標籤，全小寫 kebab-case，可空陣列 |
| lang | enum | ✅ | zh-TW 或 en，預設 zh-TW |
| description | string | ❌ | SEO meta description |
| tldr | string | ❌ | 一句話摘要（tech / learning 類強烈建議填） |
| draft | boolean | ❌ | true 時不顯示（預設 false） |

## Category 選項（只能選一個）

| Category | 適用內容 |
|----------|---------|
| `tech` | 技術問題解決、工具介紹、架構設計 |
| `product` | 產品設計、UX、功能開發、市場策略 |
| `learning` | 概念解說、知識整理、AI/教育/政策主題 |
| `creative` | 電影、動漫、設計、衝浪、咖啡、旅遊 |
| `life` | 日常記錄、職涯、個人反思 |

## Tags 說明

Tags 有兩種用途：

**1. 主題標籤**（原本是 category 的概念，現降為 tag）：
`ai` / `marketing` / `design` / `film` / `anime` / `coffee` / `surf` / `travel` / `career` / `policy` / `education`

**2. 技術標籤**：依文章內容選用
（如 `astro`、`cloudflare`、`llm`、`react`、`docker`、`typescript` 等）

一篇文章通常 1 個 category + 1-5 個 tags：

```yaml
# AI 技術介紹文
category: learning
tags: [ai, llm, prompt-engineering]

# 電影心得
category: creative
tags: [film, sci-fi]

# 職涯反思
category: life
tags: [career]

# 技術踩坑
category: tech
tags: [astro, cloudflare-workers, deployment]
```

## Case-Study 專用欄位

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `github` | string (URL) | ❌ | GitHub repo URL，`case-study` 類型強烈建議填寫 |
| `url` | string (URL) | ❌ | 線上 demo / 服務 URL |

`type` 可用值：`debug` / `deep-dive` / `guide` / `how-to` / `listicle` / `explainer` / `case-study` / `comparison` / `research` / `newsjacking`

## 檔名規則

`YYYY-MM-DD-<slug>.md`

slug 用英文 kebab-case，取關鍵詞：
- `2026-03-12-d1-batch-timeout.md`
- `2026-03-15-first-outdoor-lead.md`
- `2026-03-20-parasite-review.md`

## 存放路徑

`src/content/posts/<category>/YYYY-MM-DD-<slug>.md`
