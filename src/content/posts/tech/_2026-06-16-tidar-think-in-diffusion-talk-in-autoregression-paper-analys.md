---
title: "TiDAR：以擴散思維、自回歸表達（論文分析）"
date: 2026-06-16T03:59:09.324Z
category: tech
tags: ["TiDAR", "論文分析", "擴散思維", "自回歸", "AI", "機器學習", "論文"]
lang: zh-TW
tldr: "TiDAR論文分析：探討以擴散思維和自回歸表達的方法"
description: "TiDAR論文分析：探討以擴散思維和自回歸表達的方法"

type: deep-dive
original_url: "https://www.youtube.com/watch?v=taCVT5vDAk0"
draft: true
---

TiDAR：用擴散模型思考，用自回歸模型表達

## TL;DR
TiDAR 是一個結合擴散模型和自回歸模型的框架，旨在解決自然語言處理中的生成任務。它通過擴散模型進行編碼，然後使用自回歸模型進行解碼，實現更好的生成性能和多樣性。

## 設計哲學
TiDAR 的設計哲學是基於兩個假設：第一，自然語言可以用擴散模型來編碼；第二，自回歸模型可以用來解碼編碼後的語言。這個框架的目的是解決自然語言處理中的生成任務，例如語言模型、文本摘要等。

## 核心概念
TiDAR 的核心概念可以用以下流程圖來描述：
```mermaid
graph LR
    A[輸入語言] -->|編碼|> B[擴散模型]
    B -->|編碼後的語言|> C[自回歸模型]
    C -->|解碼|> D[輸出語言]
```
首先，輸入語言被編碼成一個高維空間中的向量，然後通過擴散模型進行編碼。編碼後的語言被輸入到自回歸模型中，自回歸模型根據編碼後的語言生成輸出語言。

## 跟常見替代方案比較
與其他自然語言處理框架相比，TiDAR 有以下優點：

| 框架 | 編碼模型 | 解碼模型 | 優點 |
| --- | --- | --- | --- |
| TiDAR | 擴散模型 | 自回歸模型 | 能夠捕捉長距離依賴關係 |
| Seq2Seq | RNN/LSTM | RNN/LSTM | 能夠處理序列資料 |
| Transformer | 自注意力機制 | 自注意力機制 | 能夠平行化計算 |

## 適合 / 不適合的情境
TiDAR 適合用於自然語言處理中的生成任務，例如語言模型、文本摘要等。它不適合用於需要嚴格控制輸出的任務，例如機器翻譯。

## 整體來說
TiDAR 是一個結合擴散模型和自回歸模型的框架，能夠實現更好的生成性能和多樣性。它適合用於自然語言處理中的生成任務，但需要考慮輸出的控制。

## 參考資料
* [TiDAR: Think in Diffusion, Talk in Autoregression (Paper Analysis)](https://www.youtube.com/watch?v=xxxxxxx)
- [TiDAR: Think in Diffusion, Talk in Autoregression (Paper Analysis)](https://www.youtube.com/watch?v=taCVT5vDAk0)