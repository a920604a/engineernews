---
title: "Harness Engineering：語言模型不是不夠聰明，只是缺乏引導"
date: 2026-04-21
category: learning
tags: [ai, harness-engineering, llm, ai-agent, prompt-engineering, context-engineering]
lang: zh-TW
tldr: "AI 工程的第三階段——不再只是讓模型更聰明，而是透過流程設計、觀測與失敗恢復來確保輸出可靠。"
description: "Harness Engineering 是繼 Prompt Engineering、Context Engineering 之後的 AI 工程第三階段，核心在於透過人類引導、流程驗證與失敗恢復來控制 LLM 的機率性輸出。"
draft: false
---

語言模型越來越強，但 AI Agent 在實際任務中翻車的情況還是層出不窮。問題不一定出在模型本身——更多時候，是工程師還沒有搞清楚怎麼「駕馭」它。Harness Engineering 就是為了解決這個問題而出現的概念。

## AI 工程的三個階段

在理解 Harness Engineering 之前，先看看整個 AI 工程的演進脈絡。

**第一階段：Prompt Engineering**

一切從 prompt 開始。這個階段的核心問題是：怎麼下指令才能讓模型輸出我要的東西？工程師在這個階段花大量時間調整措辭、加入 few-shot 範例、設計系統提示。

能力邊界：模型的表現上限受限於它本身的能力，prompt 只是讓它發揮得更好或更差。

**第二階段：Context Engineering**

光靠 prompt 不夠，於是開始給模型工具——function calling、MCP、RAG、外部資料庫。這個階段的邏輯是：模型夠聰明了，只是缺少資訊和能力，補上去就好。

能力邊界：工具再多，模型本質上還是機率性輸出。給了所有東西，它仍然可能做出不如預期的決策。

**第三階段：Harness Engineering**

這個階段的核心洞察是：**問題不在模型不夠聰明，而在流程沒有設計好**。

LLM 本質是機率性的，每次輸出都有一定機率偏離預期。如果讓模型一路跑到底、沒有任何檢查點，錯誤會在流程中累積放大。Harness Engineering 的解法是在流程中加入人類驗證機制：評估、觀測、中間結果檢查、失敗恢復。

## Harness Engineering 在做什麼

Harness 的字面意思是「韁繩」或「馬具」——不是讓馬跑更快，而是確保馬跑在正確的方向上，跌倒了能站起來。

具體實踐包含幾個面向：

**流程設計（Process Design）**
把任務切成有意義的步驟，每個步驟都有明確的輸入與輸出格式。不讓模型一次完成所有事，而是設計成可驗證的分段流程。

**評估與觀測（Evaluation & Observability）**
在流程中加入評估節點，記錄中間輸出、追蹤成功率、偵測偏移。能看到模型在哪個步驟出問題，才能針對性改善。

**失敗恢復（Failure Recovery）**
預設模型會失敗，設計重試機制、fallback 路徑、人工介入觸發條件。讓系統在局部失敗時仍能繼續前進，而不是整個崩掉。

**人類引導（Human-in-the-loop）**
在關鍵決策點加入人類確認，而不是讓模型全自動執行。這不代表退步，而是務實地承認模型的機率性本質。

## 跟前兩個階段的關係

Harness Engineering 不是取代 Prompt Engineering 或 Context Engineering，而是建立在它們之上的第三層。

```
Harness Engineering  ← 流程控制、驗證、失敗恢復
Context Engineering  ← 工具、記憶、外部資料
Prompt Engineering   ← 指令、格式、few-shot
```

一個成熟的 AI 系統通常三層都需要。Harness Engineering 是讓前兩層的投資真正發揮價值的框架。

## 適合的情境

Harness Engineering 特別適合以下場景：

- **長時任務**：步驟多、執行時間長，中間任何一步出錯都可能讓整個任務失敗
- **高風險操作**：結果不可逆，錯了代價很高（寫入資料庫、發送訊息、執行程式碼）
- **生產環境 Agent**：需要穩定、可預期的輸出，而不只是 demo 效果

如果你只是在做一次性的問答或簡單的文字生成，不一定需要這個層次的工程。但一旦 Agent 要在真實環境中自主執行多步驟任務，Harness Engineering 就是繞不過去的議題。

## 整體來說

Harness Engineering 代表 AI 工程思維的一個重要轉變：從「讓模型更聰明」到「讓系統更可靠」。這個概念的實踐其實早就存在於軟體工程的各種可靠性設計中，只是現在有了一個對應 LLM 場景的名字和框架。

對工程師來說，接受「模型會出錯」這個前提，反而是設計出真正好用的 AI 系統的起點。

## 參考資料

- [Harness Engineering：有時候語言模型不是不夠聰明，只是沒有人類好好引導（YouTube）](https://www.youtube.com/watch?v=R6fZR_9kmIw)
- [Rethinking AI Agents: The Rise of Harness Engineering（YouTube）](https://www.youtube.com/watch?v=Xxuxg8PcBvc)
- [Harness Engineering 101（YouTube）](https://www.youtube.com/watch?v=OTjZBjq5FPg)
