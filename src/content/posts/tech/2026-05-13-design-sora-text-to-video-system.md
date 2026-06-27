---
title: "設計一個 Sora 等級的文字轉視訊系統"
date: 2026-05-13T02:56:25.977Z
category: tech
tags: ["sora", "text-to-video", "diffusion-model", "transformer", "ai-generation", "system-design"]
lang: zh-TW
tldr: "Sora 的核心架構是 Diffusion Transformer（DiT）：把影片壓縮成時空 patch token，用擴散模型訓練去雜訊，Transformer 負責全域一致性。設計這類系統的真正難點在於時空一致性、可變長度/解析度支援，以及訓練規模。"
description: "從系統設計角度剖析 Sora 的技術架構：時空自編碼器、Diffusion Transformer、可變輸入設計，以及開源替代方案 Open-Sora 的工程選擇。"
type: deep-dive
original_url: "https://www.youtube.com/watch?v=ZuQ4B0CwNjo"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260522_235127_181707.wav"
---

2024 年 2 月，OpenAI 發布了 Sora，展示了生成一分鐘高品質影片的能力，震驚了整個 AI 研究社群。之前最好的文字轉影片系統頂多生成幾秒、解析度有限、時間一致性很差的片段。Sora 的核心技術突破在哪裡？如果你要設計一個類似的系統，架構關鍵決策是什麼？這篇文章拆解 Sora 的技術報告（Video Generation Models as World Simulators），以及開源復刻版 Open-Sora 的工程選擇。

## TL;DR

- **核心架構**：Diffusion Transformer（DiT）——擴散模型 + Transformer 取代 U-Net
- **影片表示**：時空自編碼器（spatiotemporal autoencoder）把影片壓縮成潛在空間的 3D patch
- **統一訓練**：同時在不同解析度、不同長度、不同長寬比的影片上訓練，沒有固定輸入形狀
- **關鍵論文**：Sora 是「世界模擬器」的觀點——不只生成影片，而是學習物理世界的模型
- **開源版本**：Open-Sora 2.0 是最接近 Sora 架構的開源實作

## 設計哲學

Sora 的技術報告標題是「Video Generation Models as World Simulators」，這不只是行銷詞彙，而是設計哲學的宣言：影片生成模型在學習「物理世界如何運作」，而不只是「怎麼讓像素看起來真實」。

這個哲學對架構有直接影響：

1. **不能固定輸入形狀**：真實世界的影片有各種長寬比（橫向 16:9、縱向 9:16、方形）、各種長度（幾秒到幾分鐘）。固定輸入形狀會讓模型學到「影片邊框」而非「世界的一個視角」
2. **時間一致性比空間質量更重要**：生成單張高品質圖像已有很多解法。難的是讓物體在時間軸上保持一致——同一個人的臉在第 1 秒和第 10 秒要一致，物理運動要符合常識
3. **Scaling Law 優先**：Transformer 架構在語言、圖像上都驗證了「更大的模型、更多的資料」帶來更好的效果。選 Transformer（而非只用 U-Net）就是為了這個擴展性

## 核心概念

### 時空自編碼器（Spatiotemporal Autoencoder）

傳統影片在像素空間訓練擴散模型計算量太大。Sora 先把影片壓縮到潛在空間（latent space），再在潛在空間做擴散訓練。

壓縮器（encoder）同時在空間和時間維度壓縮：
- 空間：把每個 frame 的 H×W 像素壓縮到 h×w 的 feature map
- 時間：把連續 T 個 frame 壓縮到 t 個時間步

壓縮後的潛在表示是一個 3D 張量：`t × h × w × c`，比原始影片小很多，但保留了視覺和時間資訊。

然後從這個 3D 潛在表示切出**時空 patch**（spatiotemporal patches），每個 patch 是固定大小的 3D 立方體（如 2×4×4 個時間-空間格點）。這些 patch 被展平成序列，就可以送進 Transformer。

### Diffusion Transformer（DiT）

傳統擴散模型（如 Stable Diffusion）使用 U-Net 作為去雜訊網路。U-Net 有卷積結構，適合固定大小的圖像，但難以處理可變長度序列。

Sora 把 U-Net 換成 **Transformer**：

```
雜訊影片（潛在空間）
    ↓ 切成時空 patch tokens
patch tokens + 時間步 t 的 sinusoidal embedding + 文字條件 embedding
    ↓
Transformer（多層 self-attention + cross-attention）
    ↓
預測每個 patch 的雜訊
    ↓ 迭代去雜訊 T 步
乾淨的潛在影片
    ↓ Decoder
生成的影片
```

Transformer 的 self-attention 天然支援可變長度輸入（不同長度、不同解析度的影片切成不同數量的 patch，但都能送進同一個 Transformer）。

### 3D 時空位置編碼

Patch token 需要知道自己的位置——不只是「第幾個 token」，而是「第幾個時間步的第幾行第幾列的 patch」。Sora 使用 3D sinusoidal positional encoding，從 (t, h, w) 三個維度計算位置向量。

這讓模型能區分：「同樣的 patch 在時間步 1 和時間步 10」，以及「同樣的 patch 在影片的左上角和右下角」。

### 文字條件：CLIP + T5

文字 prompt 需要被轉成影響生成的條件向量。Sora 使用 T5 文字編碼器把文字轉成豐富的語義表示，再透過 cross-attention 在每個 Transformer 層加入條件資訊。

DALL-E 3 的研究發現，用 GPT-4 先把短 caption 擴展成詳細描述，再訓練，效果大幅提升。Sora 也採用了這個策略。

## 跟常見替代方案比較

| 方案 | 架構 | 可變輸入 | 時間一致性 | 訓練規模 |
|------|------|----------|-----------|----------|
| Sora | DiT + 時空 patch | 完整支援 | 優 | 超大 |
| Open-Sora 2.0 | DiT（開源復刻） | 支援 | 良 | 中等 |
| Stable Video Diffusion | U-Net | 有限 | 中 | 中等 |
| AnimateDiff | U-Net + 時間模組 | 有限 | 中 | 較小 |
| Runway Gen-3 | 未公開（推測 DiT） | 支援 | 良 | 大 |

**Open-Sora 2.0**（浙江大學 + 上海 AI Lab 合作）是最值得關注的開源版本，完整使用 DiT 架構，支援可變解析度和長度，有完整的訓練程式碼。

## 適合/不適合的情境

**適合：**
- 廣告、行銷影片的快速原型
- 電影特效的概念驗證（previs）
- 教育動畫的自動化生成
- 遊戲開發的場景概念圖（轉成影片形式）

**不適合（目前）：**
- 需要精確控制鏡頭運動的專業拍攝
- 真實人物的還原（容易出現臉部一致性問題）
- 超長影片（超過 1 分鐘的時間一致性仍然困難）
- 即時生成（Sora 的推論時間以分鐘計算）

## 如果你要自己設計一個

以下是 scaled-down 版本的設計決策：

```
訓練資料：
  100K-1M 影片 + 詳細 caption（用 LLM 自動生成）

影片自編碼器：
  使用 Open-Sora 的預訓練 VAE（可直接復用）

模型架構：
  DiT（小型版本：12層、512維度即可開始驗證）

文字編碼：
  T5-XL 或 Flan-T5（開源，效果好）

訓練基礎設施：
  A100 × 8 = 1-2 週訓練 baseline 版本

評估指標：
  FVD（Fréchet Video Distance）、CLIP Score
```

## 整體來說

Sora 最重要的技術貢獻不是某個具體演算法，而是兩個架構選擇的組合：

1. **時空 patch 表示**：把影片均勻地切成 3D token，讓模型可以直接在時空維度做 self-attention，而不需要分開處理空間和時間
2. **用 Transformer 取代 U-Net 做擴散**：繼承了 Transformer 的 scaling law 特性，讓模型效果隨規模可預期地增長

Open-Sora 2.0 的開源讓這個技術路線可以被研究社群驗證和優化。如果你想進入文字轉影片這個領域，從 Open-Sora 的訓練程式碼開始，是目前最快的路徑。

## 參考資料

- [OpenAI Sora 技術報告：Video Generation Models as World Simulators](https://openai.com/index/video-generation-models-as-world-simulators/)
- [arXiv：Sora 技術綜述](https://arxiv.org/html/2402.17177v1)
- [Louis Bouchard：Open-Sora 2.0 解說](https://www.louisbouchard.ai/open-sora-2/)
- [arXiv：Open-Sora 論文](https://arxiv.org/html/2412.20404v1)
- [AllPCB：Sora 架構詳解](https://www.allpcb.com/allelectrohub/sora-openais-video-model-architecture-and-use-cases)
- [原始影片](https://www.youtube.com/watch?v=ZuQ4B0CwNjo)
