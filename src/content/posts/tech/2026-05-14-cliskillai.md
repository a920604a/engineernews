---
title: "OpenClaw × Playwright CLI：三段式 AI 瀏覽器自動化，執行階段 0 Token"
date: 2026-05-14T11:18:29.269Z
category: tech
tags: ["automation", "playwright", "openclaw", "ai-agent", "browser", "workflow"]
lang: zh-TW
tldr: "用 OpenClaw 的 Playwright CLI + Skill 三段式流程，讓 AI 學一次瀏覽器操作，之後每次執行零 Token 消耗，比 Playwright MCP 節省約 4 倍 Token。"
description: "介紹 OpenClaw × Playwright CLI 的三段式 AI 瀏覽器自動化架構：AI 探索 → 蒸餾成 Skill 檔案 → 零 Token 執行，適合登入、表單、爬蟲等重複性瀏覽器任務。"
type: how-to
original_url: "https://www.youtube.com/watch?v=nlK7-zuYDcs"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260521_021057_532032.mp3"
---

一樣的登入流程、一樣的表單填寫、一樣的資料爬取——這些任務明明寫過一次，卻每次還是得呼叫 AI 推理，Token 一直在燒。

OpenClaw 的解法很直接：**讓 AI 學一次，蒸餾成 Skill 檔案，之後免推理執行**。

## TL;DR

- **Playwright CLI**（非 MCP）搭配 **OpenClaw Skills** 是目前 Token 效率最高的 AI 瀏覽器自動化組合之一
- 三段式工作流：AI 探索（~41% Token）→ Skill 蒸餾（~5% Token）→ 零 Token 執行
- Skill 是一份 Markdown 檔案，描述操作步驟；一旦建立，後續執行不消耗任何推理 Token
- ClawHub 社群已有大量現成 Skill 可直接安裝使用

## 為什麼不用 Playwright MCP？

許多人直接把 Playwright MCP 接進 AI Agent，讓模型即時控制瀏覽器。這個方案可行，但每個步驟都需要模型推理，Token 消耗高、延遲也大。

相比之下，**Playwright CLI** 是專為 AI Agent 設計的輕量瀏覽器控制介面：

- 把瀏覽器操作（navigate、click、fill、screenshot、tab 管理等）包裝成結構化 CLI 指令
- 比 Playwright MCP 方案約節省 **4 倍 Token**
- 指令輸出是 AI 可解析的純文字格式，而非 DOM 樹

Token 效率的差距來自一個關鍵設計決策：MCP 方案讓模型在每個操作步驟之間反覆推理，Playwright CLI 則把瀏覽器狀態序列化成 AI 友好的摘要，大幅降低每次 context 的大小。

## 三段式工作流

整個架構的精髓在於**把 AI 推理的成本集中在一次性學習，而非每次執行**。

### 第一段：AI 探索（學習階段，~41% Token）

讓 AI Agent 搭配 Playwright CLI 實際操作目標網站一次：

```bash
# 安裝 Playwright CLI Skill
clawhub install playwright-cli

# 啟動 AI 探索
openclaw "登入目標網站並擷取今天的通知列表"
```

這個階段 AI 需要即時推理，探索 UI 結構、找到正確的元素選擇器、處理動態載入的內容。Token 消耗較高，但只需執行**一次**。

### 第二段：蒸餾成 Skill 檔案（~5% Token）

AI 探索完成後，把操作過程整理成一份 Skill 檔案（Markdown 格式）。Skill 是操作劇本——精確描述每個步驟，不需要 AI 再去推理：

```markdown
# skill: login-and-fetch-notifications
## 描述
登入網站並擷取最新通知

## 前置條件
- playwright-cli 已安裝

## 步驟
1. playwright-cli navigate {{TARGET_URL}}
2. playwright-cli fill [name="username"] {{USERNAME}}
3. playwright-cli fill [name="password"] {{PASSWORD}}
4. playwright-cli click button[type="submit"]
5. playwright-cli wait .notification-list
6. playwright-cli snapshot .notification-list
```

Skill 檔案是純 Markdown，人類可以直接閱讀和修改，不是 DSL 或 JSON 配置檔。

### 第三段：零 Token 執行

Skill 建立後，後續每次執行只需：

```bash
clawhub run login-and-fetch-notifications \
  --TARGET_URL=https://example.com \
  --USERNAME=me@example.com \
  --PASSWORD=***
```

**執行階段完全不呼叫模型推理**，Playwright CLI 直接按照 Skill 腳本操作瀏覽器。三次、一百次、定時排程執行——Token 成本永遠是 0。

## Skill 的設計哲學

OpenClaw Skill 的設計有幾個值得注意的特點：

**參數化**：用 `{{VARIABLE}}` 注入執行時參數，同一份 Skill 可以對應不同帳號、不同目標 URL。

**可組合**：Skill 可以呼叫其他 Skill，形成複合自動化流程：

```markdown
## 步驟
1. skill: login-and-fetch-notifications  # 呼叫另一個 Skill
2. playwright-cli click .mark-all-read
3. playwright-cli screenshot notifications-cleared.png
```

**可分享**：上傳到 ClawHub 後，任何人都可以安裝使用：

```bash
# 搜尋社群 Skill
clawhub search "form automation"

# 安裝他人發布的 Skill
clawhub install openclaw/playwright-cli

# 發布自己的 Skill
clawhub publish ./my-skill/
```

這個設計讓「操作知識」可以像程式碼一樣被版本控制、分享、組合，而不是鎖在某個人的腦袋或 prompt 歷史裡。

## 適合與不適合的場景

**適合：**

| 場景 | 說明 |
|------|------|
| 定期資料擷取 | 每日抓取競品價格、社群貼文數據 |
| 帳號操作自動化 | 批次登入、表單填寫、通知確認 |
| 測試流程錄製 | 把 QA 手工測試路徑固化成可重複執行的 Skill |
| 跨平台資料同步 | 在不提供 API 的平台之間搬運資料 |

**不適合：**

- 需要即時決策的任務（例如：根據頁面內容動態決定下一步）
- 頁面 UI 結構頻繁大幅變動的網站
- 需要 CAPTCHA 或人機驗證的流程

## 安裝與快速開始

```bash
# 安裝 OpenClaw
npm install -g openclaw

# 安裝 Playwright CLI Skill
npx clawhub install playwright-cli

# 確認 Playwright 瀏覽器已安裝
npx playwright install chromium

# 執行第一個探索任務（會消耗 Token，但只做一次）
openclaw "打開 GitHub，截圖我的 PR 列表"
```

## 參考資料

- [告別一切重複枯燥任務，CLI+Skill 搭建 AI 瀏覽器自動化框架（YouTube）](https://www.youtube.com/watch?v=nlK7-zuYDcs)
- [Playwright CLI + Skill 三段式：把 AI 瀏覽器自動化做到 0 Token](https://www.heyuan110.com/zh/posts/ai/2026-04-18-playwright-cli-skill-zero-token-automation/)
- [GitHub - openclaw/clawhub：OpenClaw 的 Skill 目錄](https://github.com/openclaw/clawhub)
- [分享一套自己寫的 OpenClaw 瀏覽器自動化 Skill+CLI 組合（V2EX）](https://www.v2ex.com/t/1197894)
