## ADDED Requirements

### Requirement: llms.txt 支持
系統應在根目錄提供 `llms.txt` 檔案以輔助 AI 代理人。

#### Scenario: AI 代理人發現網站結構
- **WHEN** AI 代理人請求 `/llms.txt`
- **THEN** 它應收到關鍵頁面列表與文章摘要，格式需為機器可讀。

### Requirement: 結構化元數據 (JSON-LD)
每篇文章應包含 JSON-LD 結構化數據。

#### Scenario: 搜尋引擎解析文章
- **WHEN** 爬蟲程式解析文章頁面
- **THEN** 它應找到一個 `<script type="application/ld+json">` 區塊，其中包含文章的元數據。
