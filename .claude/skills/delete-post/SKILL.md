---
name: delete-post
description: 徹底刪除一篇既有文章，連同 D1、Vectorize、R2（OG 圖 + TTS 音檔）與本地 Markdown 一併清除
---

# delete-post skill

把一篇既有文章從所有地方移除：本地 Markdown（含英文版 `.en.md`）、D1 資料表、Vectorize 向量索引、R2 物件（OG 分享圖 + TTS 音檔）、以及本地 `public/og/` 產物。

## 何時使用

使用者說「刪除這篇文章」、「把 XXX 移除」、「連同 D1 / R2 資料一起刪掉」、「下架某篇」時觸發。

## 一篇文章的資料分佈

| 位置 | Key / 路徑 |
|------|-----------|
| 本地 Markdown | `src/content/posts/<cat>/YYYY-MM-DD-slug.md` + `.en.md` |
| D1 `posts` | `id = <cat>/YYYY-MM-DD-slug`（英文版為 `...slug.en`） |
| D1 `doc_chunks` | `source_id = id`、`source_type = 'post'` |
| D1 `page_views` / `post_reactions` / `comments` / `bookmarks` | slug = 前端 post.id |
| Vectorize `engineer-news-index` | chunk id = `post:<sha1(id)前16碼>-<index>` |
| R2 OG 圖 | `posts/<id>`；英文版 `en/posts/<id去.en>` |
| R2 TTS 音檔 | frontmatter `audio_url` → 去掉 `/api/tts/r2/` 前綴 |
| 本地 OG PNG | `public/og/posts-<id斜線轉減號>.png` |

刪除邏輯由 `scripts/delete-post.ts` 統一處理，無需手動下指令逐項清除。

## 執行步驟

1. **確認目標文章**：取得使用者要刪的文章檔案路徑（`src/content/posts/<cat>/...md`）。
   若使用者只給標題或關鍵字，先用 Glob／Grep 在 `src/content/posts/` 找出對應檔案並回報，請其確認。

2. **先跑 dry-run 給使用者看**（不會變動任何資料）：
   ```bash
   make delete-post-dry FILE=src/content/posts/<cat>/YYYY-MM-DD-slug.md
   ```
   列出將被刪除的所有項目（本地檔、D1 表、Vectorize、R2 keys）。

3. **明確取得使用者同意**。刪除不可逆，務必確認後再執行。

4. **實際刪除（遠端 prod）**：
   ```bash
   make delete-post FILE=src/content/posts/<cat>/YYYY-MM-DD-slug.md
   ```
   這會清除遠端 D1、Vectorize、R2，並刪除本地 `.md`（含 `.en.md`）與本地 OG PNG。

5. **提交變更**（本地檔案已被刪除，需 git commit）：
   ```
   chore(post): 刪除文章 <title>
   ```

## 重要注意事項

- **必須先 dry-run、取得同意再執行 `--yes`**。`scripts/delete-post.ts` 預設即為 dry-run，只有 `--yes` 才真的刪除。
- 只給「中文主檔」路徑即可，script 會自動連同 `.en.md` 英文版一起刪除。
- `--prod` 才會操作線上 D1 / Vectorize / R2；不加 `--prod` 只會動本地 D1 與本地檔案（適合本機測試）。
- 遠端操作需要環境變數 `CLOUDFLARE_API_TOKEN` 與 `CLOUDFLARE_ACCOUNT_ID`（通常在 `.env`）。
- 直接用 script（等價於 Make 目標）：
  ```bash
  npx tsx scripts/delete-post.ts --file=<path> --prod          # dry-run
  npx tsx scripts/delete-post.ts --file=<path> --prod --yes    # 實際刪除
  npx tsx scripts/delete-post.ts --id=<cat>/<slug> --prod --yes # 用 id 指定
  ```
