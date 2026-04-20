## ADDED Requirements

### Requirement: 文章資訊流 (Article Feed)
系統應在首頁顯示按時間排序的技術文章資訊流。

#### Scenario: 查看文章資訊流
- **WHEN** 用戶訪問根路徑 `/`
- **THEN** 他們應該看到按日期排列的文章卡片列表，最新發布的排在最前面。

### Requirement: 標籤過濾 (Tag-based Filtering)
系統應允許用戶通過點擊標籤來過濾文章。

#### Scenario: 按標籤過濾
- **WHEN** 用戶點擊一個標籤（例如 `#astro`）
- **THEN** 資訊流應僅顯示包含該標籤的文章。

### Requirement: 專案展示 (Project Showcases)
系統應設有一個專門的區塊來展示作品與專案。

#### Scenario: 查看專案列表
- **WHEN** 用戶訪問 `/projects`
- **THEN** 他們應該看到包含描述與連結的專案列表。
