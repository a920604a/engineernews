# 架構說明

Engineer News 使用 Astro 建構前端，部署於 Cloudflare Pages / Workers。主要元件：

- 前端：Astro + React（部分互動元件）
- 邊緣執行：Cloudflare Workers（API、LLM 入口）
- 資料庫：Cloudflare D1（SQLite）
- 向量搜尋：Cloudflare Vectorize
- AI：Workers AI 或外部 LLM（作為推理層）

資料流簡述：
1. Markdown 文章寫入 src/content
2. sync 腳本將 Markdown 同步到 D1 並呼叫 Vectorize 建立向量索引
3. 使用者透過搜尋 UI 發出查詢，API 在邊緣以向量檢索並回傳結果

