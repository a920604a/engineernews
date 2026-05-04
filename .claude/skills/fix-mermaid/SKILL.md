# fix-mermaid

掃描 `src/content/posts/**/*.md` 中的 mermaid 程式碼區塊，透過 `mmdc` 嘗試渲染來驗證每個區塊，並修正所有語法錯誤——持續循環直到每個圖表都能正常渲染。

---

## 步驟

### 1. 找出所有 mermaid 區塊

使用 Grep 找出所有包含 ` ```mermaid ` 的檔案：

```
pattern: ```mermaid
path: src/content/posts
glob: **/*.md
```

### 2. 針對每個找到的檔案

讀取該檔案，提取所有 mermaid 區塊（即 `\`\`\`mermaid` 與結尾 `\`\`\`` 之間的文字）。

### 3. 透過渲染進行驗證

對每個提取的區塊，寫入暫存檔案並執行：

```bash
echo '<mermaid-content>' > /tmp/test_diagram.mmd
mmdc -i /tmp/test_diagram.mmd -o /tmp/test_out.svg --quiet 2>&1
```

- 若 exit code 為 0 → 圖表有效，跳過。
- 若 exit code 非 0 → 擷取錯誤輸出，進行修正。

### 4. 修正區塊

結合 mmdc 的錯誤訊息與圖表原始碼，分析問題所在。常見問題如下：

| 問題 | 修正方式 |
|---|---|
| 缺少或錯誤的圖表類型關鍵字 | 新增或修正 `flowchart TD`、`sequenceDiagram`、`graph LR` 等 |
| 節點標籤含特殊字元且未加引號 | 將標籤用 `"..."` 包起來 |
| 箭頭語法錯誤（如 `->` 應為 `-->`） | 修正箭頭符號 |
| Subgraph 缺少 `end` | 補上 `end` |
| 陳述式之間缺少換行 | 補上換行 |
| 新語法應用 `flowchart` 卻寫成 `graph` | 轉換關鍵字 |
| sequenceDiagram 缺少 participant/actor 宣告 | 補上 participant 宣告 |
| 節點 ID 含中文或特殊字元 | 移至標籤：`A["中文"]` |

修正後，**重新執行 mmdc** 確認能正常渲染。若仍失敗，分析新的錯誤再次修正。每個圖表最多嘗試 **5 次**。若 5 次後仍失敗，記錄檔案路徑後跳過——不修改該檔案。

### 5. 將修正寫回檔案

確認修正後的區塊可正常渲染（mmdc exit code 為 0），使用 Edit 工具將原始檔案中的損壞區塊替換為修正版本。**只**替換 mermaid 區塊內容，不動周圍的 markdown。

### 6. 輸出報告

掃描所有檔案後，輸出摘要：

```
## Mermaid 修正報告

✅ 有效（無變更）：  N 個圖表
✏️  已修正：         N 個圖表  
  - src/content/posts/tech/some-file.md（區塊 1）：<簡短修正說明>
❌ 無法修正：        N 個圖表
  - src/content/posts/...：<錯誤片段>
```

---

## 限制條件

- 絕對不可完全移除 mermaid 區塊——只能修正語法。
- 若圖表意圖不明確，做最小幅度的變更使其能解析，盡量保留原始語意。
- 不可修改 mermaid 程式碼圍欄以外的任何內容。
- 一次處理一個區塊——修正、驗證、寫回，再處理下一個。
