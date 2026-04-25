## Why

目前的 UI 視覺與互動體驗較為傳統，對比現代技術部落格，缺乏「工具感」與「專業感」。為了在體驗上領先，我們需要進行全面的視覺打磨與互動革命，將平台打造為一個高效的工程師終端。

## What Changes

- **指揮中心 UI (Command Palette)**：實作全局 ⌘K 介面，支援快速導航與對話式搜尋。
- **高密度內容排版**：設計文章頁的 Side-by-Side 模式，將 AI 摘要與圖表置於側邊。
- **動態技術風格 OG 圖**：自動為每篇文章產出高品質的技術風格分享圖。
- **文章頁視覺打磨**：
  - 新增 hero banner、SVG 分隔線與 scroll-to-top 進度條。
  - 程式碼區塊加入 macOS 風格裝飾條。
  - 每篇文章底部加入前後篇導航卡片。
- **品牌基礎建設**：新增 favicon 與 per-category 的識別配色。

## Capabilities

### New Capabilities
- `command-center`: 全局指令入口 (⌘K)。
- `high-density-reader`: Side-by-Side 的技術閱讀佈局。
- `dynamic-og-images`: 自動化的 OG 分享圖產生器。
- `post-visual-polish`: Hero banner, Scroll-to-top, Prev/Next Nav, Code block decorations.

### Modified Capabilities
- `portfolio-system`: 調整 CSS 全局樣式與 Category 識別色。

## Impact

- 大規模重構 `src/layouts/` 與 `src/components/`。
- 新增 `src/components/CommandCenter.tsx`。
- 修改 `src/pages/posts/[...slug].astro`。
