---
name: project
description: Manage project metadata and skill tags; add or update project entries under src/content/projects/.
---

# project skill

把專案（repository）資訊轉成一致的 project 頁面，並在 frontmatter 補上 concise skills tags（短小 kebab-case），以利索引、搜尋與自動生成詳細說明。

## 目的
- 讓 project 頁面不只是 metadata（title / tags / github / skills），而能輸出可讀的專案介紹段落（背景、挑戰、解法、貢獻、結果），便於呈現於網站或生成文章。

## description schema（必用）
description 應為 YAML mapping，包含以下欄位：

- background: 專案背景與目標（1-2 句）。
- challenge: 主要技術或產品挑戰（1-2 句）。
- solution: 概要解法或設計策略（1 句 + 選列重點）。
- core_contributions: 列表（array）— 3–6 項核心貢獻或實作細項，建議以「以 **X** 建置 Y」格式，並包含技術或工具名。
- outcome: 專案成果或量化指標（1 句）。

範例：

description:
  background: "設計並實作以即時語音為核心的 AI 英文家教平台，整合前端 WebRTC（LiveKit）、AI Agent 與語音模型。"
  challenge: "需在低延遲環境中同時支援即時互動、語音辨識/合成與課後報告生成。"
  solution: "採用解耦式前後端與 agent 架構，LiveKit self-hosted 作為媒體層，FastAPI 作為 API 層，Agent Worker 處理 LLM 與 TTS。"
  core_contributions:
    - "以 **FastAPI** 建置後端（token 簽發、session 管理、監控）。"
    - "以 **LiveKit agent** 串接 Google Gemini 與 TTS/Whisper 流程，實作即時糾錯與課後報告。"
    - "以 Docker 與 Terraform 規劃部署流程，確保可重複環境建置。"
  outcome: "完成端到端即時互動教學平台，支援即時糾錯與報告生成。"

## 自動生成 page body（模板）
使用 description 欄位時，可依下列模板自動生成 project 內文：

1. 首段（簡短 summary）：結合 background 與 outcome，1–2 句。
2. 背景段落：展開 background，說明使用情境與目標（2–4 句）。
3. 挑戰段落：將 challenge 轉為能理解的技術/產品問題（2–3 句）。
4. 解法段落：總覽 solution，再用 core_contributions 的每項做 1–2 句說明，將核心貢獻展開成行動項目。
5. 結果段落：引用 outcome 並補上任何量化或可觀察的成果（1–2 句）。

示範輸出（簡短範例）：

"Live English Tutor 是一個以即時語音互動為核心的英語教學平台，完成端到端的即時糾錯與課後報告功能。系統的目標是讓學生能在自然對話中獲得即時回饋，並於課後收到自動生成的學習報告。面對低延遲與資料同步的挑戰，採用了 LiveKit self-hosted 處理 WebRTC 媒體，FastAPI 提供 API 層，agent worker 處理 LLM 與 TTS。核心貢獻包括：以 FastAPI 建置後端 token 與 session 管理；以 LiveKit agent 串接 Gemini 與 TTS 做即時互動；以 Docker/Terraform 規劃部署流程。最終系統可重複部署，並穩定支援多人同時課程。"

## category 欄位

每個 project 從以下 5 個 category 擇一：

| Category | 適用 |
|----------|------|
| `tech` | 技術工具、基礎設施、工程平台 |
| `product` | 面向用戶的產品、服務、應用 |
| `learning` | 研究工具、教育平台、知識系統 |
| `creative` | 創意媒體、設計工具、藝術類 |
| `life` | 個人工具、日常輔助類 |

## skills 標準化
- skills 建議 6–12 個短標籤（小寫、kebab-case），覆蓋 Languages / Frameworks / Infra / ML / DevOps。
- 可附加主題 tag（如 `ai`、`design`、`education`）與技術標籤混用。
- 若需要更詳盡分類，可在 frontmatter 新增 `tech_stack` mapping（languages/frameworks/infra/ml/devops），但 site 主要使用 `skills` 做搜尋索引。

## 執行步驟（自動化建議）
1. 抓 README, docs 與 repo 結構，生成 description 草稿（background/challenge/solution/core_contributions/outcome）。
2. 由人審核並修正 core_contributions 列項（確保每項具體且含技術名）。
3. 產生 page body（使用上方模板），將 body 寫入專案檔案主體（frontmatter 下方）。
4. 更新 .claude/skills/project/index.md（或使用腳本同步）。

## 範例流程指令
- 同步 index： node scripts/sync-project-skills.cjs
- 若要覆寫所有 project body（自動生成），可撰寫腳本讀取 frontmatter description 並套模板輸出。

## 參考
- .claude/skills/post/SKILL.md（流程樣式）
- self-reusme-website（格式參考）
