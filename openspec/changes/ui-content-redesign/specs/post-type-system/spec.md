## ADDED Requirements

### Requirement: 文章類型 enum
系統 SHALL 支援以下 10 種 `type` 值，所有值為可選欄位；未設定 type 的文章視為一般文章正常顯示：
`debug` / `deep-dive` / `guide` / `how-to` / `listicle` / `explainer` / `case-study` / `comparison` / `research` / `newsjacking`

#### Scenario: 合法 type 值通過 schema 驗證
- **WHEN** 一篇文章的 frontmatter 含 `type: case-study`
- **THEN** Astro content collection schema 驗證通過，文章正常出現在 feed

#### Scenario: 不合法 type 值被拒絕
- **WHEN** 一篇文章的 frontmatter 含 `type: crawled`（已移除的舊值）
- **THEN** `pnpm build` 報 Zod validation error，build 失敗

---

### Requirement: type badge 配色
PostCard 的 type badge SHALL 依 type 值顯示不同顏色，讓讀者一眼辨識文章類型。

| type | 顏色 |
|------|------|
| `debug` | 紅色 `#ff5f57` |
| `how-to` | 綠色 `var(--color-green)` |
| `listicle` | 橙色 `#ff9f0a` |
| `explainer` | accent 藍 `var(--accent)` |
| `case-study` | 紫色 `#bf5af2` |
| `comparison` | 青色 `#64d2ff` |
| `research` | 黃色 `#ffd60a` |
| `newsjacking` | 粉紅 `#ff6b81` |
| `deep-dive` | accent 藍（加深） |
| `guide` | 綠色（預設） |

#### Scenario: case-study badge 顯示紫色
- **WHEN** 一篇 `type: case-study` 的文章卡片渲染在 feed
- **THEN** badge 背景為 `#bf5af2` 的 10% 透明色，文字為 `#bf5af2`

---

### Requirement: case-study github/url 欄位
posts schema SHALL 支援可選的 `github`（URL）與 `url`（URL）欄位，僅 `case-study` 類型文章填寫。

#### Scenario: github 欄位通過 URL 格式驗證
- **WHEN** frontmatter 含 `github: "https://github.com/user/repo"`
- **THEN** schema 驗證通過

#### Scenario: 無效 URL 被拒絕
- **WHEN** frontmatter 含 `github: "not-a-url"`
- **THEN** `pnpm build` 報 Zod URL validation error

---

### Requirement: case-study 卡片連結顯示
PostCard 在 `type: case-study` 時 SHALL 在卡片底部顯示 GitHub 與網站的連結按鈕（若欄位有值）。

#### Scenario: 有 github 的 case-study 卡片顯示 GitHub 連結
- **WHEN** `type: case-study` 且 `github` 欄位有值
- **THEN** PostCard 底部出現「GitHub ↗」連結，`target="_blank"`

#### Scenario: 無 github 的 case-study 卡片不顯示連結列
- **WHEN** `type: case-study` 但 `github` 與 `url` 皆為空
- **THEN** PostCard 不顯示連結列，版面無空白殘留

---

### Requirement: case-study 生成流程（post skill）
post skill 在觸發 case-study 時 SHALL 執行以下流程：

1. 若使用者提供 GitHub URL，先以 raw URL 抓取 README；失敗則 fallback 至 GitHub 頁面 HTML
2. 從 README / 對話萃取：背景、挑戰、解法、成果
3. 套用 `templates/case-study.md` 模板，產生五段式結構：摘要、背景、挑戰、解法（含 core contributions 列表）、成果
4. 主動生成兩張 Mermaid 圖：架構圖（`graph LR`）+ 流程圖（`flowchart TD`），優先沿用 README 現有圖表
5. 存至 `src/content/posts/<category>/YYYY-MM-DD-<slug>.md`，type 固定為 `case-study`

#### Scenario: 提供 GitHub URL 觸發 case-study
- **WHEN** 使用者對 post skill 說「我做了一個專案」並附上 GitHub URL
- **THEN** skill 抓取 README，產生含五段式結構與雙 Mermaid 圖的草稿，存至 posts/

#### Scenario: 不提供 GitHub URL 的 case-study
- **WHEN** 使用者說「幫我寫 case study」但未附 GitHub URL
- **THEN** skill 從對話中收集資訊，套用 case-study 模板，產生草稿（Mermaid 圖依對話資訊生成）

---

### Requirement: project skill 移除
`.claude/skills/project/` 目錄 SHALL 完全刪除；所有專案類文章改由 post skill `case-study` 路徑處理。

#### Scenario: 呼叫已刪除的 project skill
- **WHEN** 使用者嘗試觸發 `/project` slash command
- **THEN** 系統回應 skill 不存在，引導使用者改用 post skill 並說「case study」或「我做了一個專案」
