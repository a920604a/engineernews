## ADDED Requirements

### Requirement: 初始狀態顯示推薦問題
系統 SHALL 在聊天 popup 開啟且無對話歷史時，顯示至多 4 個推薦問題按鈕，引導使用者發問。

#### Scenario: popup 首次開啟
- **WHEN** 使用者開啟聊天 popup 且尚未輸入任何問題
- **THEN** 顯示 4 個推薦問題按鈕，每個按鈕顯示完整問題文字

#### Scenario: 有對話後推薦問題隱藏
- **WHEN** 使用者已送出至少一個問題並收到回答
- **THEN** 推薦問題按鈕不再顯示

### Requirement: 點擊推薦問題自動發問
系統 SHALL 在使用者點擊推薦問題按鈕時，自動填入問題並立即送出，不需額外確認。

#### Scenario: 點擊推薦問題按鈕
- **WHEN** 使用者點擊任一推薦問題按鈕
- **THEN** 問題文字填入輸入框，立即觸發 RAG 搜尋，推薦問題按鈕消失，顯示載入狀態

### Requirement: 推薦問題依語言切換
系統 SHALL 根據當前頁面語言（zh-TW 或 en）顯示對應語言的推薦問題。

#### Scenario: 中文頁面推薦問題
- **WHEN** 使用者在 `lang: zh-TW` 頁面開啟 popup
- **THEN** 推薦問題以繁體中文顯示

#### Scenario: 英文頁面推薦問題
- **WHEN** 使用者在 `/en/*` 路由下開啟 popup
- **THEN** 推薦問題以英文顯示
