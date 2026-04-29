# Spec: TTS Cloudflare AI Fallback

### Requirement: Edge TTS Health Check Before Synthesis
系統在每次 TTS 合成前，SHALL 先對 Edge TTS server 執行 health check（HEAD request，3 秒 timeout），再決定使用哪個合成引擎。

#### Scenario: Edge TTS server 可用
- **WHEN** HEAD `{TTS_API_URL}/api/tts/voices` 在 3 秒內回傳 2xx
- **THEN** 系統 SHALL 使用 Edge TTS server 合成音訊（維持現有流程）

#### Scenario: Edge TTS server 不可用
- **WHEN** HEAD request 超時或回傳非 2xx（包括 `TTS_API_URL` 未設定的情況）
- **THEN** 系統 SHALL 自動 fallback 到 Cloudflare Workers AI 合成

#### Scenario: CI 環境無 TTS server
- **WHEN** 環境變數 `TTS_API_URL` 未設定（預設指向 localhost:8008）
- **THEN** health check 必然失敗，系統 SHALL 直接使用 CF AI，不應拋出未捕獲的錯誤

### Requirement: CF AI Language Routing
系統 SHALL 根據文章 `lang` 欄位選擇對應的 CF AI TTS 模型，且只使用免費額度內的模型。

#### Scenario: 中文文章 fallback
- **WHEN** `lang` 為 `'zh'` 或未指定，且 Edge TTS 不可用
- **THEN** 系統 SHALL 呼叫 `@cf/myshell-ai/melotts`，lang 參數設為 `'zh'`

#### Scenario: 英文文章 fallback
- **WHEN** `lang` 為 `'en'`，且 Edge TTS 不可用
- **THEN** 系統 SHALL 呼叫 `@cf/deepgram/aura-2-en`

### Requirement: CF AI Output Stored as MP3 in R2
CF AI 合成的音訊 SHALL 以 `.mp3` 格式存入 R2，R2 key 為 `tts/{slug}.mp3`，Content-Type 為 `audio/mpeg`。

#### Scenario: CF AI 合成成功後存 R2
- **WHEN** CF AI 回傳 binary audio 資料
- **THEN** 系統 SHALL 將其以 `tts/{slug}.mp3` 存入 R2，並將 `audio_url` 設為 `/api/tts/r2/tts/{slug}.mp3`

#### Scenario: CF AI 合成失敗
- **WHEN** CF AI API 回傳錯誤或非 2xx
- **THEN** 系統 SHALL 記錄錯誤警告，跳過 TTS，不中斷主流程

### Requirement: Node.js Scripts Use CF AI REST API
在 Node.js 腳本環境（`crawl.ts`、`tts-all.ts`）中，SHALL 透過 Cloudflare REST API 呼叫 CF AI，使用環境變數 `CLOUDFLARE_ACCOUNT_ID` 與 `CLOUDFLARE_API_TOKEN`。

#### Scenario: CI 環境批次合成
- **WHEN** `crawl.ts` 在 GitHub Actions 中執行，Edge TTS health check 失敗
- **THEN** 系統 SHALL 使用 CF REST API 合成音訊，`CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` 由 GitHub Secrets 提供

#### Scenario: Token 未設定
- **WHEN** `CLOUDFLARE_API_TOKEN` 或 `CLOUDFLARE_ACCOUNT_ID` 未設定
- **THEN** 系統 SHALL 記錄警告並跳過 TTS，不拋出未捕獲的錯誤

### Requirement: Worker Uses env.AI Binding for CF AI
在 Cloudflare Worker 環境（`cache.ts`），SHALL 使用已有的 `env.AI` binding 呼叫 CF AI，不需 API Token。

#### Scenario: Worker fallback 合成
- **WHEN** `cache.ts` 中 Edge TTS health check 失敗
- **THEN** 系統 SHALL 呼叫 `env.AI.run(model, params)` 合成音訊，結果存入 R2
