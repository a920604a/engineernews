## 1. 專案初始化

- [ ] 1.1 使用 Cloudflare 適配器初始化 Astro 專案 (SSR 模式)
- [ ] 1.2 設定專案目錄結構 (src/content, src/pages, src/components)
- [ ] 1.3 在 `astro.config.mjs` 中配置多語言 (i18n)

## 2. 核心 UI 實作

- [ ] 2.1 建立具有響應式設計的 BaseLayout (Hacker-style CSS)
- [ ] 2.2 實作資訊流使用的 ArticleCard 組件
- [ ] 2.3 構建首頁，包含按時間排序的文章流與標籤過濾功能
- [ ] 2.4 建立文章詳情頁面，支援 Markdown 渲染
- [ ] 2.5 構建專案展示頁面 (Projects page)

## 3. 多語言支持

- [ ] 3.1 設定翻譯檔案 (ZH/EN)
- [ ] 3.2 實作 LanguageSwitcher 組件
- [ ] 3.3 確保所有靜態字串完成本地化

## 4. AI 優先與 SEO

- [ ] 4.1 在建構過程中自動生成 `llms.txt`
- [ ] 4.2 在 BaseLayout 中加入 JSON-LD 元數據組件
- [ ] 4.3 配置 sitemap.xml 與 robots.txt

## 5. 對話攝取工具 (Ingestion Tool)

- [ ] 5.1 建立 `scripts/ingest.ts` 用於解析日誌
- [ ] 5.2 實作利用 Gemini 或 Workers AI 的摘要邏輯
- [ ] 5.3 加入數據脫敏功能，移除日誌中的 Secret
- [ ] 5.4 將生成的文章匯出至 `src/content/blog/`

## 6. 基礎設施與部署

- [ ] 6.1 設定 Cloudflare D1 資料庫與初始遷移 (0001_initial.sql)
- [ ] 6.2 配置 Cloudflare Vectorize 以支援語義搜尋
- [ ] 6.3 設置 Cloudflare Pages 部署流水線
- [ ] 6.4 驗證處理搜尋與過濾的邊緣函數 (Edge Functions)
