## 為什麼 (Why)

用戶希望在多工處理時能收聽文章。整合遠端 TTS（文字轉語音）服務可以提供高品質的語音合成。為了提升體驗，我們希望在文章生成階段就預先合成音訊，減少用戶等待時間，同時保留客戶端手動合成的彈性。

## 改動內容 (What Changes)

- 在 `scripts/ingest.ts` 文章生成流程中，加入自動調用 TTS API 的步驟。
- 在文章標頭（Frontmatter）中加入 `audio_url` 與 `srt_url` 欄位。
- 在文章詳情頁面加入 `TTSPlayer` 元件，優先使用預合成的音訊。
- 實作健康檢查機制，偵測遠端 TTS API 的可用性。
- 如果遠端 API 無法連通且無預合成音訊，動態隱藏 TTS 播放功能。
- 加入代理（Proxy）路由處理音訊串流與 CORS。
- 與本地「歷史服務」整合，追蹤合成紀錄。

## 能力 (Capabilities)

### 新能力 (New Capabilities)
- `tts-voice-playback`: 提供自動與手動合成音訊、管理語音並在 UI 中播放結果的能力。

### 修改的能力 (Modified Capabilities)
- 無

## 影響範圍 (Impact)

- **Scripts**: `scripts/ingest.ts` 將依賴 TTS API。
- **Content**: Markdown 文章的 Frontmatter 結構變更。
- **UI**: `src/pages/posts/[...slug].astro` 中的新播放控制項。
- **API**: `src/pages/api/tts/` 代理路由。
- **依賴**: `src/lib/tts.ts` 工具函式。
