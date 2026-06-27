---
title: "RTK：讓 AI Coding 助手少吃 80% token 的 Rust 工具"
date: 2026-05-11T09:00:00.000Z
category: tech
tags: ["ai", "llm", "cli"]
lang: zh-TW
description: "RTK (Rust Token Killer) 攔截 shell 命令輸出，在進入 AI context 前壓縮 60-90%，支援 100+ 命令與 12 個 AI coding 工具，overhead < 10ms。"
tldr: "裝一個 Rust binary，git/npm/docker 等命令的輸出自動壓縮後再送進 AI context，30 分鐘 session 從 118,000 token 壓到 23,900。"
draft: true
---

用 Claude Code 寫程式，一次 `git diff` 就可能吃掉幾千 token。問題不在 AI 笨，而在輸出本身充滿對 AI 沒意義的內容——顏色 escape code、空白行、重複的 header、冗長的 stack trace。

[RTK (Rust Token Killer)](https://github.com/rtk-ai/rtk) 在命令輸出進入 AI context 之前攔截並壓縮，不改變你的工作流程，只是讓 AI 看到更乾淨的版本。

## 安裝

```bash
# Homebrew（推薦）
brew install rtk

# Linux / macOS
curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh

# cargo
cargo install --git https://github.com/rtk-ai/rtk
```

裝好後跑一次初始化，對應你用的 AI 工具：

```bash
rtk init -g                    # Claude Code
rtk init -g --copilot          # GitHub Copilot
rtk init -g --agent cursor     # Cursor
rtk init -g --gemini           # Gemini CLI
rtk init -g --codex            # Codex
rtk init --agent windsurf      # Windsurf
rtk init --agent cline         # Cline / Roo Code
rtk init -g --opencode         # OpenCode
rtk init --agent kilocode      # Kilo Code
rtk init --agent antigravity   # Google Antigravity
```

初始化後，你繼續打 `git status`，hook 自動接管並走 RTK，切換完全透明。

## 壓縮效果

| 操作 | 原始 | 壓縮後 | 節省 |
|------|------|--------|------|
| `ls` / `tree` | 2,000 tokens | 400 | -80% |
| `cat`（讀檔） | 40,000 tokens | 12,000 | -70% |
| `grep` / `rg` | 16,000 tokens | 3,200 | -80% |
| `git status` | ~2,000 tokens | ~200 | -90% |
| `git push` | 200 tokens | 10 | -95% |
| 測試輸出（失敗） | 200+ 行 | ~20 行 | -90% |
| **30 分鐘 session 合計** | **~118,000** | **~23,900** | **-80%** |

四個壓縮策略同時運作：smart filtering（去雜訊與 escape code）、grouping（同類合併，例如檔案按目錄群組）、truncation（保留關鍵內容，截掉冗餘）、deduplication（重複 log 行折疊成「N 次」）。

## 支援命令（100+）

**Git / GitHub CLI**：`git status`、`git log`、`git diff`、`git push/pull`、`gh pr list/view`、`gh issue list`、`gh run list`

**測試框架**：Jest、Vitest、Playwright、pytest、cargo test、Go test、RSpec、rake test

**Lint / Build**：ESLint、Biome、TypeScript、Next.js、Cargo（build + clippy）、Ruff、golangci-lint、RuboCop、Prettier

**Package managers**：pnpm、pip、bundle、Prisma

**雲端 / 容器**：AWS（EC2、Lambda、CloudFormation、DynamoDB、S3、IAM）、Docker（ps、images、logs、compose）、Kubernetes（pods、logs、services）

**其他**：JSON 處理、curl/wget、環境變數、log 分析

## 設定

設定檔在 `~/.config/rtk/config.toml`（macOS 為 `~/Library/Application Support/rtk/config.toml`）：

```toml
[hooks]
exclude_commands = ["curl", "playwright"]

[tee]
enabled = true
mode = "failures"  # "failures" | "always" | "never"
```

## 注意事項

**Windows**：native 環境使用 fallback 模式（CLAUDE.md injection），沒有 auto-rewrite hook，建議用 WSL 取得完整功能。

**Claude Code 內建工具**：Read、Grep、Glob 這些內建工具不走 hook，只有 Bash 工具呼叫的 shell 命令才會被 RTK 攔截。

**Telemetry**：預設關閉，需要明確 opt-in。就算開啟，也不收集原始碼、路徑、命令參數或環境變數。

## 適合誰

只要你在用任何 AI coding 助手，shell 命令輸出就在吃你的 token 預算。RTK 不管你連的是哪個 AI provider，只做一件事：讓輸出變小。

如果你同時也想管理多個 AI provider 的切換與成本，可以搭配 [9Router](https://github.com/decolua/9router)——它在請求路由層解決另一個問題。

## 參考資料

- [RTK GitHub](https://github.com/rtk-ai/rtk)
- [RTK 官方文件](https://rtk-ai.app/guide)
