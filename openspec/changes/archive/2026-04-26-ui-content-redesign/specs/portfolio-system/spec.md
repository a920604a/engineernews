## MODIFIED Requirements

### Requirement: 作品集展示
系統 SHALL 提供一個專屬頁面 `/projects`，以卡片形式展示個人 Side Projects。資料來源從 `projects` Astro collection 改為 `posts` collection，以 `type: case-study` 且 `lang: zh-TW` 過濾（英文版過濾 `lang: en`）。

每張卡片 SHALL 包含：專案名稱、一句話描述、技術標籤，以及 GitHub 連結按鈕（若 `github` 欄位有值）與網站連結按鈕（若 `url` 欄位有值）。「查看」按鈕連結至 `/posts/<post.id>`。

#### Scenario: 查看作品集
- **WHEN** 用戶訪問 `/projects`
- **THEN** 系統顯示所有 `type=case-study` 的 posts，包含名稱、描述、標籤與 GitHub/網站連結

#### Scenario: case-study post 有 github 欄位時顯示 GitHub 按鈕
- **WHEN** 一篇 `type: case-study` 的 post 有 `github: "https://github.com/..."` 欄位
- **THEN** 對應的作品集卡片顯示「GitHub」按鈕，點擊在新分頁開啟

#### Scenario: 點擊「查看」進入文章詳情
- **WHEN** 用戶點擊作品集卡片的「查看」按鈕
- **THEN** 導向 `/posts/<post.id>`，顯示完整的 case-study 文章頁

---

## REMOVED Requirements

### Requirement: 專案與文章關聯
**Reason**: 原設計的「點擊相關文章」功能從未實作；case-study posts 本身就在 feed 中，tags 過濾已足以找到相關文章。
**Migration**: 使用 `/tags/<tag>` 頁面過濾包含特定專案標籤的所有文章。
