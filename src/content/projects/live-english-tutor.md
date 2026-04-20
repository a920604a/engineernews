---
title: "Live English Tutor"
description:
  background: "設計並實作以即時語音為核心的 AI 英文家教平台，整合前端 WebRTC（LiveKit）、AI Agent、語音模型與後端服務。"
  challenge: "需在低延遲的即時通訊環境下整合 WebRTC 媒體串流、AI Agent 任務流程與課後報告生成，同時處理驗證與可擴展部署。"
  solution: "建立解耦式前後端與 agent 架構，採用 LiveKit self-hosted 作為即時媒體層，FastAPI 作為後端 API，Agent Worker 負責呼叫大模型與 TTS/報告生成。"
  core_contributions:
    - "以 **FastAPI** 建置後端（token 簽發、sessions 與 agent lifecycle 管理，含 Prometheus/Grafana 監控）。"
    - "實作 **LiveKit agent worker**：串接 Google Gemini（或其他 LLM）做即時語音互動、VAD/STT/TTS 與課後報告生成（Ollama 作為選項）。"
    - "前端採 **React + Vite** 並整合 LiveKit JS，處理麥克風/視訊發布及 UI 控制流程；使用 Firebase 做 Google Sign-In 驗證。"
    - "以 Docker 與 Docker Compose 管理本地開發環境，Postgres 作為資料庫，讓部署與測試可重複執行。"
  outcome: "完成端到端即時互動教學平台，支援即時糾錯、語音互動與課後報告，並具備可重複部署的 Dev/Prod 架構。"
tags: ["live-english", "tutor", "websocket"]
skills: ["react", "vite", "fastapi", "livekit", "webrtc", "firebase", "postgresql", "docker", "ollama", "google-gemini"]
github: "https://github.com/a920604a/live-english-tutor"
tag: "live-english-tutor"
pinned: false
---

Live English Tutor 是一個以即時語音互動為核心的英語教學平台，完成端到端的即時糾錯與課後報告功能。系統目標是讓學生能在自然對話中獲得即時回饋，並在課後收到自動生成的中文學習報告。

背景：系統需在低延遲的即時通訊環境下，整合 WebRTC 媒體串流（LiveKit）、語音辨識、LLM 回應與語音合成。為了同時支援多人課程與穩定性，專案採用了 self-hosted LiveKit 配合 Docker/Compose，並以 Postgres 作為持久化資料存放。

挑戰：主要問題包含即時音訊的延遲控制、Agent 任務協調（VAD → STT → LLM → TTS）與驗證／授權流程的安全性。系統須保證在多人同時上課時能維持流暢的互動體驗，並妥善保存與回放課程紀錄。

解法與貢獻：以 FastAPI 建置後端提供 token 發放、session 管理與內部 agent 介面；以獨立的 LiveKit agent worker 實作即時語音處理與課後報告生成（可串接 Google Gemini / Ollama）；前端採用 React + Vite 與 LiveKit JS 處理媒體發布與 UI 控制；以 Docker 與 Docker Compose 做開發與測試環境，並以 Terraform/Ansible 為生產部署做 IaC 與自動化（若適用）。

成果：系統已具備端到端的即時互動與報告生成功能，實驗環境能穩定支援多人課程與回放，部署流程可重複執行。
