---
title: "DeepSeek V4 發布：1.6 兆參數開源模型挑戰 GPT-5，還跑在華為晶片上"
date: 2026-05-23T19:22:34.019Z
category: tech
tags: ["ai", "deepseek", "llm", "open-source", "china-tech"]
lang: zh-TW
tldr: "DeepSeek V4 是一個 1.6 兆參數（49B 活躍）的 MoE 開源模型，100 萬 token 上下文，在部分基準測試上超越 GPT-5.2，且是首款針對華為 Ascend 晶片最佳化的 DeepSeek 模型。"
description: "DeepSeek V4 深度解析：1.6 兆參數 MoE 架構、百萬 token 上下文、Huawei Ascend 最佳化，以及對開源 AI 生態和中美 AI 競賽的意義。"
type: explainer
original_url: "https://www.youtube.com/watch?v=LpXhy2iiaQE"
draft: false
---

2026 年 4 月 24 日，DeepSeek 正式發布 V4 系列——距離他們以 DeepSeek-R1 震驚矽谷剛好過了一年。這次他們帶來了更大的模型、更長的上下文、更激進的定價，以及一個對整個中美 AI 競賽都有深遠意義的技術細節：V4 是 DeepSeek 首款針對**華為 Ascend 晶片**最佳化的模型。

## TL;DR

DeepSeek V4 有兩個版本：**V4 Flash**（輕量高速）和 **V4 Pro**（旗艦）。Pro 版本是目前最大的開源混合專家（MoE）模型，總參數量 1.6 兆，每次推論啟動 49B 參數，支援 100 萬 token 上下文。定價方面，V4 Flash 輸入 $0.14/M tokens、輸出 $0.28/M tokens，全面低於 GPT-5.4 Nano 和 Gemini 3.1 Flash。效能方面，V4-Pro-Max 宣稱在推理基準上超越 GPT-5.2 和 Gemini 3.0 Pro。

## 是什麼

DeepSeek V4 是 DeepSeek 2026 年的旗艦模型系列，採用混合專家架構（Mixture of Experts, MoE）。MoE 的核心概念是：模型雖然有龐大的總參數量，但每次推論只會「啟動」其中一小部分的專家子網路，讓計算成本可以維持在比 dense 模型低得多的水準。

| 版本 | 總參數 | 活躍參數 | 上下文視窗 | 定價（輸入/輸出） |
|------|--------|----------|-----------|-----------------|
| V4 Flash | 未公開 | 未公開 | 1M tokens | $0.14 / $0.28 per M tokens |
| V4 Pro | 1.6T | 49B | 1M tokens | 未公開 |
| V4-Pro-Max | 1.6T | 49B | 1M tokens | 未公開 |

100 萬 token 的上下文視窗允許將完整的大型程式碼庫或長文件放進單一 prompt。這對需要跨多個檔案理解的程式碼任務尤其有用。

## 為什麼重要

### 開源定價的天花板再度下探

V4 Flash 的定價全面低於 GPT-5.4 Nano、Gemini 3.1 Flash、GPT-5.4 Mini 和 Claude Haiku 4.5。這是 DeepSeek 一貫的策略：用遠低於市場的定價施壓 OpenAI 和 Google，同時靠開源版本讓社群自行部署，進一步擠壓競爭對手的商業空間。

### 效能宣稱

DeepSeek 宣稱 V4-Pro-Max 在推理基準上超越 GPT-5.2 和 Gemini 3.0 Pro，並在編碼基準上取得頂尖成績。需要注意的是，這些數字目前主要來自 DeepSeek 自己公布的評測，獨立第三方的全面評測仍在進行中。

歷史參考：DeepSeek-R1 去年的宣稱效能大致上獲得了社群驗證，因此 V4 的數字值得認真對待，但仍需觀察。

### 華為 Ascend 最佳化：地緣政治的技術分水嶺

這是這次發布中最具戰略意義的細節，卻在技術報導中最容易被忽視。

美國對 Nvidia GPU 的出口管制迫使中國 AI 公司尋求替代硬體。DeepSeek V4 是他們首款正式宣稱針對**華為 Ascend 晶片**最佳化的模型。如果這個最佳化的實際效能達到宣稱水準，它將是一個重要的技術里程碑：中國頂尖 AI 公司有能力在不依賴 Nvidia A100/H100/H200 的情況下訓練和部署最前沿的模型。

這對台灣的半導體產業同樣值得關注：如果華為 Ascend 生態逐漸成熟，它代表的是一條與台積電主要服務的 Nvidia-TSMC 供應鏈平行的路徑正在成形。

## 怎麼運作

DeepSeek V4 的 MoE 架構繼承了 V3 的設計並做了幾個關鍵改進：

**更長的上下文處理**：V4 採用了新的設計來更有效率地處理長序列，解決了過去 Transformer 模型在超長上下文下記憶體使用量爆炸的問題。具體技術細節 DeepSeek 尚未完全公開。

**推理能力強化**：V4 在訓練時加強了鏈式思考（chain-of-thought）的監督學習，讓模型在數學推導和複雜邏輯問題上有明顯提升。

**智慧體任務**（agentic tasks）：V4 在工具使用和多步驟任務規劃上有專項訓練，適合作為 AI agent 的底層模型。

## 跟競爭對手的差別

| 比較維度 | DeepSeek V4-Pro | GPT-5.2 | Gemini 3.0 Pro |
|---------|----------------|---------|----------------|
| 開源 | 是 | 否 | 否 |
| 總參數 | 1.6T (MoE) | 未公開 | 未公開 |
| 上下文視窗 | 1M tokens | 未公開 | 未公開 |
| 可自架部署 | 是 | 否 | 否 |
| Ascend 支援 | 是 | 否 | 否 |

最大的差異化優勢仍然是**開源+低價**組合：企業可以下載 V4 自行部署，完全不依賴 API，同時確保資料不流出。對資料敏感的企業應用（金融、醫療、法律）而言，這個特性的價值難以用 benchmark 衡量。

## 小結

DeepSeek V4 是對「開源模型效能必然落後閉源模型」這個假設的持續挑戰。無論最終效能評測結果如何，它的發布對 AI 市場定價產生了即時壓力，並在技術上驗證了中國 AI 在沒有 Nvidia 最新 GPU 的情況下依然能夠前進。

對開發者和技術決策者而言，現在值得評估的問題是：在你的應用場景中，DeepSeek V4 Flash 的定價和效能組合，是否已經取代了你目前使用的閉源 API？

## 參考資料

- [Three reasons why DeepSeek's new model matters - MIT Technology Review](https://www.technologyreview.com/2026/04/24/1136422/why-deepseeks-v4-matters/)
- [DeepSeek previews new AI model that 'closes the gap' with frontier models - TechCrunch](https://techcrunch.com/2026/04/24/deepseek-previews-new-ai-model-that-closes-the-gap-with-frontier-models/)
- [DeepSeek Unveils Newest Flagship AI Model - Bloomberg](https://www.bloomberg.com/news/articles/2026-04-24/deepseek-unveils-newest-flagship-a-year-after-ai-breakthrough)
