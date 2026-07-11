---
title: "OpenStock：AGPL 授權的開源股市儀表板，可自架、永久免費"
date: "2026-05-11T10:00:00.000Z"
category: "tech"
tags: ["fintech","open-source","next-js"]
type: "case-study"
github: "https://github.com/Open-Dev-Society/OpenStock"
draft: false
key_points:
  - "Next.js 15 + MongoDB + Finnhub + TradingView widgets 打造的開源股市儀表板，AGPL-3.0 授權、永久免費。"
  - "核心功能：Better Auth 登入、個人 watchlist、Cmd+K 全域搜尋、TradingView 圖表、AI 個人化 Email。"
  - "自架需要 Node 20+、MongoDB、Finnhub API key；即時報價可能需 Finnhub 付費方案，非券商、無交易功能。"
tldr: "OpenStock 是 Open Dev Society 的開源股市儀表板，用 Next.js 15、MongoDB、Finnhub 與 TradingView widgets 建成，AGPL-3.0 授權、可自架、永久免費，定位是市場情報工具而非交易平台。"
description: "以真實 GitHub README 為依據，解析開源股市儀表板 OpenStock 的技術棧、功能與自架方式。"
audio_url: "/api/tts/r2/tts/tts_20260711_002445_342318.mp3"
---

付費市場終端機（如 Bloomberg 之類的商業平台）把即時行情、公司資料與市場新聞鎖在訂閱牆後面。OpenStock 提出的是另一條路：一個開源、可自架、永久免費的股市儀表板，用它自己的話說是「built openly, for everyone, forever free」。

這個專案由 **Open Dev Society** 維護，採 **AGPL-3.0** 授權——這代表如果你修改、再散布或把它部署成網路服務，都必須以相同授權釋出原始碼並標註原作者。README 也把話講清楚：OpenStock 不是券商（brokerage），市場數據可能因 provider 規則與你的設定而有延遲，站上任何內容都不構成投資建議。

## 這是一個怎樣的專案

Open Dev Society 在 README 裡放了一份宣言（Manifesto），核心信念是「技術應該屬於所有人，知識應該是開放、免費、可取得的；社群應該用信任而非 gatekeeping 來迎接新人」。他們的承諾是：不把知識上鎖、不對存取收費、靠透明度與捐款而非利潤運作。

換句話說，OpenStock 的性格與其說由技術棧定義，不如說由這份「拒絕商業化、歡迎初學者貢獻」的立場定義。

## 技術架構

```mermaid
graph LR
  User["使用者"] --> Next["Next.js 15 App Router / React 19"]
  Next --> Auth["Better Auth + MongoDB adapter"]
  Next --> Mongo["MongoDB / Mongoose"]
  Next --> Finnhub["Finnhub API 股價・公司資料・新聞"]
  Next --> TV["TradingView widgets K線・熱力圖"]
  Next --> Inngest["Inngest events / cron / AI"]
  Inngest --> Gemini["Gemini 個人化 Email"]
  Inngest --> Mail["Nodemailer / Gmail"]
```

**核心層**：Next.js 15（App Router）、React 19、TypeScript，樣式用 Tailwind CSS v4（透過 `@tailwindcss/postcss`）搭配 shadcn/ui 與 Radix UI primitives，圖示用 Lucide。整個 repo 的語言組成大約是 TypeScript 93.4%、CSS 6%、JavaScript 0.6%——幾乎是純 TypeScript 的前後端。

**驗證與資料層**：Better Auth 提供 email/password 登入，搭配 MongoDB adapter；資料持久化用 MongoDB + Mongoose。市場數據來自 Finnhub API（symbols、公司 profile、市場新聞），圖表則直接嵌入 TradingView 的 widgets。

**自動化與通訊層**：Inngest 負責 events、cron 排程與 AI 推論；Nodemailer 透過 Gmail transport 寄信；另外還用了 next-themes、cmdk（command palette）與 react-hook-form。

## 功能

- **驗證**：Better Auth + MongoDB adapter 的 email/password 登入，受保護路由由 Next.js middleware 強制。
- **全域搜尋與 Cmd + K palette**：由 Finnhub 支撐的股票搜尋，閒置時顯示熱門股，查詢有 debounce。
- **Watchlist**：每個使用者一份追蹤清單存在 MongoDB（同一使用者不重複的 symbol）。
- **個股詳情**：TradingView 的 symbol info、K 線／進階圖表、baseline、技術指標，以及公司 profile 與財務 widgets；並可選擇性接入跨來源情緒洞察，涵蓋 Reddit、X.com、新聞與 Polymarket 預測市場。
- **市場總覽**：熱力圖、報價與 top stories，同樣以 TradingView widgets 呈現。
- **個人化 onboarding**：蒐集國家、投資目標、風險承受度與偏好產業。
- **Email 與自動化**：透過 Inngest 用 Gemini 產生 AI 個人化的歡迎信；並以 cron 依使用者 watchlist 寄出每日新聞摘要信。
- **介面**：shadcn/ui + Radix + Tailwind v4 design tokens，預設深色主題；Cmd/Ctrl + K 快捷操作。

值得注意的是 AI provider 是可替換的：預設用 `gemini`，也支援 `minimax` 與 `siray`，透過 `AI_PROVIDER` 環境變數切換，不鎖定單一廠商。情緒分析則是 optional 整合，需要 `ADANOS_API_KEY`，不是核心依賴。

## 自架與設定

前置需求：Node.js 20+ 與 pnpm 或 npm、一組 MongoDB 連線字串（MongoDB Atlas 或本地 Docker）、一把 Finnhub API key（支援免費 tier，但即時行情可能需付費方案）、一個寄信用的 Gmail 帳號，以及選用的 Gemini API key。

基本流程是 clone → `pnpm install` → 建立 `.env` → `pnpm test:db` 驗證資料庫連線 → `pnpm dev`（Next.js dev 走 Turbopack）。若要跑到 workflows、cron 與 AI，另外用 `npx inngest-cli@latest dev` 在本地啟動 Inngest。Production 則是 `pnpm build && pnpm start`，預設在 `http://localhost:3000`。

也可以直接用 Docker Compose 一次拉起 app 與 MongoDB：

```bash
docker compose up -d mongodb && docker compose up -d --build
```

Compose 檔含兩個服務——`openstock`（app）與 `mongodb`（mongo:7，帶 persistent volume 與 healthcheck）。這種情況下 MongoDB 連線字串走 Docker 網路內的 host：

```env
MONGODB_URI=mongodb://root:example@mongodb:27017/openstock?authSource=admin
```

環境變數方面，除了 `MONGODB_URI`，還需要 `BETTER_AUTH_SECRET`／`BETTER_AUTH_URL`、`NEXT_PUBLIC_FINNHUB_API_KEY`（部署到 Vercel 時必填）與 `FINNHUB_BASE_URL`。若要用 AI 與 Email，還有 `GEMINI_API_KEY`、`INNGEST_SIGNING_KEY`（Vercel 部署必填），以及 `NODEMAILER_EMAIL`／`NODEMAILER_PASSWORD`（Gmail 建議搭配 App Password）。`ADANOS_API_KEY` 與 `MINIMAX_API_KEY` 則是 optional。

## 定位與限制

有兩個限制值得先想清楚：

第一，**數據延遲**。股市數據不是來自 OpenStock 自己的資料庫，而是上游 Finnhub。免費 tier 通常是延遲數據，即時報價可能需要升級到付費方案，實際延遲取決於 provider 的條款與你的設定。

第二，**它不是交易平台**。OpenStock 沒有下單、沒有券商功能，README 明白定位它是市場情報工具，站上內容也非投資建議。

在這兩個前提下，OpenStock 對散戶、學生，或想在免費、可完全掌控的基礎上做二次開發的工程師來說，是個相當完整的起點——而且因為是 AGPL-3.0，你在它之上做的任何公開部署，也得同樣開放回饋社群。

## 參考資料

- [OpenStock GitHub](https://github.com/Open-Dev-Society/OpenStock)
- [Open Dev Society](https://github.com/Open-Dev-Society)
- [Finnhub API](https://finnhub.io/)
- [Inngest](https://www.inngest.com/)
- [Better Auth](https://www.better-auth.com/)
- [TradingView Widgets](https://www.tradingview.com/widget/)
