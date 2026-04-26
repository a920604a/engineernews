## 1. Share Card Pipeline

- [x] 1.1 抽出共用的 route-to-image helper，讓 BaseLayout、文章頁與產圖腳本使用同一套命名規則
- [x] 1.2 加入 Cloudflare R2 bucket binding 與必要的部署設定
- [x] 1.3 新增 OG 產生 endpoint，支援 `/posts/...` 與 `/en/posts/...` 的 runtime 請求
- [x] 1.4 實作 R2 cache lookup，存在時直接回傳，不存在時生成並寫入 R2
- [x] 1.5 更新 `src/layouts/BaseLayout.astro` 的 `og:image` / `twitter:image` 指向 helper 產生的分享卡 URL

## 2. Article Share UI

- [x] 2.1 新增文章分享面板元件，提供 native share、copy link、download card 三個動作
- [x] 2.2 將分享面板插入 `src/pages/posts/[...slug].astro`
- [x] 2.3 將分享面板插入 `src/pages/en/posts/[...slug].astro`

## 3. Interaction Details

- [x] 3.1 實作 `navigator.share` 與 clipboard fallback 邏輯
- [x] 3.2 加上分享成功 / 失敗的狀態回饋與無障礙標籤
- [x] 3.3 確保下載動作會下載目前文章路由對應的分享卡圖片

## 4. Verification

- [x] 4.1 執行 build，確認 runtime OG endpoint 與頁面 metadata 編譯無誤
- [x] 4.2 連續請求同一篇 zh-TW 文章的分享卡，確認第二次請求命中快取且不重新生成
- [x] 4.3 英文文章目前仍無樣本可手動驗證，保留說明即可，不影響 change 完成
