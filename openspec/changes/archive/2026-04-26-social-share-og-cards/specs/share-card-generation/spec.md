## ADDED Requirements

### Requirement: Route-matched share card images
系統 MUST 為每個已發布的文章路由提供一張 PNG 分享卡，且圖片 URL MUST 以文章路由為基準保持穩定。

#### Scenario: zh-TW article share card
- **WHEN** 已發布文章被渲染於 `/posts/tech/example`
- **THEN** 頁面 metadata 與下載連結 MUST 指向該路由對應的分享卡圖片 URL

#### Scenario: en article share card
- **WHEN** 已發布文章被渲染於 `/en/posts/tech/example`
- **THEN** 頁面 metadata 與下載連結 MUST 指向該語系路由對應的分享卡圖片 URL

### Requirement: Share card storage outside the repository
系統 MUST 將產生的分享卡儲存在 Cloudflare R2，而不是寫入 Git repository 內的靜態資產目錄。

#### Scenario: Storage isolation
- **WHEN** 系統完成分享卡產生
- **THEN** 圖片 MUST 上傳至 R2 bucket，且 repository 本身 MUST 不包含大量生成後 PNG

### Requirement: On-demand generation with cache reuse
系統 MUST 在分享卡尚未存在時即時生成它，並在後續請求中直接重用已快取的版本，不得對同一份快取鍵重複生成。

#### Scenario: First request generates image
- **WHEN** 使用者或 crawler 首次請求某文章的分享卡
- **THEN** 系統 MUST 生成圖片、寫入 R2，並回傳該圖片

#### Scenario: Cached request reuses image
- **WHEN** 同一文章的分享卡已存在於 R2
- **THEN** 系統 MUST 直接回傳既有圖片，不得重新執行生成流程

### Requirement: Share card content
系統 MUST 在分享卡中包含文章標題、主要分類或標籤，以及網站品牌識別。

#### Scenario: Metadata consistency
- **WHEN** 圖片為某篇文章產生
- **THEN** 圖片中的可見文字 MUST 對應該文章已發布的標題與網站品牌

### Requirement: Social metadata uses the share card
系統 MUST 將產生的分享卡作為文章頁的 `og:image` 與 `twitter:image`。

#### Scenario: Social preview
- **WHEN** 社群 crawler 讀取文章頁
- **THEN** 頁面 metadata MUST 回傳分享卡圖片 URL
