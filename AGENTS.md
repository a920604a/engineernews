# Engineer News — AI Agent 指引

這是 Engineer News 的部落格專案，以 Astro + Cloudflare Workers 建構。

## 寫文章

### 存放位置與檔名

```
src/content/posts/<category>/YYYY-MM-DD-<slug>.md
```

slug 用英文 kebab-case，取關鍵詞，例如：
- `src/content/posts/tech/2026-03-12-d1-batch-timeout.md`

### Frontmatter

```yaml
---
title: ""           # 必填
date: YYYY-MM-DD    # 必填
category: ""        # 必填，見下方清單
tags: []            # 必填，全小寫 kebab-case，可空陣列
lang: zh-TW         # 必填，zh-TW 或 en
description: ""     # 選填，SEO meta description
tldr: ""            # 選填，一句話摘要（tech 類強烈建議）
draft: false        # 選填，true 時不顯示
---
```

### 支援的分類（Category）

`tech` / `product` / `learning` / `creative` / `life`

| Category | 適用內容 |
|----------|---------|
| `tech` | 技術問題解決、工具介紹、架構設計、工程實踐 |
| `product` | 產品設計、UX、功能開發、市場策略 |
| `learning` | 概念解說、知識整理、AI/教育/政策主題 |
| `creative` | 電影、動漫、設計、衝浪、咖啡、旅遊 |
| `life` | 日常記錄、職涯、個人反思 |

### 推薦 Tags

**主題標籤**（原本的 category，現降為 tag）：
`ai` / `marketing` / `design` / `film` / `anime` / `coffee` / `surf` / `travel` / `career` / `policy` / `education`

**技術標籤**：依文章內容選用（如 `astro`、`cloudflare`、`llm`、`react` 等）

### 文章結構模板

**tech（踩坑 / 問題解決）**：

```
## TL;DR
## 情境
## 問題
## 嘗試過程
## 解法
## 為什麼會這樣
## 學到的事
```

**tech（工具 / 技術介紹）**：

開頭段落說明主題與讀者收穫。各段落至少涵蓋：設計哲學、與替代方案比較、適用情境、程式碼範例。結尾說明整體取捨。目標 1000–2000 字。

**其他分類**：無固定結構，依內容性質決定。

### 寫作風格

- 寫給「一週後的自己」，也寫給遇到同樣事情的人
- 直接，不客套，可以有情緒，不需要介紹自己
- tech：標題包含關鍵錯誤或技術名稱，具體 > 抽象
- film：不劇透開頭，說清楚為什麼值得看（或不值得）
- career：誠實，包含猶豫和失敗的部分

### 參考資料

- 只要文章有明顯引用工具、框架、官方文件、論文、版本資訊、數據比較、外部說法，就要在文末補 `## 參考資料`
- `## 參考資料` 至少要有 1 個有效 Markdown 連結；主題越廣，連結不能只放 1 個敷衍帶過
- 參考資料要覆蓋文章主題本身，不是隨便貼幾個不相干連結
- tech / learning / product 類文章，以及帶有 ai / policy / education / marketing tag 的文章，預設應該附參考資料
- 可執行 `pnpm check:references` 檢查缺漏與覆蓋是否明顯不足

### Commit 格式

```
post(<category>): <標題摘要>
```

例如：`post(tech): Cloudflare D1 batch timeout 踩坑記錄`
