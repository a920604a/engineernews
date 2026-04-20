---
title: "STT-TTS Unified"
description:
  background: "整合語音辨識（STT）與語音合成（TTS）的工具集合與範例，包含前後端 demo 與處理流程。"
  challenge: "必須支援多模型（如 Whisper、不同 TTS 引擎）與資料上傳/處理流程，同時盡量降低延遲並保護上傳音訊隱私。"
  solution: "以 FastAPI 提供 STT / TTS / history API，React + Vite 作為示例前端，採用 Docker Compose 串接服務與 SQLite 做簡易儲存。"
  core_contributions:
    - "設計 FastAPI 路由與服務層（tts / stt / history），封裝模型呼叫與檔案處理邏輯。"
    - "建立 React + Vite 範例前端，展示上傳音訊、即時辨識與播放 TTS 結果。"
    - "以 Dockerfile 與 docker-compose 組合開發環境，簡化啟動流程並方便 CI/CD 測試。"
  outcome: "提供一套可復用的 STT/TTS 範例與工具，方便在其他專案整合多種語音模型與優化延遲。"
date: 2026-03-28
tags: ["speech", "stt", "tts"]
skills: ["fastapi", "react", "vite", "whisper", "tts", "docker", "docker-compose", "sqlite"]
github: "https://github.com/a920604a/stt-tts-unified"
tag: "stt-tts-unified"
pinned: false
---

STT-TTS Unified 提供一套實作範例，展示如何把語音辨識（STT）與語音合成（TTS）整合到前後端流程中，包含模型呼叫、檔案上傳、歷史記錄與播放功能。

背景：專案包含 FastAPI 後端、React + Vite 前端，以及示範用的 SQLite/資料夾儲存結構，方便開發者快速跑起 STT/TTS 流程並測試多個模型。

挑戰：需要支援多種 STT（如 Whisper）與 TTS 引擎，處理音訊上傳、長檔分段與延遲優化，並確保使用者資料（音訊）不會外洩。

解法與貢獻：設計 FastAPI 的路由與服務層（tts/stt/history）來封裝模型呼叫與檔案管理；提供 React 範例 UI 展示上傳、辨識結果與播放；使用 Dockerfile 與 docker-compose 簡化整體啟動流程，方便 CI 與本地測試。

成果：提供一套可重複使用的 STT/TTS 範例，支援在其他專案中快速整合語音模型，並為性能優化提供測試場域。
