---
title: "對話即文件：用 Claude Code 把 Debug 過程直接變成文章"
date: 2026-04-21T08:03:40+08:00
category: learning
tags: ["ai", "claude-code", "debugging", "writing-automation"]
lang: zh-TW
description: "示範如何把對話與除錯歷程透過 Claude Code 自動整理為技術文章，包含 prompt 設計與常見調整技巧。"
tldr: "把對話當成可寫成文章的材料：用結構化 prompt 與範本，讓 Claude Code 自動把 debugging thread 轉為可發佈的技術文章。"
draft: false
pinned: true
audio_url: "/api/tts/r2/tts/tts_20260427_023441_464616.wav"
---

**Claude Code** 是 Anthropic 的 CLI 工具，讓開發者直接在終端機與 Claude 協作寫程式和文件。它支援「skill」擴充點 — 可自訂工作流程腳本。本站使用的 `post` skill 把對話或筆記輸入轉成結構化 Markdown 文章；底層的 `ingest.ts` 腳本負責偵測敏感資訊、呼叫 LLM 萃取 metadata，最終輸出帶完整 frontmatter 的文章檔案。

## TL;DR

用 `make ingest FILE=<對話檔>` 一鍵把工程對話轉成結構化技術文章：`ingest.ts` 自動遮蔽敏感資訊、萃取 frontmatter metadata、套用 debug 文章範本。輸出 80% 可用，剩餘 20% 人工補充技術根因與結論。

## 情境

多人協作 debug 時，對話往往是這樣的：

```
[10:32] @alice: 我的 D1 查詢一直 timeout，用的是 wrangler 2.x
[10:33] @bob: 貼一下 error log？
[10:34] @alice: Error: D1_EXEC_ERROR: Error in line 1: ...SQLITE_BUSY
[10:35] @alice: 我已經加了 retry 但還是不行
[10:47] @bob: 你有沒有用 batch()？
[10:51] @alice: 沒有，應該要嗎
[10:52] @bob: 試試看，我上次也中過這個
[11:08] @alice: batch() 可以了！但 insert 還是偶爾掛
```

一個跨越 40 分鐘、穿插程式碼片段和錯誤訊息的 thread，對當事人來說是解謎過程，對後來的讀者來說是一堆雜訊。把這個直接貼到部落格？完全不可讀。

更麻煩的是，這類對話通常夾帶敏感資訊：API token、內部 URL、staging 環境的 database ID。直接公開會是安全問題。

目標是把這個對話變成一篇「D1 SQLITE_BUSY 錯誤與 batch() 解法」的完整技術文章，不需要人工重寫全文。

這個問題不是個案。

## 問題

**訊息雜亂**：對話按時間排列，不按邏輯結構排列。「嘗試了什麼」、「為什麼失敗」、「最終解法」散落在各處，讀者需要自己拼湊。原始 thread 50 行，真正有用的資訊可能只有 10 行。

**隱私與敏感資訊**：工程對話幾乎都包含不該公開的內容 — 公司內部 URL、staging 環境 credentials、log 裡的 user ID。發佈前需要逐一移除，手動做容易漏。一旦不小心發佈出去，即使後來刪掉，搜尋引擎 cache 和 GitHub 歷史記錄都可能留著。

**表述需要精簡與補足**：對話語言是給懂 context 的同事看的，縮寫、省略、只有內部人懂的前提都很正常。變成文章需要補背景、理清邏輯、加結論 — 這是大量編輯工作。如果這件事全靠人工，大多數 debug session 根本不會被記錄下來。

## 嘗試過程

最直覺的做法：把整個對話扔給 Claude，要求「做摘要」和「列步驟」。結果很快就遇到問題：模型傾向自由敘述，輸出的是一段散文，不是可以直接貼進部落格的結構化文章。同樣的對話跑兩次，輸出格式不一致；有時段落順序不同，有時某個關鍵錯誤訊息被略掉。

第二次嘗試：改用 Claude Code 的範本輸出，在 prompt 前置加上明確的欄位要求（背景、問題、嘗試、解法、教訓）和格式規則（Markdown、程式碼用 fenced block、敏感詞列表）。這次輸出結構一致了，但仍需要人工補充「為什麼會這樣」的解釋段落 — 模型只描述了 *什麼* 發生，沒有解釋 *為什麼*。

另一個問題是敏感詞處理。手動在 prompt 裡列出「請移除以下詞彙」效果不穩定，模型有時會忽略，有時會改寫成意思不同的東西。需要一個在 prompt 進模型前就先過濾的機制。

最終做法：分兩段處理。先用 `make ingest` 跑 `ingest.ts` 自動處理敏感詞遮蔽和基礎 metadata 萃取，再人工補充「為什麼會這樣」和「學到的事」兩個段落。自動化處理機械性工作，人工保留需要判斷的部分。

## 解法

### Step 1：整理輸入檔案

把對話複製到純文字檔，去除平台 metadata（Slack 的 reaction、已讀標記等），保留時間戳和發言者標記。存成 `debug-session.txt`。

注意：不需要預先清理內容，`ingest.ts` 的敏感詞過濾會處理。只要確保是可讀的純文字即可。

### Step 2：執行 ingest

```bash
make ingest FILE=debug-session.txt
```

執行後會在 `src/content/posts/` 下產生新的 Markdown 檔案，檔名根據萃取出的 title 自動生成。

`ingest.ts` 做三件事：

1. 掃描並遮蔽敏感資訊（API token、內部 URL pattern、database ID 格式）

2. 呼叫 `llama-3.1-8b` 萃取 title、tags、tldr、description，輸出為 YAML frontmatter

3. 根據文章類型（bug/debugging）套用段落範本，要求模型輸出完整 Markdown 結構

prompt 核心結構（`ingest.ts` 內部）：

```
你是一個技術部落格編輯。以下是一段工程對話，
請輸出一篇結構完整的繁中技術文章，格式如下：

---
title: ""
date: <今天>
category: "tech"
tags: []
lang: zh-TW
tldr: ""
description: ""
draft: false
---

## TL;DR
## 情境
## 問題
## 嘗試過程
## 解法
## 為什麼會這樣
## 學到的事

規則：
- 程式碼用 fenced code block 並標語言
- 敏感資訊已遮蔽，不要還原
- 「為什麼會這樣」必須解釋根本原因，不只描述現象
- 每個段落至少 2-3 句話，不接受單行列點
```

### Step 3：人工審查與補充

輸出的文章通常 80% 可用。需要人工補充的部分：

- 「為什麼會這樣」的技術深度（模型傾向描述現象而非根因）

- 特定錯誤訊息的引用（模型有時會略過關鍵的 stack trace）

- 結論的判斷（什麼時候該用 batch()、什麼時候不用）

審查時間通常是 10-15 分鐘，對比從零開始寫一篇 1000 字技術文章的 60-90 分鐘，節省約 75% 的時間。

### 輸入 → 輸出對比

**輸入（原始對話片段）：**
```
[10:34] @alice: Error: D1_EXEC_ERROR: SQLITE_BUSY
[10:52] @bob: 試試看 batch()
[11:08] @alice: batch() 可以了
```

**輸出（ingest 後的對應段落）：**

````markdown
## 解法

改用 `DB.batch()` 把多個 statement 合併為單一交易：

```ts
await DB.batch([
  DB.prepare('INSERT INTO logs ...').bind(...),
  DB.prepare('UPDATE posts ...').bind(...),
]);
```

batch() 把多個操作包成原子交易，避免並發寫入時的鎖爭用。
````

## 為什麼會這樣

**模型輸出不一致的根本原因**：基於對話的生成模型傾向於自由敘述，沒有明確格式約束時會產生不一致的輸出。每次生成都從不同的機率路徑開始，段落順序、用詞選擇、哪些細節被保留都可能不同。使用範本與欄位約束能強制模型回傳結構化結果，把「創意空間」限縮在內容上而非格式上，大幅降低後處理成本。

**D1 SQLITE_BUSY 的根本原因**：D1（Cloudflare 的 SQLite）在並發寫入時容易觸發 `SQLITE_BUSY`，因為 SQLite 的寫入鎖是全資料庫層級的，不是行鎖或表鎖。當多個 Worker 實例同時執行寫入操作，後到的請求會拿到 BUSY 錯誤而非等待。`batch()` 把多個 statement 包成單一交易，大幅減少鎖競爭次數：原本 N 次個別鎖請求，變成 1 次原子操作。這也讓 retry 邏輯更簡單 — 只需要在交易層級 retry，而不是追蹤哪幾個 statement 成功了哪幾個沒有。

## 學到的事

**Prompt 輸出格式要明確指定**：要求「輸出 Markdown」不夠，需要指定段落標題、程式碼格式規則、哪些欄位必填。格式越明確，後處理工作越少。一個實用的做法是在 prompt 裡直接貼上空白範本（只有標題沒有內容），讓模型「填空」而不是「自由發揮」。

**自動化是加速器，不是替代**：`ingest.ts` 處理的是機械性工作 — 格式化、敏感詞遮蔽、metadata 萃取。判斷性工作（技術根因解釋、結論的正確性）仍然需要人工確認。把自動化當成「草稿生成器」而不是「一鍵發佈」，品質會好很多。

**保留原始對話的索引**：輸出文章後不要刪掉原始 `debug-session.txt`。幾個月後回頭看，原始時間戳和對話脈絡經常能提供文章裡沒有的上下文。

**分批處理比一次處理好**：如果對話很長（超過 200 行），把它切成「問題描述段」和「解法段」分別 ingest，再手工合併，通常比一次扔給模型得到更好的結果。模型在較短的 context 下更容易抓到關鍵細節。

