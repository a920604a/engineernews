## MODIFIED Requirements

### Requirement: CF AI Output Stored as MP3 in R2
CF AI 合成的音訊 SHALL 以 `.mp3` 格式存入 R2，R2 key 為 `tts/{slug}.mp3`，Content-Type 為 `audio/mpeg`。在執行 R2 上傳前，系統 SHALL 確認文章 `draft` 為 `false` 且 `audioUrl` 字串非空；任一條件不符時，SHALL 跳過 R2 上傳，不更新 `audio_url` 欄位。

#### Scenario: CF AI 合成成功後存 R2（非草稿）
- **WHEN** CF AI 回傳 binary audio 資料，且文章 `draft` 為 `false`，且 `audioUrl` 字串非空
- **THEN** 系統 SHALL 將其以 `tts/{slug}.mp3` 存入 R2，並將 `audio_url` 設為 `/api/tts/r2/tts/{slug}.mp3`

#### Scenario: 草稿文章略過 R2 上傳
- **WHEN** 文章 `draft` 為 `true` 或未設定
- **THEN** 系統 SHALL 跳過 TTS 合成與 R2 上傳，不修改文章 frontmatter

#### Scenario: audioUrl 為空略過 R2 上傳
- **WHEN** TTS 合成完成但回傳的 `audioUrl` 為空字串
- **THEN** 系統 SHALL 記錄警告，跳過 R2 上傳，不寫入空 URL

#### Scenario: CF AI 合成失敗
- **WHEN** CF AI API 回傳錯誤或非 2xx
- **THEN** 系統 SHALL 記錄錯誤警告，跳過 TTS，不中斷主流程

## ADDED Requirements

### Requirement: Draft Posts Excluded from TTS Pipeline
`tts-all.ts` 在掃描文章時，SHALL 跳過所有 `draft !== false` 的文章，不觸發 Edge TTS health check、TTS 合成或 R2 上傳。

#### Scenario: draft: false 文章無 audio_url
- **WHEN** 文章 `draft` 為 `false` 且 frontmatter 中無 `audio_url`
- **THEN** 系統 SHALL 繼續執行 TTS 合成流程（現有行為）

#### Scenario: draft: true 文章
- **WHEN** 文章 `draft` 為 `true` 或欄位缺失
- **THEN** 系統 SHALL 跳過，記錄 `⏭️ 跳過（草稿）: <filename>`，不做任何 TTS 處理
