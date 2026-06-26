---
name: post-verify
description: Fact-layer verification for a post under src/content/posts/<category>/ — extract every checkable technical claim (version numbers, API/product names, prices, dates, metrics, quoted statistics, benchmark numbers) and cross-check each against current authoritative sources via WebSearch / WebFetch, then produce a verdict report (Confirmed / Outdated / Unverifiable / Contradicted). Does NOT modify the file. Complementary to writing/structure review. Use when the user says verify 一下 / 查證 / 對一下事實 / fact check / 確認版本 / 驗證 and references a post.
---

# post-verify skill

發文前的**事實層**審查。看的不是格式或風格，而是「寫的是不是真的」。

這個專案大量內容來自 YouTube 爬蟲 + LLM 生成（`crawl.ts` 用 llama-3.1-70b）。模型訓練資料截止 + 影片轉述，會讓文章自信地寫出**過時或捏造的版本號、API 名稱、定價、benchmark 數字**。這個 skill 專抓那些。

**只報告，永不 auto-fix**——是真錯還是只是換個說法，由使用者決定。

## 何時用 vs 區分

| 工作 | 用哪個 |
|---|---|
| 標題弱、tldr 沒重點、tags 分裂 | 一般 review / `tag-audit` |
| Mermaid 壞掉 | `fix-mermaid` |
| 「GPT-5.4 售價 $X」「Claude context 是 N tokens」是不是真的 | **`post-verify`** |
| 版本號 / 發布日期 / benchmark 分數對不對 | **`post-verify`** |

## 執行步驟

### 1. 抽出可查證的宣稱
讀文章，列出所有「可被現實驗證」的具體陳述，分類：
- **版本 / 發布**：模型版本、軟體版本、發布日期（「Opus 4.8 於 X 發布」）
- **數字 / 指標**：價格、context window、參數量、benchmark 分數、市佔、融資金額
- **名稱 / API**：產品名、API 名、函式名、公司名
- **引用統計**：「研究顯示 N 人…效果量 d=X」

忽略主觀論述、預測、比喻。

### 2. 逐項查證
每項用 `WebSearch` 找權威來源，必要時 `WebFetch` 該頁確認原文。優先官方來源（官方 docs / blog / release notes / 論文）。

> ⚠️ LLM 對 Claude/Anthropic 版本、定價最容易記錯——這類一律查證，不要憑記憶。

### 3. 產出 verdict 報告（不改檔）
每項給一個結論：

| 狀態 | 意義 |
|---|---|
| ✅ Confirmed | 與權威來源一致 |
| ⚠️ Outdated | 曾經對，但已過時（附最新值） |
| ❌ Contradicted | 與來源衝突（附正確值 + 來源連結） |
| ❓ Unverifiable | 查不到可靠來源，標記待人工確認 |

報告格式：`原文宣稱` → `狀態` → `查到的事實 + 來源 URL`。最後給一句總評（這篇可不可以安心發）。

### 4. 交回使用者
使用者決定怎麼改。若要改，由使用者或另一個流程處理；**這個 skill 不動檔案**。

## 常見錯誤
- 憑記憶判斷版本/定價對錯：錯，一律查。模型自己的訓練截止就是問題來源。
- 把主觀論述當事實去查：只查可驗證的具體陳述。
- 直接改文章：錯，只報告。
- 查到衝突卻不附來源：每個 ❌/⚠️ 都要附 URL，讓使用者能複查。
