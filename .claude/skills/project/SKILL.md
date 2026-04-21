---
name: project
description: Manage project metadata and tags; add or update project entries under src/content/projects/.
---

# project skill

把專案資訊轉成一致的 project 頁面，補上 category、tags 與結構化內文，便於索引、搜尋與展示。

## 觸發時機

以下情況應使用此 skill：

- 使用者說「幫我新增/更新一個 project」
- 使用者提供 GitHub repo URL 或貼上 README 內容
- 使用者說「我做了一個專案叫 X」
- 使用者要求更新既有 project 的 description、category 或 tags

## 執行步驟

1. **蒐集資料**：依序抓取以下文件，盡可能多讀以理解系統設計：
   - `README.md`（根目錄）
   - `docs/` 目錄下所有 `*.md` 檔案
   - 根目錄其他 `*.md` 檔案（ARCHITECTURE.md、DESIGN.md 等）
   - **優先**使用 raw URL（`https://raw.githubusercontent.com/<owner>/<repo>/main/<path>`）
   - 若 raw URL 失效（404 / 無內容），**自動 fallback** 改抓 GitHub 頁面 URL（`https://github.com/<owner>/<repo>`），從頁面 HTML 中萃取 README 與描述
   - 若 main 分支失敗，改用 master 再試一次，再失敗才 fallback 到 GitHub 頁面
   - 從蒐集內容生成草稿：background / challenge / solution / core_contributions / outcome

2. **人工審核**：確認 core_contributions 每項具體且含技術名；outcome 有可量化指標。

3. **產生 page body**：套用 `templates/project-page.md` 模板，包含：
   - 五段式正文（背景/挑戰/解法/成果）
   - **架構圖**：優先直接使用 repo 文件中已有的 Mermaid 程式碼（README / docs/*.md 中的 ```mermaid 區塊）；若無，依 `references/writing-guide.md` § Mermaid 圖表 重新生成（`graph LR` 或 `graph TB`）
   - **流程圖**：同上，優先沿用 repo 現有圖；若無，重新生成（`flowchart TD` 或 `sequenceDiagram`）
   - 沿用原圖時可直接複製 mermaid 程式碼，不得自行修改內容

4. **請使用者 review**：展示草稿，詢問是否修改

5. **存檔**：寫入 `src/content/projects/<slug>.md`。

## 參考

- `references/frontmatter-schema.md` — 所有欄位定義、tags / skills 清單、category 規範
- `references/writing-guide.md` — 各欄位寫作原則與 ✅ / ❌ 範例
- `templates/project-page.md` — frontmatter + 五段式正文模板
