---
title: "為什麼新款手機相機感覺越拍越假？AI 計算攝影的代價"
date: 2026-05-23T03:57:22.064Z
category: tech
tags: ["smartphone", "camera", "computational-photography", "ai", "product"]
lang: zh-TW
tldr: "手機相機拍出的照片越來越「AI 感」——過度降噪導致皮膚像塑膠、月亮是貼上去的、細節是 AI 捏造的。問題不在硬體性能，而在廠商用 AI 補足硬體先天限制卻沒有清楚告知使用者。"
description: "探討手機相機的 AI 計算攝影爭議：為什麼 2025-2026 年的旗艦手機拍出的照片反而感覺失真？過度 AI 處理如何損害色彩準確度、細節真實感，以及這對手機攝影文化的影響。"
type: explainer
original_url: "https://www.youtube.com/watch?v=coX4duwUCpw"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260615_195341_050446.mp3"
---

你有沒有注意到，用新旗艦手機拍的人像，皮膚總是有一種奇怪的蠟質感？或者，明明天黑了還能把夜景拍得亮如白晝，但仔細看星星和樹葉的輪廓，總有一種「電腦繪圖」的不真實感？

這不是你的錯覺。這是計算攝影（computational photography）過度依賴 AI 後遺留下來的問題。

## TL;DR

現代手機相機的問題不是硬體，而是 AI 後製太激進。廠商用 AI 超解析度補足感光元件先天不足，用 AI 降噪掩蓋高 ISO 的雜訊，用訓練資料合成細節——但這些操作的副作用是顏色失真、細節被抹平或捏造、照片失去真實感。Samsung 的月亮事件是最知名的案例：AI 辨識出月亮後直接貼上一張訓練資料中的月面紋理，而不是真正拍攝到的。

## 是什麼

「計算攝影」指的是用軟體和演算法來補足光學硬體限制的技術。這個領域本身沒有問題——HDR 合成、夜間模式的多幀疊加、光學防手震配合電子防手震，都是計算攝影的一部分，而且都做得很好。

問題出在當廠商開始用 AI **主動創造照片中從未被真正拍攝到的細節**時。

具體來說，有幾個常見的過度處理模式：

### 1. AI 降噪導致皮膚像塑膠

手機感光元件體積小，在昏暗環境下需要拉高 ISO 才能維持正常曝光。高 ISO 會產生雜訊，廠商的解法是用 AI 降噪演算法在後製階段消除雜訊。問題是降噪的本質是「模糊化」——它把每個像素平滑成周圍像素的平均值，細節和紋理也一起被抹去。結果是皮膚失去毛孔，頭髮變成一片模糊的色塊，眼睛的虹膜紋理消失。

Google Pixel 系列在這方面的批評尤其明顯：演算法導向的處理讓照片有一種特定的「Google Look」——色彩飽和度異常高，陰影部分有奇怪的雜訊抑制偽影。

### 2. AI 超解析度填充不存在的細節

部分廠商的相機 app 在儲存照片時會執行 AI 超解析度（super-resolution）處理，把 12MP 的原始感光元件資料「升解析度」到 50MP 甚至更高。這個過程中 AI 會根據訓練資料「猜測」並補充不存在的細節。

從數學上說，這是不可能還原真實資訊的——AI 補充的細節是統計意義上「最可能存在的細節」，不是實際光線在感光元件上產生的資訊。

### 3. Samsung 月亮事件

2023 年開始廣泛被討論的 Samsung 月亮事件，最終成為這個問題的標誌性案例。有人用手機拍攝了一張月亮的模糊圖片，卻得到了清晰的月面環形山紋理。調查發現，Samsung 的場景優化功能在偵測到月亮後，會覆蓋相機實際拍攝到的模糊影像，改用 AI 訓練資料中的月面紋理貼圖。

這等於是照片在不告知使用者的情況下被 AI 「修圖」了——而且修的是根本不在現場的資訊。

## 為什麼重要

手機攝影的信任基礎建立在「這是當下發生的真實記錄」這個前提上。當 AI 開始在照片中創造從未被拍攝到的細節，這個前提就受到了挑戰。

對一般使用者而言，影響可能是：
- 你以為自己拍到了某個表情或瞬間，但那個細節其實是 AI 合成的
- 新聞攝影的可信度問題（如果消費者手機都在 AI 後製，標準在哪裡？）
- 在社群媒體上你看到的「手機拍的旅遊照」，其實比你的眼睛看到的飽和度高出許多

## 硬體限制才是根本

這個問題的根本原因是物理限制：手機的超薄機身讓感光元件永遠無法跟全片幅相機相比。感光元件越小，在低光環境下能夠捕捉到的光子就越少，訊噪比就越低。

在這個約束下，廠商有兩條路：
1. **接受硬體的限制**，在照片中呈現真實但帶有噪點的影像
2. **用 AI 掩蓋限制**，呈現更「好看」但失真的影像

多數廠商選擇了第二條路，因為它在發布會的展示圖片上更有說服力。

但正如 Android Authority 的批評所指出的：「與其用 AI 掩蓋硬體的裂縫，這些手機本來可以透過直接提供更好的硬體來表現得更好。」

## 跟傳統相機的差別

傳統相機（包括微單）的計算攝影策略更保守：多幀合成、光學防手震、RAW 後製支援。廠商會提供 RAW 格式讓使用者自行選擇後製程度。

手機相機的問題在於這個選擇通常被取走了——預設就是 AI 處理過的 JPEG，你沒有選擇「不讓 AI 動我的照片」的選項。部分廠商（如 Apple、Pixel）提供 ProRAW 或 RAW+ 格式，讓進階使用者可以拿到較少後製的影像，但這依然不是主流使用情境。

## 小結

手機相機的 AI 後製問題本質上是一個**透明度問題**：廠商沒有清楚告知使用者哪些細節是真實拍攝的，哪些是 AI 補充的。如果有人說「我用手機拍了這張照片」，他們的意思是「光線打到感光元件上產生了這個影像」，還是「AI 根據這個場景生成了一張看起來最美的圖片」？

這兩件事越來越難區分，而廠商並沒有動力讓它們變得更清晰。

## 參考資料

- [The Smartphone AI Photography Controversy: What's Really Going On? - Glyn Dewis](https://glyndewis.com/blog/mobile-photography-controversy)
- [If there's one smartphone camera feature we leave in 2025, it should be this - Android Authority](https://www.androidauthority.com/smartphone-camera-feature-leave-in-2025-ai-zoom-3628559/)
- [If there's one thing I want from my next phone it's less AI in my camera - Android Authority](https://www.androidauthority.com/less-ai-photos-phones-2026-3631398/)
- [Computational Photography Is the Future, Not Optics - Fstoppers](https://fstoppers.com/gear/real-future-photography-computational-not-optical-712081)
