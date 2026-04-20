## ADDED Requirements

### Requirement: 作品集展示
系統應提供一個專屬頁面 `/projects`，以卡片形式展示個人 Side Projects。

#### Scenario: 查看作品集
- **WHEN** 用戶訪問 `/projects`
- **THEN** 系統應顯示包含專案名稱、描述、技術標籤與 GitHub/連結的卡片。

### Requirement: 專案與文章關聯
作品集頁面應能自動顯示與該專案相關的技術文章。

#### Scenario: 點擊專案查看相關文章
- **WHEN** 用戶在專案卡片點擊「相關文章」
- **THEN** 系統應過濾並顯示包含該專案標籤（如 `#project-abc`）的所有文章。
