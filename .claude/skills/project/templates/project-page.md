---
title: "{{title}}"
description: "{{一句話摘要，用於 meta/SEO}}"
category: tech
tags: []
github: ""
url: ""
pinned: false
---

{{summary：結合背景與成果，1–2 句，讓讀者 30 秒內理解這個專案}}

## 背景

{{展開背景，說明使用情境、為什麼做、誰有這個問題，2–4 句}}

## 挑戰

{{將主要技術/產品挑戰轉為具體描述，說明限制條件與難點，2–3 句}}

## 解法

{{總覽設計策略，再將核心貢獻每項展開成 1–2 句行動說明}}

- 以 **X** 建置/實作 Y
- 以 **X** 建置/實作 Y

## 架構圖

```mermaid
graph LR
  {{依實際系統元件填入，例如：}}
  Client["前端 (React)"] --> API["後端 API (FastAPI)"]
  API --> DB[(PostgreSQL)]
  API --> Agent["AI Agent (Gemini)"]
```

## 流程圖

```mermaid
flowchart TD
  {{依實際使用者操作主流程填入，例如：}}
  A([使用者開始]) --> B[步驟一]
  B --> C{判斷條件}
  C -- 是 --> D[步驟二]
  C -- 否 --> E[替代流程]
  D --> F([結束])
```

## 成果

{{引用可量化指標或可觀察的狀態，1–2 句}}
