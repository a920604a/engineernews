---
title: "科學家發現 AI Agent 之間有更好的溝通語言——不是自然語言"
date: 2026-06-20T04:20:31.986Z
category: tech
tags: ["ai", "ai-agent", "multi-agent", "research", "protocol", "language"]
lang: zh-TW
tldr: "研究發現 AI Agent 之間用「湧現語言」（emergent language）比用自然語言溝通更有效率——更短、更省計算資源，但也更不透明"
description: "多個 AI Agent 組成系統時，讓它們用自然語言溝通其實很浪費。研究顯示 Agent 會自發發展出壓縮的內部語言，比自然語言更有效率，但可解釋性是新的問題"
type: explainer
original_url: "https://www.youtube.com/watch?v=dUmT0OIGoqE"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260620_083453_722868.mp3"
---

當你把多個 AI Agent 組在一起，讓它們協作完成任務，一個直覺的做法是讓它們用自然語言互相溝通——畢竟這是它們最擅長的東西。但研究顯示，這可能不是最有效率的設計。

近年的多智能體研究出現了一個反覆被觀察到的現象：當你給 Agent 足夠的自由度，允許它們自行決定溝通方式，它們會逐漸放棄自然語言，發展出更短、更壓縮的溝通方式——一種為任務優化的「湧現語言」（emergent language）。

## TL;DR

多智能體系統（multi-agent system）裡，自然語言溝通雖然人類可讀，但信息密度低、token 消耗高。讓 Agent 發展自己的壓縮溝通協定可以大幅提升效率，但也帶來新的可解釋性問題：你不知道它們在說什麼。

## 現有的問題：自然語言很貴

目前主流的 AI Agent 框架（LangChain、AutoGen、CrewAI 等）預設讓 Agent 用自然語言交換狀態、分派任務、回報結果。

這有幾個問題：

**1. Token 消耗高：** 自然語言冗餘，同樣的資訊用壓縮協定可以用更少的 token 傳達。在大規模多輪任務裡，這不只是成本問題，也是延遲問題。

**2. 模糊性：** 自然語言設計來給人類用，它天然有歧義。「處理好了」跟「完成了但有問題」在人類對話裡靠上下文區分，但 Agent 之間需要更精確的狀態表達。

**3. 格式不穩定：** 要求 Agent 輸出結構化資訊時，自然語言輸出往往格式不一致，需要額外的解析步驟。

## 湧現語言：Agent 自己發明的捷徑

Meta AI Research 和 Frontiers on Sustainability 等機構的研究觀察到，在允許自由通訊的多智能體訓練環境中，Agent 會自發發展出壓縮的符號系統——不再是人類可讀的句子，而是更像「編碼後的指令集」。

這些湧現語言的特點：

- **更短：** 同樣的語意用更少的符號表達
- **任務特化：** 為特定任務優化，在該任務上比通用自然語言更準確
- **Agent 之間共享：** 同一個系統裡的 Agent 能互相理解，但對外部觀察者不透明

一個直觀的類比：程式設計師之間說「PR 合了，CI 綠了，上 staging 了」，對不熟悉的人完全看不懂，但對團隊成員來說這一句話比用完整的自然語言說清楚快很多。湧現語言是 AI Agent 版本的這種壓縮。

## 為什麼這件事很重要

**效率面：** 研究顯示湧現語言可以在不降低任務表現的前提下，顯著減少通訊的計算成本。在大規模部署多智能體系統（想想幾十個 Agent 持續協作幾個小時）的場景下，這個差異會很實質。

**能源面：** Frontiers 2025 年的論文特別關注這一點：更高效的 Agent 通訊直接轉化為更少的伺服器計算時間，影響 AI 系統的整體能源消耗和水冷用量。

**架構面：** 這暗示未來的多智能體系統設計可能需要在「人類可讀的自然語言通道」和「Agent 優化的內部通訊通道」之間做出明確的分層設計——而不是一律用自然語言。

## 可解釋性的代價

最大的問題是：你失去了對 Agent 之間溝通的透明度。

如果系統出現問題，你無法直接「閱讀」Agent 的通訊記錄來 debug。湧現語言對人類是黑盒子。這在高風險場景（金融交易、醫療診斷、關鍵基礎設施）裡是嚴重的限制。

目前的研究方向是為這些壓縮語言建立「翻譯層」——讓人類可以在需要時查看 Agent 之間實際交換了什麼語意，但這本身又增加了系統複雜度。

## 對工程師的實際影響

如果你在設計多智能體系統，現在還不需要去實作湧現語言。但這個研究方向告訴你幾件事：

1. **Agent 之間的通訊格式值得設計，不只是用自然語言當預設。** 結構化的 JSON schema、用 Pydantic 定義的輸出格式、或明確的狀態機轉換，都比讓 Agent 自由用自然語言交換狀態更可靠。

2. **在通訊效率和可解釋性之間，你需要明確選擇。** 不是所有 Agent 通訊都需要對人類可讀，但需要審計的那部分需要。

3. **長期來說，Agent 通訊協定可能成為一個真正的設計領域**——就像 HTTP 是 Web 的通訊協定、gRPC 是微服務的通訊協定，多智能體系統可能需要自己的專用協定。

## 參考資料

- [Scientists Found A Better Language For AI Agents (YouTube)](https://www.youtube.com/watch?v=dUmT0OIGoqE)
- [Emergent language among AI agents: a path toward energy efficiency and water conservation — Frontiers in Sustainability (2025)](https://www.frontiersin.org/journals/sustainability/articles/10.3389/frsus.2025.1717425/full)
- [Multi-Agent Cooperation and the Emergence of (Natural) Language — Meta AI Research](https://ai.meta.com/research/publications/multi-agent-cooperation-and-the-emergence-of-natural-language/)
- [Language agents: a critical evolutionary step of artificial intelligence](https://yusu.substack.com/p/language-agents)
