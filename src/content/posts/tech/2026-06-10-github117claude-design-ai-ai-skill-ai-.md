---
title: "GitHub 熱門開源週報 #117：設計工具、AI 上下文壓縮、英語學習、手搓 AI"
date: 2026-06-10T12:27:07.655Z
category: tech
tags: ["GitHub", "開源", "AI", "設計工具", "開發工具"]
lang: zh-TW
tldr: "本週 GitHub 熱門精選：Penpot 開源設計工具替代 Figma、LLMLingua 上下文壓縮、AI 提示詞美學課程、英語學習神器 Anki 進化版，以及 Andrej Karpathy 的 nanoGPT 教學系列。"
description: "GitHub 開源專案週報第 117 期：五個值得工程師關注的熱門專案，涵蓋設計工具、AI 上下文優化、提示詞工程、語言學習和從零建造 AI 模型。"
type: listicle
original_url: "https://www.youtube.com/watch?v=Oruwe_eBbfw"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_202029_384114.mp3"
---

每週 GitHub Trending 跑一遍，挑五個工程師會想知道的專案。第 117 期的主題分佈在設計、AI 工具鏈、英語學習和 AI 教育，涵蓋前端設計師、AI 工程師和想深入理解模型的開發者。

## TL;DR

本週五個值得關注的開源專案：UI 設計工具 Penpot（開源 Figma 替代）、LLM 上下文壓縮工具 LLMLingua、AI 提示詞美學課程、Anki 進化版英語學習工具，以及 nanoGPT 系列從零手搓 AI。

---

## 1. Penpot：開源的 Figma 替代方案

**GitHub：** [penpot/penpot](https://github.com/penpot/penpot)

Figma 在 2022 年被 Adobe 收購（後來因監管問題告吹），這件事讓設計工具生態的開源替代需求大增。Penpot 是目前最完整的開源選項。

**為什麼值得注意：**
- 完全 web-based，Clojure/ClojureScript 撰寫，可自架
- 支援 SVG 原生格式（不是私有格式），設計稿可以真正「帶走」
- 支援 design token、component library、prototype 流程
- 可以 self-host 在 Docker 上（一行 docker-compose up）

**和 Figma 的主要差別：**
Penpot 的外掛生態比 Figma 小很多，但對「不想資料在 Adobe 伺服器上」的團隊是個可行選項。Community 版免費，Enterprise 版有商業授權。

```bash
# 自架 Penpot
git clone https://github.com/penpot/penpot
cd penpot
docker-compose -p penpot -f docker/images/docker-compose.yaml up -d
```

---

## 2. LLMLingua：AI 上下文壓縮神器

**GitHub：** [microsoft/LLMLingua](https://github.com/microsoft/LLMLingua)

LLM 的 context window 雖然越來越大，但 token 費用和延遲也跟著增加。LLMLingua（Microsoft Research）解決的問題是：**在不大幅犧牲回答品質的前提下，壓縮你送給 LLM 的 prompt。**

**運作方式：**
用一個小型語言模型（如 Llama 2 7B）評估 prompt 中每個 token 的資訊密度，去掉低資訊量的部分，讓送出去的 prompt 更精簡。

**實際效果（論文數據）：**
- 壓縮率可達 20x（把 1000 token prompt 壓到 50 token）
- 在 GSM8K 等推理 benchmark 上品質損失 < 5%
- 配合 RAG 使用時，去掉 retrieved context 中的冗餘部分效果最明顯

```python
from llmlingua import PromptCompressor

llm_lingua = PromptCompressor("microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank")
compressed = llm_lingua.compress_prompt(
    context,
    instruction=instruction,
    question=question,
    target_token=200,
)
print(compressed["compressed_prompt"])
```

如果你的 RAG pipeline 有很長的 retrieved context，LLMLingua 可以直接插入在送給 LLM 之前。

---

## 3. Prompt Engineering 美學課程

**類型：** 課程型 GitHub repo

本週有一個「如何讓 AI 生成更有美感的視覺內容」的開源課程上了 Trending，目標讀者是想讓 AI 圖像生成工具（Midjourney、DALL-E、Stable Diffusion）產出更精緻結果的設計師和工程師。

**課程涵蓋的核心技術：**
- **風格參考（Style Reference）**：如何用參考圖、色票、藝術家名字引導生成風格
- **負向提示詞（Negative Prompt）**：明確排除不要的元素（模糊、過曝、漫畫風格等）
- **CFG Scale 與 Sampling Steps**：在 Stable Diffusion 中控制創意性 vs. 忠實度的旋鈕
- **Inpainting 與 Outpainting**：局部修改和圖片延伸

重點是這份課程用的是工程師看得懂的語言解釋，而不是「就這樣說就對了」的魔法咒語教學。

---

## 4. 離譜英語學習法：SuperMemo 繼承者

**類型：** 語言學習工具

Anki 的核心演算法（SM-2，間隔重複）是 1987 年的設計，Anki 本身在移動端的 UI 也一直是痛點。本週一個基於更新的間隔重複演算法（FSRS 4.5）的英語學習工具上了 Trending。

**FSRS vs. SM-2 的差別：**
- SM-2 用固定的遺忘曲線模型，FSRS（Free Spaced Repetition Scheduler）用機器學習從你的實際複習歷史學習你個人的遺忘曲線
- 理論上同樣記憶效果，FSRS 需要的複習次數更少
- 有人測試後每日複習量降低約 20–30%，同等記憶保留率

**實際整合方式：**
- Anki 23.10+ 已內建 FSRS 作為可選排程器（`Tools → Preferences → Review → Scheduler`）
- 不需要另外安裝外掛，切換成本很低

---

## 5. nanoGPT：從零手搓 GPT 的系列課程

**GitHub：** [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT)

Andrej Karpathy（前 Tesla AI Director、OpenAI 共同創辦人）的教學 repo，讓你從頭用 ~300 行 PyTorch 實作一個可以真正訓練的 GPT-2。配合他的 YouTube 教學系列 "Let's Build GPT from Scratch"，是目前最好的「理解 Transformer 不只是用它」課程。

**為什麼這個 repo 一直在 Trending：**
- 程式碼極度乾淨，沒有不必要的抽象層，讀完就理解 attention mechanism 在做什麼
- 可以在 MacBook 上訓練小版本（幾分鐘出結果），不需要 GPU 農場
- Karpathy 的解釋方式是「把數學翻譯成直覺」，不是「記公式」

**延伸學習路徑：**
1. nanoGPT：理解 GPT 架構
2. [micrograd](https://github.com/karpathy/micrograd)：理解 backpropagation
3. [llm.c](https://github.com/karpathy/llm.c)：理解 GPU 效能優化（C 實作版）

---

## 本週趨勢觀察

這五個專案分別對應五種不同的工程師需求：設計師想要資料主權、AI 工程師在降 token 成本、想做 AI 應用的設計師在學提示詞、語言學習者在找更科學的工具、想真正懂 LLM 的工程師在找正確的入口。

GitHub Trending 本身是一個很好的市場信號——某件事大量的人同時想做，代表業界的某個痛點正在被關注。

## 參考資料

- [GitHub 一周熱門開源專案 #117](https://www.youtube.com/watch?v=Oruwe_eBbfw)
- [Penpot — 開源設計工具](https://github.com/penpot/penpot)
- [LLMLingua — Microsoft Research](https://github.com/microsoft/LLMLingua)
- [nanoGPT — Andrej Karpathy](https://github.com/karpathy/nanoGPT)
- [FSRS 間隔重複演算法](https://github.com/open-spaced-repetition/fsrs4anki)
