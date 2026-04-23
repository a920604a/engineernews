## 1. Migration — content_hash 欄位

- [x] 1.1 建立 `migrations/000X_add_content_hash.sql`，ALTER TABLE posts ADD COLUMN content_hash TEXT
- [x] 1.2 同上 ALTER TABLE projects ADD COLUMN content_hash TEXT
- [x] 1.3 確認 migration 編號與現有 migrations 不衝突（0003）

## 2. sync-to-d1.ts — Hash 比對基礎建設

- [x] 2.1 引入 `createHash` from `node:crypto`（已在 sync 腳本中，確認可用）
- [x] 2.2 實作 `computeHash(raw: string): string`（SHA256 hex）
- [x] 2.3 實作 `loadExistingHashes(type: 'posts' | 'projects'): Map<string, string>`，一次 SELECT id, content_hash 建 Map
- [x] 2.4 在 `syncPosts` 與 `syncProjects` 開始前呼叫 `loadExistingHashes`

## 3. sync-to-d1.ts — 增量跳過邏輯

- [x] 3.1 在 `syncPosts` 的 for loop 中，計算 `hash = computeHash(raw)`
- [x] 3.2 比對 `existingHashes.get(id) === hash`，相同則 `continue`（跳過）
- [x] 3.3 不同或不存在則繼續完整 UPSERT 並更新 `content_hash` 欄位
- [x] 3.4 對 `syncProjects` 套用相同邏輯

## 4. sync-to-d1.ts — Vectorize 舊向量清除

- [x] 4.1 確認正確指令：`wrangler vectorize delete-vectors --ids`
- [x] 4.2 實作 `getChunkCount(sourceId, sourceType): number`，query D1 的 doc_chunks COUNT
- [x] 4.3 實作 `deleteOldVectors(sourceId, sourceType)`，重建 chunk IDs 後呼叫 vectorize delete-vectors
- [x] 4.4 在文章 hash 不同時，UPSERT 前先呼叫 `deleteOldVectors`
- [x] 4.5 vectorize delete 失敗時 catch error、印警告，不中斷 sync

## 5. sync-to-d1.ts — 孤立資料清除

- [x] 5.1 實作 `cleanupOrphans`，SELECT id FROM posts/projects 後 diff 本地集合
- [x] 5.2 sync 結束後，計算 `d1Ids - localIds` 得到孤立 id 集合
- [x] 5.3 對每個孤立 id：DELETE doc_chunks、DELETE posts/projects
- [x] 5.4 isProd 時對孤立 id 呼叫 `deleteOldVectors`

## 6. 驗證

- [x] 6.1 本地測試：新增一篇文章，跑 `pnpm sync`，確認只有新文章被處理
- [x] 6.2 本地測試：修改一篇舊文章，跑 `pnpm sync`，確認只有該文章被重跑
- [x] 6.3 本地測試：刪除一篇文章，跑 `pnpm sync`，確認 D1 中對應記錄被清除
- [x] 6.4 本地測試：不改任何文章，跑 `pnpm sync`，確認所有文章皆跳過（0 writes）
- [ ] 6.5 push 至 CI，確認 deploy.yml 的 sync:prod 步驟成功完成
