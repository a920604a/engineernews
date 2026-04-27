---
title: "這個部落格用了哪些工具"
date: 2026-04-20T13:38:46+08:00
category: "tech"
tags: ["astro", "cloudflare", "d1", "vectorize", "typescript"]
lang: zh-TW
description: "說明 Engineer News 部落格使用的關鍵工具與設計抉擇，包含 Astro、Cloudflare Pages/Workers、D1、向量化流程與開發流程。"
tldr: "本部落格採用 Astro 作靜態渲染、Cloudflare Pages/Workers 提供部署與動態 API、D1 作輕量資料儲存，向量化在同步步驟中處理文章索引。"
draft: false
pinned: true
audio_url: "/api/tts/r2/tts/tts_20260427_023733_770570.wav"
---

## 工具清單與角色
- Astro：內容與頁面渲染（輕量、快速）。
- Cloudflare Pages：靜態內容部署與 CDN。  
- Cloudflare Workers（Wrangler）：輕量 API、同步流程、向量化觸發器。  
- D1：輕量 SQLite 兼容資料庫，用於小型元資料。  
- PNPM：快速的 mono/mono-workspace 相依管理。  
- TypeScript：靜態類型，提升可維護性。  

## 為什麼這些選擇
- 邊緣部署（Pages + Workers）讓全站延遲低且維運簡單。  
- Astro 的內容驅動模型適合以 Markdown 為主的部落格。  
- D1 對於小型資料與 Cloudflare 環境整合良好；大型資料再外部分離。

## 注意事項與建議
- 在內容 schema（src/content.config.ts）盡量嚴格，以避免 build 時錯誤。  
- 把敏感金鑰放在 Cloudflare / GitHub Secrets，CI 不要暴露。  
- 為向量化流程設計 idempotent 的同步步驟，避免重複索引。

## 參考資料
- Astro 入門：https://docs.astro.build/
- Cloudflare Pages & Workers：https://developers.cloudflare.com/
- PNPM workspace：https://pnpm.io/
