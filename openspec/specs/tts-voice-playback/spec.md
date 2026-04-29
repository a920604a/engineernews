## 新增需求 (ADDED Requirements)

### 需求：生成時自動合成 (Requirement: Automated Synthesis on Generation)
系統應在生成新文章（透過 `ingest.ts`）時，自動調用 TTS API 合成音訊。

#### 情境：成功自動合成
- **當 (WHEN)** 文章內容生成並寫入檔案後
- **且 (AND)** 遠端 TTS API 可連通時
- **則 (THEN)** 系統應調用合成接口並將得到的 `audio_url` 與 `srt_url` 儲存於文章的 Frontmatter 中

#### 情境：自動合成失敗
- **當 (WHEN)** TTS API 無法連通或合成出錯時
- **則 (THEN)** 系統應記錄錯誤日誌並完成文章生成（不含音訊欄位），不應中斷整個 ingestion 流程

### 需求：優先使用預合成音訊 (Requirement: Prefer Pre-synthesized Audio)
`TTSPlayer` 元件應優先檢測並使用文章 Frontmatter 中已有的音訊連結。

#### 情境：使用 Frontmatter 音訊
- **當 (WHEN)** 文章 Frontmatter 包含有效的 `audio_url` 時
- **則 (THEN)** `TTSPlayer` 應載入該音軌，無需再次發送合成請求

### 需求：API 健康檢查（擴展）(Requirement: API Health Check Before Synthesis, Extended)
系統應在顯示任何 TTS 相關 UI 元素之前，先檢查遠端 TTS API 節點的可用性（若無預合成音訊）。health check 失敗時不再視為「無法合成」，而是觸發 CF AI fallback。

#### 情境：無預合成音訊且 API 可連通
- **當 (WHEN)** 文章無 `audio_url` 且 API 健康檢查成功時
- **則 (THEN)** 元件應顯示「合成並收聽」按鈕

#### 情境：無預合成音訊且 Edge TTS 不可���
- **當 (WHEN)** 文章無 `audio_url`，且 Edge TTS health check 失敗
- **則 (THEN)** 系統 SHALL fallback 到 CF AI 合成，而非直接隱藏播放器

#### 情境：無預合成音訊且 Edge TTS 與 CF AI 皆不可用
- **當 (WHEN)** Edge TTS health check 失敗，且 CF AI 合成也失敗
- **則 (THEN)** 元件 SHALL 顯示錯誤訊息並保持隱藏

### 需求：R2 音檔多格式查找 (Requirement: R2 Audio Lookup, Multi-format)
系統在透過 `/api/tts/r2/{key}` 存取 R2 音訊時，SHALL 支援同一 slug 可能存在 `.wav`（Edge TTS）或 `.mp3`（CF AI）兩種格式，並依序嘗試。

#### Scenario: R2 存有 .wav 格式（Edge TTS 生成）
- **WHEN** 請求對應 slug 的音檔，R2 中有 `tts/{slug}.wav`
- **THEN** 系統 SHALL 直接回傳 `.wav` 檔案，Content-Type 為 `audio/wav`

#### Scenario: R2 存有 .mp3 格式（CF AI 生成）
- **WHEN** R2 中 `tts/{slug}.wav` 不存在，但 `tts/{slug}.mp3` 存在
- **THEN** 系統 SHALL 回傳 `.mp3` 檔案，Content-Type 為 `audio/mpeg`

#### Scenario: R2 兩種格式皆不存在
- **WHEN** `tts/{slug}.wav` 與 `tts/{slug}.mp3` 皆不存在於 R2
- **THEN** 系統 SHALL 回傳 404
