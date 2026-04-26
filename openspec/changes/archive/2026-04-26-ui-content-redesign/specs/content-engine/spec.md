## MODIFIED Requirements

### Requirement: 文章資訊流 (Article Feed)
系統 SHALL 在首頁顯示按時間排序的文章資訊流。資料來源僅為 `posts` collection（移除 `projects` collection 查詢）；`type: case-study` 的文章與一般文章一起出現在 feed 中。

排序規則：`pinned: true` 的文章優先置頂，其餘依 `date` 降序排列。

#### Scenario: 查看文章資訊流
- **WHEN** 用戶訪問根路徑 `/`
- **THEN** 顯示按日期排列的文章卡片，最新在最前；`pinned` 文章排在所有非 pinned 文章之前

#### Scenario: case-study 文章出現在一般 feed
- **WHEN** 存在 `type: case-study` 的 post
- **THEN** 該文章與其他類型文章一起出現在首頁 feed，依日期排序

---

### Requirement: 標籤過濾 (Tag-based Filtering)
系統 SHALL 允許用戶透過點擊標籤過濾文章。標籤頁面資料來源僅為 `posts` collection（移除 `projects` collection 查詢）。

#### Scenario: 按標籤過濾
- **WHEN** 用戶點擊標籤（例如 `#ai`）
- **THEN** 資訊流僅顯示包含該標籤的 posts，包括 `type: case-study` 的文章

#### Scenario: case-study 文章的標籤可正常過濾
- **WHEN** 一篇 `type: case-study` 的 post 含 `tags: ["docker", "python"]`
- **THEN** 訪問 `/tags/docker` 可看到該文章

---

## REMOVED Requirements

### Requirement: 專案展示 (Project Showcases)
**Reason**: `projects` Astro collection 已移除；專案類文章改為 `type: case-study` 的 posts，由 `portfolio-system` 的 `/projects` 頁面及一般 feed 承接。
**Migration**: 專案文章出現在首頁 feed（`type: case-study`）與 `/projects` 頁面。獨立的「Project Showcases 區塊」不再存在。
