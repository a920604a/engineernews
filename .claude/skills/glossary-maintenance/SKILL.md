---
name: glossary-maintenance
description: Use when reviewing Engineer News glossary lookup stats, deciding whether reader-searched terms should become site-wide glossary entries (src/lib/glossary/terms.ts) or article-specific frontmatter glossary entries, or checking glossary coverage after publishing content.
---

# Glossary Maintenance

維護文章術語提示，讓讀者查過、容易卡住的詞回流成可點開的 glossary 解釋。

## 資料架構（本專案）

- **全站詞彙**：`src/lib/glossary/terms.ts`
  - `DEFAULT_GLOSSARY_TERMS` = 「精選 rich 詞條」(`RICH_TERMS`，雙語 definition/advanced/context/links) 疊加在「legacy 輕量詞條」(`src/data/glossary.ts` 的 188 筆 `{zh, context}`) 之上；同名時 rich 覆蓋 legacy。
  - 要補一個跨多篇、會卡理解的詞 → 加進 `RICH_TERMS`（給 beginner/advanced/links 才有價值）。
- **文章專屬詞彙**：該篇 `.md` frontmatter 的 `glossary:` 陣列（schema 見 `src/content.config.ts`）。只在單篇、專案代號、特定脈絡才用。
- **互動卡片**：讀者點詞 → `POST /api/glossary/explain`（Workers AI qwen 產生解釋 + local fallback），並把該次查詢寫進 D1 `glossary_lookup_stats`。
- **顯示**：`src/lib/applyGlossary.ts` 掃內文標 `.gloss`，slug 頁腳本叫出卡片（入門/進階切換）。

## 何時使用

- 每月內容維護時，回顧 `glossary_lookup_stats`。
- 新增或大改 3–5 篇文章後，檢查 glossary coverage。
- 使用者問「哪些詞該補 glossary」「讀者常查哪些詞」「要補全站詞彙還是文章詞彙」。

## 維護節奏

| 時機 | 做什麼 |
|------|--------|
| 寫新文章時 | 只補明顯會影響理解的詞 |
| 新增／大改 3–5 篇文章後 | 跑 `pnpm check:glossary`，找沒有 coverage 的文章 |
| 每月一次 | 查 `glossary_lookup_stats`，整理高頻查詢詞 |

## 判斷規則

- 累積查詢 5 次以上：檢查是否需要補 glossary。
- 同一詞出現在多篇文章，或是通用概念 → 補到 `src/lib/glossary/terms.ts` 的 `RICH_TERMS`。
- 只集中在單篇、專案代號、特定脈絡 → 補到該篇 frontmatter 的 `glossary`。
- 不補所有專有名詞，只補「不解釋會影響理解」的詞。

## 查詢方式

`glossary_lookup_stats` 是讀者點查 glossary 時累積的 D1 統計，不是每次寫文章都要查。用 wrangler 查（本地加 `--local`，正式去掉）：

```bash
# 高頻查詢詞
wrangler d1 execute engineer-news-db --local --command \
  "SELECT term, SUM(lookup_count) AS total, COUNT(DISTINCT slug) AS posts \
   FROM glossary_lookup_stats GROUP BY term HAVING total >= 5 \
   ORDER BY total DESC, posts DESC;"

# 某個詞集中在哪些文章
wrangler d1 execute engineer-news-db --local --command \
  "SELECT term, slug, SUM(lookup_count) AS total FROM glossary_lookup_stats \
   WHERE term = 'RAG' GROUP BY term, slug ORDER BY total DESC;"
```

## 執行步驟

1. 跑 `pnpm check:glossary`（可帶檔案/資料夾參數縮小範圍）或查 lookup stats。
2. 列候選詞：term、total lookup、posts、主要 slug。
3. 逐詞判斷：全站詞彙 / 文章詞彙 / 暫不處理。
4. 改 `RICH_TERMS`（記得補 `_en` 欄位）或文章 frontmatter `glossary`。
5. 用 node 20（`nvm use v20.20.2`）跑 `npx astro build`，抽樣開文章確認 popover 正常；改了 schema 要先 `npx astro sync`。

## 常見錯誤

- 把 `glossary_lookup_stats` 當成發文前必跑：錯，它適合發布後或內容維護時看。
- 看到技術名詞就全補：錯，只補會阻礙理解的詞。
- 單篇特有詞放進全站：錯，先放該篇 frontmatter，除非多篇都會用到。
- rich 詞條只寫中文：錯，`RICH_TERMS` 要補 `definition_en` / `advanced_en`，否則英文頁卡片會 fallback。
