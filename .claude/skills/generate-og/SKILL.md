---
name: generate-og
description: 生成 / 預熱文章的 OG 分享圖（社群分享卡 + 文章頁 hero 背景）。當 admin 顯示 R2 OG 數量偏低、剛重生大量文章、或上線前想一次補滿 OG 快取時使用。
---

# generate-og skill

把文章的 OG 圖（Open Graph 分享圖）補齊。OG 圖用在三處：社群分享卡（`og:image` / `twitter:image`）、文章頁的模糊 hero 背景、分享面板。

## 先搞懂：兩套機制（別搞混）

| 機制 | 產物位置 | 誰在用 | 工具 |
|------|---------|--------|------|
| **按需生成 + 快取 R2** | R2 `engineer-news-og-images`（key：`posts/<id>`、`en/posts/<id>`、`site`） | **線上實際服務的就是這個** | `/api/og/[...slug].ts`（自動）；`scripts/prewarm-og.ts`（主動預熱） |
| 本地靜態預生成 | `public/og/posts-<id>.png` | 建置產物，非線上 OG 來源 | `scripts/generate-og.ts` |

**關鍵**：admin 看的「R2 OG 數量」只反映**第一種**。要讓它變多 → 用 **prewarm**，不是 `generate-og.ts`。

OG 是 lazy 快取：沒人開過頁面，R2 就沒有那張圖（admin 顯示 0/偏低是正常、非錯誤）。滿載時 ≈ `已發佈文章數 + 1`（每篇每語言一張 + 一張 `site.png`）。

## 何時使用

- admin 顯示 R2 OG 數量遠低於 posts 數，想一次補滿
- 剛重生 / 還原大量文章（OG 被刪過），想預熱避免首次分享要等即時生成
- 上線 / 大改版前的暖機

## 執行步驟（預熱 R2，主要路徑）

1. **先確認文章已部署**：prewarm 打的是「**已部署的線上站**」(`https://engineer-news.pages.dev`)，不是本地 dev。新文章必須先 push + deploy 成功才存在。

2. **dry-run 看會打哪些 URL**（不送請求）：
   ```bash
   npx tsx scripts/prewarm-og.ts --dry-run
   ```
   只處理 `draft:false` 的文章；自動含 zh（`/api/og/posts/<id>.png`）、en（`/api/og/en/posts/<id>.png`）與 `site.png`。

3. **實際預熱**（Node ≥ 20）：
   ```bash
   npx tsx scripts/prewarm-og.ts
   # 單篇：--file=src/content/posts/<cat>/YYYY-MM-DD-slug.md
   # 換站：--base=https://<your-domain>
   ```
   冪等：每個 URL GET 一次，端點命中既有快取直接回傳、未命中才生成並寫入 R2。

4. **驗證 R2 OG 數量**（需 `set -a; . ./.env; set +a`）：
   ```bash
   curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/engineer-news-og-images/objects?per_page=1000" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     | python3 -c "import sys,json; d=json.load(sys.stdin); print('OG:', sum(1 for o in d['result'] if not o['key'].startswith('tts/')))"
   ```

## 本地靜態（次要，少用）

只在需要 `public/og/*.png` 靜態檔時用，**不影響線上 OG / R2**：
```bash
npx tsx scripts/generate-og.ts          # 跳過已存在
npx tsx scripts/generate-og.ts --force  # 全部重生
```

## 注意事項

- **不要刪 OG 機制**：它被 `og:image` / `twitter:image` / hero 背景 / SharePanel 使用，刪了會破壞分享卡與文章頁外觀。
- OG 圖是每篇每語言各一張（中英標題不同），與 D1 posts 1:1，**不是除以二**。
- 真正該維持的不變式是 `D1 posts == draft:false .md`；R2 OG/TTS 是 cache/選配，會按需逼近 posts 數，不適合當即時等式。
- prewarm 會對線上端點發請求、觸發 Workers AI / satori 生成，量大時留意用量。

## 相關檔案

- `scripts/prewarm-og.ts` — 預熱 R2 OG（主要）
- `scripts/generate-og.ts` — 本地靜態 OG（次要）
- `src/pages/api/og/[...slug].ts` — 按需生成 + R2 快取端點
- `src/lib/shareCard.ts` — OG URL / cache key 規則
