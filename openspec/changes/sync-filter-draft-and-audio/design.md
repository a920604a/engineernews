## Context

`sync-to-d1.ts` 目前對所有 `.md` 文章（含草稿）進行 chunk/embed/upsert，導致草稿文章進入 D1 `doc_chunks` 表和 Vectorize 向量索引。`tts-all.ts` 同樣不分草稿或非草稿，對所有缺少 `audio_url` 的文章生成 TTS 並上傳 R2。

兩支腳本的現有「跳過」邏輯只依賴 content hash 變化（sync）或 audio_url 已存在（tts），未考慮 `draft` 狀態。

## Goals / Non-Goals

**Goals:**
- `sync-to-d1.ts` 只處理 `draft: false` 的文章（D1 posts + doc_chunks + Vectorize）
- `tts-all.ts` 只對 `draft: false` 的文章生成 TTS；上傳 R2 前需確認 `audio_url` 已設定

**Non-Goals:**
- 不清除已存在的草稿 chunks（舊資料清理由 `make rebuild` 負責）
- 不修改爬蟲 / ingest 流程中的草稿行為
- 不改變 `draft` 欄位的 schema 定義

## Decisions

**D1 guard 放在 hash 比對之前**

在 `syncPosts()` 的 `for (const filePath of files)` 迴圈中，讀取 frontmatter 後立即判斷 `data.draft !== false`，直接 `continue` 跳過整個文章（包括 hash 比對與 `localIds.add`）。

替代方案：放在 hash 比對之後。但此方案仍會把草稿加入 `localIds`，使 cleanup orphan 邏輯將其排除在「孤兒」清除範圍外，造成已刪除草稿的向量殘留。把 guard 放在最前面可確保草稿完全不參與 sync 流程。

*注意*：目前 `matter(raw)` 在 hash 比對之後才呼叫，需要將其移至迴圈較前位置，或重構為先解析 frontmatter 再做 hash 比對。

**TTS guard 與 R2 upload guard 分開**

`tts-all.ts` 的迴圈開頭加一個 `draft !== false` guard（跳過整篇），音訊成功合成後、寫入 R2 前，再確認 `audioUrl` 字串非空（本已由 CF AI / Edge TTS 回傳決定，加明確檢查以避免空 URL 寫入）。

## Risks / Trade-offs

- **已存在的草稿 chunks**：不清除舊有資料。若有草稿已被寫入，需執行 `make rebuild` 重建。
- **`matter()` 呼叫提前**：在 `sync-to-d1.ts` 中，frontmatter 解析會在 hash 比對前執行，輕微增加 I/O，但文章數量有限，無效能顧慮。
- **`draft` 欄位不存在的文章**：按「嚴格模式」處理 — `draft` 未設定（`undefined`）視同 `draft: true`，一律跳過。確保每篇要同步的文章都必須明確寫 `draft: false`。
