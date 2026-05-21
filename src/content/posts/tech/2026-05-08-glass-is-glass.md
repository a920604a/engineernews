---
title: "玻璃就是玻璃：Meta Ray-Ban Display 智慧眼鏡的技術突破與現實"
date: 2026-05-08T10:28:22.229Z
category: tech
tags: ["Meta", "AR", "穿戴式裝置", "Ray-Ban", "AI硬體"]
lang: zh-TW
tldr: "Meta Ray-Ban Display 是第一款真正將 AI 顯示器整合進一般眼鏡鏡框的消費產品，但 $799 的售價和 6 小時電池壽命顯示這還是早期採用者的市場。"
description: "深入解析 Meta Ray-Ban Display 智慧眼鏡的技術架構、顯示技術、EMG 神經腕帶設計，以及對 AR 穿戴裝置路線圖的意義。"
type: explainer
original_url: "https://www.youtube.com/watch?v=7YrdI7h2XoY"
draft: false
---

AR 眼鏡做了十幾年，真正能讓人戴出門的幾乎沒有。Google Glass 失敗了，Snap Spectacles 賣不動，Magic Leap 燒掉幾十億之後幾乎消聲匿跡。但 Meta 在 Connect 2025 發表的 Ray-Ban Display 看起來不太一樣——它的鏡框就是一般的 Ray-Ban 眼鏡，重量只有 69 公克，而且內建了一個真正可用的顯示器。「玻璃就是玻璃」——意思是，這次不是概念展示，是能出貨的產品。

## TL;DR

Meta Ray-Ban Display 在右側鏡片內整合了 600×600 解析度的單眼顯示器，亮度最高達 5,000 nits，搭配 EMG 神經腕帶作為輸入裝置。售價 $799，電池續航 6 小時，目前已在美國開賣。對工程師來說，最值得關注的是它在消費性硬體中把顯示光學、AI 推論、生物訊號輸入三件事同時整合進來的工程取捨。

## 是什麼

Ray-Ban Meta Display 是 Meta 與 EssilorLuxottica（Ray-Ban 的母公司）共同開發的 AI 智慧眼鏡，於 2025 年 9 月 Meta Connect 上正式發表，同年 9 月 30 日開始在美國實體通路販售。

它的前身是 2023 年推出的 Ray-Ban Meta（無顯示器版本），那款只有相機、麥克風和喇叭，靠語音和 Meta AI 互動。Display 版本在此基礎上加入了顯示模組，讓眼鏡從「戴在臉上的藍牙耳機」升級為真正的 AR 輸入輸出裝置。

主要規格：

- **顯示器**：右側鏡片內嵌單眼顯示，解析度 600×600，FOV 20 度，42 像素/度，亮度 30–5,000 nits，刷新率最高 90 Hz
- **相機**：12MP 主鏡頭，支援 3 倍光學變焦，配合鏡片內的取景器操作
- **音訊**：2 個開放式喇叭，6 個麥克風
- **重量**：69 公克（標準）/ 70 公克（大尺寸）
- **電池**：單次充電 6 小時，搭配充電盒可達 30 小時總續航
- **售價**：$799，包含 Meta Neural Band

## 為什麼重要

這不是第一副智慧眼鏡，但可能是第一副「普通人願意戴出門」的智慧眼鏡。

Google Glass（2013）失敗的核心原因不是技術，是社交可接受度。那塊懸在臉上的方塊讓人一眼就知道你在錄影，引發隱私爭議。Snap Spectacles 走的路線相近，也遭遇同樣困境。

Ray-Ban Meta Display 的策略完全不同：從外觀優先。鏡框就是正常的 Ray-Ban Headliner 款式，顯示器整合進鏡片而不是突出在鏡框外，路人不容易分辨你戴的是智慧眼鏡還是普通眼鏡。這個設計選擇決定了整個產品的工程方向——不能有散熱鰭片，不能有厚重電池倉，所有元件必須塞進正常眼鏡能接受的體積和重量範圍內。

對 AI 應用的影響也很直接：當顯示器掛在你臉上，AI 的資訊呈現從「需要掏出手機看」變成「隨時可用」。導航、即時翻譯、通知、物體識別——這些功能的實用性在有顯示器之後才真正成立。

## 怎麼運作

### 顯示光學

Ray-Ban Display 使用的是波導（waveguide）顯示技術，這是目前主流 AR 眼鏡的標準方案，Microsoft HoloLens 和 Apple Vision Pro 也都採用不同形式的波導。原理是：投影機（通常是 LCoS 或 DLP 微型投影機）把圖像注入鏡片邊緣，光線在鏡片內部透過全反射傳播，最後從特定角度射出進入眼睛，讓使用者看到虛像浮在視野中。

Meta 選擇單眼設計（只在右側）而非雙眼，這是工程上的取捨：雙眼提供更好的沉浸感，但對準難度和成本都急劇上升，在消費性眼鏡的體積限制下目前幾乎做不到。20 度的 FOV 也比 HoloLens 的 52 度窄很多，但換來的是足夠輕薄的鏡片和可接受的重量。

### Neural Band EMG 輸入

這是整個產品最有趣的部分。傳統 AR 眼鏡的輸入問題是個大坑——語音輸入有隱私疑慮，觸控式觸控板不夠直覺，手勢識別需要相機功耗。Meta 的解法是 Neural Band：一個戴在手腕的 EMG（肌電圖）腕帶。

EMG 感測器透過偵測肌肉收縮時產生的微弱電訊號，反推手指的動作意圖。你不需要真的用力動手指，只要「意圖動」就能觸發輸入。這個技術來自 Meta 2019 年收購的 CTRL-labs，在 Facebook Reality Labs 研發了好幾年後終於進入消費品。

腕帶的電極採用類鑽碳塗層，外部以 Vectran 編織強化——Vectran 是火星探測車降落緩衝墊用的材料，抗拉強度比鋼高，但可以彎折。電池壽命 18 小時，比眼鏡本體的 6 小時還長。

### AI 處理

眼鏡本體做輕量化推論，重運算卸載到手機（配對後透過藍牙/WiFi 連線）或 Meta 雲端。Meta AI 整合了 Llama 系列模型，支援即時問答、物體識別、場景理解等功能。12MP 相機每隔一段時間或按需拍照，視覺資料送給模型分析後，結果顯示在鏡片 HUD 上。

## 跟其他方案的差別

| 產品 | FOV | 重量 | 售價 | 外觀 | 輸入 |
|------|-----|------|------|------|------|
| Meta Ray-Ban Display | 20° | 69g | $799 | 一般眼鏡 | EMG 腕帶 + 語音 |
| Apple Vision Pro | ~120° | 600g | $3,499 | 頭戴裝置 | 眼動追蹤 + 手勢 |
| Microsoft HoloLens 2 | 52° | 566g | ~$3,500 | 頭盔 | 手勢 + 語音 |
| Snap Spectacles 5 | — | 226g | 需訂閱 | 運動眼鏡 | 觸控板 |

Meta 的定位是「能日常佩戴的 AI 顯示器」，Apple Vision Pro 是「坐著用的空間電腦」。這兩個產品其實不在同一個使用場景競爭，更準確的比較對象是下一代的 Android XR 眼鏡，以及 Apple 傳說中的輕量版智慧眼鏡。

## 小結

Ray-Ban Meta Display 是 AR 眼鏡歷史上第一個認真把「外觀可接受度」放在第一位的消費產品。技術上，20 度 FOV + 6 小時電池代表它還不是你能取代手機的裝置；但它能讓你在不掏手機的情況下接收通知、做導航、用 AI 問答，這個使用場景是真實的。

EMG 腕帶是值得關注的輸入技術路線——如果這個互動模式被驗證有效，它可能成為下一代穿戴裝置的標準輸入法，影響遠超過這副眼鏡本身。

$799 的售價讓它目前還是早期採用者市場。但 Meta 每一代都在降成本、提規格，這次能出貨、能戴出門已經是個里程碑。

## 參考資料

- [Meta Ray-Ban Display 官方規格](https://www.meta.com/ai-glasses/meta-ray-ban-display/)
- [Meta Connect 2025 發表公告](https://www.meta.com/blog/meta-ray-ban-display-ai-glasses-connect-2025/)
- [Gizmodo 評測：Meta Ray-Ban Display](https://gizmodo.com/meta-ray-ban-display-smart-glasses-review-is-this-the-future-we-really-want-2000679520)
- [Red Shark News 深度分析](https://www.redsharknews.com/meta-ray-ban-display-glasses-neural-band-connect-2025)
- [Time Best Inventions 2025](https://time.com/collections/best-inventions-2025/7318319/meta-ray-ban-display/)
- [原始影片](https://www.youtube.com/watch?v=7YrdI7h2XoY)
