---
title: "Transformer 怎麼知道詞的順序？從絕對位置編碼到 RoPE 的演進"
date: 2026-05-10T04:00:23.072Z
category: tech
tags: ["Transformer", "RoPE", "位置編碼", "NLP", "機器學習", "深度學習"]
lang: zh-TW
tldr: "Transformer 的 self-attention 天生不知道詞的順序，位置編碼是補救措施。從正弦函數絕對編碼、可學習絕對編碼、相對位置編碼，到 RoPE（旋轉位置嵌入）——現代 LLM 幾乎都用 RoPE，因為它是免參數、天然表達相對距離、且可外推到更長序列的最佳方案。"
description: "系統性介紹 Transformer 位置編碼的四種主要方案：Sinusoidal 絕對編碼、可學習絕對編碼、相對位置編碼（T5、ALiBi），以及 RoPE 的數學直覺與工程優勢。"
type: explainer
original_url: "https://www.youtube.com/watch?v=Ll-wk8x3G_g"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260522_235011_563925.wav"
---

把「貓咬狗」和「狗咬貓」丟進 Transformer，如果沒有位置資訊，這兩個句子對模型來說是一樣的——都是「貓、咬、狗」三個 token，順序不知道。Self-attention 機制讓每個 token 能關注所有其他 token，但這個「全連接」的設計本身就失去了序列順序的概念。位置編碼（Positional Encoding）是 Transformer 原始論文就引入的解決方案，但從 2017 年到現在，這個問題的解法已經演進了好幾代。

## TL;DR

- **Sinusoidal 絕對位置編碼**（原始 Transformer）：用正弦/餘弦函數計算每個位置的向量，不需要訓練，但無法外推到訓練序列長度之外
- **可學習絕對位置編碼**（GPT-2、BERT）：把位置向量當參數訓練，有點彈性但同樣不能外推
- **相對位置編碼**（T5、ALiBi）：讓 attention 直接感知 token 間的相對距離，對長序列更友善
- **RoPE**（LLaMA、Mistral、Qwen、DeepSeek 等現代 LLM）：用旋轉矩陣把位置資訊乘進 Query 和 Key，免參數、自然編碼相對距離、可透過 YaRN 等技術外推，是目前最主流的方案

## 是什麼

### 為什麼需要位置編碼

Self-attention 的計算是：

```
Attention(Q, K, V) = softmax(QK^T / √d_k) × V
```

這個計算對輸入 token 的排列順序是**排列不變的（permutation-invariant）**。你把輸入 sequence 打亂，每個 token 的輸出向量只是重新排列，數值不變。這在圖像 patch 分類或集合問題中沒關係，但在語言中，詞序攜帶大量語義資訊。

位置編碼的任務：在不改變 attention 機制本身的前提下，把位置資訊注入到 token 的表示中。

## 怎麼運作

### 方案一：Sinusoidal 絕對位置編碼（Vaswani et al., 2017）

原始 Transformer 論文的方法：對每個位置 pos，每個維度 i，計算：

```
PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
```

這個向量直接**加**到 token embedding 上，之後的計算就隱含了位置資訊。

**直覺**：不同維度用不同頻率的正弦波，類似二進位計數——低頻維度捕捉整體位置（是前半還是後半），高頻維度捕捉精細位置（是第幾個）。

**缺點**：訓練時只看到特定長度的序列，推論時超出訓練長度，模型沒看過那個 pos 位置的 PE，表現急劇下降。

### 方案二：可學習絕對位置編碼（GPT-2、BERT）

不用公式計算，直接建立一個 `max_seq_len × d_model` 的嵌入表，每個位置的向量透過反向傳播訓練。BERT 和 GPT-2 用的是這個方法。

**優點**：模型可以學到適合任務的位置表示。
**缺點**：
1. 增加參數量
2. 同樣無法外推——沒有位置 512 之後的向量
3. 位置 1 和位置 2 的「相對關係」不是顯式建模的，模型要自己學

### 方案三：相對位置編碼

**T5 的方案（Shaw et al., 2018）**：不在 embedding 加位置，而是在 attention 計算時，對每對 (query token, key token) 直接加一個相對位置偏置（relative position bias）。這樣 attention 分數本身就包含了相對距離資訊。

**ALiBi（Press et al., 2021）**：更簡潔的相對編碼——對每個 attention head，把一個與相對距離成比例的負數線性偏置直接加到 attention logit 上。不需要額外參數，越遠的 token 就有越大的負懲罰（相當於衰減）。ALiBi 在外推到更長序列時表現相對穩健。

### 方案四：RoPE — 旋轉位置嵌入（Su et al., 2021）

RoPE（Rotary Positional Embedding）是目前最主流的位置編碼方案，被 LLaMA、Mistral、Qwen、DeepSeek、PaLM 2 等幾乎所有現代 LLM 採用。

**核心思想**：把位置資訊**乘**到 Query 和 Key 向量上，而不是**加**到 token embedding 上。具體做法是用旋轉矩陣：

對位置為 m 的 token，把其 Q 向量（或 K 向量）的每對維度 (q_{2i}, q_{2i+1}) 做旋轉：

```
[q_{2i}' ]   [cos(mθ_i)  -sin(mθ_i)] [q_{2i}  ]
[q_{2i+1}'] = [sin(mθ_i)   cos(mθ_i)] [q_{2i+1}]
```

其中 θ_i = 10000^(-2i/d_model)，是類似 Sinusoidal 的頻率設計。

**為什麼這樣做有效**？當你計算位置 m 的 Q 和位置 n 的 K 的點積時：

```
Q_m^T · K_n = f(q, m)^T · f(k, n) = 只依賴 (q, k, m-n)
```

點積的結果**只依賴相對位置 m-n**，不依賴絕對位置。這就自然地把相對距離編碼進了 attention 計算，不需要修改 attention 公式本身。

**RoPE 的工程優勢**：
- **免參數**：不需要額外的可學習參數
- **天然表達相對距離**：點積的值只依賴相對位置
- **可外推**：搭配 YaRN（Yet another RoPE extensioN）、Positional Interpolation 等技術，可把訓練時的序列長度上下文視窗延伸到數倍，Llama 3.1 用 RoPE + 長文本微調達到 128K 上下文

```
                   絕對位置編碼
                   ┌──────────────────────┐
                   │ Sinusoidal（加法）   │ ← 原始 Transformer
                   │ 可學習嵌入（加法）   │ ← BERT, GPT-2
                   └──────────────────────┘

                   相對位置編碼
                   ┌──────────────────────┐
                   │ T5 Bias（attention） │ ← T5
                   │ ALiBi（線性衰減）    │ ← BLOOM, MPT
                   └──────────────────────┘

                   旋轉編碼（乘法）
                   ┌──────────────────────┐
                   │ RoPE                 │ ← LLaMA, Mistral,
                   │                      │   Qwen, DeepSeek
                   └──────────────────────┘
```

## 跟沒有位置編碼的差別

2023 年有一些研究探討「沒有位置編碼的 Transformer」能不能 work。結論是：對於特定任務（如少量 token 的分類），模型可以靠 causal masking 隱性推斷位置；但對語言生成任務，沒有位置編碼的模型在訓練 loss 更高，生成質量明顯下降。Mamba、RWKV 等非 Transformer 架構透過 SSM（State Space Model）或 RNN 的時間步長隱性編碼位置，是另一條路線。

## 小結

| 方案 | 參數量 | 外推能力 | 相對距離 | 現代 LLM 採用 |
|------|--------|----------|----------|--------------|
| Sinusoidal | 無 | 差 | 間接 | 少 |
| 可學習絕對 | 有 | 差 | 間接 | 少（BERT時代） |
| T5 Bias | 少 | 中 | 直接 | T5 系列 |
| ALiBi | 無 | 好 | 直接（線性） | BLOOM, MPT |
| RoPE | 無 | 好（需輔助） | 直接（旋轉） | LLaMA, Mistral, Qwen... |

RoPE 的勝出不是偶然——它把「免參數」「相對距離」「可外推」三個需求同時滿足，而且在大量 LLM 的實際訓練中被驗證有效。理解 RoPE 的數學原理也有助於理解為什麼 YaRN 這類長文本外推技術能 work：本質上是調整 θ 的頻率，讓模型以為它還在訓練的位置範圍內。

## 參考資料

- [RoFormer 論文（arXiv 2104.09864）](https://arxiv.org/abs/2104.09864)
- [EleutherAI Blog：Rotary Embeddings 完整介紹](https://blog.eleuther.ai/rotary-embeddings/)
- [LearnOpenCV：Inside RoPE](https://learnopencv.com/rope-position-embeddings/)
- [labml.ai：RoPE 實作與解說](https://nn.labml.ai/transformers/rope/index.html)
- [Medium：Rotary Positional Embeddings 詳解](https://medium.com/ai-insights-cobet/rotary-positional-embeddings-a-detailed-look-and-comprehensive-understanding-4ff66a874d83)
- [原始影片](https://www.youtube.com/watch?v=Ll-wk8x3G_g)
