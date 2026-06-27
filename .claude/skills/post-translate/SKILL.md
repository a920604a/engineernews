---
name: post-translate
description: Translate an existing zh-TW post under src/content/posts/<category>/ into an English version, written as a sibling `.en.md` file (same slug) with `lang: en`. Use when the user says 翻成英文 / 翻成 en / translate post / 出個英文版 / 補英文版 and references an existing zh-TW post by URL, slug, filename, or title keyword. Skip when a `.en.md` already exists or the source is already `lang: en`.
---

# post-translate skill

把既有的 zh-TW 文章做出對應英文版。**本專案雙語用「同 slug + `.en.md`」**（不是另開英文 slug）。

## 路由規則

```
src/content/posts/tech/2026-06-14-why-is-kafka-fast-part-1.md      # zh-TW (lang: zh-TW)
src/content/posts/tech/2026-06-14-why-is-kafka-fast-part-1.en.md   # English (lang: en)
```
- 同目錄、同檔名，英文版多 `.en` 後綴。
- 英文版 frontmatter `lang: en`，其餘 key 對齊（保留 `series`、`glossary`、`type`、`tags`、`original_url`、`audio_url` 若有就照搬；`title`/`tldr`/`description`/`key_points` 翻成英文）。

## 執行步驟

1. **確認來源**：使用者給 slug/標題/URL → Glob 找到 `src/content/posts/<cat>/...md`。
2. **檢查**：若已有 `.en.md` 或來源本身 `lang: en` → 停，回報不需翻。
3. **翻譯 frontmatter**：
   - `title` / `tldr` / `description` → 自然、技術正確的英文（不是逐字直譯）
   - `key_points`（若有）→ 逐條翻成英文，保持「短、可一眼掃完」，條數與順序對齊中文版
   - `tags` 照搬（已是 lowercase-kebab 英文）
   - `lang: en`
   - `series`（若有）→ `name` 保持原值（系列以 name 分組，中英共用同一 name），`order` 不變
   - `glossary`（若有）→ 照搬（已含 `_en` 欄位）
   - 移除 zh 專屬、保留 `original_url` / `category` / `date` / `type` / `pinned`
4. **翻譯內文**：技術術語維持原文（RAG、embedding、sendfile…），中文敘述翻成通順英文；保留 Markdown 結構、code block、Mermaid、連結。`## 參考資料` → `## References`。
5. **寫檔** `<same-path>.en.md`。
6. **驗證**：node 20 跑 `npx astro sync`（schema）+ 抽看 `/en/posts/<slug>` 能否 build。

## 批次模式

使用者說「把所有缺英文版的補上」時：
```bash
# 列出有 zh 但沒 en 的文章
for f in $(find src/content/posts -name "*.md" ! -name "*.en.md"); do
  [ -f "${f%.md}.en.md" ] || echo "$f"
done
```
逐篇翻譯。量大時先回報清單與數量，分批進行、讓使用者可中斷。

## 常見錯誤
- 用新英文 slug 另開檔：錯，本專案是 `.en.md` 同 slug。
- 逐字硬翻：要通順、技術精準。
- 漏搬 `series` / `glossary` / `audio_url`：英文頁的系列歸屬、詞彙卡、語音會失效。
- 翻譯技術名詞（把 embedding 翻成「嵌入」當英文）：技術術語保留原文。
