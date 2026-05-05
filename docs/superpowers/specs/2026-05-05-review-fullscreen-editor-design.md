# Review Page Full-screen Editor — Design Spec

**Date:** 2026-05-05  
**File:** `src/pages/review.astro`  
**Status:** Approved

## 需求摘要

在 review page 的 edit form 加入全螢幕編輯模式，讓使用者能在更大的空間內編輯草稿。全螢幕模式包含所有欄位（標題、TL;DR、Description、Category、Tags、Markdown body），並提供左右分割的 Markdown 編輯器與同步捲動的即時預覽。

---

## 架構

### Overlay 結構

在 `<body>` 底部新增一個常駐但預設隱藏的 `div#fullscreen-overlay`，使用 `position: fixed; inset: 0; z-index: 1000`。Overlay 內包含完整的 form 結構，與 card 的 edit form 互相獨立。

不移動原始 DOM 元素——改用「複製值進 overlay → 操作 → 複製回 card」的方式，避免事件監聽器失效問題。

### 版面

```
┌─────────────────────────────────────────────────────────┐
│ [標題 input                                    ] [✕關閉] │  top bar
│ [TL;DR input               ] [Description input       ] │
│ [Category select] [Tags input                          ] │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│   Markdown textarea      │   Preview pane               │
│   左右各 50%             │   同步捲動                   │
│   高度撐滿剩餘空間       │                              │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│                         [儲存草稿]  [發布]              │  bottom bar
└─────────────────────────────────────────────────────────┘
```

---

## 資料流

### 開啟全螢幕

1. 使用者點擊全螢幕按鈕（或按快捷鍵）
2. 從當前 card form 讀取所有欄位值（title、tldr、description、category、tags、body、`data-frontmatter`、`data-slug`）
3. 將值填入 overlay form
4. 將 overlay 的 preview pane 更新為 markdown 渲染結果
5. 顯示 overlay（`display: flex`），body 加 `overflow: hidden` 防止背景捲動
6. focus 到 overlay 的 body textarea

### 關閉全螢幕

1. 使用者按 ESC 或點擊 ✕ 按鈕
2. 把 overlay form 的所有欄位值複製回對應的 card form
3. 更新 card form 的 preview pane
4. 隱藏 overlay，移除 body `overflow: hidden`

### 儲存 / 發布（在 overlay 內）

Overlay 的儲存與發布按鈕呼叫與 card form 相同的 `submitEdit()` 函數，傳入 overlay form。行為一致：
- 儲存草稿：顯示 toast，保持 overlay 開啟
- 發布：關閉 overlay，從 draft list 移除該 card

---

## 同步捲動

用捲動百分比對齊兩個 pane，避免 textarea 與 preview 行高差異造成偏移：

```js
function syncScroll(source, target) {
  const pct = source.scrollTop / (source.scrollHeight - source.clientHeight);
  target.scrollTop = pct * (target.scrollHeight - target.clientHeight);
}

textarea.addEventListener('scroll', () => syncScroll(textarea, preview));
preview.addEventListener('scroll', () => syncScroll(preview, textarea));
```

同步捲動在 overlay 開啟時初始化，overlay 關閉後不需要移除監聽器（overlay 隱藏時不會觸發捲動事件）。

---

## 觸發方式

| 觸發 | 行為 |
|------|------|
| Markdown 內容 label 旁的 ⛶ 按鈕 | 開啟全螢幕 |
| `Cmd+Shift+F`（Mac）/ `Ctrl+Shift+F`（Win/Linux） | 開啟全螢幕（只在對應 edit panel 為 open 狀態時有效） |
| ✕ 按鈕（overlay 右上角） | 關閉全螢幕 |
| `ESC` 鍵 | 關閉全螢幕 |

快捷鍵觸發條件：目前頁面上只有一個 edit panel 是 `open` 狀態時，對該 panel 的 form 生效。若同時有多個 panel 開啟（理論上不太可能但需防禦），快捷鍵不觸發。

---

## 實作範圍

**修改檔案：** `src/pages/review.astro`（唯一需要改的檔案）

**需要新增：**
1. `<style>` 區塊：overlay 相關 CSS（`#fullscreen-overlay`、`.fs-*` class）
2. HTML：`div#fullscreen-overlay` 結構，放在 `<div class="toast-container">` 之前
3. `<script>` 區塊：
   - `openFullscreen(slug)` 函數
   - `closeFullscreen()` 函數
   - 全螢幕按鈕的事件監聽
   - ESC 鍵監聽
   - 快捷鍵監聽
   - overlay 內同步捲動初始化
   - overlay 內 preview 即時更新
   - overlay 的儲存 / 發布按鈕監聽

**不需要改：**
- 任何 API route（`/api/admin/*`）
- `submitEdit()` 函數本身（overlay 直接複用）
- card form 的現有邏輯

---

## 邊界情況

| 情況 | 處理方式 |
|------|---------|
| edit form 尚未載入（loading 狀態）就觸發全螢幕 | 按鈕在 form `ready` 前為 `disabled` |
| 全螢幕內儲存後，card form 的值需同步 | 關閉時複製回 card form |
| 全螢幕內發布後 | 關閉 overlay，移除 card，不需複製回 |
| 視窗縮放 | overlay 使用 `100vw/100vh`，自動適應 |
| 手機螢幕 | 不阻擋，但 50/50 分割在小螢幕效果差——不在本次範圍內處理 |
