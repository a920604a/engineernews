## 1. sync-to-d1.ts — Draft Filter

- [x] 1.1 在 `syncPosts()` 的文章掃描迴圈中，將 `matter(raw)` 呼叫移至 hash 比對之前（或複製一次輕量解析）
- [x] 1.2 加入 draft guard：`if (data.draft !== false) { skipped++; continue; }`，放在 `localIds.add(id)` 之前，確保草稿不進入 `localIds`
- [x] 1.3 更新 skip log：`console.log` 中分別顯示「hash unchanged」與「draft skipped」的計數
- [x] 1.4 本地測試：建立一篇 `draft: true` 的測試文章，執行 `make sync`，確認不出現在 D1 `posts` 與 `doc_chunks`

## 2. tts-all.ts — Draft Filter

- [x] 2.1 在 `tts-all.ts` 的文章掃描迴圈開頭，加入 draft guard：`if (data.draft !== false) { console.log(...); continue; }`
- [x] 2.2 在 R2 上傳前，加入 audioUrl 非空斷言：`if (!audioUrl) { console.warn(...); continue; }`
- [x] 2.3 本地測試：建立一篇 `draft: true` 的測試文章，執行 `make tts-all`，確認被跳過且 log 顯示草稿提示

## 3. 驗證與清理

- [ ] 3.1 若 D1 中已存在草稿文章的 chunks，執行 `make rebuild` 重建 D1 + Vectorize（或手動 DELETE FROM doc_chunks WHERE post_id IN (...)）
- [ ] 3.2 執行 `make sync-prod` 驗證生產環境同步結果符合預期（僅非草稿文章被更新）
