---
title: "OpenStock: An AGPL-Licensed Open-Source Stock Market Dashboard — Self-Hostable, Forever Free"
date: "2026-05-11T10:00:00.000Z"
category: "tech"
tags: ["fintech","open-source","next-js"]
type: "case-study"
github: "https://github.com/Open-Dev-Society/OpenStock"
draft: false
key_points:
  - "An open-source stock market dashboard built with Next.js 15 + MongoDB + Finnhub + TradingView widgets, licensed under AGPL-3.0 and forever free."
  - "Core features: Better Auth login, personal watchlist, Cmd+K global search, TradingView charts, and AI-personalized email."
  - "Self-hosting requires Node 20+, MongoDB, and a Finnhub API key; real-time quotes may require a paid Finnhub plan — it's not a brokerage and has no trading functionality."
tldr: "OpenStock is Open Dev Society's open-source stock market dashboard, built with Next.js 15, MongoDB, Finnhub, and TradingView widgets. AGPL-3.0 licensed, self-hostable, and forever free, it's positioned as a market-intelligence tool rather than a trading platform."
description: "A breakdown of the tech stack, features, and self-hosting process of the open-source stock market dashboard OpenStock, based on its real GitHub README."
audio_url: "/api/tts/r2/tts/tts_20260711_002415_617754.mp3"
---

Paid market terminals (commercial platforms like Bloomberg) lock real-time quotes, company data, and market news behind a subscription wall. OpenStock proposes a different path: an open-source, self-hostable, forever-free stock market dashboard that, in its own words, is "built openly, for everyone, forever free."

The project is maintained by **Open Dev Society** and licensed under **AGPL-3.0** — which means that if you modify, redistribute, or deploy it as a network service, you must release the source code under the same license and credit the original authors. The README also spells it out plainly: OpenStock is not a brokerage, market data may be delayed depending on provider rules and your configuration, and nothing on the site constitutes investment advice.

## What Kind of Project This Is

Open Dev Society includes a Manifesto in the README, whose core belief is that "technology should belong to everyone, knowledge should be open, free, and accessible, and communities should welcome newcomers with trust rather than gatekeeping." Their commitment: don't lock away knowledge, don't charge for access, and operate on transparency and donations rather than profit.

In other words, OpenStock's character is defined less by its tech stack than by this stance of "refusing commercialization and welcoming beginner contributions."

## Technical Architecture

```mermaid
graph LR
  User["User"] --> Next["Next.js 15 App Router / React 19"]
  Next --> Auth["Better Auth + MongoDB adapter"]
  Next --> Mongo["MongoDB / Mongoose"]
  Next --> Finnhub["Finnhub API prices・company data・news"]
  Next --> TV["TradingView widgets candlesticks・heatmap"]
  Next --> Inngest["Inngest events / cron / AI"]
  Inngest --> Gemini["Gemini personalized email"]
  Inngest --> Mail["Nodemailer / Gmail"]
```

**Core layer**: Next.js 15 (App Router), React 19, TypeScript, with styling handled by Tailwind CSS v4 (via `@tailwindcss/postcss`) paired with shadcn/ui and Radix UI primitives, and Lucide for icons. The repo's language composition is roughly TypeScript 93.4%, CSS 6%, JavaScript 0.6% — essentially a pure-TypeScript frontend and backend.

**Auth and data layer**: Better Auth provides email/password login, paired with a MongoDB adapter; data persistence uses MongoDB + Mongoose. Market data comes from the Finnhub API (symbols, company profiles, market news), while charts are embedded directly via TradingView widgets.

**Automation and communication layer**: Inngest handles events, cron scheduling, and AI inference; Nodemailer sends email through a Gmail transport; and next-themes, cmdk (command palette), and react-hook-form are also in the mix.

## Features

- **Auth**: email/password login via Better Auth + MongoDB adapter, with protected routes enforced by Next.js middleware.
- **Global search and Cmd + K palette**: Finnhub-backed stock search that shows popular stocks when idle and debounces queries.
- **Watchlist**: a per-user watchlist stored in MongoDB (unique symbols per user).
- **Individual stock detail**: TradingView's symbol info, candlestick/advanced charts, baseline, technical indicators, plus company profile and financials widgets; with optional cross-source sentiment insights covering Reddit, X.com, news, and the Polymarket prediction market.
- **Market overview**: heatmap, quotes, and top stories, likewise rendered with TradingView widgets.
- **Personalized onboarding**: collects country, investment goals, risk tolerance, and preferred sectors.
- **Email and automation**: AI-personalized welcome emails generated with Gemini via Inngest, plus a cron job that sends daily news digest emails based on each user's watchlist.
- **Interface**: shadcn/ui + Radix + Tailwind v4 design tokens, dark theme by default; Cmd/Ctrl + K for quick actions.

Notably, the AI provider is swappable: it defaults to `gemini` but also supports `minimax` and `siray`, switchable via the `AI_PROVIDER` environment variable, avoiding lock-in to a single vendor. Sentiment analysis is an optional integration requiring `ADANOS_API_KEY` — not a core dependency.

## Self-Hosting and Setup

Prerequisites: Node.js 20+ with pnpm or npm, a MongoDB connection string (MongoDB Atlas or local Docker), a Finnhub API key (the free tier is supported, but real-time data may require a paid plan), a Gmail account for sending email, and an optional Gemini API key.

The basic flow is clone → `pnpm install` → create `.env` → `pnpm test:db` to verify the database connection → `pnpm dev` (Next.js dev runs on Turbopack). To exercise workflows, cron, and AI, additionally start Inngest locally with `npx inngest-cli@latest dev`. For production, it's `pnpm build && pnpm start`, defaulting to `http://localhost:3000`.

You can also bring up the app and MongoDB together directly with Docker Compose:

```bash
docker compose up -d mongodb && docker compose up -d --build
```

The compose file contains two services — `openstock` (the app) and `mongodb` (mongo:7, with a persistent volume and healthcheck). In this case the MongoDB connection string uses the host on the Docker network:

```env
MONGODB_URI=mongodb://root:example@mongodb:27017/openstock?authSource=admin
```

As for environment variables, beyond `MONGODB_URI`, you also need `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`, `NEXT_PUBLIC_FINNHUB_API_KEY` (required when deploying to Vercel), and `FINNHUB_BASE_URL`. To use AI and email, there's also `GEMINI_API_KEY`, `INNGEST_SIGNING_KEY` (required for Vercel deployment), and `NODEMAILER_EMAIL`/`NODEMAILER_PASSWORD` (Gmail is best paired with an App Password). `ADANOS_API_KEY` and `MINIMAX_API_KEY` are optional.

## Positioning and Limitations

Two limitations are worth thinking through up front:

First, **data latency**. Stock market data doesn't come from OpenStock's own database but from the upstream Finnhub. The free tier is typically delayed data, and real-time quotes may require upgrading to a paid plan; actual latency depends on the provider's terms and your configuration.

Second, **it's not a trading platform**. OpenStock has no order placement and no brokerage functionality; the README clearly positions it as a market-intelligence tool, and the content on the site is not investment advice.

Given those two premises, OpenStock is a fairly complete starting point for retail investors, students, or engineers who want to build on a free, fully controllable foundation — and because it's AGPL-3.0, any public deployment you build on top of it must give back to the community just as openly.

## References

- [OpenStock GitHub](https://github.com/Open-Dev-Society/OpenStock)
- [Open Dev Society](https://github.com/Open-Dev-Society)
- [Finnhub API](https://finnhub.io/)
- [Inngest](https://www.inngest.com/)
- [Better Auth](https://www.better-auth.com/)
- [TradingView Widgets](https://www.tradingview.com/widget/)
