## ADDED Requirements

### Requirement: 語言切換 (Language Switching)
系統應支持在繁體中文 (ZH) 與英文 (EN) 之間切換。

#### Scenario: 切換語言
- **WHEN** 用戶點擊語言切換開關
- **THEN** 界面與內容應更改為所選語言。

### Requirement: 語系感知路由 (Locale-aware Routing)
系統應使用 URL 前綴（例如 `/en/`, `/zh/`）來區分不同語言版本。

#### Scenario: 訪問本地化內容
- **WHEN** 用戶訪問 `/en/blog/my-post`
- **THEN** 他們應該看到該文章的英文版本。
