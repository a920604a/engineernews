## ADDED Requirements

### Requirement: Automated Mermaid diagram generation
在 YouTube 內容爬取流程中，系統必須自動分析內容並產生 Mermaid.js 語法的架構圖。

#### Scenario: Diagram inclusion in crawled posts
- **WHEN** `crawl.ts` 處理一個 YouTube 影片
- **THEN** 生成的 Markdown 檔案中應包含一個 `type: mermaid` 的代碼塊，描述影片中的技術架構

### Requirement: Architecture-focused extraction
AI 提取的圖表必須專注於組件關係、數據流或邏輯順序。

#### Scenario: Relevant diagram content
- **WHEN** 影片討論的是系統架構
- **THEN** Mermaid 圖表應呈現組件間的依賴關係，而非單純的文字列表
