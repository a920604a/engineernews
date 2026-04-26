## ADDED Requirements

### Requirement: Article share panel
系統 MUST 在文章頁顯示分享面板，並提供複製 canonical URL、呼叫原生分享面板，以及下載分享卡圖片的動作。

#### Scenario: View share panel
- **WHEN** 使用者開啟文章頁
- **THEN** 頁面 MUST 在文章標題或 metadata 區域附近顯示可見的分享面板

### Requirement: Native share progressive enhancement
系統 MUST 在瀏覽器支援 `navigator.share` 時使用它，並在不支援時退回為 copy-link 行為。

#### Scenario: Native share supported
- **WHEN** 瀏覽器支援 Web Share API
- **THEN** 啟動主要分享動作 MUST 打開原生分享面板，並攜帶文章 URL 與標題

#### Scenario: Native share unavailable
- **WHEN** 瀏覽器不支援 Web Share API
- **THEN** 同一個動作 MUST 保持文章可透過複製連結與下載圖卡分享

### Requirement: Copy link feedback
系統 MUST 將 canonical article URL 複製到剪貼簿，並提供立即的成功回饋。

#### Scenario: Copy link success
- **WHEN** 使用者點擊複製連結動作
- **THEN** canonical URL MUST 被寫入剪貼簿，且 UI MUST 顯示成功狀態

### Requirement: Download share card
系統 MUST 允許使用者從文章頁下載該文章的分享卡圖片。

#### Scenario: Download card
- **WHEN** 使用者點擊下載動作
- **THEN** 瀏覽器 MUST 下載與目前文章路由一致的分享卡圖片
