## ADDED Requirements

### Requirement: 來源設定檔（Source Registry）
系統 SHALL 維護一個可擴充的來源設定檔 `scripts/sources.ts`，定義所有爬蟲來源的 metadata。

#### Scenario: 新增來源
- **WHEN** 開發者在 `SOURCES` 陣列新增一筆 `Source` 物件並設定 `enabled: true`
- **THEN** 下次 crawl 執行時，系統 SHALL 自動納入該來源

#### Scenario: 停用來源
- **WHEN** 開發者將某 `Source` 的 `enabled` 設為 `false`
- **THEN** crawl 執行時 SHALL 跳過該來源，不產生任何文章

---

### Requirement: YouTube 新影片發現
系統 SHALL 透過 YouTube RSS feed 取得每個頻道的最新影片清單。

#### Scenario: 取得頻道最新影片
- **WHEN** crawl 腳本執行且來源 type 為 `youtube`
- **THEN** 系統 SHALL 請求 `https://www.youtube.com/feeds/videos.xml?channel_id=<ID>` 並解析最新 5 筆影片

#### Scenario: 跳過已處理影片
- **WHEN** 影片 ID 對應的檔案 `src/content/posts/crawled/<VIDEO_ID>.md` 已存在
- **THEN** 系統 SHALL 跳過該影片，不重複處理

---

### Requirement: 字幕下載
系統 SHALL 使用 yt-dlp 下載影片字幕，優先順序為 zh-TW > zh > en。

#### Scenario: 成功下載字幕
- **WHEN** 影片有可用字幕（自動或人工）
- **THEN** 系統 SHALL 下載字幕檔（.vtt），不下載影片本體

#### Scenario: 字幕不可用時 Fallback
- **WHEN** yt-dlp 無法取得任何字幕
- **THEN** 系統 SHALL 改用影片標題與 description 作為摘要來源，並繼續執行不中斷

---

### Requirement: 繁體中文 AI 摘要
系統 SHALL 使用 Cloudflare Workers AI 將字幕內容轉換為繁體中文摘要文章。

#### Scenario: 生成中文摘要
- **WHEN** 系統收到字幕文字（或 fallback 的標題+描述）
- **THEN** Workers AI SHALL 輸出包含 `title`、`tldr`、`tags`、`category`、`summary` 的 JSON，語言為繁體中文

#### Scenario: AI 輸出解析失敗
- **WHEN** Workers AI 回傳非法 JSON 或空白
- **THEN** 系統 SHALL 使用原始影片標題作為 title，跳過該影片並記錄警告，不中斷整體爬蟲

---

### Requirement: 爬蟲文章 Markdown 輸出
系統 SHALL 將每支影片的摘要輸出為符合 Astro content schema 的 markdown 檔案。

#### Scenario: 輸出爬蟲文章
- **WHEN** AI 摘要生成成功
- **THEN** 系統 SHALL 在 `src/content/posts/crawled/<VIDEO_ID>.md` 寫入含完整 frontmatter 的 markdown，包含 `type: crawled`、`source`、`source_url` 欄位

---

### Requirement: 排程自動執行
系統 SHALL 透過 GitHub Actions cron 每週自動執行爬蟲。

#### Scenario: 定期爬蟲觸發
- **WHEN** GitHub Actions cron 觸發（每週一 UTC 00:00）
- **THEN** 系統 SHALL 執行完整爬蟲流程，對有新影片的來源生成文章並 commit/push

#### Scenario: 無新內容時
- **WHEN** 所有來源均無新影片（已處理過）
- **THEN** 系統 SHALL 不產生空 commit，gracefully 結束
