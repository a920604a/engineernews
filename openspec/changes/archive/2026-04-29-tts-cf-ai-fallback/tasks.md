## 1. src/lib/tts.ts — 新增 Fallback 函式

- [x] 1.1 新增 `checkEdgeTTSHealth(baseUrl: string): Promise<boolean>`，HEAD `{baseUrl}/api/tts/voices`，3 秒 timeout，失敗回傳 false
- [x] 1.2 新增 `synthesizeCFAI(text: string, lang: string, accountId: string, apiToken: string): Promise<ArrayBuffer>`，根據 lang 選擇模型（`@cf/myshell-ai/melotts` 或 `@cf/deepgram/aura-2-en`），呼叫 CF REST API，回傳 binary MP3
- [x] 1.3 新增 `synthesizeWithFallback(text, lang, slug, opts): Promise<string>`，整合 health check → Edge TTS（.wav）→ CF AI（.mp3）→ 上傳 R2 → 回傳 public URL
- [x] 1.4 驗證 MeloTTS 的 lang code（`'zh'` or `'ZH'`），以及 aura-2-en 的完整 input schema，更新實作

## 2. scripts/crawl.ts — 替換 TTS 呼叫

- [x] 2.1 在中文文章段落（~line 616）將 `synthesize()` + download + uploadToR2 替換為 `synthesizeWithFallback()`
- [x] 2.2 在英文文章段落（~line 679）同樣替換，lang 傳 `'en'`
- [x] 2.3 確認 `CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN` 由 `process.env` 讀取並傳入

## 3. scripts/tts-all.ts — 替換 TTS 呼叫

- [x] 3.1 在 `processPost()` 函式中將 `synthesize()` + download + uploadToR2 替換為 `synthesizeWithFallback()`
- [x] 3.2 確認 `voice` 欄位邏輯改為 `lang` 判斷（原本 `data.lang === 'en'` 分支保留）

## 4. src/pages/api/tts/cache.ts — Worker Fallback

- [x] 4.1 在 Mode 2（synthesize via TTS API）路徑加入：先 `checkEdgeTTSHealth(TTS_API_URL)` 
- [x] 4.2 health check 成功 → 維持現有 proxy 流程（.wav）
- [x] 4.3 health check 失敗 → 呼叫 `env.AI.run(model, params)`，處理回傳值（base64 string 或 ArrayBuffer 兩種情況）
- [x] 4.4 CF AI 結果存 R2 為 `tts/{slug}.mp3`，回傳 `{ audio_url: '/api/tts/r2/tts/{slug}.mp3' }`

## 5. src/pages/api/tts/[...path].ts — R2 Multi-format Lookup

- [x] 5.1 在 R2 路徑段（`path?.startsWith('r2/')`）中，將單次 `OG_IMAGES.get(key)` 改為：先 get `.wav`，若 null 再 get `.mp3`
- [x] 5.2 根據實際取到的 key 副檔名設定正確的 Content-Type（`audio/wav` 或 `audio/mpeg`）

## 6. 驗證與整合測試

- [ ] 6.1 本地測試：停掉 TTS server，執行 `pnpm crawl`，確認 CF AI fallback 觸發並生成 `.mp3`
- [ ] 6.2 確認 R2 中有 `tts/{slug}.mp3`，且 `/api/tts/r2/tts/{slug}.mp3` 可正常播放
- [ ] 6.3 確認 `pnpm tts-all` 在 Edge TTS 不可用時也能透過 CF REST API 完成批次
- [ ] 6.4 確認 Edge TTS 可用時，原有 `.wav` 流程不受影響
<!-- 驗證任務需手動執行，請在本地測試後手動勾選 -->
