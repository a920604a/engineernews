## Why

現有的 `projects` collection 與 `posts` collection 是兩套平行系統，造成 feed、tags、sync 腳本都需要維護兩條路徑；同時 post 的 `type` 欄位只有 5 個值（含 `crawled` 這種以「產生方式」而非「內容類型」命名的值），無法有效描述文章結構。高流量技術 Blog 的研究也指出：閱讀寬度過寬（現為 720px）與缺少 sticky TOC 是最影響閱讀體驗的兩個問題。

## What Changes

- **BREAKING** 移除 `projects` Astro collection；6 個現有 project 檔案遷移至 `posts/` 成為 `type: case-study`
- **BREAKING** `type` enum 移除 `crawled`，爬蟲產生的文章改以內容類型分類（如 `explainer`、`newsjacking`）
- `type` enum 擴充至 10 個值，新增：`how-to`、`listicle`、`explainer`、`case-study`、`comparison`、`research`、`newsjacking`
- posts schema 新增 `github` 和 `url` 兩個可選欄位（供 `case-study` 使用）
- `/projects` 頁面改為查詢 `type=case-study` 的 posts（URL 不變，行為不變）
- `/projects/<slug>` detail 頁面移除，由 `/posts/<id>` 承接
- `sync-to-d1.ts` 移除 `syncProjects()` — case-study 文章直接走 `syncPosts()`
- **BREAKING** `project` skill 完全移除；其功能（GitHub README 抓取、五段式結構、Mermaid 架構圖）整合至 `post` skill，新增 `templates/case-study.md` 模板承接所有專案類文章
- 文章頁 prose 寬度從 720px 收窄至 `65ch`
- 文章頁桌面版（≥ 1024px）加入 sticky sidebar TOC，手機版保留折疊式 TOC
- 首頁 feed 加入「精選大卡」（第一筆）＋「最新文章」緊湊列表的視覺層次
- PostCard 各 `type` 使用不同 badge 顏色；`case-study` 顯示 GitHub／網站連結

## Capabilities

### New Capabilities

- `post-type-system`：posts 的 type 分類系統，定義 10 種文章類型的語意與 UI 行為（badge 顏色、連結顯示規則）；包含 `case-study` 類型的完整觸發邏輯、GitHub README 抓取流程、五段式內容結構與 `templates/case-study.md` 模板
- `article-reading-experience`：文章頁閱讀體驗規格，包含 prose 寬度、sticky TOC layout 與響應式行為
- `feed-visual-hierarchy`：首頁 feed 的視覺層次規格，包含精選大卡與緊湊列表的切換邏輯

### Modified Capabilities

- `portfolio-system`：**BREAKING** — `/projects` 頁面資料來源從 `projects` collection 改為 `posts` collection（`type=case-study` filter）；`/projects/<slug>` 路由移除
- `content-engine`：feed 移除 projects 資料來源；feed 新增視覺層次（featured + list 分層）

## Impact

**程式碼**
- `src/content.config.ts`：schema 變更（移除 projects collection）
- `src/content/projects/*.md` → `src/content/posts/<category>/`（6 個檔案遷移）
- `src/pages/projects.astro`、`src/pages/en/projects.astro`：改查 posts
- `src/pages/projects/[...slug].astro`：刪除
- `src/pages/index.astro`、`src/pages/en/index.astro`：移除 projects 查詢
- `src/pages/tags/[tag].astro`、`src/pages/en/tags/[tag].astro`：移除 projects 查詢
- `src/components/PostCard.astro`：新增 github/url props、移除 kind prop、type badge 配色
- `src/layouts/BaseLayout.astro`：prose 65ch、article layout override
- `src/pages/posts/[...slug].astro`、`src/pages/en/posts/[...slug].astro`：sticky TOC layout
- `scripts/sync-to-d1.ts`：移除 syncProjects()

**Skills**
- `.claude/skills/post/SKILL.md`：新增 case-study 觸發規則、GitHub README 抓取步驟
- `.claude/skills/post/templates/case-study.md`：新建，整合原 project skill 的五段式結構 + 雙 Mermaid 圖（架構圖 + 流程圖）+ github/url frontmatter
- `.claude/skills/post/references/frontmatter-schema.md`：補充 `github`、`url`、`type` case-study 欄位說明
- `.claude/skills/project/`：**整個目錄刪除**（SKILL.md、templates/、references/ 全部移除）

**URL 破壞性變更**
- `/projects/<slug>` 路由消失（個人站，404 可接受）；`/projects/` 列表頁 URL 不變
