---
title: "為了幫助社交焦慮的粉絲，我做了一個 AI 視訊通話產品"
date: 2026-05-12T11:24:47.018Z
category: tech
tags: ["indie-developer", "ai", "video-call", "webrtc", "product-development"]
lang: zh-TW
tldr: "一位 YouTuber/indie developer 注意到粉絲因社交焦慮難以開口，於是自己做了一個 AI 驅動的視訊通話練習平台，這篇文章拆解這類產品的技術架構和從零到一的取捨。"
description: "Indie developer 案例研究：用 AI 視訊通話幫助社交焦慮用戶，涵蓋 WebRTC、AI 即時語音、Tavus 等技術選型，以及產品從想法到 MVP 的工程決策。"
type: case-study
original_url: "https://www.youtube.com/watch?v=M1bifAQSVcY"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260522_235114_814470.wav"
---

有些產品來自市場調查，有些來自自身痛點，這個案例來自一封粉絲信。一位有相當粉絲數的技術 YouTuber 收到粉絲留言：「我很想在 YouTube 問你問題，但我有社交焦慮，連打字都緊張，更不用說真人通話了。」他決定做點什麼——不是寫一篇建議文，而是直接建立一個產品。

這篇文章記錄這類「AI 輔助視訊通話」產品的技術架構思路，以及 indie developer 在資源有限下的工程決策。

## TL;DR

- 目標用戶：有社交焦慮、想練習真實對話但害怕真人互動的人
- 核心功能：AI 扮演對話夥伴，提供即時語音回應，用視訊通話介面模擬真實對話場景
- 技術堆疊：WebRTC 視訊串流 + 即時 ASR（語音識別）+ LLM + TTS（語音合成）+ AI 虛擬形象（Tavus 或 HeyGen 類服務）
- 最大挑戰：端到端延遲必須低於 800ms 才能讓對話感覺自然

## 背景與挑戰

社交焦慮（Social Anxiety Disorder）影響全球約 7% 的成人，核心症狀是對被評判的過度恐懼。這讓許多人在需要當面溝通或視訊通話時感到極大壓力。

傳統「解法」是認知行為治療（CBT），核心方法之一是「曝露療法」——逐漸讓患者暴露在引起焦慮的社交情境中。理論是對的，但有幾個現實問題：
- 預約治療師昂貴且等待期長
- 練習場合有限（不可能每天找真人練習）
- 失敗成本高（和真人練習失敗，焦慮可能加重）

AI 視訊通話的假設：提供一個「低風險的練習場」——對話對象是 AI，說錯了可以重來，沒有人在評判你。

## 解法設計

### 核心 UX 假設

成功的 AI 社交焦慮練習工具需要滿足：
1. **視覺上夠真實**：看起來是真人在說話，而不是文字框或聲音
2. **延遲夠低**：超過 1 秒的回應延遲會打斷對話的節奏感
3. **對話夠自然**：AI 要能理解上下文，不要每次都忘記前面說的話
4. **有安全感**：清楚告知用戶這是 AI，不讓人覺得被欺騙

### 技術架構選擇

#### 視訊串流：WebRTC

瀏覽器原生支援 WebRTC，不需要安裝 app。P2P 連線延遲低，在同一地區的最佳情況下可達 50ms 以下。

對 indie developer 來說，自己架 WebRTC 信令伺服器（signaling server）+  TURN 伺服器成本不低，更實際的選擇是用託管服務：
- **Daily.co**：$0.004/participant-minute，有 SDK，最快上線
- **Livekit**：開源，可自架，免費額度較高
- **Agora**：大廠方案，穩定但定價較複雜

#### AI 虛擬形象：讓 AI「有臉」

讓 AI 有視覺形象的方案分幾層：

**方案 A（最簡單）**：靜態頭像 + 音訊。AI 是一個不會動嘴的圖片，只有聲音。實作最簡單，但用戶體驗差。

**方案 B（中等）**：2D 虛擬形象 + 口型同步。用 Ready Player Me 或 TalkingHead.js 等工具把語音波形對應到口型動畫。成本低，但看起來像虛擬 YouTuber 而非真人。

**方案 C（最真實）**：AI 生成即時視訊流。Tavus 和 HeyGen 提供這類 API——上傳一個真人影片作為基底，API 即時生成說話的視訊流，說話內容跟隨你輸入的文字或語音。延遲在 300-800ms 左右，效果最接近真人。Tavus 的 Conversational Video Interface（CVI）就是為這個場景設計的。

對 indie developer 的建議：先用方案 A/B 驗證用戶是否買單，有足夠用戶後再升級到方案 C。

#### 即時語音識別（ASR）

用戶說話 → 轉成文字 → 送給 LLM。速度和準確率都很關鍵。

- **Whisper（OpenAI）**：準確率高，但即時串流延遲在 500ms+ 以上
- **Deepgram**：專為即時串流優化，延遲低（200ms 以下），API 定價 $0.0059/minute
- **AssemblyAI**：中間選項，有語者分離（speaker diarization）功能

indie developer 首選 Deepgram 或 AssemblyAI 的 real-time API。

#### LLM 回應生成

ASR 拿到文字後，送給 LLM 生成回應。延遲敏感，所以要選速度快的模型：
- **GPT-4.1（OpenAI）**：首字 token 速度快，適合串流輸出
- **Claude Haiku 3.5**：延遲低，成本低，足夠聰明處理對話
- **Gemini Flash**：Google 的低延遲選項

LLM 這層也需要精心設計 system prompt，讓 AI 模擬特定的對話場景（如：面試練習、問路練習、打電話練習），並在回應中控制語速和語調。

#### 文字轉語音（TTS）

LLM 輸出文字 → 轉成語音 → 播給用戶聽。

- **ElevenLabs**：音質最好，支援即時串流，多種聲音克隆
- **OpenAI TTS**：$15/million characters，音質不錯，API 簡單
- **Play.ai**：專為對話設計，支援情緒語調調整

## 實作細節

### 端到端延遲預算

```
用戶說話完畢（VAD 偵測靜音）
    → ASR 識別：~200ms（Deepgram）
    → LLM 首字 token：~300ms（Claude Haiku）
    → TTS 首段語音：~200ms（ElevenLabs 串流）
    ─────────────────────────────────────
    總計：~700ms
```

700ms 接近可接受的邊界。當任何一個環節出現延遲（網路波動、LLM 負載），就會超過 1 秒的「自然感」臨界值。這是這類產品最難的工程問題。

### VAD（Voice Activity Detection）

必須準確偵測「用戶說完了」才能送給 ASR 處理。太早觸發（用戶還在說），AI 就打斷了；太晚觸發，延遲又上去了。WebRTC 內建 VAD，也可以用 Silero VAD（開源，準確率高）。

### 對話記憶管理

多輪對話需要記憶上下文，但 LLM API 是無狀態的，需要自己管理 conversation history。策略：
- 前 N 輪完整保留
- 較早的對話用摘要替代（壓縮 token 用量）
- 重要事項存進向量資料庫（如 Pinecone、Supabase pgvector）

## 成果

這類產品在 2025 年的市場驗證結果顯示，AI 陪伴應用全球下載量超過 2.2 億次，AI 陪伴 App 數量兩年內成長 700%。Born（虛擬寵物 Pengu 的公司）在 2025 年獲得 1,500 萬美元的 A 輪融資，專做社交性 AI 陪伴。

對 indie developer 來說，這個市場有足夠的用戶需求，但競爭也在快速增加。差異化的關鍵在於特定場景的深度（如：只專注面試練習、或只專注電話焦慮），而非試圖做通用的 AI 聊天產品。

## 學到的事

1. **延遲是第一工程問題**：對話感受是主觀的，但超過 800ms 的回應延遲幾乎所有用戶都感受得到
2. **視覺真實感 > 功能豐富**：用戶在意「這看起來像真實對話嗎」，不在意功能列表有多長
3. **先用便宜方案驗證**：ElevenLabs + Deepgram + Claude 的 MVP 成本低，能快速驗證用戶是否真的使用
4. **系統 prompt 是產品核心競爭力**：讓 AI 在對話中表現自然的 prompt 工程，比任何基礎設施優化都重要

## 參考資料

- [Tavus：Conversational Video Interface](https://www.tavus.io/)
- [Deepgram 即時 ASR API](https://deepgram.com/)
- [Livekit：開源 WebRTC 框架](https://livekit.io/)
- [ElevenLabs TTS API](https://elevenlabs.io/)
- [TechCrunch：Born AI 社交陪伴融資](https://techcrunch.com/2025/09/10/born-maker-of-virtual-pet-pengu-raises-15m-to-launch-a-new-wave-of-social-ai-companions/)
- [原始影片](https://www.youtube.com/watch?v=M1bifAQSVcY)
