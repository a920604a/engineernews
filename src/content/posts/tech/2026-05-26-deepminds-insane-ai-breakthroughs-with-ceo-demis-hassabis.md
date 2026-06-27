---
title: "Demis Hassabis 與 DeepMind 的路徑：從棋盤到諾貝爾獎的 AI 突破圖譜"
date: 2026-05-26T03:26:49.879Z
category: tech
tags: ["deepmind", "ai", "research", "alphafold", "demis-hassabis"]
lang: zh-TW
tldr: "DeepMind 在 Demis Hassabis 帶領下的核心策略是：用遊戲環境訓練出的泛化推理能力，解決科學上最難的現實問題。AlphaFold、AlphaGeometry、AlphaDev、GNoME 是這個策略最具體的成果。"
description: "深入了解 DeepMind CEO Demis Hassabis 的研究哲學與戰略：從 AlphaGo 到 AlphaFold 諾貝爾獎，DeepMind 如何用 RL + 深度學習打開一個又一個科學問題的大門。"
type: explainer
original_url: "https://www.youtube.com/watch?v=huAwz_BR8WM"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260615_195734_678197.mp3"
---

DeepMind 2014 年被 Google 以 5 億英鎊收購時，很多人覺得這是一家「做遊戲 AI 的公司」。十年後，它的研究成果拿到了諾貝爾化學獎。

這不是運氣。這是一個明確策略的結果。

## TL;DR

Demis Hassabis 的核心策略是：用遊戲和模擬環境（因為有明確的評估函數）訓練出強大的泛化推理能力，然後把同樣的方法應用到有評估函數的科學問題上。AlphaGo 是驗證概念，AlphaFold 是策略的全面開花，AlphaGeometry、AlphaDev、GNoME 是這個框架向不同領域的延伸。

## 是什麼

Google DeepMind（2023 年 Google Brain 和 DeepMind 合併）是目前世界上成果最具影響力的 AI 研究機構之一。Demis Hassabis 在創立 DeepMind 之前是棋盤遊戲設計師和研究型神經科學家——這個背景對理解他的研究哲學至關重要。

DeepMind 的研究方法論有一個一貫的特點：不解最簡單的問題，解那些**一旦解開就能帶出大量下游應用**的問題。

## 為什麼重要

### AlphaFold：2024 年諾貝爾化學獎

蛋白質折疊問題（protein folding problem）是分子生物學 50 年來的核心難題：從蛋白質的胺基酸序列預測其三維空間結構。這個問題之所以重要，是因為蛋白質的功能由其結構決定，而理解結構是藥物設計的基礎。

AlphaFold2 在 2020 年的 CASP14 競賽中，以媲美實驗測定的精度解決了這個問題，震驚整個生物學界。2024 年，Demis Hassabis 和 John Jumper 因此獲得諾貝爾化學獎。

截至 2025 年，AlphaFold 資料庫已包含超過 2 億個蛋白質結構預測，幾乎涵蓋所有已知的蛋白質序列。這是有史以來最大規模的科學數據集之一。

### AlphaGeometry：解奧林匹克幾何題的 AI

2024 年初，DeepMind 發布了 AlphaGeometry——一個能以接近金牌選手水準解決國際數學奧林匹克幾何題的系統。這個成果的意義不只是解題能力本身，而是它展示了 AI 可以做出有步驟的、人類可驗證的數學推導。

### AlphaDev：發現 49 年來最快的排序演算法

2023 年，DeepMind 用強化學習讓 AI 自主設計 CPU 組合語言指令序列，發現了比已知最佳演算法更快的排序演算法——這個演算法後來被直接採用進了 LLVM C++ 標準函式庫的 `sort` 實作。

### GNoME：發現 220 萬種新材料

2023 年底，DeepMind 的 GNoME（Graph Networks for Materials Exploration）系統預測了 220 萬種潛在的新穩定晶體結構，相當於過去 800 年人類發現的材料總量的 45 倍。其中約 38 萬種被認為有高穩定性，是未來材料科學研究的巨大資料庫。

## 怎麼運作

DeepMind 的研究路徑有一個清晰的架構：

**第一步：選一個有明確評估函數的困難問題**。下棋有贏/輸，蛋白質折疊有結構精度評分（GDT_TS），幾何題有正確/錯誤。這個評估函數讓 RL 可以運作。

**第二步：生成大量訓練資料（通常合成）**。AlphaFold 的訓練資料來自 Protein Data Bank；AlphaGeometry 大量使用 AI 自動生成的幾何問題；AlphaDev 在模擬 CPU 環境中自我演化。

**第三步：讓模型在評估函數驅動下自我改進，超越人類知識的邊界**。AlphaGo Zero 完全不用人類棋譜就超越所有人類棋手；AlphaDev 發現了人類從未想到的排序指令序列。

## 跟其他 AI 研究機構的差別

OpenAI 的路徑是：打造通用大語言模型，然後從語言能力擴展到其他任務。

DeepMind 的路徑是：針對每個有明確評估函數的領域，設計專用系統，解決一個具體的、有重大科學意義的問題。

這兩條路不互斥，但代表了不同的研究哲學。OpenAI 的 GPT 系列改變了人類與 AI 互動的方式；DeepMind 的 Alpha 系列改變了科學研究的邊界。

## 小結

Demis Hassabis 在採訪中多次說他對「硬題」有偏好——那些如果解開了就能帶來大量後續進展的問題。從 AlphaGo 到 AlphaFold，DeepMind 確實在執行這個策略。

對工程師而言，DeepMind 的研究路徑有個值得借鑑的方法論：在你的問題域裡，找到那個如果能自動化就能釋放大量後續能量的核心瓶頸，然後設計一個有可量化評估函數的系統去攻克它。

## 參考資料

- [AlphaFold - DeepMind](https://www.deepmind.com/research/highlighted-research/alphafold)
- [GNoME: A step change in materials discovery with AI - DeepMind](https://deepmind.google/discover/blog/millions-of-new-materials-discovered-with-deep-learning/)
- [AlphaGeometry - DeepMind](https://deepmind.google/discover/blog/alphageometry-an-olympiad-level-ai-system-for-geometry/)
- [DeepMind's Insane AI Breakthroughs With CEO Demis Hassabis](https://www.youtube.com/watch?v=huAwz_BR8WM)
