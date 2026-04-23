## Context

**現狀**
- `posts` 與 `projects` 是兩個獨立的 Astro content collection，各有自己的 schema、skill、sync 路徑
- `post` skill 有 3 個模板，`project` skill 有獨立的 GitHub 抓取流程
- `sync-to-d1.ts` 維護 `syncPosts()` + `syncProjects()` 兩條路徑
- `type` enum 含 `crawled`（以產生方式命名，而非內容類型），且只有 5 個值
- 文章頁 TOC 只有折疊式 `<details>`；prose 與 main 同寬（720px）；首頁 feed 所有卡片等高等寬

**限制**
- Astro SSG（`prerender = true`），不能動態 fetch；所有資料在 build time 確定
- 不引入新 npm 套件
- `/projects/` URL 要維持可用（listing），`/projects/<slug>` URL 可斷（個人站可接受 404）
- skill 檔案不是程式碼，無法自動測試；變更後只能靠人工觸發 skill 驗證

---

## Goals / Non-Goals

**Goals:**
- 統一 posts 與 projects 為單一 collection，消除雙軌維護成本
- post skill 能完整覆蓋原 project skill 的所有流程（GitHub 抓取、五段式、雙 Mermaid 圖）
- `type` enum 語意清晰，每種 type 有對應 UI 行為
- 閱讀體驗對齊高流量技術 Blog 標準（prose 65ch、sticky TOC）
- 首頁 feed 有精選大卡與緊湊列表的視覺層次

**Non-Goals:**
- 重新設計 `/projects/` 頁面的 UI 樣式（只改資料來源，HTML 結構不動）
- 搜尋功能（Pagefind / Vectorize）的改動
- 爬蟲腳本（`crawl.ts`）的 type 分類邏輯（另立計畫）
- i18n 完整支援 case-study（英文版 `/en/projects` 暫時只顯示 `lang: zh-TW` 的 case-study）

---

## Decisions

### D1：projects → posts，不保留 projects collection

**決定**：移除 `projects` Astro collection，6 個現有 project 檔案遷移至 `src/content/posts/<category>/`，補上缺少的 frontmatter（`date`、`lang`、`type: case-study`、`draft`、`tldr`）。

**為什麼不保留 collection 再加一個 union type**：保留會讓 feed、tags、sync 繼續有兩條路徑，所有改動都要同時維護兩邊，根本原因沒有消除。

**Alternative 考慮**：用 `symlink` 或 `glob` 讓 posts 同時掃 `projects/` 目錄 → 但這樣 schema 衝突（projects 沒有 `date`），需要 `z.coerce.date().optional()`，增加複雜度。

---

### D2：`/projects/<slug>` 路由移除，不做 redirect

**決定**：直接刪除 `src/pages/projects/[...slug].astro`，舊 URL 回傳 404。

**為什麼不做 redirect**：這是個人站，沒有外部 SEO 連結需要維護。Cloudflare Pages 的 `_redirects` 規則需要知道每個舊 slug 對應的新 post id，且 post id 路徑包含 category（如 `tech/2026-04-23-llm-assistant`），維護成本高於效益。

**Alternative 考慮**：用 `[...slug].astro` catch-all 做 redirect → 需要維護一份 slug 對應表，且隨著 case-study 文章增加需要手動更新。

---

### D3：sticky TOC 用 CSS grid 雙欄，不用 JS scroll spy

**決定**：文章頁用 CSS grid（`1fr 220px`）實現雙欄，TOC `position: sticky; top: 72px`。不實作 scroll spy（滾動時 highlight 當前 section）。

**為什麼不做 scroll spy**：需要 IntersectionObserver JS，增加複雜度，且對閱讀體驗的提升邊際效益低。Sticky TOC 本身已解決最主要的問題（讀者滾動後目錄消失）。

**為什麼用 CSS grid 而非 fixed/absolute**：grid 是 flow-based，不需要計算 sidebar 高度或 z-index；sticky 子元素在 grid column 裡自然工作；響應式只需 media query 切換 `display: block`。

**`<main>` 最大寬度從 720px 擴展到 1040px（僅文章頁）**：透過 `data-layout="article"` attribute override，不影響其他頁面。

---

### D4：`case-study` 模板整合 project skill 的所有流程，project skill 目錄完全刪除

**決定**：在 `.claude/skills/post/templates/case-study.md` 新建模板，包含五段式結構（摘要、背景、挑戰、解法、成果）與雙 Mermaid 圖佔位符；在 `post/SKILL.md` 加入 case-study 觸發條件與 GitHub README 抓取步驟。`project/` 目錄整個刪除。

**為什麼不保留 project skill 作為 alias**：空殼 alias 會造成混淆，開發者不確定該用哪個 skill；完全移除讓系統更清晰，錯誤訊息會直接引導使用者改用 post skill。

**Alternative 考慮**：保留 `project/SKILL.md` 只寫一行「請用 post skill」→ 仍然會出現在 skill 清單，造成 cognitive overhead。

---

### D5：featured card 用 `featured` prop，不用第一個 post 的 pinned 狀態決定

**決定**：首頁 feed 的第一篇文章（排序後的 index 0）一律用 `featured={true}` 渲染大卡樣式，不論其是否 pinned。

**為什麼不只對 pinned 文章用大卡**：若沒有 pinned 文章，首頁視覺層次消失；若有多篇 pinned，大卡數量不可預測。固定取 index 0 保證視覺穩定。

**Alternative 考慮**：手動在 frontmatter 加 `featured: true` 欄位 → 需要作者手動維護，爬蟲產生的文章不會自動設定。

---

## Risks / Trade-offs

**[Risk] 遷移的 6 個 project 檔案沒有 `date`，設為 2026-04-23**
→ 這些文章會出現在首頁 feed，排序位置取決於 date。設為今日可能擠占 feed 頂部。
→ Mitigation：可在遷移完成後手動調整 date 為各專案的實際建立時間。

**[Risk] `/projects/<slug>` 舊 URL 斷掉**
→ 個人站可接受；若未來有外部分享連結會回傳 404。
→ Mitigation：若有需要，可在 `public/_redirects` 加靜態 redirect 規則（Cloudflare Pages 支援）。

**[Risk] case-study 文章出現在首頁 feed，可能稀釋技術文章的資訊流**
→ 6 篇 case-study 加入後會出現在 feed 中，對於習慣只看技術文章的讀者是干擾。
→ Mitigation：case-study 有明顯的 `#bf5af2` 紫色 badge，讀者可視覺辨識；未來可加分類過濾。

**[Risk] skill 檔案沒有自動測試，case-study 流程正確性無法驗證**
→ 只能靠手動觸發 post skill 測試 case-study 路徑。
→ Mitigation：在 `post/SKILL.md` 的步驟中加入明確的驗證 checklist，確保 Claude 每次生成都檢查 5 個必要段落與 2 張 Mermaid 圖。

---

## Migration Plan

**步驟（依序執行）**

1. 更新 `content.config.ts`（移除 projects collection、更新 type enum、加 github/url 欄位）
2. 建立 6 個遷移後的 post 檔案，刪除 `src/content/projects/`
3. 更新所有依賴 projects collection 的頁面（projects.astro、en/projects.astro、tags、index）
4. 更新 PostCard（github/url props、移除 kind prop、type badge 配色）
5. 移除 `syncProjects()`
6. 更新 post skill（case-study 模板、觸發規則、frontmatter schema 說明）
7. 刪除 `.claude/skills/project/` 目錄
8. 執行 `pnpm build` 確認無錯誤
9. 執行 `pnpm dev` 目視確認：`/`、`/projects`、`/posts/tech/2026-04-23-llm-assistant`、`/tags/ai`
10. （Phase 2）prose 65ch + sticky TOC
11. （Phase 3）featured card + 緊湊列表

**Rollback**
步驟 1–9 全部在 git 中；任何步驟出問題直接 `git checkout` 回上一個 commit。`src/content/projects/` 的舊檔案在 git history 中可復原。

---

## Open Questions

- **遷移 date**：6 個 case-study 的 `date` 要設成今日（2026-04-23）還是各專案的實際 commit 日期？若要用 commit 日期，需要 `git log --follow` 查歷史。
- **英文版 case-study**：`/en/projects` 目前顯示 `lang: zh-TW` 的 case-study（因為沒有 `lang: en` 版本）。是否要加英文版 case-study，或直接連結到中文版？
