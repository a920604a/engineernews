## Why

`scripts/sync-to-d1.ts` 目前會同步所有文章（含草稿）到 D1 和 R2，導致未完成的文章被寫入生產資料庫並佔用向量索引空間。需要在同步流程加入明確的篩選條件，確保只有公開且備妥的內容才被寫入。

## What Changes

- `sync-to-d1.ts` 在掃描 `.md` 文章時，跳過 `draft: true`（或未設定 `draft`）的文章，不寫入 D1 / Vectorize
- `sync-to-d1.ts` 在處理 R2 音訊同步時，額外要求 `audio_url` 欄位存在才執行上傳/連結

## Capabilities

### New Capabilities
- `sync-draft-filter`: D1/Vectorize 同步流程的草稿篩選邏輯 — 只有 `draft: false` 的文章才進入 chunk/embed/upsert 管線

### Modified Capabilities
- `tts-cf-ai-fallback`: R2 音訊同步的前置條件新增 `audio_url` 必須存在（原本只依賴 `draft` 狀態；delta spec 描述新的篩選規則）

## Impact

- **`scripts/sync-to-d1.ts`**: 主要修改點，需在文章掃描迴圈加入兩個 guard
- **D1 `doc_chunks`**: 不再含有草稿文章的 chunks（若已有草稿 chunks，需手動清除或重建）
- **Vectorize index**: 同上，草稿向量不再被寫入
- **R2**: 只有具備 `audio_url` 的非草稿文章才會觸發音訊同步
- 無 API / schema 破壞性變更
