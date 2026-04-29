## MODIFIED Requirements

### Requirement: R2 Audio Lookup（Multi-format）
系統在透過 `/api/tts/r2/{key}` 存取 R2 音訊時，SHALL 支援同一 slug 可能存在 `.wav`（Edge TTS）或 `.mp3`（CF AI）兩種格式，並依序嘗試。

原先行為：只查找固定的 `tts/{slug}.wav`。

更新後行為：
1. 先 HEAD `tts/{slug}.wav`，找到則回傳 `audio/wav`
2. 若不存在，再 HEAD `tts/{slug}.mp3`，找到則回傳 `audio/mpeg`
3. 兩者皆不存在則回傳 404

#### Scenario: R2 存有 .wav 格式（Edge TTS 生成）
- **WHEN** 請求 `/api/tts/r2/tts/{slug}.wav` 或相對應路徑
- **THEN** 系統 SHALL 直接回傳 `.wav` 檔案，Content-Type 為 `audio/wav`

#### Scenario: R2 存有 .mp3 格式（CF AI 生成）
- **WHEN** R2 中 `tts/{slug}.wav` 不存在，但 `tts/{slug}.mp3` 存在
- **THEN** 系統 SHALL 回傳 `.mp3` 檔案，Content-Type 為 `audio/mpeg`

#### Scenario: R2 兩種格式皆不存在
- **WHEN** `tts/{slug}.wav` 與 `tts/{slug}.mp3` 皆不存在於 R2
- **THEN** 系統 SHALL 回傳 404

### Requirement: API Health Check Before Synthesis（Extended）
原有需求「API Health Check」擴展：health check 失敗時不再視為「無法合成」，而是觸發 CF AI fallback。

#### Scenario: 無預合成音訊且 Edge TTS 不可用
- **WHEN** 文章無 `audio_url`，且 Edge TTS health check 失敗
- **THEN** 系統 SHALL fallback 到 CF AI 合成，而非直接隱藏播放器

#### Scenario: 無預合成音訊且 Edge TTS 與 CF AI 皆不可用
- **WHEN** Edge TTS health check 失敗，且 CF AI 合成也失敗
- **THEN** 元件 SHALL 顯示錯誤訊息並保持隱藏
