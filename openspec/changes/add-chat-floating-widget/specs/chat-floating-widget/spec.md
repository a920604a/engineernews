## ADDED Requirements

### Requirement: 浮動聊天按鈕常駐顯示
系統 SHALL 在所有頁面右下角顯示常駐的浮動聊天按鈕，按鈕高度不得遮擋頁面主要內容。

#### Scenario: 首次進入頁面
- **WHEN** 使用者載入任意頁面（首頁、文章頁、分類頁等）
- **THEN** 右下角顯示聊天圖示按鈕，popup 為關閉狀態

#### Scenario: 按鈕點擊展開 popup
- **WHEN** 使用者點擊浮動聊天按鈕
- **THEN** popup 聊天視窗從右下角向上展開，按鈕圖示切換為關閉（X）圖示

#### Scenario: 關閉 popup
- **WHEN** 使用者點擊 X 按鈕或按下 Escape 鍵
- **THEN** popup 收合，按鈕恢復聊天圖示，對話內容清空

### Requirement: popup 在行動版適配
系統 SHALL 在螢幕寬度小於 640px 時將 popup 調整為近全螢幕 bottom sheet 樣式。

#### Scenario: 行動版開啟 popup
- **WHEN** 使用者在行動裝置上點擊浮動按鈕
- **THEN** popup 佔據螢幕下方 90% 高度，寬度為 100vw，頂部顯示標題列與關閉按鈕

### Requirement: 浮動元件不影響現有頁面
浮動聊天元件 SHALL 不修改現有 `/ai-search` 頁面行為，且不影響 TTS Player、ScrollToTop 等現有浮動元素的可點擊性。

#### Scenario: 與其他浮動元素共存
- **WHEN** 頁面同時存在 ScrollToTop 按鈕與聊天浮動按鈕
- **THEN** 兩者皆可正常點擊，聊天按鈕位於右下角，ScrollToTop 位於其上方或左側，互不遮擋
