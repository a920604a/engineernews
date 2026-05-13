## ADDED Requirements

### Requirement: LLM 回答渲染為 Markdown
系統 SHALL 將 `/api/search` 回傳的 LLM 回答文字以 Markdown 格式渲染，支援 GFM（GitHub Flavored Markdown）語法。

#### Scenario: 回答含 code block
- **WHEN** LLM 回答包含 \`\`\`語言\`\`\` 區塊
- **THEN** 渲染為帶語法高亮提示的 code block，等寬字型顯示，有背景色區隔

#### Scenario: 回答含清單
- **WHEN** LLM 回答包含 `- item` 或 `1. item` 格式
- **THEN** 渲染為有縮排的無序/有序清單

#### Scenario: 回答含表格（GFM）
- **WHEN** LLM 回答包含 GFM 表格語法
- **THEN** 渲染為有邊框的 HTML 表格，水平可捲動避免溢出

### Requirement: Citation 連結保留
系統 SHALL 保留現有 `[1]`、`[2]` 格式的 citation 連結行為，點擊後導至對應來源文章，與 Markdown 渲染相容。

#### Scenario: 回答含 citation
- **WHEN** LLM 回答包含 `[1]` 格式且該 citation 有對應來源
- **THEN** `[1]` 渲染為可點擊超連結，連至該來源文章，hover 顯示文章標題

#### Scenario: 無對應來源的 citation
- **WHEN** LLM 回答包含 `[N]` 但無對應來源
- **THEN** 顯示為純文字 `[N]`，不渲染為連結

### Requirement: Markdown 渲染不引入 XSS 風險
系統 SHALL 使用 react-markdown 預設的 HTML sanitization，禁止渲染原始 HTML 標籤，防止 XSS。

#### Scenario: LLM 回答含 HTML 標籤
- **WHEN** LLM 回答包含 `<script>` 或其他 HTML 標籤
- **THEN** HTML 標籤以純文字顯示，不執行或渲染為 DOM 元素
