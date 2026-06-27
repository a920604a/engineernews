---
title: "10 個你可能沒聽過但值得裝的奇怪開源專案"
date: 2026-06-04T12:02:03.080Z
category: tech
tags: ["open-source", "developer-tools", "productivity", "cli", "devtools"]
lang: zh-TW
tldr: "從把程式碼轉成美圖的 Carbon、反向生成 API client 的 Hoppscotch，到監控 GitHub Action 的 nektos/act——這 10 個開源專案各有獨特的切入點，不是那種「又一個 X 的替代品」。"
description: "10 個真正解決特定痛點的開源專案，有的讓你的 README 瞬間上檔次，有的讓你不用推上 CI 就能本地跑 GitHub Actions，有的讓終端機輸出直接變成互動式 UI。"
type: listicle
original_url: "https://www.youtube.com/watch?v=qPuzWFvRajk"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260615_200930_235704.mp3"
---

你的 GitHub stars 裡大概有一堆「以後要用」卻從沒打開過的 repo。這些不是那種——它們各自解決一個很具體的痛點，而且很多是你裝上去之後三天內就會用到的工具。

## TL;DR

10 個工程師工具箱裡少見但實用的開源專案，涵蓋程式碼視覺化、本地 CI 執行、終端機 UI 生成、API 測試、Git 工作流強化等領域。每個都有明確的使用場景，不是通用工具。

## 1. Carbon — 把程式碼截圖做得像設計師作品

**GitHub**: `carbon-app/carbon`

在 Twitter 或技術部落格貼程式碼截圖，直接截螢幕的效果往往很醜。Carbon 讓你選擇主題、字型、背景色，把一段程式碼輸出成美觀的 PNG/SVG。

適合場景：技術分享貼文、演講簡報的程式碼截圖、README 的示例圖。

不適合場景：你需要貼可以直接複製的程式碼——圖片沒法複製。

## 2. Excalidraw — 架構圖的白板工具，看起來像手繪

**GitHub**: `excalidraw/excalidraw`

Lucidchart 和 Draw.io 的圖看起來太正式，有時候你就是需要一個「快速草圖」感覺的架構圖。Excalidraw 生成的圖有刻意的「手繪」風格，而且完全免費開源，可以自架。支援即時協作、匯出 SVG。

VS Code 有對應的 extension，可以直接在編輯器裡開 `.excalidraw` 檔案。

## 3. nektos/act — 在本機跑 GitHub Actions

**GitHub**: `nektos/act`

每次 push 才能測試 CI workflow 是最浪費時間的事之一。`act` 讓你在本機用 Docker 執行 GitHub Actions workflow，迭代速度快十倍。

```bash
# 安裝（macOS）
brew install act

# 跑所有 push event 的 workflow
act push

# 只跑特定 job
act -j build
```

限制：部分 GitHub 內建的 action（如 `actions/checkout`）需要額外設定才能在本機正確執行。

## 4. Hoppscotch — 開源的 Postman 替代品，可以自架

**GitHub**: `hoppscotch/hoppscotch`

Postman 免費版的功能越來越受限，而且把你的 API collection 存在他們的雲端。Hoppscotch 完全開源，支援 REST、GraphQL、WebSocket 測試，可以自架在你自己的伺服器，資料完全在你手上。

Web 版免費，自架版社群授權免費。

## 5. Bun Shell (`$`) — 在 JavaScript 裡寫 shell script

**GitHub**: `oven-sh/bun`（內建在 Bun runtime）

`child_process.exec` 很醜，`shelljs` 太老，Bun 內建的 `$` 讓你在 JavaScript/TypeScript 裡直接寫 shell 語法：

```typescript
import { $ } from "bun";

const result = await $`ls -la`.text();
const files = await $`find . -name "*.ts"`.lines();
```

跨平台（在 Windows 上也能用），有完整的 TypeScript 型別，是用 Node.js 寫構建腳本的現代替代方案。

## 6. Ink — 用 React 寫終端機 UI

**GitHub**: `vadimdemedes/ink`

你不需要學 ncurses 就能寫互動式 CLI。Ink 讓你用 React component 的方式寫終端機介面：

```jsx
import React from 'react';
import { render, Text, Box } from 'ink';

const App = () => (
  <Box flexDirection="column">
    <Text color="green">Build complete!</Text>
    <Text dimColor>3 files processed</Text>
  </Box>
);

render(<App />);
```

Gatsby CLI 和 Parcel 的 CLI 界面都是用 Ink 做的。

## 7. Slidev — 工程師的簡報工具，用 Markdown 寫投影片

**GitHub**: `slidevjs/slidev`

如果你討厭 PowerPoint 但又需要做技術分享簡報，Slidev 讓你用 Markdown + Vue component 寫投影片，程式碼區塊有語法高亮，可以嵌入互動式 demo，匯出成 PDF 或部署成網頁。

對工程師來說，投影片放進 Git 做版本控制這件事本身就很有吸引力。

## 8. Zod — TypeScript 的執行時期型別驗證

**GitHub**: `colinhacks/zod`

TypeScript 的型別在執行時期消失了。當你從 API 拿到資料，你無法確定它符合你預期的型別。Zod 讓你定義 schema 並在執行時期驗證：

```typescript
import { z } from "zod";

const User = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
});

// 如果資料不符合 schema，會拋出清楚的錯誤訊息
const user = User.parse(apiResponse);
```

和 tRPC 配合使用效果特別好——前後端共用同一份 schema。

## 9. Playwright — 比 Selenium 好用的 E2E 測試工具

**GitHub**: `microsoft/playwright`

Selenium 的 API 設計出自 2004 年，Playwright 是 Microsoft 在 2020 年發布的現代替代品：支援 Chromium、Firefox、WebKit，有自動等待機制（不需要手動加 `sleep`），有 codegen 可以錄製操作生成測試程式碼。

```bash
# 錄製操作，自動生成測試
npx playwright codegen https://your-app.com
```

## 10. Mermaid — 在 Markdown 裡直接畫圖

**GitHub**: `mermaid-js/mermaid`

GitHub、Notion、GitLab 都原生支援 Mermaid。你在 Markdown 裡寫文字，它幫你渲染成流程圖、序列圖、甘特圖。不需要開任何繪圖工具：

```
graph LR
    A[用戶請求] --> B[API Gateway]
    B --> C[服務 A]
    B --> D[服務 B]
```

文件和程式碼在同一個 repo，架構圖可以做 code review，這才是架構文件該有的樣子。

## 總結

這 10 個工具的共同特點：它們都解決了一個很具體的問題，而不是試圖成為「什麼都能做的平台」。Carbon 就是幫你生成漂亮的程式碼圖，act 就是讓你本機跑 CI，Zod 就是執行時期型別驗證。這種定位清晰的工具，反而是最容易上手、最容易評估是否適合你的。

## 參考資料

- [carbon-app/carbon](https://github.com/carbon-app/carbon)
- [excalidraw/excalidraw](https://github.com/excalidraw/excalidraw)
- [nektos/act](https://github.com/nektos/act)
- [hoppscotch/hoppscotch](https://github.com/hoppscotch/hoppscotch)
- [vadimdemedes/ink](https://github.com/vadimdemedes/ink)
- [slidevjs/slidev](https://github.com/slidevjs/slidev)
- [colinhacks/zod](https://github.com/colinhacks/zod)
- [microsoft/playwright](https://github.com/microsoft/playwright)
- [mermaid-js/mermaid](https://github.com/mermaid-js/mermaid)
