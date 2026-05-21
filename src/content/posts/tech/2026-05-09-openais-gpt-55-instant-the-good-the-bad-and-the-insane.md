---
title: "OpenAI 的 o3、o4-mini 與 GPT-4.1：好用的、有問題的、與瘋狂的"
date: 2026-05-09T03:42:45.473Z
category: tech
tags: ["OpenAI", "o3", "o4-mini", "GPT-4.1", "AI", "LLM"]
lang: zh-TW
tldr: "OpenAI 2025 年春季一次推出三款新模型：GPT-4.1 強化程式碼與指令遵循、o3 是目前最強推理模型、o4-mini 以低成本達到驚人的數學與程式效能——但定價策略和 API 存取限制讓開發者有複雜感受。"
description: "評析 OpenAI 2025 年春季發布的 o3、o4-mini 和 GPT-4.1 三款模型的優缺點、基準表現與適用場景。"
type: explainer
original_url: "https://www.youtube.com/watch?v=4nQnhjimB4Y"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260521_020625_158433.mp3"
---

2025 年 4 月，OpenAI 在幾週內推出了三款不同定位的模型：GPT-4.1、o3 和 o4-mini。YouTube 創作者給了這波發布一個誇張標題「GPT 5.5 Instant」，但實際上這三款模型都不叫那個名字——GPT-5 要到 2025 年稍晚才發布。儘管如此，這三款模型每一款都有值得深入討論的特點，以及讓開發者皺眉的設計決策。

## TL;DR

- **GPT-4.1**：程式碼和指令遵循的專用模型，比 GPT-4o 更準確，適合 API 開發任務，已進入 ChatGPT
- **o3**：目前 OpenAI 最強推理模型，GPQA Diamond 87.7%，但成本高、速度慢
- **o4-mini**：以低成本達到 AIME 2025 最高分，是數學/程式碼任務的驚喜
- 三款模型中沒有一款叫「GPT 5.5 Instant」——這個標題是創作者自創的

## 是什麼

### GPT-4.1

GPT-4.1 於 2025 年 4 月先在 API 上線，後來因開發者反應熱烈也加入 ChatGPT。它的定位是 GPT-4o 的「精調版本」，重點在兩個方向：

1. **程式碼能力**：在 SWE-bench Verified（真實 GitHub issue 修復）上比 GPT-4o 提高明顯，特別在 web 開發、多步驟程式任務上
2. **指令遵循**：在系統提示（system prompt）中的格式要求、限制條件的遵守準確率提升，這對需要精確輸出的 API 使用場景很重要

GPT-4.1 的推論速度和成本介於 GPT-4o mini 和 GPT-4o 之間，是追求「夠快、夠準、不要太貴」的中間選擇。

### o3

o3 是 o1 的繼承者，採用「extended thinking」推論策略——模型在給出最終答案前會進行多步驟的中間推理過程。這讓它在需要多步邏輯推導的任務上表現大幅超越一般 LLM。

基準成績：
- **GPQA Diamond**（博士級科學選擇題）：87.7%，是目前已知所有公開模型最高分
- **AIME 2025**（數學競賽）：高分但略遜於 o4-mini（見下）
- **SWE-bench Verified**：比 o1 大幅提升

代價是：o3 比 o1 慢，定價也更高。在思考過程展開的情況下，一個複雜問題的回應可能需要數分鐘，費用可能達到幾美分到幾美元。這讓它適合離線批次推論，而非即時互動應用。

### o4-mini

o4-mini 是這次發布最讓人意外的一款。名字有「mini」，但在數學和程式碼領域的表現超過了所有人的預期：

- **AIME 2024 和 2025**：兩年的美國數學奧林匹亞試題，o4-mini 達到所有已發布模型的最高分
- **速度**：比 o3 快得多
- **成本**：比 o3 低得多，比較接近 o3-mini 的定價範圍

OpenAI 描述 o4-mini 的目標是「在小型、快速、便宜的情況下最大化數學和程式推理能力」。它的「mini」指的是成本和延遲，不是能力。

## 為什麼重要

### 推理能力的分級

這三款模型的存在說明 OpenAI 正在把模型族群分成不同「計算預算」的層次：

```
GPT-4.1          → 快速、精確的指令遵循（no extended thinking）
o4-mini          → 中等成本的推理能力（controlled thinking）
o3               → 最高推理能力、最高成本（extensive thinking）
GPT-5（稍後）    → 統一的下一代
```

這個策略讓開發者可以根據任務的難度和預算選擇合適模型，而不是一刀切。

### 對 AI 編程助理的影響

GPT-4.1 和 o4-mini 的推出讓 Cursor、GitHub Copilot、Windsurf 等 AI 程式碼工具有了更多可選的後端模型。特別是 o4-mini 在 SWE-bench 上的表現，讓「用便宜模型跑複雜修 bug 任務」成為可行選項。

## 跟其他語言模型的差別

| 模型 | 強項 | 速度 | 成本（per M input token） | 推理模式 |
|------|------|------|--------------------------|----------|
| GPT-4.1 | 程式碼、指令遵循 | 快 | $2 | 標準 |
| o3 | 科學推理、複雜邏輯 | 慢 | $10 | Extended thinking |
| o4-mini | 數學、程式推理 | 中 | $1.1 | Controlled thinking |
| Claude 3.7 Sonnet | 均衡、長文 | 中 | $3 | 標準 + extended |
| DeepSeek V3 | 成本效益 | 中 | $0.028 | 標準 |
| Gemini 2.5 Pro | 多模態、長文 | 中 | $1.25 | 標準 |

## 好用的、有問題的、與瘋狂的

**好用的（The Good）：**
- o4-mini 的數學能力/成本比是目前市場上最划算的推理選項
- GPT-4.1 的指令遵循改進對需要結構化輸出的 API 應用很實際
- o3 的 GPQA Diamond 分數代表 AI 在科學推理上達到了新的里程碑

**有問題的（The Bad）：**
- 三款模型同時推出，命名邏輯讓人困惑（GPT-4.1 和 o3 是什麼關係？）
- o3 的定價和速度讓它對大多數開發者不實用
- API 存取限制——部分功能依然只在 ChatGPT Plus 可用，API 用戶等級不同

**瘋狂的（The Insane）：**
- o4-mini 在 AIME（美國頂尖數學競賽）上拿下所有公開模型最高分，這是幾年前沒人想到小型模型能做到的
- GPQA Diamond 87.7% 意味著 o3 在博士級科學題目上比大多數博士做得更好

## 小結

這三款模型代表 OpenAI 在 GPT-5 正式推出前的「過渡布局」：把不同能力需求的用戶分流到不同定位的模型。對工程師來說，最實用的組合可能是：日常 API 任務用 GPT-4.1，需要數學/程式推理時用 o4-mini，最複雜的多步驟推理才用 o3。

YouTube 上「GPT 5.5 Instant」這個標題是誇大其詞，但這三款模型的真實進步是紮實的——特別是 o4-mini 的性能/成本比，是 2025 年上半年 AI 模型市場的真正驚喜。

## 參考資料

- [OpenAI 官方：GPT-4.1 發布](https://openai.com/index/gpt-4-1/)
- [OpenAI 官方：o3 和 o4-mini 發布](https://openai.com/index/introducing-o3-and-o4-mini/)
- [DataStudios：2025 年 ChatGPT 模型全報告](https://www.datastudios.org/post/all-chatgpt-models-in-2025-complete-report-on-gpt-4o-o3-o4-mini-4-1-and-their-real-capabilities)
- [Every.to：Vibe Check 評測](https://every.to/vibe-check/vibe-check-openai-s-o3-gpt-4-1-and-o4-mini)
- [OpenAI o3 Wikipedia](https://en.wikipedia.org/wiki/OpenAI_o3)
- [原始影片](https://www.youtube.com/watch?v=4nQnhjimB4Y)
