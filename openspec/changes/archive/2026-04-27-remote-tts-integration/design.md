## 上下文 (Context)

系統目前提供靜態新聞內容。我們正在整合遠端 TTS API（預設 `http://localhost:8008`）。除了手動播放外，現在要求在文章生成的同時預先合成音訊。

## 目標 / 非目標 (Goals / Non-Goals)

**目標：**
- 在 `ingest.ts` 腳本中實作自動化合成。
- 在文章 Frontmatter 中儲存預合成的音訊連結。
- 實作穩健的 API 健康檢查。
- 提供具有進度條和語音選擇功能的播放面板。
- 透過本地 API 路由代理遠端請求。

**非目標：**
- 伺服器端音訊檔持久化（音檔保留在遠端 API 伺服器）。
- 離線播放。

## 決策 (Decisions)

### 1. 自動合成與 Frontmatter
- **決策**：修改 `scripts/ingest.ts`。在寫入 Markdown 檔案後，調用 TTS API 合成音訊，並將 `audio_url` 與 `srt_url` 寫入 Frontmatter。
- **理由**：預先合成可大幅提升用戶進入頁面時的體驗，無需等待。
- **降級方案**：如果 API 離線，`ingest.ts` 應忽略錯誤並生成無音訊的文章。

### 2. 播放面板設計 (TTSPlayer)
- **視覺設計**：
    - 放置於文章標題下方、TL;DR 上方。
    - 包含：播放/暫停按鈕、語音下拉選單、進度條、當前時間。
- **狀態邏輯**：
    - 若 Frontmatter 已有 `audio_url`，初始狀態為「可播放」。
    - 若無且 API 可用，顯示「合成並收聽」按鈕。
    - 若 API 離線且無 `audio_url`，則隱藏整個元件。

### 3. API 代理與音訊流
- **決策**：`src/pages/api/tts/audio/[filename].ts` 需支援二進位流轉發。
- **理由**：確保 `<audio>` 標籤能正確播放來自不同 origin 的 wav 檔案。

## 風險 / 權衡 (Risks / Trade-offs)

- **[風險]** 預合成增加 ingestion 時間 → **緩解**：非同步執行或設定合理的 timeout。
- **[風險]** 遠端音檔過期 → **緩解**：如果預合成連結失效，提供「重新合成」按鈕（手動觸發）。
