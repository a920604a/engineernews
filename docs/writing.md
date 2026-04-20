# 撰寫文章

## Frontmatter Schema

```markdown
---
title: "文章標題"           # 必填
date: "2026-04-20"          # 必填，YYYY-MM-DD
category: "tech"            # 必填：tech | debug | guide | product
tags: ["astro", "cloudflare"] # 必填，陣列
lang: "zh-TW"               # zh-TW | en，預設 zh-TW
description: "文章描述"      # 選填，SEO 用
tldr: "一句話摘要"           # 選填，顯示在文章頂部
draft: false                # 預設 false，true 則不顯示
pinned: false               # 置頂，預設 false
type: "guide"               # 選填：debug | deep-dive | guide | project
series:                     # 選填，系列文章
  name: "系列名稱"
  order: 1
---
```

## 文章類型（type）

| type | 用途 |
|------|------|
| `debug` | 記錄 Debug 過程與解法 |
| `deep-dive` | 深度技術分析 |
| `guide` | 教學與操作指南 |
| `project` | 專案紀錄 |

## 目錄結構

```
src/content/posts/
├── tech/               # 技術文章
├── debug/              # Debug 紀錄
└── your-post.md        # 直接放根目錄也可以
```

## 語言版本

- 繁體中文：`lang: "zh-TW"`，路由為 `/posts/<slug>`
- 英文：`lang: "en"`，路由為 `/en/posts/<slug>`

## 與作品集關聯

如果文章與某個 Side Project 相關，加上對應的 tag：

```markdown
tags: ["astro", "engineer-news"]
```

在 `src/content/projects/engineer-news.md` 設定相同的 `tag: "engineer-news"`，作品集頁面會自動顯示相關文章連結。

## 標籤命名慣例

- 使用小寫 kebab-case：`cloudflare-workers`，不要 `CloudflareWorkers`
- 技術名稱保持原樣：`astro`, `react`, `d1`
- 避免複數：`tag` 不要 `tags`
