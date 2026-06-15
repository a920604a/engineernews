---
title: "AlphaProof：DeepMind 用神經符號 AI 解開奧林匹克數學題"
date: 2026-06-09T12:09:16.925Z
category: tech
tags: ["ai", "deepmind", "alphaproof", "reasoning", "math", "reinforcement-learning"]
lang: zh-TW
tldr: "DeepMind 的 AlphaProof 結合語言模型與強化學習，在 2024 年國際數學奧林匹克中解出 6 題中的 4 題，達到銀牌水準——這是 AI 第一次在形式化數學推理上接近頂尖人類選手。"
description: "AlphaProof 如何用神經符號方法在 IMO 達到銀牌水準，以及這對 AI 推理能力意味著什麼。"
type: explainer
original_url: "https://www.youtube.com/watch?v=Dkqzqw8rxXI"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_201922_257731.mp3"
---

大多數人對 AI 解數學題的印象是：語言模型做不好多步推導、會在中間跳步、算出錯誤答案卻信心滿滿。2024 年 7 月，DeepMind 宣布 AlphaProof 在當年度的國際數學奧林匹克（IMO）預試題中解出了 6 題裡的 4 題，包括一道只有 5 名人類選手解開的最難題。這不是語言模型的進步，而是一個架構層面的突破。

## TL;DR

AlphaProof 把語言模型的直覺和 AlphaZero 的強化學習結合，在形式化證明語言（Lean）中「玩數學」。它產出的不是「可能的答案」，而是每一步都可被機器驗證的完整證明。在 IMO 銀牌水準後，繼任的 AlphaProof Nexus 進一步解出了 9 道 Erdős 開放問題和 492 道 OEIS 猜想中的 44 道。

## 是什麼

AlphaProof 是 Google DeepMind 的自動定理證明系統，屬於「神經符號（neurosymbolic）」架構：神經網路負責統計直覺，符號系統負責嚴格驗證。

它的前身是 AlphaZero——那個在西洋棋、圍棋、將棋上打敗人類冠軍的強化學習系統。AlphaProof 把同樣的思路帶入數學：把數學問題當成一個遊戲，讓 AI 在可驗證的規則下自我迭代。

## 為什麼重要

語言模型解數學有一個根本問題：沒有自我驗證機制。模型生成看起來合理的推導，卻無法確認每一步是否正確，走錯路了也不知道要回頭。

AlphaProof 換了遊戲規則：把數學問題翻譯成 Lean 這個形式化語言。Lean 的每一步推導都可以被電腦自動驗證——要麼合法，要麼不合法，沒有模糊地帶。這給強化學習提供了清晰的獎勵信號，讓系統能夠真正從錯誤中學習，而不是繼續生成下一個 token。

## 怎麼運作

AlphaProof 的架構分兩層：

**語言模型層**：一個基於 Gemini 架構的預訓練語言模型負責「提出方向」——把自然語言的數學問題翻譯成 Lean 形式語言，並生成可能的證明步驟候選。

**強化學習層**：基於 AlphaZero 的 RL 引擎負責搜尋與驗證。每一個 Lean 步驟都即時送進驗證器，成功的推導路徑被保留並用來強化語言模型的生成策略。

訓練過程是一個正向循環：
1. RL 引擎嘗試各種證明路徑
2. Lean 驗證器回饋哪些步驟有效
3. 成功的完整證明強化語言模型在類似結構問題上的策略
4. 難度遞增，持續迭代

這種設計的關鍵優勢是**可驗證性**：AlphaProof 產出的不是「可能正確的答案」，而是任何人都可以用 Lean 跑一遍、逐步確認的完整證明。

## IMO 2024 的表現

2024 年 IMO 有 6 道題，AlphaProof 解出了 4 道：

- 2 道代數題
- 1 道數論題
- 1 道幾何題（競賽中最難的那道，只有 5 名人類選手完整解出）

按 IMO 評分標準每題 7 分，解出 4 題得 28 分，相當於銀牌水準（金牌門檻約 29–30 分）。需要注意的是，AlphaProof 解題花的時間遠超人類選手的 4.5 小時考試時間——速度不是它的優勢，準確性才是。

## AlphaProof Nexus 的延伸

IMO 之後，DeepMind 繼續擴大應用範圍。AlphaProof Nexus 把這個方法套用到更廣泛的開放數學問題：

- **Erdős 猜想**：解出 353 道開放問題中的 9 道。這些是數學家 Paul Erdős 生前提出、懸而未決數十年的問題。
- **OEIS 猜想**：驗證了 492 道整數序列相關猜想中的 44 道。

這些不是跑分，是對數學社群有實質貢獻的成果。

## 跟其他 AI 推理方法的差別

| 方法 | 驗證機制 | 適用範圍 | 輸出品質保證 |
|------|---------|---------|------------|
| LLM 直接推理（o1、o3）| 無，靠生成質量 | 廣但不嚴格 | 無 |
| AlphaProof | Lean 形式驗證 | 嚴格數學 | 完整可驗證證明 |
| 計算機代數系統（Mathematica）| 算術驗證 | 計算型問題 | 有限 |

最大差異在「可驗證性」：AlphaProof 的每一步都可以被任何人用 Lean 重新驗證，這在數學上等同於「把工作做完了」，不是「大概對」。

## 小結

AlphaProof 不是「AI 終於學會算術」，而是一個架構突破：把深度學習的直覺和形式驗證的嚴格性接在一起，讓 AI 在數學推理上第一次具備真正的自我糾錯能力。

對工程師來說，更值得思考的問題是：形式化語言不只能描述數學，也能描述軟體規格、協定設計、安全性屬性。如果 AlphaProof 的框架能遷移到這些領域，對軟體可靠性的影響可能遠比解 IMO 更深遠。

## 參考資料

- [AI achieves silver-medal standard solving International Mathematical Olympiad problems - Google DeepMind](https://deepmind.google/discover/blog/ai-solves-imo-problems-at-silver-medal-level/)
- [DeepMind's New AI Found A Strange New Way To Think（YouTube）](https://www.youtube.com/watch?v=Dkqzqw8rxXI)
- [AlphaProof, AlphaGeometry, ChatGPT, and why the future of AI is neurosymbolic - Gary Marcus](https://garymarcus.substack.com/p/alphaproof-alphageometry-chatgpt)
