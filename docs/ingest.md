# 對話攝取與 Sync 工具

## 內容來源

本站內容有兩個來源：

| 來源 | 工具 | 觸發方式 |
|------|------|---------|
| 工程對話 / 筆記 | `scripts/ingest.ts` | 手動執行 |
| YouTube 頻道爬蟲 | `scripts/crawl.ts` | GitHub Actions 每天自動 |

---

## ingest.ts — 對話攝取

### 互動模式（預設）

```bash
pnpm ingest <conversation.txt>
```

Workers AI 分析對話內容，產生 title / tldr / tags / category，並詢問是否修改標題。確認後手動 commit 與 push。

### 自動模式（--yes）

```bash
pnpm ingest <conversation.txt> --yes
```

跳過所有互動，直接使用 AI 生成的 title，並自動執行：

```
寫入 markdown → git add → git commit → git push
```

push 後 CI 自動觸發部署與 D1 sync。

### 使用的 AI Model

呼叫 **Cloudflare Workers AI** 的 `@cf/meta/llama-3.1-8b-instruct`，將對話分析成結構化 metadata：

```
對話文字 → Llama-3.1-8b → { title, tldr, tags, category }
```

需設定環境變數：`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`

### 工作流程

```mermaid
flowchart LR
  Conv[對話 / 筆記] --> Ingest[pnpm ingest file.txt]
  Ingest --> AI[Workers AI\nllama-3.1-8b]
  AI --> Meta[title / tldr / tags / category]
  Meta --> Mode{--yes?}
  Mode -- 是 --> AutoCommit[git commit + push]
  Mode -- 否 --> Review[人工確認標題]
  Review --> ManualCommit[git commit + push]
  AutoCommit --> CI[GitHub Actions]
  ManualCommit --> CI
  CI --> Deploy[Cloudflare Pages]
  CI --> Sync[sync:prod → D1 + Vectorize]
```

---

## crawl.ts — YouTube 爬蟲

### 執行方式

```bash
pnpm crawl         # 本地（不寫 Vectorize）
pnpm crawl:prod    # 遠端（含 Vectorize embedding）
```

每次執行最多處理 **3 支**新影片（來源 shuffle，不同頻道輪流）。

### 工作流程

```mermaid
flowchart TD
  Cron[GitHub Actions cron\n每天 UTC 02:00] --> Shuffle[隨機排序 9 個來源]
  Shuffle --> Loop[for each source]
  Loop --> List[yt-dlp 列出最新 5 支影片]
  List --> Filter[過濾已處理]
  Filter --> Pick[取第 1 支新影片]
  Pick --> Sub[yt-dlp 下載字幕\nzh-TW > zh > en]
  Sub -- 有字幕 --> AI[Workers AI 生成\n繁體中文摘要]
  Sub -- 無字幕 --> Fallback[title + description fallback]
  Fallback --> AI
  AI --> Write[寫入 posts/crawled/VIDEO_ID.md\ntype: crawled]
  Write --> Count{已達 3 支?}
  Count -- 是 --> Commit[git commit + push\nauthor: a920604a]
  Count -- 否 --> Loop
  Commit --> CI[deploy.yml 觸發]
  CI --> Deploy[Cloudflare Pages]
  CI --> Sync[sync:prod → D1 + Vectorize]
```

### 來源設定

來源清單維護在 `scripts/sources.ts`，新增頻道只需在 `SOURCES` 陣列加一筆 `Source` 物件並設定 `enabled: true`。

目前收錄 9 個繁體中文 YouTube 頻道（AI、工程、職涯、個人成長）。

---

## sync-to-d1.ts — 增量同步機制

為了節省 API 呼叫額度並提升速度，`sync-to-d1.ts` 採用了基於 Hash 的增量更新機制。

### 工作流程

```mermaid
flowchart TD
  Start[啟動 Sync] --> LoadHashes[一次性載入 D1 所有 content_hash]
  LoadHashes --> Loop[遍歷本地所有 MD 檔案]
  Loop --> CalcHash[計算本地內容 SHA256 Hash]
  CalcHash --> Compare{Hash 是否一致?}
  
  Compare -- 是 --> Skip[跳過該文章]
  Compare -- 否 --> DeleteVec[刪除 Vectorize 舊向量\n依據舊 chunk 數量重建 IDs]
  DeleteVec --> UpsertD1[UPSERT D1 紀錄\n更新 content_hash]
  UpsertD1 --> SyncChunks[重新切割 Chunks 並寫入 D1]
  SyncChunks --> Embed[重新產生 Embedding 並寫入 Vectorize]
  
  Skip --> Next[下一篇]
  Embed --> Next
  Next --> Loop
  Loop -- 結束遍歷 --> Cleanup[孤立資料清理\nOrphan Cleanup]
  Cleanup --> Done[完成]
```

### 核心特性

1.  **增量跳過**：內容未改動的文章完全不會觸發 D1 寫入或 AI 向量計算，大幅縮短 CI 執行時間。
2.  **精準清理向量**：更新文章時，會先根據 D1 中記錄的舊 chunk 數量重建 chunk IDs（格式：`type:hash-index`），精準呼叫 `vectorize delete`，避免索引殘留。
3.  **孤立資料處理 (Orphan Cleanup)**：
    *   比對「本地檔案集合」與「D1 現有 ID 集合」。
    *   若 D1 中存在但本地已刪除的 ID，會自動清除 D1 紀錄及其對應的所有向量。

---

## 指令速查

| 指令 | 說明 |
|------|------|
| `pnpm ingest <file>` | 互動模式攝取對話 |
| `pnpm ingest <file> --yes` | 全自動攝取 + push |
| `pnpm crawl` | 本地爬蟲（不寫 Vectorize） |
| `pnpm crawl:prod` | 遠端爬蟲（含 Vectorize） |
| `pnpm sync` | 同步至本地 D1 |
| `pnpm sync:prod` | 同步至遠端 D1 + Vectorize（增量模式） |
