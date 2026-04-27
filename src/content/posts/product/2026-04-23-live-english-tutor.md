---
title: "Live English Tutor"
date: 2026-04-23T14:56:03+08:00
category: product
type: case-study
tags: ["python", "typescript", "react", "fastapi", "docker", "postgresql", "firebase", "ai", "education"]
lang: zh-TW
description: "以 LiveKit WebRTC + Google Gemini 驅動的即時語音 AI 英文家教平台，支援即時糾錯與課後報告生成。"
tldr: "即時語音 AI 英文家教：WebRTC 麥克風互動 + Gemini 即時糾錯 + 課後中文報告。"
github: "https://github.com/a920604a/live-english-tutor"
pinned: false
draft: false
audio_url: "/api/tts/r2/tts/tts_20260427_023632_025021.wav"
---

Live English Tutor 是一個以即時語音互動為核心的 AI 英文家教平台，學生透過麥克風與 AI 教師 Emma 進行對話練習，系統即時糾錯並於課後生成中文學習報告。

## 背景

學生缺乏低成本、隨時可用的口語練習管道，市面上語言學習工具大多以文字為主，難以在自然對話中提供即時語音回饋與糾錯。這個專案目標是打造一個能模擬真實家教互動的 AI 系統，讓學生在自然對話中練習英文並降低開口焦慮。

## 挑戰

需在低延遲環境中同時處理 WebRTC 媒體傳輸、Gemini Native Audio 推理與 STT/TTS 流程，任一環節延遲都會破壞對話流暢感。此外，Firebase ID token 需跨 FastAPI 與 LiveKit Agent 兩個服務正確驗證，確保 session 安全；Agent 狀態機（WARMUP → PRACTICE → CORRECTION → SUMMARY）需在同一 WebRTC 連線中無縫切換。

## 解法

採用解耦式架構，將媒體層、API 層與 AI Agent 層分離：

- 以 **React 18 + LiveKit JS SDK** 建置前端，支援麥克風、鏡頭與螢幕分享
- 以 **FastAPI + PostgreSQL** 建置後端 API 層，負責 Firebase token 驗證、LiveKit token 簽發與 session 管理
- 以 **LiveKit Agents SDK + Google Gemini 2.5 Flash Native Audio** 實作即時語音對話、四階段狀態機與語法糾錯
- 以 **Docker Compose** 自架 LiveKit Server，支援本地多裝置 WebRTC 連線
- 以 **Ollama** 驅動課後中文報告生成服務，獨立於主對話流程

## 架構圖

```mermaid
graph LR
  FE["前端\n(React 18 + LiveKit SDK)"]
  API["後端 API\n(FastAPI)"]
  Agent["AI Agent Emma\n(LiveKit Agents + Gemini)"]
  LK["LiveKit Server\n(Self-hosted WebRTC)"]
  DB[(PostgreSQL)]
  Ollama["報告生成\n(Ollama)"]
  Firebase["Firebase Auth"]

  FE -->|Google Sign-In| Firebase
  FE -->|REST| API
  API -->|token 簽發| LK
  FE -->|WebRTC Audio/Video| LK
  LK -->|Audio Stream| Agent
  Agent -->|糾錯 / 對話訊息| FE
  Agent -->|內部回調 API| API
  API --- DB
  API -->|Transcript + 糾錯| Ollama
```

## 流程圖

```mermaid
sequenceDiagram
  participant 學生
  participant 前端
  participant 後端API
  participant LiveKit
  participant Emma
  participant Ollama

  學生->>前端: Google Sign-In
  前端->>後端API: 建立課程 / 取得 LiveKit Token
  後端API->>LiveKit: 建立 Room + Dispatch Agent
  LiveKit->>Emma: 啟動 Emma (WARMUP)
  前端->>LiveKit: 加入 Room (WebRTC)
  loop 對話練習 (PRACTICE)
    學生->>Emma: 語音輸入
    Emma->>學生: 回應 + 即時糾錯 (CORRECTION)
  end
  學生->>前端: 結束課程
  前端->>後端API: 通知結束 (SUMMARY)
  後端API->>Ollama: 觸發課後報告生成
  後端API-->>前端: 課後中文報告
```

## 成果

完成端到端即時語音互動教學系統，支援即時糾錯與課後中文報告，可在本地多裝置環境穩定運行。Agent 四階段狀態機完整實作，WebRTC 連線延遲在區網環境下維持流暢對話體驗。
