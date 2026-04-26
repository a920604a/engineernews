## Context

目前的 UI 視覺與互動體驗雖然穩健，但缺乏吸引力與工具感。為了在個人品牌與技術影響力上超越同類競爭者，我們需要將現有的 Astro 站點升級為一個具備現代感、指令驅動且視覺層次分明的工程師終端。這涉及到從全站指令層（⌘K）到細微 CSS 打磨（代碼塊、導航卡片）的全面提升。

## Goals / Non-Goals

**Goals:**
- **極速互動**：實作全站 ⌘K 指揮中心。
- **閱讀效率**：推出 Side-by-Side 高密度佈局模式。
- **品牌傳播**：實作自動化的動態 OG 圖產生器。
- **視覺一致性**：完成 Hero Banner、波浪底邊、MacOS 風格代碼塊等打磨。

**Non-Goals:**
- 重新開發後端 RAG 引擎（由 next-gen-knowledge-engine 負責）。
- 實作完整的手機端 App（僅優化響應式 Web 體驗）。
- 修改 D1 表結構（僅透過前端組件消費資料）。

## Decisions

### 1. 全站指揮中心 (Command Center)
**決定**：使用 React 實作一個全局 Overly，整合 Pagefind 搜尋與自定義快捷操作。
**理由**：雖然 `kbar` 很成熟，但為了減少套件依賴，我們將基於 React Portals 實作一個輕量級版本，以便與 Pagefind 深度集成。

### 2. 高密度佈局 (Side-by-Side)
**決定**：在文章頁面新增一個 `[data-view-mode="technical"]` 屬性，透過 CSS Grid 將 TOC 與 AI 摘要固定在左/右側。
**理由**：使用 CSS Grid 可以在不改動 HTML 結構的情況下，僅透過切換 Attribute 來達成佈局切換，對 SEO 友好。

### 3. 動態 OG 圖 (OG Image Generation)
**決定**：使用 **Satori** 在 `pnpm build` 階段為每篇文章產生對應的 PNG 圖檔。
**理由**：Build-time 產生比 Runtime 更節省成本（無需額外的 Worker 請求），且能確保分享連結時預覽圖能立即呈現。

### 4. 視覺細節實作
- **MacOS 程式碼區塊**：透過 CSS `::before` 偽元素添加三色點與標題條，不增加額外 DOM 節點。
- **Hero Banner**：在 `[...slug].astro` 中使用動態背景色（根據 Category 屬性）。
- **Scroll-to-top**：使用 IntersectionObserver API 來觸發顯示/隱藏。

## Risks / Trade-offs

- **[Risk] OG 圖產生耗時** → **Mitigation**: 僅為標籤與文章產生圖，快取已產生的圖檔。
- **[Risk] 指揮中心與 SEO** → **Mitigation**: 確保所有操作在 ⌘K 之外仍有對應的 URL 入口。
- **[Risk] 視覺過載** → **Mitigation**: 保持 Minimalist 底色，僅在邊界處與互動點使用 Accent 顏色。
