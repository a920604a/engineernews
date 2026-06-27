---
title: "WWDC 2026 速覽：Siri 重建、macOS 告別 Intel、Liquid Glass 補丁"
date: 2026-06-12T03:50:52.651Z
category: tech
tags: ["wwdc", "apple", "ios", "macos", "siri", "apple-intelligence"]
lang: zh-TW
tldr: "WWDC 2026 最大的改變是 Siri 從頭重寫成獨立 App、macOS Golden Gate 宣告 Intel Mac 終結，其他更新在預期之中。"
description: "WWDC 2026 的開發者大會綜覽：Siri AI 重建用 Google Gemini、iOS 27 Liquid Glass 修補、macOS Golden Gate 為 Apple Silicon 專屬，以及 Apple Intelligence 的新功能。"
type: explainer
original_url: "https://www.youtube.com/watch?v=_gCXmKjDecU"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260615_202424_219210.mp3"
---

WWDC 2026 在 6 月 8 至 12 日舉行。對多數關注 Apple 平台開發的工程師來說，這屆大會的感覺大概是：「對，就是我們預期的那樣。」Siri 重建了，Liquid Glass 補了洞，Intel Mac 正式被宣告終結。沒有什麼意外，但每件事都是真實的改變。

## TL;DR

- **Siri** 從頭重建為獨立 App，背後用 Google Gemini + Private Cloud Compute；功能強大但初期名單制
- **iOS 27**：Liquid Glass 透明度調整滑桿（修正可讀性問題）、加強家長控制
- **macOS 27 Golden Gate**：最後一版支援 Intel Mac；往後只有 Apple Silicon
- **Apple Intelligence**：Image Playground 支援寫實風格圖片、Photos 新增 Extend/Reframe 工具
- 開發者 beta 即日起；公開 beta 7 月；一般可用 9 月（隨 iPhone 18 Pro）

## 是什麼

WWDC（Apple Worldwide Developers Conference）每年六月，是 Apple 宣布作業系統更新的主場。今年的主線是 Siri AI 的全面重寫，以及 macOS 正式結束對 Intel 的支援。

## 為什麼重要

### Siri AI：換心臟，也換了定位

新 Siri 不再只是語音助手，它變成一個能存取你的 email、訊息、照片、行事曆、檔案的**個人情境引擎**，整合進系統的每個角落。Spotlight 改名「Search or Ask」，反映這個新定位。

技術面：Siri AI 的後端是 **Google Gemini**，透過 Private Cloud Compute（Apple 自己的隱私運算架構）運行。Apple 的說法是：你的個人資料不會被用來訓練 Gemini，推理在隔離環境進行。

但有幾個重要限制：
- 初期**名單制**（waitlist），不是全體用戶立即可用
- **歐盟不支援**（iOS 27/iPadOS 27 上市時）——數位市場法規監管問題
- 目前沒有第三方開發者 API；開發者無法把自己的 App 深度整合進 Siri AI

對開發者來說，這最後一點值得特別注意。Apple 在 Siri 上投入了大量資源，但開發者能利用的介面仍然有限。

### macOS 27 Golden Gate：Intel 正式退場

macOS 27 是最後一版支援 Intel Mac 的 macOS。2020 年開始的 Apple Silicon 轉型在 2026 年正式進入終章。

相容設備：2020 年（含）以後的 Apple Silicon Mac，M1 起。

如果你還在用 Intel MacBook Pro，這不是馬上強迫升級，但你已經在最後一張安全網上了。

功能面：Visual Intelligence 進 Spotlight（用螢幕上的內容做查詢）、統一工具列、全寬側邊欄、AirDrop 加速、更快的網路檔案瀏覽、Messages 同步改善。

### iOS 27：Liquid Glass 補洞

iOS 26 去年推出的 Liquid Glass 設計語言（半透明、流體化 UI）收到大量可讀性投訴。iOS 27 加了一個**透明度調整滑桿**，讓用戶可以在全透明和不透明之間自調。

這個改動小，但很務實——與其等用戶投訴兩個版本，直接給選項。

其他 iOS 27 更新：自訂 AirPods EQ（每個設備個別設定）、更細粒度的家長控制（per-App、per-Website）。

相容設備：iPhone 11 起。

### Apple Intelligence：寫實圖片 + Photos 強化

Image Playground 現在可以生成**寫實風格**圖片（不只是之前的插圖/動畫風格）。

Photos App 新工具：
- **Extend**：把照片邊緣延伸（類似 Adobe Generative Fill）
- **Reframe**：調整構圖，重新裁切並填補空白
- **Enhance**：已存在功能的升級
- **Clean Up**：更好的物件移除偵測

Home App：自然語言搜尋監視器錄影（「昨天早上 10 點到 11 點在車道的人」），4K iCloud 影片儲存。

## 怎麼看這屆 WWDC

標題「Yeah, That's About Right」說的是一種溫吞的滿意。沒有什麼驚喜，但每件宣布的事都是真的有在做。

Siri 重建是真實需要的——過去幾年 Siri 落後 Google Assistant 和 OpenAI 的幅度很明顯。用 Gemini 填補是務實選擇，但名單制+歐盟不支援，表示「真正重建完成」的時間點還在後面。

macOS Intel 終結是早已預告的事，此時只是正式確認。

對開發者影響最大的缺席：跨設備開發的統一 API、Siri 的開放整合介面、Vision Pro 的更新。這些大概是 WWDC 2027 的劇本。

## 跟去年的差別

| 項目 | iOS 26 (WWDC 2025) | iOS 27 (WWDC 2026) |
|------|---------------------|---------------------|
| 設計語言 | Liquid Glass 推出 | Liquid Glass 透明度調整 |
| Siri | 基礎 Apple Intelligence | 重建為完整個人情境引擎 |
| macOS Intel | 繼續支援 | 最後一版 |
| 圖片生成 | 插圖/動畫風格 | 加入寫實風格 |

## 參考資料

- [WWDC 2026 Impressions: Yeah, That's About Right](https://www.youtube.com/watch?v=_gCXmKjDecU)
- [Apple WWDC 2026 — developer.apple.com](https://developer.apple.com/wwdc26/)
- [iOS 27 preview — Apple](https://www.apple.com/ios/ios-27-preview/)
- [macOS Golden Gate preview — Apple](https://www.apple.com/macos/macos-26-preview/)
