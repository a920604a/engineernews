## 1. Schema 重構

- [x] 1.1 修改 `src/content.config.ts`：移除 `projects` collection、更新 `type` enum（移除 `crawled`，新增 7 個值）、加入 `github` 與 `url` 可選 URL 欄位
- [ ] 1.2 執行 `pnpm build`，確認 schema 變更的 TypeScript 錯誤全部來自 pages（尚未更新），無意外型別錯誤

## 2. Content 遷移

- [ ] 2.1 建立 `src/content/posts/product/2026-04-23-a920604a-labs.md`（補 date/type/lang/tldr/draft，body 從舊 projects 複製）
- [ ] 2.2 建立 `src/content/posts/product/2026-04-23-live-english-tutor.md`
- [ ] 2.3 建立 `src/content/posts/product/2026-04-23-nutrition-risk-engine.md`
- [ ] 2.4 建立 `src/content/posts/tech/2026-04-23-llm-assistant.md`
- [ ] 2.5 建立 `src/content/posts/tech/2026-04-23-stock-mlops.md`
- [ ] 2.6 建立 `src/content/posts/tech/2026-04-23-stt-tts-unified.md`
- [ ] 2.7 刪除 `src/content/projects/` 目錄（6 個舊檔案）

## 3. Pages 更新

- [ ] 3.1 重寫 `src/pages/projects.astro`：改用 `getCollection('posts', type=case-study && lang=zh-TW)`，「查看」連結改為 `/posts/<post.id>`
- [ ] 3.2 重寫 `src/pages/en/projects.astro`：同上，lang=zh-TW（暫無英文版 case-study）
- [ ] 3.3 刪除 `src/pages/projects/[...slug].astro`
- [ ] 3.4 修改 `src/pages/index.astro`：移除 projects 查詢與 FeedItem union type，feed 改為單純的 `allPosts` 陣列
- [ ] 3.5 修改 `src/pages/en/index.astro`：同上
- [ ] 3.6 修改 `src/pages/tags/[tag].astro`：移除 projects collection 查詢，tags 僅從 posts 產生
- [ ] 3.7 修改 `src/pages/en/tags/[tag].astro`：同上

## 4. PostCard 更新

- [ ] 4.1 新增 `github` 與 `url` props，移除 `kind` prop，`postHref` 統一為 `/posts/<id>`
- [ ] 4.2 加入 type badge 配色：10 種 type 對應不同顏色（透過 `data-type` attribute + CSS）
- [ ] 4.3 加入 case-study 連結列：`type=case-study` 且有 github/url 時，卡片底部顯示「GitHub ↗」與「網站 ↗」按鈕

## 5. Sync 腳本

- [ ] 5.1 刪除 `scripts/sync-to-d1.ts` 中的 `syncProjects()` 函式及 `main()` 內的呼叫

## 6. Post Skill 更新

- [ ] 6.1 新建 `.claude/skills/post/templates/case-study.md`：五段式結構（摘要、背景、挑戰、解法、成果）+ 雙 Mermaid 佔位符（架構圖 + 流程圖）+ github/url frontmatter
- [ ] 6.2 更新 `.claude/skills/post/SKILL.md`：觸發表加入 case-study 列，補充 GitHub README 抓取步驟（raw URL → fallback GitHub 頁面）
- [ ] 6.3 更新 `.claude/skills/post/references/frontmatter-schema.md`：補充 `github`、`url`、`type`（含 case-study）欄位說明
- [ ] 6.4 刪除 `.claude/skills/project/` 整個目錄（SKILL.md、templates/、references/）

## 7. 驗證

- [ ] 7.1 執行 `pnpm build`，確認零錯誤
- [ ] 7.2 執行 `pnpm dev`，確認 `/`（feed 含 case-study）、`/projects`（6 篇 case-study）、`/posts/tech/2026-04-23-llm-assistant`（文章頁正常）、`/tags/ai`（含 case-study 文章）
- [ ] 7.3 確認 `/projects/llm-assistant` 回傳 404

## 8. 文章閱讀體驗（Phase 2）

- [ ] 8.1 在 `BaseLayout.astro` 的 `.prose` 加入 `max-width: 65ch`
- [ ] 8.2 在 `BaseLayout.astro` 加入 `layout` prop 與 `main[data-layout="article"] { max-width: 1040px }`
- [ ] 8.3 修改 `src/pages/posts/[...slug].astro`：加 `layout="article"`、`<article-grid>` 雙欄 wrapper、desktop sticky TOC `<aside>`、mobile `<details>` 加 `toc-mobile` class
- [ ] 8.4 修改 `src/pages/en/posts/[...slug].astro`：同上（TOC 標題改為 "Table of Contents"）
- [ ] 8.5 驗證桌面版（≥1024px）sticky TOC 固定不隨頁面捲動，手機版顯示折疊式目錄

## 9. Feed 視覺層次（Phase 3）

- [ ] 9.1 在 `PostCard.astro` 加入 `featured` prop 與大卡樣式（標題 24px、padding 28px 32px、3 行摘要）
- [ ] 9.2 修改 `src/pages/index.astro`：index 0 用 `featured={true}`，其餘用標準卡片，兩者之間加「最新文章」分隔標題
- [ ] 9.3 修改 `src/pages/en/index.astro`：同上，分隔標題改為「Latest」
- [ ] 9.4 驗證首頁第一張卡片視覺明顯大於其餘卡片，分隔標題正確顯示
