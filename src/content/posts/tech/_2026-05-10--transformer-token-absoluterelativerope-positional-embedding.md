---
title: "如何讓 Transformer 知道輸入 Token 的順序？Absolute、Relative、RoPE、到沒有 Positional Embedding"
date: 2026-05-10T04:00:23.072Z
category: tech
tags: ["Transformer", "Positional Embedding", "NLP", "機器學習", "AI", "深度學習"]
lang: zh-TW
tldr: "探討 Transformer 模型中 Positional Embedding 的不同實現方法"
description: "探討 Transformer 模型中 Positional Embedding 的不同實現方法"

type: explainer
original_url: "https://www.youtube.com/watch?v=Ll-wk8x3G_g"
draft: true
---

如何讓 Transformer 知道輸入 Token 的順序？Absolute、Relative、RoPE、到沒有 Positional Embedding
====================================================================

## TL;DR
了解 Transformer 中的 Positional Embedding 技術，讓模型知道輸入 Token 的順序。

## 是什麼
Positional Embedding 是一種在 Transformer 模型中添加位置信息的技術，讓模型知道輸入 Token 的順序。它是一種額外的嵌入向量，添加到輸入 Token 的嵌入向量中，以捕捉 Token 的位置信息。

## 為什麼重要
在 Transformer 模型中，自注意力機制（Self-Attention）允許模型關注輸入序列中的任意位置的 Token。但是，這也導致了模型無法區分 Token 的順序。Positional Embedding 技術解決了這個問題，讓模型可以知道輸入 Token 的順序，從而更好地理解輸入序列的語義。

## 怎麼運作
Positional Embedding 的運作原理如下：

```mermaid
graph LR
    A[輸入 Token] -->|嵌入向量|> B[Token 嵌入向量]
    C[位置信息] -->|位置嵌入向量|> D[位置嵌入向量]
    B -->|加法|> E[輸入嵌入向量]
    E -->|輸入 Transformer|> F[Transformer 模型]
```

其中，位置嵌入向量（Positional Embedding）是根據 Token 的位置計算出來的額外嵌入向量，添加到 Token 嵌入向量中，以捕捉 Token 的位置信息。

## 跟 Relative Positional Embedding 的差別
Relative Positional Embedding 是另一種 Positional Embedding 技術，它只考慮 Token 之間的相對位置，而不是絕對位置。這使得模型可以更好地處理長距離依存關係。

```mermaid
graph LR
    A[輸入 Token] -->|嵌入向量|> B[Token 嵌入向量]
    C[相對位置信息] -->|相對位置嵌入向量|> D[相對位置嵌入向量]
    B -->|加法|> E[輸入嵌入向量]
    E -->|輸入 Transformer|> F[Transformer 模型]
```

## 跟 RoPE 的差別
RoPE（Rotary Positional Embedding）是一種基於旋轉的 Positional Embedding 技術，它使用旋轉矩陣來捕捉 Token 的位置信息。RoPE 可以更好地處理長距離依存關係，且計算效率更高。

```mermaid
graph LR
    A[輸入 Token] -->|嵌入向量|> B[Token 嵌入向量]
    C[旋轉矩陣] -->|旋轉|> D[旋轉後嵌入向量]
    B -->|加法|> E[輸入嵌入向量]
    E -->|輸入 Transformer|> F[Transformer 模型]
```

## 跟沒有 Positional Embedding 的差別
沒有 Positional Embedding 的 Transformer 模型無法知道輸入 Token 的順序，從而無法理解輸入序列的語義。

## 小結
Positional Embedding 技術是 Transformer 模型中的一個重要組成部分，讓模型可以知道輸入 Token 的順序，從而更好地理解輸入序列的語義。不同的 Positional Embedding 技術，如 Absolute、Relative、RoPE，各有其優缺點和適用情境。

## 參考資料

* [Transformer 官方文檔](https://huggingface.co/transformers/)
* [Relative Positional Embedding](https://arxiv.org/abs/1803.02155)
* [RoPE](https://arxiv.org/abs/2104.09864)
- [如何讓 Transformer 知道輸入 Token 的順序？Absolute、Relative、RoPE、到沒有 Positional Embedding](https://www.youtube.com/watch?v=Ll-wk8x3G_g)