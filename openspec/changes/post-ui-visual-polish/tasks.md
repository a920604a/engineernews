## 1. Visual Foundation & Assets

- [x] 1.1 新增 `/public/favicon.svg` 並在 `BaseLayout.astro` 中引用
- [x] 1.2 定義 Per-category 的 CSS 變數（識別色）於 `global.css`
- [x] 1.3 實作程式碼區塊的 macOS 風格裝飾（CSS 偽元素實作）

## 2. Post Page Visual Polish

- [x] 2.1 在 `[...slug].astro` 實作動態背景的 Hero Banner 與波浪底邊
- [x] 2.2 實作 `ScrollToTop` 組件，包含滾動百分比顯示
- [x] 2.3 實作 `PostPrevNext` 導航組件，並整合至文章底部
- [x] 2.4 優化文章頁面的 TOC 樣式，使其具備視覺錨點與更好的層次感

## 3. Command Center (⌘K)

- [x] 3.1 建立 `CommandCenter.tsx` 基礎結構（React Portal + Overlay）
- [x] 3.2 整合 ⌘K / Ctrl+K 鍵盤事件監聽
- [x] 3.3 串接 Pagefind 搜尋 API 至指令中心介面
- [x] 3.4 實作快速跳轉指令（首頁、分類、專案）

## 4. High-Density Layout & OG Images

- [x] 4.1 重構文章頁佈局，實作 Side-by-Side 模式（CSS Grid）
- [x] 4.2 設定 Satori 產生環境，建立 OG 圖 HTML 模板
- [x] 4.3 實作 Build-time OG 圖產生腳本並整合至 Astro 配置
- [x] 4.4 驗證產出的 OG 圖 metadata 能正確被社交平台偵測
