---
title: "OpenAI Codex CLI：在終端機裡跑起來的 AI 程式設計 Agent"
date: "2026-04-29T08:24:09.680Z"
category: "learning"
tags: ["ai", "codex", "openai", "cli", "coding-agent", "terminal"]
lang: "zh-TW"
tldr: "OpenAI Codex CLI 是一個在本機終端機運行的 AI Coding Agent，可以讀取你的程式碼庫、修改檔案、執行測試，像 Claude Code 一樣，但走 OpenAI 的生態系。"
description: "介紹 OpenAI Codex CLI：一個開源的終端機 AI Coding Agent，2025 年 4 月發布，支援多種安全模式與 MCP 工具整合。"
type: "explainer"
original_url: "https://www.youtube.com/watch?v=4gciWspBVHw"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260522_233400_856238.wav"
---

如果你用過 Claude Code，你大概知道「在終端機裡跟 AI 協作寫程式」是什麼感覺：不用離開命令列，AI 直接讀你的程式碼、提出修改、跑測試、幫你 commit。

OpenAI 在 2025 年 4 月發布了同類型的工具：**Codex CLI**。它是一個開源的輕量化 Coding Agent，在你的終端機裡本地運行，可以讀取 repo、編輯檔案、執行指令，並且以對話的方式和你一起推進工作。

## TL;DR

Codex CLI 是 OpenAI 推出的終端機 AI Coding Agent，開源、本地運行、支援多種安全模式。它和 Claude Code 做的是同一件事，但走的是 OpenAI 的生態系（GPT 系列模型、MCP、GitHub 整合）。適合已經在用 OpenAI API 的開發者，或者想比較不同 Agent 工具的人。

## 是什麼

Codex CLI 的官方定位是「一個在你終端機裡運行的 lightweight coding agent」。它的核心能力：

- **讀取程式碼庫**：直接存取你工作目錄裡的檔案，不需要複製貼上
- **編輯檔案**：可以直接修改程式碼，或提出修改建議讓你確認
- **執行指令**：跑測試、執行建置、查看 log
- **對話式工作**：用自然語言描述你想做的事，它負責拆解和執行

架構上，Codex CLI 用 Rust 寫成（速度快、佔用資源少），開源在 GitHub，並且支援透過 Model Context Protocol（MCP）整合第三方工具。

## 安全模式

這是 Codex CLI 設計上很有意思的地方。它提供三個層級的「自主程度」：

**Suggest（建議模式）**：每一個動作都需要你確認。Codex 提出修改，你決定要不要套用。適合新手或對不熟悉的程式碼庫操作時。

**Auto-edit（自動編輯）**：Codex 可以自動修改檔案，但執行任何系統指令還是需要你確認。適合在熟悉的 repo 裡做日常修改。

**Full-auto（全自動）**：Codex 可以自主讀取、修改、執行，不需要每步確認。適合在隔離環境（如 Docker 容器）或已知安全的操作，跑完整的自動化流程。

這個設計讓開發者可以根據情境調整風險邊界，而不是一刀切地全部信任或全部手動確認。

## 怎麼開始用

安裝需要 Node.js 環境：

```bash
npm install -g @openai/codex
```

然後設定 API key：

```bash
export OPENAI_API_KEY="sk-..."
```

在你的專案目錄裡啟動：

```bash
codex
```

啟動後會進入全螢幕的終端機 UI。你可以直接用自然語言描述任務，例如：

```
幫我找出 auth.ts 裡可能的 race condition，並且解釋問題在哪
```

```
把所有 API endpoint 的回應格式統一改成 { data, error, meta } 的結構
```

```
在 CI 失敗的地方加上更清楚的錯誤訊息
```

Codex 會讀取相關檔案、說明它的理解、提出具體的修改方案，並根據你選擇的安全模式決定是否需要確認才執行。

## 跟 Claude Code 的差別

這兩個工具做的事情高度重疊，選哪個主要看你的生態系偏好：

| | Codex CLI | Claude Code |
|---|---|---|
| 底層模型 | GPT 系列（含 GPT-5.4） | Claude 系列 |
| 開源 | 是（MIT License） | 否 |
| 安全模式 | 三層（Suggest / Auto-edit / Full-auto） | 可設定，沙箱選項 |
| MCP 支援 | 是 | 是 |
| 主要語言 | Rust | TypeScript |
| 適合的人 | OpenAI API 用戶、想要開源工具的開發者 | Anthropic API 用戶、已用 claude.ai 的人 |

兩者都支援 MCP，所以在工具整合上的能力趨於接近。核心差異主要是模型品質和你對哪個生態系更熟悉。

## 比較值得關注的功能

**Subagent 並行**：可以啟動多個 Codex subagent 並行處理不同任務，適合大型重構或跨模組的修改。

**Code Review 模式**：可以請一個獨立的 Codex agent 在你 commit 之前先 review 你的修改，相當於多了一個自動化的 reviewer。

**Worktree 支援**：可以讓自動化流程在獨立的 git worktree 上跑，不影響主要的工作目錄。

## 整體來說

Codex CLI 是一個認真做的終端機 Coding Agent，功能上和 Claude Code 同量級。如果你已經在用 OpenAI 的服務，或者傾向使用開源工具，它值得花幾個小時試試看。

不過有一點要注意：這類 agent 工具的能力很大程度上取決於底層模型，而這個領域的差距縮得很快。現在的評估半年後可能就不準了。最好的方法還是自己跑幾個真實工作場景比較看看。

## 參考資料

- [OpenAI Codex CLI 官方頁面](https://openai.com/codex/)
- [GitHub openai/codex](https://github.com/openai/codex)
- [Codex CLI 功能文件](https://developers.openai.com/codex/cli/features)
- [Introducing Codex - OpenAI](https://openai.com/index/introducing-codex/)
- [OpenAI Codex CLI Complete Guide 2026](https://www.shareuhack.com/en/posts/openai-codex-cli-agent-guide-2026)
