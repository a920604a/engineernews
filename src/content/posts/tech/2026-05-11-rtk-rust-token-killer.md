---
title: "RTK：讓 AI Coding 助手少吃 60–90% token 的 Rust 工具"
date: 2026-05-11T09:00:00.000Z
category: tech
tags: ["ai", "llm", "cli"]
lang: zh-TW
github: https://github.com/rtk-ai/rtk
draft: false
description: "RTK (Rust Token Killer) 在 shell 命令輸出進入 AI context 前先過濾壓縮，常見開發指令省 60–90% token，單一 Rust binary、零依賴、支援 100+ 指令、overhead < 10ms。"
tldr: "裝一個 Rust binary，git/grep/test/docker 等指令的輸出自動壓縮後再送進 AI context，一段 30 分鐘的 Claude Code session 從約 118,000 token 壓到約 23,900。"
key_points:
  - "問題不在 AI，而在指令輸出本身塞滿對 AI 沒意義的東西：顏色 escape code、空行、重複 header、冗長 stack trace。"
  - "RTK 在輸出進入 context 前攔截壓縮，常見指令省 60–90% token，overhead < 10ms，單一 Rust binary、零依賴。"
  - "跟 9Router 互補：RTK 壓的是『指令輸出』、9Router 管的是『provider 路由與成本』，是兩個不同維度。"
audio_url: "/api/tts/r2/tts/tts_20260627_150729_457552.mp3"
---

用 Claude Code 寫程式，一次 `git diff` 就可能吃掉幾千 token。問題不在 AI 笨，而在輸出本身充滿對 AI 沒意義的內容——顏色 escape code、空白行、重複的 header、冗長的 stack trace。這些 token 你照樣付費、context window 照樣被佔，但對模型理解程式碼毫無幫助。

[RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk) 的切入點：在命令輸出**進入 AI context 之前**先攔截、過濾、壓縮，再把乾淨版本交給 LLM。它是單一 Rust binary、零依賴、支援 100+ 指令、overhead 低於 10ms。專案在 GitHub 上有 6.6 萬顆星、更新活躍，採 Apache 2.0 授權。

## 設計哲學：壓「噪音」，不壓「訊息」

RTK 不是無腦截斷輸出，而是針對每種指令的輸出格式做語意壓縮：去掉 ANSI 顏色碼、摺疊重複區塊、移除無意義空白、保留真正有資訊量的部分。對 AI 來說，`git status` 重要的是「哪些檔案改了」，不是那一堆排版與提示文字。

官方給的 30 分鐘 Claude Code session 估算（中型 TypeScript / Rust 專案）：

| 指令 | 次數 | 原始 token | RTK 後 | 節省 |
|---|---|---|---|---|
| `ls` / `tree` | 10× | 2,000 | 400 | −80% |
| `cat` / `read` | 20× | 40,000 | 12,000 | −70% |
| `grep` / `rg` | 8× | 16,000 | 3,200 | −80% |
| `git status` | 10× | 3,000 | 600 | −80% |
| `git diff` | 5× | 10,000 | 2,500 | −75% |
| `git add/commit/push` | 8× | 1,600 | 120 | −92% |
| `cargo test` / `npm test` | 5× | 25,000 | 2,500 | −90% |
| `pytest` / `go test` | 7× | 14,000 | 1,400 | −90% |
| **合計** | | **~118,000** | **~23,900** | **−80%** |

> 這是中型專案的估算值，實際節省依專案大小而異。整體落在 60–90% 區間。

## 安裝與接入

```bash
# Homebrew（推薦）
brew install rtk

# 或一行安裝（Linux / macOS）
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh

# 或從原始碼
cargo install --git https://github.com/rtk-ai/rtk
```

接到 AI coding 工具（會幫對應工具寫好設定）：

```bash
rtk init -g --copilot     # GitHub Copilot
rtk init -g --claude      # Claude Code
# 其他工具同理
```

之後工具呼叫 shell 指令時，輸出會先經過 RTK 壓縮再進 context，你的工作流程完全不變，只是 AI 看到的是更乾淨的版本。

## 跟向量壓縮 / provider 路由的差別

RTK 解的是「**指令輸出層**」的 token 浪費，跟兩件事容易混淆：

- 它**不是** model 端的回應壓縮，也不改 prompt；它只動「工具輸出 → context」這一段。
- 它跟 [9Router](https://github.com/decolua/9router) 是互補而非競爭：9Router 在**請求路由層**解決「多 provider 切換與成本」，RTK 在**輸出層**解決「context 被噪音撐爆」。兩個一起用沒有衝突。

> 命名提醒：9Router 內建一個同樣叫 RTK 的壓縮 middleware，但那是 9Router 自己的東西，跟這個獨立的 Rust 工具只是縮寫撞名。

## 適合誰

任何用 CLI-based AI coding 工具（Claude Code、Copilot、Codex、Cursor…）、又常讓 AI 跑 `git`、測試、`grep`、`docker` 等指令的人。專案越大、AI 跑指令越頻繁，省下的 token 越可觀。代價幾乎為零：一個 binary、<10ms overhead、工作流程不變。

## 參考資料

- [RTK GitHub](https://github.com/rtk-ai/rtk)
- [RTK 官方文件](https://www.rtk-ai.app/guide)
