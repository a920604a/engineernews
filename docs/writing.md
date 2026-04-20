# 撰寫文章指南

文章存放位置：

```
src/content/posts/<category>/YYYY-MM-DD-<slug>.md
```

必要 frontmatter 範例：

```yaml
---
title: ""
date: YYYY-MM-DD
category: ""    # 請在下列支援分類中選擇
tags: []
lang: zh-TW
description: ""
tldr: ""
draft: false
---
```

支援分類： tech / climbing / surf / film / life / coffee / learning / ai / product / marketing / travel / design / education / policy / anime / career

寫作風格與結構建議請參閱專案內的 AGENTS.md 與 README 中的快速導覽。

Commit 格式（新增文章）：

```
post(<category>): <標題摘要>
```

範例： `post(tech): Cloudflare D1 batch timeout 踩坑記錄`

