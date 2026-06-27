---
title: "Anthropic 叫大家停，然後推了 Fable 5，然後政府把它關掉了"
date: 2026-06-14T04:54:52.915Z
category: tech
tags: ["ai", "anthropic", "fable-5", "security", "policy", "regulation"]
lang: zh-TW
tldr: "Anthropic 發表暫停呼籲後五天推出 Fable 5，四天後被美國政府以國家安全為由強制下線。一場把所有矛盾壓縮進十天的業界速成劇。"
description: "Fable 5 從發布到被政府強制下線只有四天。Anthropic 這十天的故事，是一個關於 AI 安全聲明與商業現實之間張力的案例研究。"
type: newsjacking
original_url: "https://www.youtube.com/watch?v=1PBRhm5ZnjU"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260615_202742_218840.mp3"
---

「我們呼籲大家暫停。」——Anthropic，2026 年 6 月 4 日

「Fable 5 現已上線，$50/百萬 output token。」——Anthropic，2026 年 6 月 9 日

「Fable 5 已依法強制下線。」——美國政府，2026 年 6 月 12 日

三個句子，十天，一個把所有矛盾濃縮在一起的故事。

## TL;DR

Anthropic 在 6 月 4 日聯署論文呼籲全球有條件暫停前沿 AI 開發，五天後推出了他們迄今最強的公開模型 Fable 5，四天後模型被美國政府以國家安全為由強制下線。從「暫停」呼籲到政府下線令：10 天。

## 發生了什麼

### 6 月 4 日：《When AI Builds Itself》

Anthropic 員工與創辦人 Jack Clark 聯署發表了一篇論文。核心主張：

- Claude 現在撰寫 Anthropic 自家程式碼庫 **80%+ 的 commit**
- 工程師生產力提升 **8 倍**（vs. 2021–2025 平均）
- 模型的任務視野（task horizon）每 4 個月翻倍——Opus 3 能處理 4 分鐘任務，Opus 4.6 能處理 12 小時任務
- Jack Clark 估計 2028 年前達到遞迴自我改善的機率：**60%**

結語呼籲業界和政府協調「有條件的全球暫停」機制。

同一時間，Anthropic 正向 SEC 提交 S-1 IPO 申請，估值目標超過 1 兆美元。

### 6 月 9 日：Fable 5 上線

五天後，Fable 5 正式發布。

這不是一個小更新。Fable 5 在 SWE-bench Verified 得分 88.6%（Opus 4.8 是 87.6%），針對企業和科學研究場景優化，定價 $50/百萬 output token，是 Anthropic 迄今定價最高的公開模型。同時上線的還有更先進、僅限受控存取的 Mythos 5。

「呼籲暫停」後五天。

### 6 月 12 日：政府下線令

6 月 12 日下午 5:21 ET，美國出口管制指令送達 Anthropic。

原因：有已知的越獄漏洞可以繞過 Fable 5 的安全機制，存在國家安全風險。指令即刻生效——全球下線，在美外籍員工也失去存取。Anthropic 對已付費用戶提供按比例退款。

Anthropic 的回應：那個越獄「相對簡單」，在 GPT-5.5 等其他模型上也能做到，政府反應是「誤解」。

距離 Fable 5 上線：**4 天**。

## 為什麼這件事值得關注

表面上這是一個 PR 危機，但實質上它暴露了三個更深的問題。

**第一，安全聲明的可信度問題。** 當你的論文呼籲業界暫停，卻在五天內推出定價最高的新模型，你的「安全優先」訊息傳遞出了什麼？答案不是非黑即白——Anthropic 可以同時真心相信 AI 風險和真心需要商業收入。但這兩者之間的張力是真實的，而且不會因為用更精緻的語言解釋就消失。

**第二，政府監管的速度問題。** 下線令在模型上線 4 天後才到，且來自一個已知漏洞回報，不是主動監控體系的產出。如果模型的任務視野真的在以 4 個月為週期翻倍，監管的反應速度需要一個根本性的架構調整，而不只是更快的人工審核。

**第三，「有條件暫停」缺乏可操作的定義。** 論文提出了觸發條件的概念，但沒有說誰有權宣告觸發、觸發後實際執行什麼程序。在缺乏具體機制的情況下，這份呼籲更像是一份道德立場宣示，而不是一個可以執行的提案。

## 技術角度怎麼看

Fable 5 被下線的直接原因是一個越獄漏洞。值得注意的不只是「有漏洞」，而是**政府對這個漏洞的評估**：即使 Anthropic 認為它「相對簡單」，政府認為風險高到足以即刻下線。

這說明模型能力和安全認可之間存在一個越來越複雜的評估過程。隨著模型能處理的任務越來越長、越來越自主，「這個越獄能做什麼傷害」的答案也會越來越嚴重。4 天的審查期顯然不夠，但誰來審查、審查什麼，目前沒有行業標準。

Anthropic 自己的論文數據說任務視野每 4 個月翻倍。這意味著：今天的漏洞只是暖身。

## 後續值得觀察的點

- Fable 5 重新上線的條件是什麼？政府與 Anthropic 的談判進展？
- Mythos 5 未來是否會開放？安全審查標準是什麼？
- OpenAI GPT-5.5 有同樣的越獄但沒被下線——兩者的標準是否一致？
- IPO 時間線是否受這次事件影響？機構投資者怎麼看安全/商業矛盾？

## 參考資料

- [Anthropic begged the world to stop AI… then shipped this](https://www.youtube.com/watch?v=1PBRhm5ZnjU)
- [When AI Builds Itself — Jack Clark 等](https://jack-clark.net)
- [Fable 5 launch announcement — Anthropic](https://anthropic.com)
