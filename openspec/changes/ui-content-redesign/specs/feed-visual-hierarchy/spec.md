## ADDED Requirements

### Requirement: 精選大卡（Featured Card）
首頁 feed 的第一筆文章 SHALL 以大卡樣式呈現，與其餘卡片有明顯的視覺差異，作為視覺入口點。

大卡規格：
- 標題字體：24px，font-weight 800
- 內距：28px 32px
- 摘要行數上限：3 行（`-webkit-line-clamp: 3`）
- 邊框：1px，accent 色 20% 透明度

#### Scenario: 首頁第一篇文章以大卡顯示
- **WHEN** 使用者訪問首頁 `/`
- **THEN** feed 最上方的文章卡片標題字體明顯大於其餘卡片，視覺上突出

#### Scenario: 只有一篇文章時只顯示大卡
- **WHEN** feed 只有一篇文章
- **THEN** 僅顯示大卡，不出現「最新文章」分隔線與一般列表

---

### Requirement: 緊湊卡片列表（Compact Feed）
首頁 feed 第二篇起的文章 SHALL 以標準 PostCard 樣式顯示，card 間距收緊至 8px。

#### Scenario: 第二篇以後的文章以標準卡片顯示
- **WHEN** feed 有兩篇以上文章
- **THEN** 第二篇起的卡片字體與樣式與大卡有明顯區別，間距更緊湊

---

### Requirement: 分隔標題
大卡與緊湊列表之間 SHALL 顯示「最新文章」分隔標題（英文版為「Latest」），以視覺分隔兩個區塊。

#### Scenario: 有多篇文章時顯示分隔標題
- **WHEN** feed 有兩篇以上文章
- **THEN** 大卡與緊湊列表之間出現「最新文章」文字標題，字體 11px uppercase

#### Scenario: 只有一篇文章時不顯示分隔標題
- **WHEN** feed 只有一篇文章
- **THEN** 不出現「最新文章」分隔標題
