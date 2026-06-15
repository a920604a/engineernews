---
title: "長期免費使用 Codex、Hermes 等 AI Coding Agent：完整攻略"
date: 2026-06-04T03:54:50.503Z
category: tech
tags: ["openai-codex", "ai-coding", "agent", "free-tier", "developer-tools", "llm"]
lang: zh-TW
tldr: "OpenAI Codex CLI 和多個 AI coding agent 工具都有免費方案，關鍵是了解各自的額度機制、如何組合使用以延長免費額度，以及什麼情境下值得付費。"
description: "整理 OpenAI Codex CLI、Hermes、Claude Code 等 AI coding agent 的免費方案、額度限制和實際使用策略，讓你在不花錢的情況下把 AI 程式開發效率最大化。"
type: how-to
original_url: "https://www.youtube.com/watch?v=FwAQ75QCEoU"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_201026_365287.mp3"
---

AI coding agent 已經不是實驗性的技術了。OpenAI Codex CLI、Anthropic Claude Code、GitHub Copilot 的 agent 模式，這些工具都在快速演化，而且很多有免費方案或試用額度。問題是：免費的額度夠不夠用？怎麼組合使用才能讓免費額度撐最久？

## TL;DR

大多數 AI coding agent 工具有某種形式的免費方案，但細節差異很大。核心策略是：(1) 理解每個工具的計費單位（請求次數 vs token 數 vs 時間）；(2) 把不同複雜度的任務分派給不同工具；(3) 自架開源模型作為補充。

## 前置條件

- 一個可以收信的 email（用於帳號申請）
- 基本的終端機操作能力
- （選配）一台可以跑 Docker 的機器，用於自架方案

## 主要工具和免費方案

### OpenAI Codex CLI

OpenAI Codex CLI 是一個在終端機裡跑的 AI coding agent，可以讀取你的程式碼庫、執行指令、修改檔案。

免費方案現況（截至 2025 年）：
- OpenAI 的 API 有新用戶試用額度（約 $5 的免費 credit）
- Codex CLI 本身開源免費，但背後的 API 呼叫需要付費
- 可以在 Codex CLI 設定檔中切換到 `o3-mini` 或 `gpt-4o-mini` 等便宜的模型

```bash
# 安裝 Codex CLI
npm install -g @openai/codex

# 設定使用較便宜的模型
codex --model gpt-4o-mini "重構這個函數"
```

### Anthropic Claude Code

Claude Code 是 Anthropic 的 CLI coding agent，在 2025 年初推出。

免費方案：
- 需要付費方案（Pro 或 API 存取）才能使用
- Anthropic API 有新用戶的試用額度
- 有 `claude.ai` 的 web 介面可以免費試用（但不是 agent 模式）

### GitHub Copilot

Copilot 有「Free」方案，每月 2000 次自動完成和 50 次 chat 請求：

```bash
# 在 VS Code 安裝 GitHub Copilot 擴充套件
# 登入 GitHub 帳號，選擇 Free 方案
```

Copilot 的 agent 模式（workspace agent）需要付費方案。

### 開源替代方案

如果你想完全不花錢，有幾個選項：

**Continue.dev + 本機模型**

Continue 是 VS Code/JetBrains 的開源 AI coding 擴充套件，可以連接本機跑的 Ollama 模型：

```bash
# 安裝 Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# 下載並跑一個 coding 模型
ollama pull deepseek-coder-v2

# Continue 會自動偵測 Ollama
```

缺點：本機跑模型需要足夠的 VRAM，品質也比 GPT-4o 差一截。

**Cline（前身 Claude Dev）**

Cline 是 VS Code 的開源 agent 擴充套件，可以連接任何 OpenAI 相容的 API（包括 Ollama 的本機模型）。

## 最大化免費額度的策略

### 1. 按任務複雜度選工具

不是每個任務都需要最強的模型：

| 任務類型 | 推薦工具 | 原因 |
| --- | --- | --- |
| 簡單的程式碼補全 | GitHub Copilot Free | 每月 2000 次足夠日常使用 |
| 中等複雜的重構 | OpenAI gpt-4o-mini | 便宜但夠用 |
| 複雜的架構設計/除錯 | Claude Code 或 GPT-4o | 需要強模型才有效 |
| 批量簡單任務 | 本機 Ollama 模型 | 無額度限制 |

### 2. 減少不必要的 context 傳送

AI coding agent 通常會把你的整個程式碼庫作為 context，但大多數時候你只需要相關的幾個檔案。明確指定要分析的檔案範圍可以大幅減少 token 消耗：

```bash
# 不好：讓 agent 自己判斷要看哪些檔案
codex "修復這個 bug"

# 好：明確告訴它相關檔案
codex --file src/auth.ts --file src/middleware.ts "修復認證中間件的 bug"
```

### 3. 用 Claude.ai 網頁版處理一次性大任務

如果你有一個「幫我設計這個系統的架構」這種一次性大任務，用 claude.ai 的免費網頁版（有對話長度限制）比花 API 費用更划算。

## 完整範例：零成本的 AI 程式開發工作流

```bash
# 日常程式碼補全：GitHub Copilot Free（免費）
# 在 VS Code 裡自動補全

# 快速問題：直接問 claude.ai 網頁版（免費）
# "這個 TypeScript 錯誤是什麼意思？"

# 中等任務：OpenAI gpt-4o-mini（便宜）
codex --model gpt-4o-mini "幫我寫這個函數的單元測試"

# 複雜任務：留到有 credit 時用強模型
# 或者用本機 Ollama 模型（免費但慢）
```

## 常見問題

**Q：免費額度用完了怎麼辦？**

申請新帳號不建議（違反 ToS）。更好的做法是切換到本機模型，或者等下個月額度重置。

**Q：本機跑模型的硬體需求是什麼？**

DeepSeek Coder 7B 需要至少 8GB VRAM，16B 需要 16GB。沒有獨立顯卡的話，CPU 模式也能跑但很慢。

**Q：有推薦的便宜 API 嗎？**

DeepSeek 的 API 比 OpenAI 便宜很多，且 DeepSeek-V3 的程式碼能力接近 GPT-4o。值得考慮。

## 參考資料

- [OpenAI Codex CLI GitHub](https://github.com/openai/codex)
- [Continue.dev 官方文件](https://docs.continue.dev/)
- [Ollama 官方網站](https://ollama.ai/)
- [Cline VS Code 擴充套件](https://github.com/cline/cline)
- [GitHub Copilot 方案比較](https://github.com/features/copilot)
