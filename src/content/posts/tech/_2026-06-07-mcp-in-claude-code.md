---
title: "MCP 在 Claude Code 的應用"
date: 2026-06-07T19:42:59.311Z
category: tech
tags: ["MCP", "Claude Code", "系統設計", "架構"]
lang: zh-TW
tldr: "了解 MCP 在 Claude Code 中的實踐"
description: "了解 MCP 在 Claude Code 中的實踐"

type: deep-dive
original_url: "https://www.youtube.com/shorts/VMF4InsZm9I"
draft: true
---

# MCP 在 Claude Code 中的應用

## TL;DR
本文將深入探討 MCP（Microsoft Control Protocol）在 Claude Code 中的應用，包括其設計哲學、核心概念、與常見替代方案的比較，以及適合和不適合的使用情境。

## 設計哲學
MCP 是一種用於控制 Microsoft 應用程式的通訊協定，Claude Code 是一個基於 MCP 的程式庫，旨在提供一套簡單、易用的 API 來控制 Microsoft 應用程式。MCP 的設計哲學是基於標準化和模組化的原則，旨在提供一套統一的控制接口，讓開發者可以輕鬆地控制不同版本的 Microsoft 應用程式。

## 核心概念
MCP 的核心概念是基於一套標準化的控制命令和事件模型。控制命令是用於控制 Microsoft 應用程式的動作，例如打開、關閉、最大化等。事件模型則是用於處理 Microsoft 應用程式的事件，例如點擊、鍵盤輸入等。Claude Code 將這些核心概念封裝成簡單易用的 API，讓開發者可以輕鬆地控制 Microsoft 應用程式。

```mermaid
graph LR
    A[MCP] -->|控制命令|> B[Microsoft 應用程式]
    B -->|事件|> A
    A -->|API|> C[Claude Code]
    C -->|API|> D[開發者]
```

## 跟常見替代方案比較
| 方案 | 優點 | 缺點 |
| --- | --- | --- |
| MCP | 標準化、模組化、易用 | 有限的控制功能 |
| COM | 豐富的控制功能 | 複雜、難用 |
| WMI | 強大的控制功能 | 有限的平台支援 |

## 適合 / 不適合的情境
MCP 和 Claude Code 適合用於需要控制 Microsoft 應用程式的簡單動作的場景，例如自動化測試、資料抓取等。不適合用於需要複雜控制或跨平台支援的場景。

## 整體來說
MCP 和 Claude Code 是一套簡單易用的控制 Microsoft 應用程式的方案，適合用於簡單的控制動作。但是，如果需要複雜控制或跨平台支援，則需要考慮其他方案。

## 參考資料
* [MCP 官方文件](https://docs.microsoft.com/en-us/previous-versions/windows/desktop/mcp/mcp-start-page)
* [Claude Code 官方文件](https://claudecode.github.io/)
- [MCP in Claude Code](https://www.youtube.com/shorts/VMF4InsZm9I)