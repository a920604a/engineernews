---
title: "DeepSeek V3 如何以 $5.6M 訓練成本挑戰百億美元系統"
date: 2026-05-09T08:05:43.493Z
category: tech
tags: ["DeepSeek", "AI", "開源模型", "MoE", "LLM"]
lang: zh-TW
tldr: "DeepSeek V3 以 671B 參數 MoE 架構、僅 278 萬 H800 GPU 小時的訓練成本，在多項基準測試上達到接近 GPT-4 的表現，API 費用僅是 OpenAI 的十分之一。"
description: "深入解析 DeepSeek V3 的 MoE 架構、訓練效率突破與成本優勢，以及對 AI 產業競爭格局的影響。"
type: deep-dive
original_url: "https://www.youtube.com/watch?v=p7K3xfViWCE"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260521_020614_316898.mp3"
---

2024 年 12 月，中國 AI 公司 DeepSeek 發布了一篇技術報告，內容讓 AI 研究圈的很多人重新算了一遍數字：他們用 278 萬 H800 GPU 小時訓練了一個 671B 參數的模型，成本約 557 萬美元。相比之下，GPT-4 的訓練成本估計超過 1 億美元。同等效能，約二十分之一的訓練成本，完全開源。這件事的影響不只是「便宜的 AI」，而是整個產業對訓練效率假設的重新校準。

## TL;DR

DeepSeek V3 是 671B 總參數的 MoE（Mixture of Experts）模型，每個 token 只啟用 37B 參數。透過 MLA（Multi-head Latent Attention）、輔助損失自由負載均衡、多 token 預測等創新，在 2.788M H800 GPU 小時、約 $5.576M 的成本下完成訓練，在多項基準測試達到接近頂尖閉源模型的水準。API 定價約 $0.028 per million input tokens，是 OpenAI 同等規模模型的十分之一。

## 設計哲學

DeepSeek 的核心問題意識是：AI 訓練的效率上限在哪裡？

主流觀點認為，前沿模型需要海量 GPU 叢集和天文數字預算。OpenAI、Google、Anthropic 的訓練成本每一代都在翻倍。DeepSeek 的研究方向相反——他們問的是「在固定算力預算下，架構設計能做到什麼」。

這個思路體現在幾個具體決策：
1. **選擇 MoE 而非 Dense**：MoE 讓你有大參數量（表達力強）但推論時不需要全部激活（計算量少）
2. **在中國可取得的硬體上優化**：H800 是 H100 的出口管制版，記憶體頻寬較低。DeepSeek 必須在這個限制下優化跨節點通訊
3. **演算法、框架、硬體協同設計**：不假設最好的硬體，而是在現有條件下把系統效率榨到最高

## 核心概念

### MoE 架構

DeepSeek V3 的 Transformer 架構中，FFN（前饋網路）層被替換為 MoE 層。每個 MoE 層有 256 個 expert 模組，每個 token 路由到其中 8 個。671B 總參數中，每次 forward pass 只激活約 37B——這讓推論的計算量接近一個 37B 的 dense 模型，但模型容量接近 671B。

**DeepSeekMoE 的改進**：
- 在標準 MoE 之上加入「共享 expert」（shared experts），確保某些通用知識不依賴路由
- 細粒度 expert（256 個而非傳統的 8-16 個），讓路由更精細

### Multi-head Latent Attention（MLA）

傳統 MHA（Multi-head Attention）的 KV Cache 在長文本下會佔用大量記憶體。MLA 的創新是把 Key 和 Value 投影到低維隱空間（latent space）後再展開，KV Cache 的記憶體佔用大幅下降，推論時的記憶體頻寬需求也跟著降低。

這對在記憶體頻寬受限的 H800 上跑長文本推論特別重要。

### 輔助損失自由（Auxiliary-Loss-Free）負載均衡

MoE 的一個老問題是 expert collapse——路由器傾向於把所有 token 送給少數幾個 expert，導致大多數 expert 沒被充分訓練。傳統解法是加輔助損失函數懲罰不平衡，但這會干擾主要訓練目標。

DeepSeek V3 提出的方案是在 softmax 路由前加入 token 層面的偏置項，動態調整，不需要額外損失函數，負載均衡效果同樣好，且不影響模型的主任務學習。

### 多 Token 預測（Multi-Token Prediction）

傳統語言模型一次預測一個下一個 token。DeepSeek V3 引入多 token 預測（預測未來 N 個 token），讓模型在訓練時學習更長程的依存關係，也提升了訓練信號密度。

## 跟常見替代方案比較

| 模型 | 類型 | 激活參數 | 訓練成本估計 | 開源 | API 每 1M input token |
|------|------|----------|-------------|------|----------------------|
| DeepSeek V3 | MoE | 37B | ~$5.6M | 是 | $0.028 |
| GPT-4 | Dense（估計） | ~1T | >$100M | 否 | $10 |
| Claude 3.5 Sonnet | 未公開 | 未公開 | 未公開 | 否 | $3 |
| Llama 3.1 405B | Dense | 405B | >$30M（估計） | 是（部分） | 視服務商 |
| Mistral Large | Dense | 123B | 未公開 | 否 | $3 |

DeepSeek V3 的定價比 Claude Sonnet 便宜約 107 倍，比 GPT-4 便宜約 357 倍，這讓大規模部署的成本結構完全不同。

## 適合/不適合的情境

**適合：**
- 需要大量 API 呼叫的商業應用（成本優勢最明顯）
- 程式碼生成、數學推理、長文本處理（V3 強項）
- 想要本地部署但算力有限（MoE 推論的計算量接近 37B dense 模型）
- 研究目的（完整技術報告和模型權重開放）

**不適合：**
- 需要最嚴格資料隱私的應用（模型來自中國公司，API 部署在中國伺服器）
- 即時語音互動（非推論速度強項）
- 需要最高準確率的醫療、法律場景（相比 GPT-4 o1/o3 的推理能力有差距）

## 整體來說

DeepSeek V3 改變了 AI 訓練的成本參考點。它不是說「百億美元的系統毫無價值」，而是說「特定效能水準不需要百億美元」。

對產業的影響已經可見：OpenAI、Anthropic、Google 都在加速推出更便宜的模型選項，API 定價在 2025 年持續下滑。DeepSeek 的貢獻不只是一個好用的模型，而是把 MoE 效率優化的研究成果完整開放，讓整個社群可以站在這個基礎上繼續推進。

DeepSeek V4 的技術預覽已在 2026 年 4 月釋出，持續關注。

## 參考資料

- [DeepSeek V3 技術報告（arXiv）](https://arxiv.org/abs/2412.19437)
- [DeepSeek GitHub](https://github.com/deepseek-ai/DeepSeek-V3)
- [Introl Blog：DeepSeek V3.2 vs GPT-5](https://introl.com/blog/deepseek-v3-2-benchmark-dominance-china-ai-december-2025)
- [CNBC：DeepSeek V4 預覽](https://www.cnbc.com/2026/04/24/deepseek-v4-llm-preview-open-source-ai-competition-china.html)
- [BentoML：DeepSeek 模型系列完整指南](https://www.bentoml.com/blog/the-complete-guide-to-deepseek-models-from-v3-to-r1-and-beyond)
- [原始影片](https://www.youtube.com/watch?v=p7K3xfViWCE)
