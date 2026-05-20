# TTS LLM 劇本生成設計

**日期：** 2026-05-21  
**狀態：** 待實作

## 背景

現有 TTS pipeline 使用 `processTextForTTS()` 對 Markdown 做機械式清理（去語法符號、跳過程式碼），再直接送 TTS 合成。結果是逐字照稿朗讀，聆聽體驗差。

NotebookLM 等競品的核心差異在於加入一層 **LLM 語義轉型**：將適合閱讀的文字重寫成適合聆聽的腳本。

## 目標

在 TTS 合成前加入 LLM 劇本生成步驟，讓輸出音頻具備：
- 廣播主播的清晰度 + Podcast 主持人的個性感
- 程式碼區塊口語化解釋（不逐字念）
- 精煉至原文 60-80%（去除不適合聆聽的元素）

## 範圍

- 僅在本機跑（`make tts-post`、`make tts-all`），不需要支援 CI/CD
- 使用 `claude -p` CLI（Claude Code 現有認證，無需新 API key）
- 若 `claude` CLI 不可用，fallback 到現有的 `processTextForTTS()`

## 架構

```
make tts-post FILE=xxx.md
  ↓
processPost()
  ├─ 若 xxx.tts-script.txt 已存在 → 直接讀取（跳過 LLM）
  ├─ 否則 → generateTTSScript(title, tldr, content, lang)
  │           ├─ 建構 prompt
  │           ├─ execSync('claude -p "..."')
  │           ├─ 儲存 xxx.tts-script.txt（同目錄）
  │           └─ 若失敗 → fallback processTextForTTS()
  └─ synthesizeWithFallback(script, ...)  ← 現有 TTS pipeline 不動
```

## 劇本格式

存為純文字（`.tts-script.txt`），同文章 `.md` 檔同目錄、同 slug：

```
src/content/posts/tech/2026-05-20-foo.md
src/content/posts/tech/2026-05-20-foo.tts-script.txt  ← 新增
```

## Prompt 設計

### zh-TW 文章

```
你是一位技術 Podcast 主持人，兼具廣播主播的清晰度與 Podcast 的個性感。
將以下技術文章改寫成「純聆聽」的音頻腳本。

規則：
- 程式碼區塊：理解後用口語解釋，不唸原始碼
- 表格：改成口語比較句
- 圖片：直接跳過，不提及
- Mermaid 圖表：口語描述流程
- 語氣：口語自然但技術精準，帶點個性，不要機器人感
- 長度：原文的 60-80%，精煉重點
- 開頭：直接進入主題，不說「歡迎收聽」等套語
- 結尾：總結 2-3 個核心要點，自然收尾
- 輸出：只輸出腳本本身，不加任何說明或標記

文章標題：{title}
摘要：{tldr}
---
{content}
```

### en 文章

```
You are a tech podcast host with the clarity of a radio broadcaster and the personality of a great storyteller.
Rewrite the following technical article into a script made for pure listening.

Rules:
- Code blocks: understand and explain in plain spoken language, never read raw code
- Tables: convert to verbal comparisons
- Images: skip entirely, don't mention them
- Diagrams: describe the flow in plain language
- Tone: natural and conversational, technically precise, with personality — not robotic
- Length: 60-80% of the original, distill to the key points
- Opening: dive straight into the topic, no "welcome to..." phrases
- Closing: summarize 2-3 core takeaways, end naturally
- Output: only the script itself, no meta-commentary or formatting markers

Article title: {title}
Summary: {tldr}
---
{content}
```

## 實作細節

### `generateTTSScript()` 函式

位置：`src/lib/tts.ts`

```typescript
export async function generateTTSScript(
  title: string,
  tldr: string,
  content: string,
  lang: 'zh' | 'en',
  outputPath: string   // .tts-script.txt 完整路徑
): Promise<string>
```

行為：
1. 若 `outputPath` 已存在，直接讀取回傳（冪等）
2. 建構 prompt（依 `lang` 選中文或英文 prompt）
3. 將 prompt 寫入 temp file，以 stdin pipe 方式呼叫：`spawnSync('claude', ['-p', '--dangerously-skip-permissions'], { input: prompt, timeout: 120_000 })` 避免 shell 逸脫問題
4. 寫入 `outputPath`
5. 若 `execSync` 拋錯（`claude` 不存在、逾時等），`console.warn` 後 fallback 到 `processTextForTTS()`

### `scripts/tts-all.ts` 修改

在 `processPost()` 中：
- 計算 `scriptPath = filePath.replace(/\.md$/, '.tts-script.txt')`
- 取代原本的 `processTextForTTS()` 呼叫，改呼叫 `generateTTSScript()`
- 其餘流程（`synthesizeWithFallback`、上傳 R2、寫 frontmatter）不動

### `.gitignore`

加入：
```
*.tts-script.txt
```

## 受影響檔案

| 檔案 | 變更類型 |
|-----|---------|
| `src/lib/tts.ts` | 新增 `generateTTSScript()` 函式 |
| `scripts/tts-all.ts` | 更新 `processPost()` 使用新函式 |
| `.gitignore` | 加入 `*.tts-script.txt` |

## 不在範圍內

- 雙主播對話（Option B）
- CI/CD 自動執行
- 劇本版本管理或 diff
- 音頻後製（混音、BGM）
