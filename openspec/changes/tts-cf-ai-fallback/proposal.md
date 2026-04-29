## Why

Edge TTS（Microsoft Edge TTS Python server）是目前唯一的 TTS 來源，但在 CI/CD（GitHub Actions crawl.yml）環境中該 server 不會啟動，導致每次自動爬文都無法生成音訊，文章 `audio_url` 永遠留空。透過整合 Cloudflare Workers AI 免費模型作為 fallback，可在 server 不可用時自動合成音訊，讓 CI pipeline 也能完整產出音訊。

## What Changes

- 新增 `checkEdgeTTSHealth()` 函式：在合成前快速 HEAD check Edge TTS server 狀態
- 新增 `synthesizeCFAI()` 函式：透過 CF AI REST API（Node.js 腳本）或 `env.AI.run()` binding（Worker）合成音訊
- 新增 `synthesizeWithFallback()` 統一入口：health check → Edge TTS → CF AI 自動切換
- `scripts/crawl.ts`、`scripts/tts-all.ts` 的 synthesize() 呼叫替換為 `synthesizeWithFallback()`
- `src/pages/api/tts/cache.ts` 加入 health check + CF AI fallback 路徑
- `src/pages/api/tts/[...path].ts` 的 R2 lookup 改為同時試 `.wav` 和 `.mp3` 兩個 key
- CF AI 產出 `.mp3` 存入 R2，格式與現有 Edge TTS 的 `.wav` 並存

## Capabilities

### New Capabilities

- `tts-cf-ai-fallback`: 當 Edge TTS server 不可用時，自動 fallback 到 Cloudflare Workers AI 免費 TTS 模型合成音訊，支援 zh（MeloTTS）與 en（Aura-2-EN）兩種語言路由，並於 R2 以 `.mp3` 格式儲存結果

### Modified Capabilities

- `tts-voice-playback`: R2 audio 查找行為改變——由單一 `.wav` key 改為依序嘗試 `.wav` 與 `.mp3`，以相容兩種來源的音訊格式

## Impact

- **`src/lib/tts.ts`**：新增 3 個函式，現有 `synthesize()` 保留不變
- **`scripts/crawl.ts`**：兩處 TTS 呼叫（zh / en）改用 `synthesizeWithFallback()`
- **`scripts/tts-all.ts`**：一處 TTS 呼叫改用 `synthesizeWithFallback()`
- **`src/pages/api/tts/cache.ts`**：加入 fallback 分支，需要 Worker `env.AI` binding
- **`src/pages/api/tts/[...path].ts`**：R2 lookup 邏輯改變
- **`wrangler.toml`**：確認 `[ai]` binding 已設定（`env.AI`）
- **`.github/workflows/crawl.yml`**：不需修改，已有 `CLOUDFLARE_API_TOKEN` 與 `CLOUDFLARE_ACCOUNT_ID`
- **依賴**：不引入任何新的 npm 套件或付費服務
