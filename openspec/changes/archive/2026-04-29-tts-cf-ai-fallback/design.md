## Context

目前 TTS 合成的唯一來源是外部 Python FastAPI server（`edge_tts`），透過環境變數 `TTS_API_URL`（預設 `http://localhost:8008`）指定。GitHub Actions（`crawl.yml`）每 6 小時自動爬文，但 CI 環境沒有 TTS server，導致 `synthesize()` 必然失敗、`audio_url` 留空。

現有路徑：
- `src/lib/tts.ts` 的 `synthesize()` → POST `{TTS_API_URL}/api/tts/synthesize` → 回傳 `{ audio_url }` → 下載 `.wav` → 上傳 R2
- `src/pages/api/tts/cache.ts` → 同樣 proxy 到 TTS server
- R2 lookup：固定找 `tts/{slug}.wav`

`wrangler.jsonc` 已設定 `"ai": { "binding": "AI" }`，Worker 內可直接用 `env.AI.run()`。

## Goals / Non-Goals

**Goals:**
- Edge TTS server 不可用時自動 fallback 到 CF Workers AI 免費模型
- CI/CD 環境（無 TTS server）也能成功合成並存入 R2
- 不改動現有 Edge TTS 路徑，不破壞已有 `audio_url`
- 不引入任何新 npm 套件或付費服務

**Non-Goals:**
- 取代 Edge TTS 作為主要引擎（Edge TTS 品質較優，仍是首選）
- 支援付費 partner models（MiniMax、Inworld、OpenAI）
- 串流（stream）路徑的 fallback（讀者手動觸發的串流維持原樣）
- SRT 字幕生成（CF AI 模型不支援）

## Decisions

### 1. Fallback 觸發：Health Check per Request

**決策**：每次合成前先 `HEAD {TTS_API_URL}/api/tts/voices`，超時 3 秒視為不可用，直接走 CF AI。

**理由**：
- 實作最簡單，不需要 KV 或定期 cron
- CI 環境 `TTS_API_URL` 未設定時直接 fallback，無需額外邏輯
- 3 秒 timeout 避免 Edge TTS 慢速拖延整個 pipeline

**替代方案考慮**：
- KV cached health state（5 分鐘 TTL）：後續請求零延遲決策，但需要 KV binding 和 cron，複雜度高
- 純 try/catch（無 pre-check）：第一次 Edge TTS 失敗前會等完整 timeout，體驗較差

---

### 2. 兩種執行環境各自呼叫 CF AI

**Node.js 腳本**（`crawl.ts`、`tts-all.ts`）無法使用 Worker binding，改用 CF AI REST API：
```
POST https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/{model}
Authorization: Bearer {CLOUDFLARE_API_TOKEN}
→ 回傳 binary audio/mpeg（MP3）
```

**Worker**（`cache.ts`）使用已有的 `env.AI` binding：
```typescript
const result = await env.AI.run('@cf/myshell-ai/melotts', { prompt: text, lang: 'zh' });
// result 為 { audio: string } (base64) 或 ArrayBuffer，依 binding 版本
```

**語言路由**：
- `lang === 'en'` → `@cf/deepgram/aura-2-en`（參數：`{ text }`）
- 其他（zh 或未指定） → `@cf/myshell-ai/melotts`（參數：`{ prompt, lang: 'zh' }`）

---

### 3. 音訊格式與 R2 Key 並存策略

Edge TTS → `.wav`，CF AI → `.mp3`，兩者分開存、分開查：

| 來源 | R2 Key | Content-Type |
|------|--------|--------------|
| Edge TTS | `tts/{slug}.wav` | `audio/wav` |
| CF AI | `tts/{slug}.mp3` | `audio/mpeg` |

`[...path].ts` R2 lookup 改為：
1. HEAD `tts/{slug}.wav` → 200 則回傳
2. HEAD `tts/{slug}.mp3` → 200 則回傳
3. 都沒有 → 404

`audio_url` 路徑格式對應改為 `/api/tts/r2/tts/{slug}.wav` 或 `/api/tts/r2/tts/{slug}.mp3`，前端 `<audio>` 標籤無需感知格式差異。

---

### 4. `synthesizeWithFallback()` 統一介面

在 `src/lib/tts.ts` 新增，供 Node.js 腳本呼叫：

```typescript
async function synthesizeWithFallback(
  text: string,
  lang: string,            // 'zh' | 'en'
  slug: string,
  opts: {
    ttsApiUrl: string;
    accountId: string;
    apiToken: string;
    isProd: boolean;
  }
): Promise<string>         // 回傳 R2 public URL
```

內部流程：
1. `checkEdgeTTSHealth(ttsApiUrl)` → boolean
2. true → 現有 `synthesize()` + download + uploadToR2 (`.wav`)
3. false → `synthesizeCFAI(text, lang, accountId, apiToken)` → ArrayBuffer → uploadToR2 (`.mp3`)

Worker 端（`cache.ts`）因為有 `env.AI` binding，不使用此函式，自行實作 health check + `env.AI.run()`。

## Risks / Trade-offs

- **[風險] MeloTTS 中文腔調**：MeloTTS 以 Simplified Chinese 訓練，zh-TW 口音不如 Edge TTS 的 `zh-TW-HsiaoChenNeural`。**緩解**：僅作 fallback，Edge TTS 可用時優先。

- **[風險] CF AI `audio` 回傳格式**：`env.AI.run()` 的回傳值可能是 base64 string 或 ArrayBuffer，需在實作時驗證並處理兩種情況。**緩解**：加 `typeof` 判斷，兩者都 handle。

- **[風險] aura-2-en API 參數未完全確認**：文件顯示參數為 `text`，但可能需要額外的 `voice` 欄位。**緩解**：實作時以最小參數測試，錯誤時補齊。

- **[風險] R2 lookup 由 1 次變 2 次 HEAD**：每次找不到 `.wav` 才試 `.mp3`，多一次 R2 讀取。**緩解**：R2 HEAD 極快（< 10ms），整體影響可忽略；且多數文章只存一種格式。

- **[Trade-off] Stream 路徑不 fallback**：讀者手動觸發的串流（`/api/tts/stream`）不加 fallback，Edge TTS 掛掉時讀者只會看到錯誤訊息。串流需要 chunk-by-chunk 輸出，CF AI 目前不支援真正串流，實作複雜度高，留待後續。

## Open Questions

- MeloTTS 的 `lang` 參數：CF 文件只有 `'en'`、`'fr'` 範例，中文是 `'zh'`？`'ZH'`？需實測確認。
- `aura-2-en` 的完整 input schema（是否需要 `voice` 欄位）？
