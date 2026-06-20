---
title: "我把過去 100 年的重要 CS 論文都讀了一遍——然後呢？"
date: 2026-06-18T12:30:14.323Z
category: learning
tags: ["計算機科學", "論文", "程式設計", "AI", "歷史"]
lang: zh-TW
tldr: "Fireship 用一支影片帶你走過 10 篇改變電腦科學歷史的論文，從圖靈機到 GPT-3，每一篇都是一次典範轉移"
description: "10 篇跨越 100 年的 CS 經典論文回顧：圖靈、Shannon、Perceptron、Backprop、PageRank、AlexNet、Transformer、GPT-3——這些名字背後的想法如何環環相扣，最終走向今天的 AI 時代"
type: case-study
original_url: "https://www.youtube.com/watch?v=ML3q7Ok4hJg"
draft: false
---

有時候你會想，現在這些讓大家趨之若鶩的 AI 技術，到底是怎麼來的？不是那種「先有深度學習，然後有 ChatGPT」這種版本，而是真正從頭說起的那種。

Fireship 最近出了一支影片，標題叫「I read every major CS paper of the last 100 years」，用大概十幾分鐘的時間，挑了 10 篇論文，試圖回答這個問題。這不是學術回顧，也不是什麼嚴肅的文獻梳理，而是一個程式設計師版的「你必須知道的那幾個名字」。看完之後我覺得這個框架很值得記下來，因為它讓你看到每個想法是怎麼接著下一個想法長出來的。

## TL;DR

從 1936 年圖靈的可計算性理論，到 2020 年 GPT-3 的少樣本學習，這 10 篇論文構成了現代電腦科學的骨幹。有些想法彼此之間隔了幾十年，卻在對的時機相遇，變成你今天每天在用的工具。

## 10 篇論文，100 年的骨架

### 1936：圖靈，計算的邊界

Alan Turing 的〈On Computable Numbers〉（可計算數與判定問題應用）當年根本不是在設計電腦，他在回答一個邏輯問題：什麼東西「可以被計算」？他提出了一個想像中的紙帶機器（圖靈機），證明有些問題在邏輯上永遠不可判定。

但這個想像中的機器，後來變成了所有真實電腦的理論基礎。「可計算性」這個概念，決定了哪些問題電腦能解、哪些永遠解不了。

### 1948：Shannon，資訊的本質

Claude Shannon 的〈A Mathematical Theory of Communication〉定義了「位元」（bit）作為資訊的基本單位，引入了熵（entropy）的概念來測量不確定性。這篇論文創造了資訊理論這整個領域。

現在你傳一則訊息、壓縮一個檔案、播一段串流影片，底層都是 Shannon 的數學。

### 1958：Rosenblatt，第一個神經元

Frank Rosenblatt 的 Perceptron（感知機）是第一個可以從範例中「學習」的演算法，模仿大腦神經元的運作。它能分辨簡單的圖案，在當時引發了巨大的媒體熱潮：「機器可以學習了！」

### 1969：Minsky 與 Papert，AI 寒冬的起點

Marvin Minsky 和 Seymour Papert 出版了《Perceptrons》，用數學嚴格證明了感知機無法解決非線性問題（例如 XOR）。這本書幾乎扼殺了神經網路研究整整十年，資金撤走，研究者轉行，AI 進入第一次寒冬。

這是一個提醒：一篇嚴謹的否定，也可以改變整個領域的走向。

### 1978：Lamport，分散式系統的時間

Leslie Lamport 的〈Time, Clocks, and the Ordering of Events in a Distributed System〉解決了一個很實際的問題：在沒有全域時鐘的網路裡，你怎麼知道哪件事先發生？

他提出「邏輯時鐘」（logical clocks）的概念，讓分散式系統可以在不同節點之間建立事件的因果順序。今天所有的分散式資料庫、雲端服務、微服務架構都活在這個概念的影子裡。

### 1986：Rumelhart、Hinton、Williams，誤差反傳

〈Learning Representations by Back-propagating Errors〉讓神經網路重新復活。反向傳播演算法（backpropagation）讓多層神經網路得以有效訓練，繞過了 Minsky 的致命批評。

Hinton 後來花了幾十年在這條路上繼續走，最終走到了 2024 年的諾貝爾物理學獎。

### 1998：Brin 與 Page，PageRank

Sergey Brin 和 Larry Page 在史丹佛讀博士時寫的論文〈The Anatomy of a Large-Scale Hypertextual Web Search Engine〉，描述了一個把整個網路看作圖（graph）、用連結關係來排名網頁重要性的搜尋引擎。

這就是 Google 的起點，也是今天搜尋引擎的基礎。

### 2012：AlexNet，深度學習的分水嶺

Krizhevsky、Sutskever 和 Hinton 的〈ImageNet Classification with Deep Convolutional Neural Networks〉在 ImageNet 比賽裡把錯誤率從 26% 砍到 15%，遠超第二名。

這一刀切開了「深度學習之前」和「深度學習之後」。GPU 訓練、大資料集、深度卷積網路——三個東西湊在一起，引爆了接下來十年的 AI 熱潮。

### 2017：Transformer，現在什麼都是它

Google Brain 的 Vaswani 等人的〈Attention Is All You Need〉提出了 Transformer 架構，把注意力機制（attention mechanism）推向中心位置，丟掉了 RNN 的時序限制。

幾乎現在所有的大型語言模型、影像生成模型、語音模型，底層都是 Transformer 的變體。

### 2020：GPT-3，少樣本學習

OpenAI 的〈Language Models are Few-Shot Learners〉展示了一件讓所有人都沒預料到的事：把語言模型練得夠大，它不需要針對特定任務微調，光靠幾個範例就能解決新問題。

這篇論文讓「提示工程」（prompt engineering）變成一件嚴肅的事，也開啟了現在這波 AI 應用爆發。

## 這個時間軸最讓我印象深刻的事

這 10 篇論文裡有幾個模式：

**一、否定本身也是推進。** Minsky 打倒感知機，結果讓研究者更認真去思考多層網路的問題，最後有了 backprop。科學不是線性往前走的，它有時候需要先被推倒。

**二、數學工具比應用先到。** Shannon 1948 年就發展出資訊理論，但真正大規模應用要等到網路時代。圖靈機更早，但真實電腦晚了幾十年。

**三、硬體是關鍵的第三個輪子。** AlexNet 不是因為 2012 年才有好的想法，而是 GPU 算力終於夠了。很多論文其實在算力或資料到位之前，只是停在紙上的可能性。

**四、想法的結合比想法本身更重要。** GPT-3 不是靠某一個全新的突破，而是把 Transformer + 大資料 + 規模擴展規律（scaling laws）組在一起。

## 對工程師的意義

你不需要讀完這 10 篇原文，但知道它們的輪廓，對你日常的技術判斷會有幫助。

當你看到某個新框架號稱「改變了一切」，你可以問：這個想法是真的新的，還是把舊東西組合得更好？當你覺得某個技術方向走不通，你可以想起 Minsky 打倒感知機、結果催生了反向傳播這件事。

100 年的 CS 論文說的，其實是同一件事：現在看起來無解的問題，通常只是還在等對的工具或對的時機。

## 參考資料

- [I read every major CS paper of the last 100 years... (Fireship, YouTube)](https://www.youtube.com/watch?v=ML3q7Ok4hJg)
- [On Computable Numbers, with an Application to the Entscheidungsproblem — Turing (1936)](https://www.cs.virginia.edu/~robins/Turing_Paper_1936.pdf)
- [A Mathematical Theory of Communication — Shannon (1948)](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf)
- [Attention Is All You Need — Vaswani et al. (2017)](https://arxiv.org/abs/1706.03762)
- [Language Models are Few-Shot Learners — Brown et al. (2020)](https://arxiv.org/abs/2005.14165)
