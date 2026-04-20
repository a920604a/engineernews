---
title: "Nutrition Risk Engine"
description:
  background: "多族群飲食風險管理系統，提供食物查詢、個人化飲食建議與 AI 驗證的飲食分析。"
  challenge: "需將食物標籤與疾病風險對應，並在前端呈現即時查詢、飲食日記與 AI 分析，同時儲存與同步使用者資料。"
  solution: "以 Cloudflare Workers 提供 API 與 D1 做為食物資料庫，前端使用 React + TypeScript + Tailwind，並以 Workers AI 做個人化分析與 PDF 匯出。"
  core_contributions:
    - "設計 riskEngine.ts，透過標籤（tag）系統對不同疾病進行分數評估與建議。"
    - "實作 Worker API（/api/foods 等）與 D1 schema 與 seed，維護 140 種食物與對應標籤。"
    - "整合 Workers AI 進行飲食日記分析，並在前端提供 React 組件與 react-pdf 匯出功能。"
  outcome: "完成可部署的示範系統，支援前端查詢、日記記錄、AI 分析與 PDF 報告，並以 Cloudflare 無伺服器資源達成低成本運營。"
tags: ["nutrition", "health", "ml"]
skills: ["react", "typescript", "tailwindcss", "cloudflare-workers", "d1", "firestore", "workers-ai", "react-pdf"]
github: "https://github.com/a920604a/nutrition-risk-engine"
tag: "nutrition-risk-engine"
pinned: false
---

Nutrition Risk Engine（Nutrition Guard）是一個針對多族群飲食風險管理的示範系統，提供食物查詢、個人化飲食建議、飲食日記與 AI 分析功能。

背景：專案以 Cloudflare Workers + D1 儲存食物資料庫（約 140 種食物），前端採 React + TypeScript + Tailwind，並整合 Firebase 做認證與 Firestore 儲存使用者資料。

挑戰：需把食物屬性與疾病風險建立穩健對應（tag 系統），同時在前端提供即時查詢與 7 天飲食分析，並支援 AI 為使用者生成個人化建議。

解法與貢獻：實作 riskEngine.ts 做標籤評分邏輯、建立 Worker API 與 D1 schema/seed、整合 Workers AI 做飲食日記分析，以及在前端提供 React 組件與 react-pdf 的報告匯出功能。

成果：完成低成本、可部署的示範系統，支援前端查詢、個人化 AI 分析、飲食日記與 PDF 匯出，適合進一步擴展資料集或商業化功能。
