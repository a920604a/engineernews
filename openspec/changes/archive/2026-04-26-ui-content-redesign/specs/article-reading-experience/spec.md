## ADDED Requirements

### Requirement: prose 閱讀寬度
文章內文 `.prose` 區塊的最大寬度 SHALL 為 `65ch`，確保每行字元數在 65 個字元以內，符合最佳閱讀行長。

#### Scenario: 桌面寬螢幕下 prose 不超過 65ch
- **WHEN** 使用者在 1440px 寬的瀏覽器開啟任一篇文章
- **THEN** prose 內文寬度不超過 65ch，左右兩側有空白邊距

#### Scenario: 窄螢幕下 prose 自然填滿可用寬度
- **WHEN** 使用者在 375px 寬的手機開啟文章
- **THEN** prose 填滿去除 padding 後的可用寬度，不出現橫向捲動

---

### Requirement: 桌面版 sticky sidebar TOC
文章頁在桌面版（viewport ≥ 1024px）且文章有 2 個以上 h2/h3 標題時，SHALL 在右側顯示固定不動的目錄側欄。

- 側欄寬度：220px
- 側欄頂部距離：距 nav bar 底部 72px（`top: 72px`）
- 側欄最大高度：`calc(100vh - 88px)`，超出時可獨立捲動
- h3 標題縮排 12px
- 連結 hover 時顯示 `--accent` 色

#### Scenario: 有足夠標題的文章顯示 sidebar TOC
- **WHEN** 使用者在桌面瀏覽器（≥ 1024px）開啟含 3 個以上 h2/h3 的文章
- **THEN** 右側出現包含所有 h2/h3 連結的固定側欄

#### Scenario: 滾動時 TOC 不跟著移動
- **WHEN** 使用者往下滾動文章 500px
- **THEN** 右側 TOC 側欄維持在相同位置，不跟著滾動

#### Scenario: 標題不足時不顯示 sidebar
- **WHEN** 文章只有 1 個 h2 或無任何標題
- **THEN** 右側不出現 TOC 側欄，文章全寬顯示

---

### Requirement: 手機版折疊式 TOC
文章頁在手機版（viewport < 1024px）且有足夠標題時，SHALL 在文章開頭顯示可折疊的 `<details>` 目錄，sidebar TOC 隱藏。

#### Scenario: 手機版顯示折疊 TOC
- **WHEN** 使用者在 375px 手機開啟含多個標題的文章
- **THEN** 顯示可展開/收合的 `<details>` 目錄，sidebar TOC 不出現

#### Scenario: 桌面版折疊 TOC 隱藏
- **WHEN** viewport ≥ 1024px
- **THEN** `<details>` 折疊目錄不顯示（`display: none`），僅顯示 sidebar TOC

---

### Requirement: 文章頁雙欄 layout
文章頁在桌面版 SHALL 採用 CSS grid 雙欄排版：左欄為文章內容，右欄為 sticky TOC；`<main>` 最大寬度擴展至 1040px 以容納兩欄。

#### Scenario: 桌面版文章頁呈現雙欄
- **WHEN** 使用者在 ≥ 1024px 的裝置開啟文章
- **THEN** 文章正文在左，sticky TOC 在右，兩欄間距 48px

#### Scenario: 手機版文章頁單欄顯示
- **WHEN** 使用者在 < 1024px 的裝置開啟文章
- **THEN** 文章全寬單欄顯示，無右側欄位
