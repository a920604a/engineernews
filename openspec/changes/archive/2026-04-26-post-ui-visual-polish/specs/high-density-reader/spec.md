## ADDED Requirements

### Requirement: Technical side-by-side layout
文章頁面應提供一種高密度閱讀模式，將目錄 (TOC) 與 AI 摘要固定於側邊。

#### Scenario: Side-by-side view on desktop
- **WHEN** 在桌面端裝置閱讀文章
- **THEN** 目錄與摘要應與主文內容併排顯示，而非位於主文上方或下方

### Requirement: Sticky sidebar navigation
側邊欄在捲動時應保持固定，讓使用者隨時能進行章節跳轉。

#### Scenario: Scrolling with sticky sidebar
- **WHEN** 使用者向下捲動長文
- **THEN** 側邊欄（TOC 與摘要）應固定在視窗頂部附近
