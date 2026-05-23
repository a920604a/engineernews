---
title: "我對 2025 年新款 Apple M4 產品線的看法"
date: 2026-05-08T02:49:47.988Z
category: tech
tags: ["Apple", "M4", "MacBook Air", "Mac Studio", "Apple Intelligence"]
lang: zh-TW
tldr: "M4 MacBook Air 和 Mac Studio 是紮實的規格升級，但 Apple Intelligence 的 Siri 整合仍然讓人失望——硬體領先，軟體還在追。"
description: "從工程師角度評析 2025 年 Apple M4 產品線：MacBook Air M4、Mac Studio M4 Max，以及 Apple Intelligence 的實際表現。"
type: explainer
original_url: "https://www.youtube.com/watch?v=i9TvUGeTltE"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260522_234639_630710.wav"
---

Apple 2025 年上半年的硬體陣容基本上就是一句話：M4 晶片全面普及，Apple Intelligence 正式從 Pro 機型下放到入門級產品。MacBook Air M4 和 Mac Studio M4 Max 是這波更新的核心，規格上都有明確的進步，但 Apple Intelligence 的軟體整合卻讓工程師社群有點失望。這篇文章從技術角度拆解這次更新真正重要的地方。

## TL;DR

- MacBook Air M4：從 8GB 基本款升到 16GB、M4 晶片 10 核 CPU、12MP 鏡頭、售價降至 $999，性價比明顯提升
- Mac Studio M4 Max：比 M1 Max 版本快 3.5 倍，M3 Ultra 版本可在記憶體內跑超過 6,000 億參數的 LLM
- Apple Intelligence：Siri 整合改善但仍不穩定，第三方 API 開放有限，開發者還在等

## 是什麼

### MacBook Air M4（2025 年 3 月）

這是第一款搭載 M4 晶片的 MacBook Air，也是第一款把 16GB 記憶體設為標配的入門級 MacBook。M4 採用 10 核 CPU（4 個效能核心 + 6 個效率核心），比 M3 的 8 核增加 25%；GPU 10 核，Neural Engine 16 核。

關鍵規格變化：
- 基本款記憶體：8GB → 16GB（同樣售價）
- 螢幕鏡頭：1080p → 12MP，加入 Center Stage 自動追蹤
- 售價：13 吋 $999，15 吋 $1,199（比 M3 時期便宜）
- 外觀：新增天藍色（Sky Blue），其他維持原樣

效能基準測試上，Final Cut Pro 剪接一段 4K 影片從 M3 的 3 分 45 秒降到 2 分 58 秒。對大多數用戶來說，M3 到 M4 的升級感可能不明顯，但 M2 甚至 M1 用戶會感受到顯著差異。

### Mac Studio M4 Max（2025 年 3 月）

Mac Studio 這次有兩個選項：M4 Max 和 M3 Ultra。

M4 Max 配置：
- CPU 16 核（12 效能核 + 4 效率核）
- GPU 40 核
- 最高 128GB 統一記憶體
- 記憶體頻寬 410 GB/s

M3 Ultra 配置：
- CPU 32 核
- GPU 80 核
- 最高 512GB 統一記憶體
- 記憶體頻寬 800 GB/s

Apple 宣稱 M4 Max 版本比 M1 Max 版本快 3.5 倍，M3 Ultra 版本比最強的 Intel 27 吋 iMac 快 6.1 倍。Mac Studio 形體和前代相同，維持那個偏矮的金屬圓柱體，沒有任何外觀變化——如果你不在意樣子，這是工作站等級效能最便宜的入口。

## 為什麼重要

### 記憶體門檻的改變

把 MacBook Air 基本款從 8GB 升到 16GB 這件事比表面看起來更重要。8GB 的 macOS 系統記憶體在 2024 年已經開始顯得捉襟見肘：跑一個本地 LLM（如 Ollama + llama-3.2-3B）就要佔掉大半資源，多開幾個 Chrome 分頁加上一個 Docker 容器就開始把任務交換到 SSD，長期使用 SSD 壽命。16GB 讓入門級 MacBook Air 真正成為可以日常跑本地 AI 工作負載的機器。

### LLM 本地推論的新基準

Mac Studio M3 Ultra 的 512GB 統一記憶體是目前消費性電腦中跑本地大型語言模型最實際的選項。Apple 自己說可以在記憶體內跑超過 6,000 億參數的模型——這個規模已經接近 GPT-4 的估計參數量。對 AI 研究者和想要本地跑大模型的工程師來說，這個規格很有意義。

## Apple Intelligence 的現實

Apple Intelligence 在 iOS 18 / macOS Sequoia 正式推出，M4 MacBook Air 是第一款「出廠就能用 Apple Intelligence」的入門級 Mac。但實際體驗如何？

**做到的部分：**
- 系統層級的 Writing Tools（改寫、摘要、校對）在大多數文字輸入框都能用
- Siri 可以理解上下文接力提問（問完「幾度」可以接著問「需要帶傘嗎」）
- Image Playground 和 Genmoji 產生速度快，質量夠用
- Priority Notifications 確實有用，高重要性通知放前面

**還沒做好的部分：**
Siri 的整合是最大的問題。理論上 Siri 應該要能跨 App 執行複雜指令（「把 Instagram 上最近那張照片傳給媽媽」），但實際成功率大概只有五成。語音辨識對英文外的語言（包括中文）的準確率比 ChatGPT 差得多。

**對開發者的影響：**
Apple 在 2025 年 10 月的開發者更新中開放了第三方 App 使用裝置端基礎模型——但只是透過 Writing Tools、Image Playground 和 Genmoji 等有限介面。底層模型本身不直接暴露給開發者，Apple 的策略是讓 App 把資料交給 Siri，由 Apple 扮演 AI 聚合器的角色。這讓不少開發者不滿，因為無法直接整合自己的 AI pipeline。

## 跟其他選項比較

| | MacBook Air M4 | MacBook Pro M4 Pro | Dell XPS 15（AMD Ryzen AI） |
|--|--|--|--|
| 起始價 | $999 | $1,999 | ~$1,299 |
| 基本記憶體 | 16GB | 24GB | 16GB |
| AI 加速器 | Neural Engine 16 核 | Neural Engine 16 核 | AMD NPU |
| 散熱 | 無風扇 | 主動散熱 | 主動散熱 |
| 持續效能 | 有限制 | 無限制 | 中等 |

MacBook Air M4 的無風扇設計意味著在持續高負載下（長時間跑 LLM inference、編譯大型專案）效能會受到熱節流（thermal throttling）限制。如果你的工作需要長時間滿載，MacBook Pro 或 Mac Studio 才是正確選擇。

## 小結

M4 MacBook Air 在 $999 的價格點實現了「夠用的 AI 開發機」，16GB 記憶體和 10 核 CPU 讓它成為目前同價位最均衡的薄型筆電。Mac Studio M4 Max 則是本地 AI 推論工作站的強力選項。

但 Apple Intelligence 的現況提醒我們，硬體和軟體是兩回事。M4 晶片的 Neural Engine 有足夠算力，但 Siri 整合的不穩定性、開放介面的限制，讓 Apple 的 AI 戰略還在追 Google 和 OpenAI 的腳步。2026 年的 iOS 19 和下一代 Siri 更新會是真正的分水嶺。

## 參考資料

- [Apple 官方：Mac Studio 發表](https://www.apple.com/newsroom/2025/03/apple-unveils-new-mac-studio-the-most-powerful-mac-ever/)
- [XDA Developers：MacBook Air M4 評測](https://www.xda-developers.com/m4-macbook-air-review/)
- [Apple Insider：Mac Studio 2025 評測](https://appleinsider.com/articles/25/04/01/2025-mac-studio-review-one-clear-purchase-choice-for-most-buyers)
- [Fello AI：Apple Intelligence 現況分析](https://felloai.com/the-state-of-apple-intelligence-siri-in-october-2025-apples-ai-vision-vs-reality/)
- [原始影片](https://www.youtube.com/watch?v=i9TvUGeTltE)
