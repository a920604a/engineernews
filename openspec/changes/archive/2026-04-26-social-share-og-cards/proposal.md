## Why

目前文章頁雖然已經有 `og:image`，但它只是被動存在於 meta tag；讀者要把內容分享到社群時，實際上仍然只是丟一條連結。這種分享方式沒有畫面感，也沒有把 Engineer News 的品牌識別一起帶出去。

同時，現有 OG 圖檔命名與文章路由之間有落差，尤其是英文章節頁面，會讓分享預覽與下載圖卡更容易失真或失敗。

## What Changes

- 在文章頁加入分享面板，提供 `native share`、`copy link`、`download card` 三種動作。
- 將既有 OG 圖生成流程升級為文章分享卡的單一來源，讓社群預覽與下載圖卡共用同一張圖。
- 改成 runtime on-demand 產圖，首次請求時生成並寫入 Cloudflare R2，之後直接回傳快取結果，不重複生成。
- 修正 OG 圖路徑與文章路由的對應，確保 `/posts/...` 與 `/en/posts/...` 都能拿到正確圖片。
- 讓分享圖卡的品牌、標題與分類資訊固定為可預期格式，維持社群預覽一致性。
- 讓分享面板在沒有 `navigator.share` 或 clipboard 權限時仍可退化成可用的 copy/download 行為。

## Capabilities

### New Capabilities
- `share-card-generation`: 生成與文章路由對應的分享圖卡，並供 `og:image` / `twitter:image` 使用。
- `share-card-cache`: 將已生成的分享圖卡快取在 R2，避免相同文章重複生成。
- `post-social-sharing`: 在文章頁提供分享入口與互動動作。

### Modified Capabilities
- None

## Impact

- `src/layouts/BaseLayout.astro`: 社群 metadata 需要指向正確的分享圖卡。
- `src/pages/posts/[...slug].astro`、`src/pages/en/posts/[...slug].astro`: 需要加入分享面板入口與圖卡下載行為。
- `scripts/generate-og.ts`: 需要讓輸出的檔名與路由一致，支援英文章節頁。
- `src/components/`: 可能新增分享面板或共用 helper。
- `src/pages/api/og/[...slug].ts` 或等效 Worker 路由：需要承接 on-demand 產圖、查詢快取並回傳圖片。
- `wrangler.jsonc`: 需要加入 R2 bucket binding 與對應部署設定。
