---
title: "TiDAR：用擴散模型思考、用自回歸模型表達的混合架構（論文分析）"
date: 2026-06-16T03:59:09.324Z
category: tech
tags: ["TiDAR", "論文分析", "擴散模型", "自回歸", "AI", "語言模型", "推論效率"]
lang: zh-TW
tldr: "TiDAR 在一次 forward pass 裡讓擴散模型負責平行「起草」token，再讓自回歸模型負責輸出，達到 AR 等級的品質但快了近 6 倍。"
description: "深度分析 TiDAR（arXiv 2511.08923）：一個在單次 forward pass 內結合擴散式思考與自回歸表達的混合語言模型架構，以 5.91x 的速度提升維持 AR 等級品質。"
type: deep-dive
original_url: "https://www.youtube.com/watch?v=taCVT5vDAk0"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260616_060719_338259.mp3"
---

語言模型推論有個長期的拉鋸戰：擴散模型（Diffusion LM）可以平行生成、速度快，但品質不如自回歸（Autoregressive，AR）模型；AR 模型品質好，但 token-by-token 生成天生有吞吐量上限。TiDAR 這篇論文（arXiv 2511.08923，2025 年 11 月）提出了一個直覺卻不簡單的問題：**能不能在同一次 forward pass 裡，同時享受兩者的優點？**

## TL;DR

TiDAR 將生成過程拆成兩個角色：
- **Think（思考）**：擴散模型平行起草一批「草稿 token」
- **Talk（表達）**：自回歸模型根據草稿逐步輸出最終 token

透過精心設計的結構化 attention mask，兩個角色在單次 forward pass 內完成。TiDAR 1.5B 比同規模 AR 快 4.71 倍，8B 版本快 5.91 倍，品質與 AR 相當。

## 設計哲學

擴散語言模型的核心優勢是**平行性**：一次 forward pass 可以同時更新多個位置的 token，不像 AR 必須等前一個 token 才能生成下一個。但這個平行性在品質上付出了代價——擴散模型的輸出往往比 AR 差，原因是它缺少 AR 那種天然的因果結構（每個 token 都能看到所有前面的 token）。

TiDAR 的觀察是：**這兩件事不一定要用同一個模型做**。

- 讓擴散模型做「思考」：在隱空間裡平行起草一批候選 token（不直接輸出，所以對精確度要求低）
- 讓自回歸解碼器做「表達」：把擴散草稿當作 context，以 AR 的方式生成最終輸出

這個架構的精妙之處在於：擴散階段負責「猜」，AR 階段負責「確認」，兩者分工讓整體既快又準。

## 核心機制

### 結構化 Attention Mask

TiDAR 最關鍵的工程決策是如何在一個 Transformer 裡同時跑擴散和自回歸，而不是用兩個獨立模型串接（那樣記憶體和延遲都會倍增）。

解法是**結構化 attention mask**：

```
Diffusion tokens (Think):  全局 attention（可看所有位置）
AR tokens (Talk):          因果 attention（只能看左側）
```

兩種 token 在同一個 Transformer forward pass 裡共存，mask 決定了資訊流的方向。擴散 token 可以互相看、也能看 AR token；AR token 只能看自己左側和擴散 token 提供的 context。

### 每次 NFE 產出多個 token

傳統 AR 每次 NFE（Neural Function Evaluation，即一次 forward pass）只輸出 1 個 token。TiDAR 的設計讓每次 NFE 可以輸出多個：

| 模型 | 每次 NFE 平均輸出 token 數 | 相對 AR 速度提升 |
|------|---------------------------|-----------------|
| TiDAR 1.5B | 7.45 tokens | 4.71× |
| TiDAR 8B | 8.25 tokens | 5.91× |

這個效率提升不是靠犧牲品質換來的——論文的 benchmark 顯示 TiDAR 在多項評測上與同規模 AR 模型相當。

## 跟常見替代方案比較

| 方法 | 生成方式 | 速度 | 品質 | 代表模型 |
|------|----------|------|------|---------|
| 純 AR | token-by-token | 慢 | 高 | GPT、LLaMA |
| 純 Diffusion LM | 全平行迭代 | 快 | 中 | MDLM、Plaid |
| Speculative Decoding | AR + 草稿模型 | 中快 | 高 | Medusa、EAGLE |
| TiDAR | 擴散起草 + AR 確認 | 快 | 高 | TiDAR 1.5B / 8B |

Speculative Decoding 是目前最常見的加速方案：用小模型起草、大模型驗證，但需要維護兩個模型，且草稿接受率會隨任務複雜度下降。TiDAR 的差異是兩個角色共用同一個 Transformer 的參數，沒有第二個模型的開銷。

## 適合 / 不適合的情境

**適合：**
- 高吞吐量推論場景（batch inference、API 服務）
- 對延遲敏感但品質不能妥協的應用
- 研究混合生成架構的起點

**需要注意：**
- 論文是 2025 年 11 月，目前開源生態的支援還在發展中
- Structured attention mask 的訓練穩定性和 scaling behavior 需要更多社群驗證
- 對 AR 的依賴意味著仍是 token-by-token 輸出，只是每次 NFE 能推進更多步

## 整體來說

TiDAR 是今年最有意思的推論效率論文之一。它不是在 AR 上貼加速補丁，也不是純粹賭擴散模型會追上 AR 品質，而是正面承認兩種範式各有擅長，用架構設計讓它們分工協作。

5.91 倍的速度提升配上 AR 等級的品質，如果能在更多任務和更大規模上複現，這個架構有機會成為下一代推論引擎的基礎。值得持續關注。

## 參考資料

- [TiDAR: Think in Diffusion, Talk in Autoregression（arXiv 2511.08923）](https://arxiv.org/abs/2511.08923)
- [TiDAR 官方專案頁](https://tidarlm.github.io/)
- [Hugging Face Paper Page](https://huggingface.co/papers/2511.08923)
- [YouTube 影片解說](https://www.youtube.com/watch?v=taCVT5vDAk0)
