# 雙語模式全面改版

**日期：** 2026-05-22  
**狀態：** 已核准

## 問題描述

雙語模式要求 `.en.tts-script.txt` 與 `.tts-script.txt` 同時存在才能啟用。目前 64 篇英文文章中，只有 19 篇有英文 TTS 腳本、30 篇有中文 TTS 腳本，導致大多數文章的雙語按鈕維持灰色停用狀態。此外，現有的雙語版面樣式簡陋（`.prose` 內的純 `<p>` 標籤），且兩欄之間沒有段落級別的對應關係。

## 目標

1. `tts-all` 以「配對」為單位運作，確保每篇文章的英文與中文腳本同時生成，不留單邊。
2. 透過 LLM 生成段落對齊映射（`bilingual-map.json`），讓英中段落可以精確連結。
3. TTS 腳本與雙語映射遷移至獨立的 `src/tts/` 目錄，`src/content/posts/` 只保留 `.md` 文章檔。
4. 雙語版面改採 Podcast／演講稿風格，支援跨欄段落高亮與詞彙點擊卡片。

## 資料層

### 目錄結構

```
src/tts/
  <category>/
    YYYY-MM-DD-<slug>.en.tts-script.txt   # 英文旁白腳本
    YYYY-MM-DD-<slug>.tts-script.txt      # 中文旁白腳本
    YYYY-MM-DD-<slug>.bilingual-map.json  # 段落對齊映射
```

### bilingual-map.json 格式

```json
{
  "pairs": [
    { "en": 0, "zh": 0 },
    { "en": 1, "zh": 1 },
    { "en": [2, 3], "zh": [2] },
    { "en": 4, "zh": [3, 4] }
  ]
}
```

每個 `pairs` 項目將一個或多個英文段落索引對應到一個或多個中文段落索引。索引從 0 開始，對應將腳本以 `\n\n` 分割後的段落陣列。

若某段落在另一語言沒有對應語意，則省略該條目，UI 對該段落不做高亮處理。

### 遷移說明

一次性遷移 shell script，將 `src/content/posts/` 下現有的 `.tts-script.txt` 搬移至對應的 `src/tts/` 路徑後刪除原檔。

## Script 變更

### `tts-all.ts` — 改為配對模式

**現有行為：** 每個 `.md` 檔案獨立處理。

**新行為：**

1. 掃描 `src/content/posts/` 下所有 `*.en.md`，以此為配對錨點。
2. 對每篇英文文章，找到對應的中文文章（`<base>.md`）。
3. 推算 `src/tts/<category>/` 輸出目錄。
4. 英文腳本不存在時生成（`generateTTSScript`，英文 prompt，輸出至 `src/tts/`）。
5. 中文腳本不存在時生成（`generateTTSScript`，中文 prompt，輸出至 `src/tts/`）。
6. 兩份腳本都存在後，生成 `bilingual-map.json`（`generateBilingualMap`）。
7. 音頻合成邏輯不變：跳過已有 `audio_url` 的文章。

純中文文章（無對應 `.en.md`）仍可進行音頻合成，但不生成雙語映射。

### `src/lib/tts.ts` — 新增 `generateBilingualMap`

```ts
generateBilingualMap(
  enScript: string,
  zhScript: string,
  outputPath: string
): Promise<void>
```

- 將兩份腳本以 `\n\n` 分割為段落陣列。
- 建立 LLM prompt，傳入兩份帶索引的段落陣列，要求輸出符合上述 schema 的 JSON。
- 呼叫 Claude CLI（`spawnSync('claude', ['--print', '--dangerously-skip-permissions'])`）。
- 解析 stdout 的 JSON，驗證格式後寫入 `outputPath`。
- 失敗時退化：若 LLM 呼叫失敗或 JSON 格式無效，寫入 identity map（`{"pairs": [{"en":0,"zh":0},…]}`，筆數取 `min(enLen, zhLen)`），並記錄警告。

### 路徑輔助函式

新增 `getTTSDir(category: string): string`，回傳 `path.join(process.cwd(), 'src/tts', category)`；新增 `getTTSBasename(slug: string): string`，去除 slug 的 `.en` 後綴。兩者供 `tts-all.ts` 與 `tts.ts` 共用。

## Astro 頁面變更 — `[...slug].astro`

在 `getStaticPaths` 中：

- 腳本路徑從 `src/content/posts/<base>.*` 改為 `src/tts/<category>/<slug>.*`。
- 額外讀取 `bilingual-map.json`（若存在）：`const alignmentMap = existsSync(mapPath) ? JSON.parse(readFileSync(mapPath, 'utf-8')) : null`。
- 將 `alignmentMap` 作為 prop 傳入頁面。

`hasZh` 條件不變：僅在 `enScript` 與 `zhScript` 同時存在時啟用雙語切換按鈕。

## 元件 — `BilingualView.tsx`

將 `[...slug].astro` 中內嵌的 `bilingual-wrapper` 標記抽離為獨立的 React 元件：

```tsx
<BilingualView
  client:load
  enScript={enScript}
  zhScript={zhScript}
  alignmentMap={alignmentMap}
/>
```

`ReadingModeBar.tsx` 繼續管理切換狀態，在 `.article-grid` 上增減 `bilingual-on` class，`BilingualView` 依此 class 顯示或隱藏（CSS 控制）。

### 英文欄

- 標題標籤：`🇺🇸 English`。
- 每段渲染為 `<p class="para-card" data-en-idx={i}>`。
- 雙語模式啟動時執行 `applyGlossary()`（從 `ReadingModeBar` 移入此處）。
- hover 英文段落 → 查詢 `alignmentMap.pairs`，找出對應 ZH 索引 → 為對應中文段落加上 `.zh-highlight` class。

### 中文欄

- 標題標籤：`🇹🇼 中文`。
- 每段渲染為 `<p class="para-card" data-zh-idx={i}>`。
- 高亮由英文欄驅動，中文欄段落被動響應。

### 段落卡片樣式（Podcast／演講稿風）

```css
.para-card {
  font-size: 18px;
  line-height: 1.9;
  padding: 20px 24px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  transition: background 0.15s;
}

.para-card:hover,
.para-card.zh-highlight {
  background: var(--bg-secondary);
}
```

### 精讀模式詞彙卡片

**現有：** hover `.gloss` span → CSS `::after` tooltip 顯示一行中文翻譯。

**新增：** 點擊 `.gloss` span → 浮動卡片（`<div class="gloss-card">`），內容包含：

- 英文詞彙（粗體）
- 中文翻譯（`glossary[term].zh`）
- 可選補充說明（`glossary[term].context`）：一句說明該詞在系統架構語境下的意義

卡片定位相對於被點擊元素，點擊外部或按 `Escape` 關閉。

### `src/data/glossary.ts` — 資料結構擴充

```ts
export interface GlossEntry {
  zh: string;
  context?: string;
}

export const glossary: Record<string, GlossEntry> = {
  "latency": { zh: "延遲", context: "影響使用者感知速度的關鍵指標，通常以 p50/p99 衡量。" },
  // ...
}
```

hover tooltip 繼續顯示 `entry.zh`。點擊卡片同時顯示 `zh` 與 `context`。

`applyGlossary()` 中所有 `glossary[term]` 的用法須更新：`span.dataset.def = def` 改為 `span.dataset.def = def.zh`。CSS `content: attr(data-def)` tooltip 行為不變。

## 遷移 Script

```bash
#!/usr/bin/env bash
# migrate-tts-scripts.sh
# 將 src/content/posts/ 下現有的 .tts-script.txt 搬移至 src/tts/
set -euo pipefail
find src/content/posts -name "*.tts-script.txt" | while read src; do
  rel="${src#src/content/posts/}"
  cat_dir="src/tts/$(dirname "$rel")"
  mkdir -p "$cat_dir"
  mv "$src" "$cat_dir/$(basename "$rel")"
done
echo "遷移完成。"
```

## 錯誤處理

- `generateBilingualMap` LLM 呼叫失敗 → 退化為 identity map，記錄警告。
- 執行期找不到 `bilingual-map.json` → UI 不做跨欄高亮，兩欄仍正常渲染。
- EN 文章找不到對應 ZH `.md` → 記錄警告，跳過 ZH 腳本生成，該文章雙語按鈕維持停用。

## 不在範圍內

- 已有 `audio_url` 的文章不重跑音頻合成（現有跳過邏輯不變）。
- 純中文文章（無英文路由）不做雙語模式。
- 腳本手動編輯後的即時重新對齊。
