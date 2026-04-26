## 1. 後端與自動化：API 代理與 Ingestion 整合

- [ ] 1.1 建立 `src/lib/tts.ts`，包含 TypeScript 介面與 API Client 函式。
- [ ] 1.2 在 `src/pages/api/tts/[...path].ts` 實作 Astro API 代理路由，支援音訊流。
- [ ] 1.3 修改 `scripts/ingest.ts`：在生成文章後調用 TTS API，並將結果寫入 Frontmatter。
- [ ] 1.4 更新 `src/content.config.ts` 中的 Schema，加入 `audio_url` 與 `srt_url` 選填欄位。

## 2. 前端：TTS 播放器元件 (TTSPlayer)

- [ ] 2.1 建立 `TTSPlayer.tsx` React 元件，實作播放/暫停與進度條功能。
- [ ] 2.2 實作優先使用 Frontmatter 音訊，若無則進行 API 健康檢查的邏輯。
- [ ] 2.3 實作語音列表獲取與「合成並播放」手動觸發功能。
- [ ] 2.4 實作 Loading 狀態與錯誤處理（如 API 逾時）。
- [ ] 2.5 調整播放器樣式，使其契合文章標題下方的視覺佈局。

## 3. 整合與驗證

- [ ] 3.1 將 `TTSPlayer.tsx` 注入 `src/pages/posts/[...slug].astro` 並傳入 Frontmatter 資料。
- [ ] 3.2 驗證 `pnpm ingest` 能自動生成帶有音訊連結的文章。
- [ ] 3.3 驗證播放器能正確讀取預合成音軌。
- [ ] 3.4 驗證手動合成功能與 API 離線時的降級行為。
