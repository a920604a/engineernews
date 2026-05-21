---
title: "打造 Cursor 的工程教訓：從 VSCode Fork 到 $500M ARR 的 AI 編輯器"
date: 2026-05-13T11:33:45.374Z
category: tech
tags: ["cursor", "ai-editor", "engineering", "系統設計", "agent"]
lang: zh-TW
tldr: "Cursor 是由四位 MIT 畢業生在 2022 年創建的 AI 程式編輯器，兩年內突破 5 億美元年度營收。這篇文章整理他們在打造 Cursor 過程中公開分享的核心工程教訓：為什麼 Fork VSCode 而不自己造編輯器、Tab 補全的延遲工程、Agent Mode 的生產挑戰。"
description: "Cursor 工程團隊分享的真實挑戰：VSCode Fork 的決策邏輯、Tab 預測的超低延遲設計、Agent Mode 從 pipeline 到真正代理的演化，以及為什麼用戶信任才是最終指標。"
type: deep-dive
original_url: "https://www.youtube.com/watch?v=dUMsFQ8y3gM"
draft: false
---

Cursor 是目前成長最快的 AI 程式編輯器。由 Sualeh Asif、Arvid Lunnemark、Aman Sanger、Michael Truell 四位在 MIT 相識的朋友於 2022 年創建，背後公司是 Anysphere。2024 年推出後兩年，年度營收突破 5 億美元——這在開發者工具史上可能是最快的里程碑。Pragmatic Engineer 等技術媒體對其工程細節做了深度報導，這篇文章整理其中最有工程參考價值的教訓。

## TL;DR

- Cursor 是 VSCode 的 Fork，而不是擴充套件——這個決策讓他們能改變「人怎麼寫程式」的根本體驗
- Tab 補全的核心工程挑戰：在幾十毫秒內完成預測，不能打斷打字節奏
- Agent Mode 的生產教訓：工具呼叫必須訓練進模型，光靠 prompt 不夠可靠
- 路由策略：不是每個步驟都需要大模型，速度也是產品的一部分
- 用戶信任才是最終指標：一次壞的編輯就能讓用戶停止信任

## 設計哲學

### 為什麼 Fork VSCode？

Cursor 的第一個重大決策是 Fork VSCode，而不是做成一個 VS Code 擴充套件。理由很清楚：

**擴充套件的限制**：擴充套件 API 限制你能做的事，無法深度改變編輯器的核心行為——例如重新設計選取機制、在行內插入幽靈文字（ghost text）、改變檔案切換的語義。

**Fork 的成本**：從零開始打造穩定的程式編輯器需要龐大的工程量。VSCode 本身已經解決了幾千個問題：Unicode 處理、syntax highlighting、LSP 整合、跨平台字體渲染……

他們的結論是：**我們的價值不在於打造一個穩定的編輯器，而在於改變開發者寫程式的方式**。Fork 讓他們站在 VSCode 的穩定基礎上，把所有差異化的工程力氣花在 AI 整合。

### 「程式設計的本質改變」

Cursor 的設計哲學不是「幫你自動完成程式碼」，而是重新定義工程師和程式碼的關係：

- 你描述意圖，AI 生成實作細節
- 你做方向和驗證，AI 做實作和迭代
- Context 是工具，不只是對話歷史

## 核心概念

### Tab 預測的延遲工程

Cursor 的 Tab 補全（Cursor Tab）是最辨識度高的功能。工程挑戰在於：

**速度要求**：預測必須在 **幾十毫秒** 內完成，否則幽靈文字出現的時機會打斷打字節奏，造成認知摩擦。

**Context 量與品質的取捨**：送給模型的 Context 越豐富，預測越準確，但讀取和傳送的時間也越長。這是一個持續需要調整的工程參數：

- 送太少 → 預測不相關
- 送太多 → 延遲太高，破壞使用體驗

**自訂模型訓練**：Cursor 為 Tab 補全訓練了專用的小模型，而不是用通用大模型。目標是在準確率和推論速度之間取得最佳平衡。

```mermaid
graph LR
    A[使用者打字] --> B[擷取本地 Context]
    B --> C{延遲預算判斷}
    C -->|時間夠| D[送豐富 Context]
    C -->|時間不夠| E[送精簡 Context]
    D --> F[Tab 專用小模型]
    E --> F
    F --> G[幽靈文字顯示]
    G --> H{使用者接受?}
    H -->|Tab| I[插入程式碼]
    H -->|繼續打| J[預測丟棄]
```

### Agent Mode 的生產挑戰

Cursor 的 Agent Mode（之前叫 Composer）是最複雜的工程部分。幾個關鍵教訓：

**工具呼叫必須訓練進模型**

早期嘗試用 prompt 教模型如何呼叫工具（搜尋、讀檔、執行命令）。結論是：光靠 prompt 在長任務中不夠可靠。搜尋和替換這類操作，一個小錯誤就會破壞整個編輯。

解法是把工具使用的 trajectory 資料（「面對這個狀況，正確的下一步工具呼叫是什麼」）納入模型訓練，讓模型學會在正確的時機呼叫正確的工具。

**Pipeline 的上限**

最初 Cursor 的代理是固定的 pipeline：分析 → 規劃 → 執行 → 驗證。這在簡單任務上表現很好，但在需要動態調整策略的複雜任務上遇到天花板。

教訓：**pipeline 會碰到上限，知道何時碰到比一開始選對架構更重要**。

**速度是產品，不只是效能指標**

不是每個步驟都需要最大的前沿模型。Cursor 的策略是路由（routing）：

- 簡單步驟 → 小模型（低延遲）
- 複雜規劃 → 大模型（高準確率）

「把小步驟路由到快速模型」讓 Cursor 的反應速度成為競爭優勢，而不只是準確率。

## 跟常見替代方案比較

| | Cursor | GitHub Copilot | Cline（VS Code 擴充）|
|-|--------|---------------|---------------------|
| 架構 | VSCode Fork | VS Code 擴充 | VS Code 擴充 |
| Tab 補全 | 自訓模型 | GPT-4 系列 | 依賴外部 API |
| Agent Mode | 內建（自研） | Copilot coding agent | 內建（外部 API）|
| 自訂模型 | 是 | 有限 | 否 |
| 客製化深度 | 最深（可改 UI） | 受 API 限制 | 受 API 限制 |

## 適合 / 不適合的情境

**Cursor 適合：**
- 需要深度 AI 整合的日常開發
- 希望 AI 能執行多步驟任務（agent mode）
- 對延遲敏感、希望 Tab 補全即時反應

**Cursor 不適合：**
- 需要在現有 VS Code 環境中整合（有些擴充在 Fork 上可能行為不同）
- 企業環境有嚴格的程式碼不外洩政策（需要確認 Cursor 的隱私模式）
- 只需要基本自動完成、不需要 agent 功能的輕量使用者

## 整體來說

Cursor 最值得借鑑的工程決策，不是它用了什麼模型或什麼框架，而是一系列**取捨的清晰度**：

1. 把 UX 放在架構決策之前（先 Fork，才能控制延遲）
2. 速度是功能，不是優化（路由策略）
3. 用戶信任是最終指標（一次壞的 agent 編輯就能終結信任）
4. 離線測試有用，但真正的評估是用戶願不願意繼續用

從 0 到 5 億美元年度營收，Cursor 花了兩年。這個速度背後不只是模型好，還有一套對「工程師怎麼寫程式」的深刻理解。

## 參考資料

- [Real-world engineering challenges: building Cursor | Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/cursor)
- [How Cursor Shipped its Coding Agent to Production | ByteByteGo](https://blog.bytebytego.com/p/how-cursor-shipped-its-coding-agent)
- [How Cursor Actually Works: Architecture and Engineering | Data Science Collective](https://medium.com/data-science-collective/how-cursor-actually-works-c0702d5d91a9)
- [The rise of Cursor: $300M ARR AI tool | Lenny's Podcast](https://podcasts.apple.com/us/podcast/the-rise-of-cursor-the-%24300m-arr-ai-tool-that/id1627920305?i=1000705681302)
- [Cursor.so: The AI-first Code Editor — with Aman Sanger | Latent Space](https://www.latent.space/p/cursor)
- [原始影片](https://www.youtube.com/watch?v=dUMsFQ8y3gM)
