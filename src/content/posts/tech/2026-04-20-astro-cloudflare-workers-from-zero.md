---
title: "用 Astro + Cloudflare Workers 從零建立低摩擦平台"
date: 2026-04-20T13:38:46+08:00
category: "tech"
tags: ["astro", "cloudflare-workers", "cloudflare-pages", "deployment"]
lang: zh-TW
description: "實作指南：從空專案開始，用 Astro 建靜態前端、Cloudflare Workers / Pages 做後端與部署，減少開發摩擦的實作步驟與注意事項。"
tldr: "以 Astro 做內容與 UI，Cloudflare Workers 提供 API 與邊緣處理，Cloudflare Pages 做靜態部署；關鍵在於 routes、環境變數與 D1/kv 的運用。"
draft: false
pinned: true
---

## 情境
需要快速經營一個技術部落格或 demo 平台，希望每天能更新內容、同時提供簡單 API（如搜索或向量化），並在低成本環境上穩定執行。

## 問題
- 想避免複雜後端維護與 CI-config；  
- 希望內容能平滑地部署到全球邊緣；  
- 需要本地預覽動態 API 與靜態內容。

## 嘗試過程
1. 初始化 Astro 專案（pnpm create astro@latest）並選擇 framework-less 或 React。  
2. 用 Astro Content 或 Markdown 管理文章；把公共元件抽出。  
3. 建立 Cloudflare Workers（Wrangler）專案，先以本地模擬器測試 API。  
4. 把靜態站輸出到 dist，使用 wrangler pages deploy 自動部署。

## 解法（步驟要點）
1. 建置專案骨架：Astro + pnpm workspace（若有 monorepo）。  
2. 內容管理：使用 src/content 與 astro:content 定義 collection 與 schema（便於檢核與 build 時同步化）。  
3. API 層：用 Cloudflare Workers 提供小型 API（搜索、webhook、向量化觸發），並使用 D1 或 KV 儲存小型元資料。  
4. 本地測試：使用 wrangler dev 並同時跑 Astro dev（或用 proxy 方式），確保跨 origin 的整合測試。  
5. CI / Deploy：在 GitHub Actions 裡執行 pnpm install → pnpm build → wrangler pages deploy dist。  

## 為什麼會這樣
Cloudflare 提供邊緣產品（Pages/Workers/D1）讓前端與小型後端無縫整合。Astro 的輸出導向使得靜態內容快而輕，Workers 適合處理輕量動態 API。

## 學到的事
- 建議把敏感憑證放在 CI/Pages 環境變數中；  
- 使用 content schema 可以在 build 時早些捕獲錯誤；  
- 本地與邊緣環境差異需用測試覆蓋流程。

## 參考資料
- Astro 官方：https://docs.astro.build/
- Cloudflare Workers / Pages：https://developers.cloudflare.com/
- wrangler 文檔：https://developers.cloudflare.com/workers/cli-wrangler/
