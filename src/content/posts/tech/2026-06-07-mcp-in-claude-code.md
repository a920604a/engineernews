---
title: "MCP 在 Claude Code 的實踐：Model Context Protocol 如何讓 AI 連接你的工具生態"
date: 2026-06-07T19:42:59.311Z
category: tech
tags: ["mcp", "claude-code", "ai", "developer-tools", "integration"]
lang: zh-TW
series:
  name: "Claude Code 自動化指南"
  order: 3
tldr: "MCP（Model Context Protocol）是 Anthropic 設計的開放協定，讓 Claude Code 能夠透過標準化介面呼叫外部工具和資料來源。2024 年 11 月發布後迅速成為 AI 代理人工具整合的事實標準，被 Cursor、Windsurf 等 40+ 款編輯器採用。"
description: "深入了解 MCP Model Context Protocol：Anthropic 如何設計這個讓 AI 連接外部工具的標準、Claude Code 的 MCP 整合實作細節、與 function calling 的差異，以及 Tool Search 如何解決 MCP 的 context 消耗問題。"
type: deep-dive
original_url: "https://www.youtube.com/shorts/VMF4InsZm9I"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_201636_673710.mp3"
---

Claude Code 會使用 GitHub、能查詢 Postgres、能搜尋 Slack 頻道——這些不是 Claude 本身的能力，而是透過 MCP（Model Context Protocol）外掛進來的。

MCP 是 Anthropic 在 2024 年 11 月發布的開放協定，設計目標只有一個：讓 AI 代理人連接任何外部工具，而不需要為每個工具寫客製化的整合程式碼。

## TL;DR

MCP（Model Context Protocol）是一個開放標準，定義了 AI 代理人和外部工具之間的溝通方式。類似 USB 統一了周邊裝置的連接標準，MCP 統一了「AI 呼叫工具」的協定。Claude Code 原生支援 MCP，可以連接 GitHub、Postgres、Slack、Google Drive 等數百個現有的 MCP server，或是用官方 SDK 自己實作一個。截至 2025 年，MCP 已被 Cursor、Windsurf 等 40+ 款 AI 編輯器採用，成為業界事實標準。

## 設計哲學

在 MCP 之前，AI 工具整合的方式是：為每個工具寫一個 function（OpenAI 稱為 function calling，Anthropic 稱為 tool use），定義它的參數格式，然後在 system prompt 裡描述它的用途。

這個方式有個根本問題：**耦合性**。你的 AI agent 程式碼直接知道「有 GitHub 這個工具、有 Postgres 這個工具」，工具的定義和 agent 的邏輯混在一起。每次加新工具，都要改動 agent 的核心程式碼。

MCP 的設計思路是把工具定義**外部化**：工具以獨立的 MCP server 形式存在，有標準化的介面。AI agent 在啟動時發現（discover）有哪些 server 可用，從 server 拿到工具描述，然後用標準協定呼叫。Agent 不需要提前知道有哪些工具——只要符合 MCP 標準，什麼工具都可以即插即用。

## 核心概念

### MCP 的三層架構

```
MCP Host（Claude Code）
    ↕ MCP Protocol
MCP Client（Claude Code 內建）
    ↕ Transport（stdio / SSE / HTTP Streamable）
MCP Server（GitHub, Postgres, Slack, 自訂工具...）
```

**MCP Host**：使用 Claude 的應用程式（Claude Code、Cursor 等）

**MCP Client**：Host 內建的 MCP 協定實作，負責連接和管理多個 server

**MCP Server**：封裝特定能力的獨立程序，可以是本機 process（stdio 傳輸）或遠端服務（HTTP/SSE 傳輸）

### MCP Server 能提供什麼

MCP server 可以暴露三種資源：

- **Tools**：AI 可以呼叫的函式（讀取 GitHub PR、執行 SQL 查詢）
- **Resources**：靜態或動態的資料（目前開啟的檔案、資料庫 schema）
- **Prompts**：預設的提示詞模板

### 傳輸模式

| 模式 | 適用場景 |
|------|---------|
| stdio | 本機工具（最常用，直接 fork subprocess） |
| SSE（Server-Sent Events） | 遠端 server，單向串流 |
| HTTP Streamable | 遠端 server，雙向，2025 年新增 |

## Claude Code 的 MCP 實作

### 設定方式

在 `~/.claude/settings.json` 或專案的 `.claude/settings.json` 中：

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres",
               "postgresql://localhost/mydb"]
    }
  }
}
```

### Tool Search：解決 MCP 的 Context 問題

每個 MCP server 都帶著它的工具定義（schema），如果你同時連接多個 server，這些定義本身就會佔用大量 context window。

Claude Code 引入了 **Tool Search** 機制：session 啟動時只載入工具名稱和 server 描述，詳細的工具 schema 按需延遲載入。這讓 context 消耗降低了約 46.9%。

實際效果是：你可以同時連接 20 個 MCP server，但 context window 使用量只比連接 5 個多一點點。

## 跟常見替代方案的差別

| 方案 | 優點 | 缺點 |
|------|------|------|
| **MCP** | 標準化、跨平台、工具生態豐富 | 需要 MCP server 運行 |
| **Function Calling（直接定義）** | 簡單直接，不需要額外 server | 工具定義耦合進 agent 程式碼，難以跨平台重用 |
| **LangChain Tools** | Python 生態系完整 | 框架鎖定，不跨語言 |
| **REST API 直接呼叫** | 最靈活 | AI 需要理解每個 API 的格式，沒有標準化 |

MCP 的核心優勢是**可重用性**：一個 GitHub MCP server 可以被 Claude Code、Cursor、Windsurf 所有支援 MCP 的工具共用，工具作者只需要維護一個實作。

## 適合 / 不適合的情境

**適合用 MCP 的情境：**
- 你需要讓 AI agent 連接多個外部系統
- 你想讓同一套工具被多個 AI 應用使用
- 你在開發需要跨工具組合的複雜 agent 工作流程

**不適合的情境：**
- 一次性的簡單工具整合（直接用 function calling 更快）
- 工具不需要在 AI 應用之間共用
- 對延遲非常敏感的場景（MCP 的 process 啟動有初始成本）

## 整體來說

MCP 是 AI 代理人工具整合的一個重要基礎設施標準化努力，解決了「每個 AI 工具都要為每個外部服務重新實作整合」的重複性問題。它在 2024-2025 年的快速採用（Cursor、Windsurf、40+ 編輯器）表明業界對這個標準方向的認可。

對工程師而言，最實際的起點是：確認你常用的工具（GitHub、Slack、資料庫）有沒有現成的 MCP server（通常有），先試用幾個，感受一下 AI agent 能如何整合進你的工作流程，再決定是否需要自己實作自訂 server。

## 參考資料

- [Introducing the Model Context Protocol - Anthropic](https://www.anthropic.com/news/model-context-protocol)
- [Connect Claude Code to tools via MCP - Claude Code Docs](https://code.claude.com/docs/en/mcp)
- [MCP Servers - GitHub](https://github.com/modelcontextprotocol/servers)
- [MCP in Claude Code](https://www.youtube.com/shorts/VMF4InsZm9I)
