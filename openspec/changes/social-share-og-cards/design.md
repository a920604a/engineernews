## Context

目前網站已經有 OG metadata 與離線產圖腳本，但文章頁沒有任何明確的分享入口。讀者如果想把文章轉成社群貼文，仍然得自己截圖、另存或純貼連結，品牌露出與轉分享率都偏弱。

現有流程也存在路由與圖檔命名的耦合風險。BaseLayout 以網址 pathname 推導 `og:image`，而 `scripts/generate-og.ts` 則是以內容檔案路徑輸出圖片。這套做法在單一語系時勉強可用，但在 `/en/posts/...` 這類路由上很容易出現對不上檔名的情況；如果再把所有 PNG 放進 repo，GitHub 會很快膨脹。

## Goals / Non-Goals

**Goals:**
- 讓文章頁可以直接分享，不只是提供連結。
- 讓社群預覽圖與下載圖卡共用同一個來源。
- 分享卡採 runtime on-demand 生成，並對已存在結果直接重用。
- 修正路由與 OG 圖檔命名的對應，包含英文章節頁。
- 避免把大量生成圖檔放進 Git repository。
- 保持實作簡單，生成後由 R2 快取結果，不對每次請求重算。

**Non-Goals:**
- 不新增第三方社群整合 API。
- 不做使用者登入後的個人化分享卡。
- 不重做整個文章頁版面，只新增分享入口與必要的 metadata 對齊。
- 不在這個 change 內改動內容編輯流程或文章 schema。

## Decisions

### D1: 改成 runtime on-demand 產圖，並以 Cloudflare R2 作為結果快取

**決定**：改成請求時才生成分享卡。第一次請求某文章的 OG 圖時，系統生成圖片並寫入 Cloudflare R2；後續請求直接從 R2 回傳既有圖片。

**為什麼**：這樣可以避免在 build 階段預先產出所有圖片，也能避免未使用文章持續產生無效資產。對分享需求來說，只有被請求過的圖片才值得生成，R2 則負責把結果固定下來。

**Alternative 考慮**：繼續 build-time 全量產圖。這會把所有文章圖片都先做出來，雖然簡單，但與實際分享頻率不成比例，也會帶來不必要的存儲與建置成本。

**Alternative 考慮**：改成 Cloudflare Worker 每次都重新渲染 OG 圖，不做快取。這樣最直接，但會把同一張圖重複生成，成本與延遲都不合理。

### D2: 用共享的 route-to-image helper 統一 BaseLayout、文章頁、OG endpoint 與 R2 key

**決定**：抽出共用 helper，讓 metadata、下載連結與實際輸出檔名都從同一套規則推導。

**為什麼**：現在最大風險不是「沒圖」，而是「圖檔名和路由不一致」。把命名規則集中起來，可以避免日後新增語系或調整路由時，meta 與實體檔案再度分叉。

**Alternative 考慮**：在每個頁面手寫字串模板。這看似快速，但很容易讓 `/posts/...`、`/en/posts/...` 或未來其他頁面各自發散，最後又回到維護地獄。

### D3: 分享面板做成輕量 Astro 元件，而不是 hydrated React island

**決定**：分享面板使用靜態 HTML 加一小段 client-side script 來處理 `navigator.share`、clipboard 與下載動作。

**為什麼**：這些互動很簡單，不值得為它引入整個 React hydration 成本。Astro 元件可以把預設 UI 直接渲染在頁面上，再用小腳本補上互動，重量最小。

**Alternative 考慮**：做成 React 元件。雖然開發習慣一致，但會把一個單純的工具面板變成互動島，增加 bundle 體積與維護負擔。

### D4: 分享 payload 以 canonical URL 與頁面標題為準

**決定**：原生分享與 copy-link 都使用 canonical URL，不依賴目前頁面狀態或臨時 query string。

**為什麼**：分享出去的內容必須穩定。canonical URL 可以保證使用者、爬蟲與分享卡拿到的是同一個文章實體。

**Alternative 考慮**：允許分享當下的 search params 或 UI state。這會讓分享結果不穩定，也會污染社群預覽。

## Risks / Trade-offs

- [Risk] build 時間會略微增加，因為要產生或更新分享卡圖片。
  - Mitigation: 沿用既有產圖腳本與靜態資產輸出，不新增 runtime 成本。
- [Risk] clipboard 或 Web Share API 可能被瀏覽器限制。
  - Mitigation: 提供 copy-link、download 的 fallback，讓分享路徑仍可用。
- [Risk] 分享卡依賴字型與圖片生成環境。
  - Mitigation: 保持現有字型載入方式，並在 build 驗證中檢查圖片輸出是否存在。

## Migration Plan

1. 抽出共用的 route-to-image helper。
2. 新增 OG 產生 endpoint 與 R2 bucket binding。
3. 實作 cache lookup：存在就回傳，不存在才生成並寫入 R2。
4. 更新 `BaseLayout.astro` 的 OG metadata，統一使用 helper 的結果。
5. 在文章頁加入分享面板與下載行為。
6. 跑 build 與手動請求驗證圖片 URL、R2 快取與 metadata 都可正確產出。

Rollback:
- 若分享面板或圖片命名有問題，先移除文章頁入口，保留原本的 OG meta 行為即可回退。

## Open Questions

- 分享面板要不要直接加 X / Threads / Telegram 的快捷按鈕，還是先保留 generic share / copy / download 三個動作。
- 分享卡要不要加入文章摘要或日期；目前設計先偏向標題 + 分類 + 品牌，維持畫面乾淨。
- R2 bucket 要不要公開讀取，還是經由一個固定的圖片 proxy endpoint 輸出；目前偏向由 endpoint 統一回傳，避免直接暴露 bucket 結構。
