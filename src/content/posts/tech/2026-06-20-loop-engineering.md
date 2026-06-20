---
title: "Loop Engineering：設計自動 Prompt Agent 的系統，不只是下 Prompt"
date: 2026-06-20
category: tech
tags: ["loop-engineering", "ai-agent", "claude-code", "harness-engineering", "automation"]
lang: zh-TW
tldr: "Loop Engineering 是把『下 Prompt 的你』換成一個系統：設計自動化的回饋迴圈，讓 Agent 在無人監督下持續、正確地工作"
description: "從 Boris Cherny 的 daily practice、Addy Osmani 的命名、到 Blake Crosley 的核心洞見——Loop Engineering 的五大構建塊、驗證成本瓶頸、以及今天就能開始的三步驟"
---

## TL;DR

Loop Engineering 是「設計自動 prompt agent 的系統」，而不是手動 prompt 的工程實踐。Boris Cherny 現在白天跑數百個 agent、晚上跑數千個——不是因為他更努力下 prompt，而是因為他設計了讓 agent 自驅的迴圈。核心洞見：**驗證成本決定你能自動化什麼，而不是 loop 有多複雜。**

---

## 抽象層的四次跳躍

從 2023 到 2026，AI 開發的核心技能每年跳一個抽象層：

| 年份 | 核心技能 | 開發者角色 |
|------|--------|---------|
| 2023 | Prompt Engineering | 寫出精準的 prompt，讓 AI 給出好回答 |
| 2024 | Agent Orchestration | 編排多個 agent 協作完成複雜任務 |
| 2025 | Harness Engineering | 用設定檔（CLAUDE.md、hooks）配置 agent 的工作環境 |
| 2026 | Loop Engineering | 設計自動運行的回饋迴圈，讓 agent 自主持續工作 |

2026 年 6 月，三則看似獨立的發言在一週內交疊，引爆了開發者社群的一場認知震盪。

---

## 三個人，同一週

**Boris Cherny**（Claude Code 負責人）在 Acquired Unplugged 訪談中描述了他的工作方式演進：從用 IDE 寫程式碼 → 提示 Claude 寫程式碼 → 同時跑 5-10 個 session → 2024 年 11 月卸載 IDE → 現在白天跑數百個 agent、晚上跑數千個。他明確說：他不再手動提示 Claude，而是讓迴圈自動運行。

**Peter Steinberger**（OpenClaw 創辦人）發推：停止直接 prompt agent，改為設計 prompt agent 的迴圈系統。

**Addy Osmani**（Google Chrome 工程負責人）隨即發文正式命名這個模式，並給了一個清晰的定義：

> "Loop engineering is replacing yourself as the person who prompts the agent. You design the system that does it instead."

他把 loop 定位在 harness 上方一層：「Harness 配置環境——但 loop 有計時器、會生出小幫手、而且能自我餵食。」

---

## Loop 的基本結構

```
發現工作 → 分派給 agent → agent 執行 → 觀察結果 → 驗證正確性 → 記錄狀態 → 決定下一步 → 重複
```

Prompt 是一次性的觸發，loop 是**持續自我驅動的系統**。關鍵不在工具，在架構。

---

## 五大構建塊 + 記憶層

Osmani 的架構把一個完整 loop 拆成五個組件，加一個記憶層。他特別指出 Claude Code 和 OpenAI Codex 現在都已內建這五個塊，「the shape is the same across products」。

### 1. Scheduled Automations（排程觸發）

Loop 的起點。可以是 cron job、GitHub Actions、PR event webhook，或工具內建的排程機制。Claude Code 的 `/schedule` 和 Codex 的 Automations tab 提供類似能力。Osmani 舉 OpenAI 內部的實際用法：每日 issue triage、彙整 CI 失敗、寫 commit briefing、搜尋上週新增的 bug。

### 2. Git Worktrees（隔離工作區）

每個 agent 在獨立的 git worktree 中工作，共享 git 歷史但互不干擾。這讓多個 agent 能平行處理不同任務——一個修 bug、一個寫測試、一個做 refactor——而不產生衝突。這也是為什麼 loop 能在「你睡覺時」穩定運作。

### 3. Skills（專案知識）

透過 CLAUDE.md、AGENTS.md、skill 檔案，將專案的規範、慣例、工作流程編碼成 agent 可讀的知識。Osmani 引用了 intent debt 的概念：

> "An agent starts every session cold and will fill any hole in your intent with a confident guess. A skill is intent written down."

沒有 skills，agent 每次啟動都從零推導你的專案慣例；有了 skills，知識才會累積。

### 4. Plugins / MCP Connectors（外部整合）

透過 MCP（Model Context Protocol）連接 GitHub、Slack、資料庫、監控系統。讓 agent 不只能讀寫 code，還能與整個開發工具鏈互動。

### 5. Sub-agents（Maker-Checker 分離）

執行者（maker）和驗證者（checker）分離。這是 loop 中最關鍵的設計決定。Osmani 解釋：

> "The reason it matters specifically inside a loop is the loop runs while you are not watching, so a verifier you actually trust is the only reason you can walk away."

Claude Code 的 `/goal` 就是這樣實作的——用另一個模型判斷 loop 是否完成，而不是讓做事的 agent 自己判斷自己。

### +1. Durable Memory（持久記憶）

Agent 本身是 amnesiac 的，但 filesystem 不是。`progress.txt`、`AGENTS.md`、`prd.json` 等檔案承載著跨 session 的記憶。這讓 loop 能「記住」上次做到哪裡。

---

## 驗證成本才是真正瓶頸

在所有討論 Loop Engineering 的文章中，Blake Crosley 的分析提出了最核心的洞見：

> "Verification cost, not loop construction, decides what you can automate."

他發現 Cherny 命名的每一個成功 loop，都有 **machine-checkable 的成功條件**——CI 修復、auto-rebasing、feedback clustering——不是開放式的 feature 開發。

當驗證可以自動化（test suite 通過、lint 清潔、type check 無誤），loop 就能無限運轉。當驗證需要人類判斷（這個 UI 好不好看、這個架構決定對不對），loop 就退化成「產出一堆東西等你 review」。

AlphaSignal 把前提條件整理成四個：

1. **任務可重複**：不是一次性的探索
2. **驗證可自動化**：有 test suite、linter、type checker
3. **Token 預算能承受浪費**：loop 會重試、會探索死路
4. **Agent 已有所需工具**：不需要人類幫忙操作外部系統

四個條件缺一個，loop 的成本就會超過收益。

---

## 已知限制與批評

### Token 成本

Loop 重讀 context、重試、探索多路徑，token 消耗遠超單次 prompt。Osmani 直言："usage patterns can vary wildly if you are token rich or poor."

### Comprehension Debt（理解負債）

比 technical debt 更隱蔽的問題：你程式碼庫中存在的東西，和你實際理解的東西之間的差距。Loop 產出的 code 你沒寫、可能沒仔細 review、不完全理解。技術債你至少知道欠了什麼；理解負債是你連自己欠了什麼都不知道。

### Cognitive Surrender（認知投降）

> "When the loop runs itself it's very tempting to stop having an opinion and just take whatever it gives back." — Osmani

用 loop 加速你深度理解的工作，它是利器；用它逃避理解，它是毒藥。

### Early Exit 問題

Agent 過早宣告完成，loop 在半成品上退出。這就是為什麼 maker-checker split 不是選項，而是必要條件。

### Review 成為新瓶頸

Output 堆積，人類 review 頻寬成為上限。你能跑多少 loop，不取決於 token 預算，取決於你能多快檢查產出。

---

## 實際場景

### PR 自動維護

```
觸發：PR 收到 review comment
  → Agent 讀取 comment
  → 判斷是否 machine-checkable
  → 修改 code → push → 等待 CI
  → CI 失敗 → 分析錯誤 → 修復 → 再 push
  → CI 通過 → 通知開發者做最終確認
```

這是 Cherny 自己在用的 loop——babysit PR，自動處理 CI 失敗和 rebase。

### 睡前啟動的任務分解

```
開發者定義目標 + 驗收條件
  → Planner agent 拆解為子任務
  → 每個子任務分配給獨立 sub-agent（各在 worktree 中）
  → Checker agent 逐一驗證
  → 不通過 → 回饋修改
  → 全部通過 → 合併、跑完整測試、開 PR
```

### 持續品質守護

```
每次 push 到 main：
  → Agent 跑 lint、typecheck、test
  → 發現問題 → 自動開 branch 修復
  → 修復完成 → 開 PR 標記 auto-fix
```

---

## 今天就能開始的三件事

### 1. 把規範寫進 CLAUDE.md / AGENTS.md

「我們不這樣做因為上次出事了」這種知識，寫下來就是 skills。沒有它，agent 每次啟動都在猜。

### 2. 用 `/goal` 或 `/loop` 跑第一個 loop

從小任務開始——babysit 一個 PR、每小時跑一次 lint check。不需要自己寫 bash orchestrator，Claude Code 內建了 maker-checker split。

### 3. 習慣用 sub-agent 做驗證

不讓同一個 agent 自己評估自己的產出。這個分工是 loop 品質的核心保證。

---

## 結語

Osmani 的結語值得留下來：

> "Build the loop. But build it like someone who intends to stay the engineer, not just the person who presses go."

另一位實踐者的說法指向同一件事：

> "The loop will do the typing. The thinking is the work."

Loop 不會取代你的判斷力。它會放大你的判斷力——前提是你還有判斷力可以被放大。

---

## 參考資料

- [Addy Osmani - Loop Engineering](https://addyosmani.com/blog/loop-engineering/)
- [Addy Osmani - Loop Engineering（Substack 版）](https://addyosmani.substack.com/)
- [Addy Osmani - Self-Improving Coding Agents](https://addyosmani.com/blog/self-improving-coding-agents/)
- [Addy Osmani - Long-running Agents](https://addyosmani.com/blog/long-running-agents/)
- [Boris Cherny - Acquired Unplugged 訪談](https://www.acquired.fm/episodes/unplugged-claude-code)
- [Blake Crosley - Loops Win Where Verification Is Cheap](https://blakecrosley.com/loops-win-where-verification-is-cheap)
- [AlphaSignal - Most Developers Do Not Need Agent Loops Yet](https://alphasignal.ai/)
- [Claude Code 官方文件 - /loop, /goal, /schedule](https://docs.anthropic.com/claude-code)
- [MCP（Model Context Protocol）](https://modelcontextprotocol.io)
