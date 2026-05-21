# TTS LLM 劇本生成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 TTS pipeline 前加入 LLM 劇本生成層，用 `claude --print` 將技術文章改寫成自然口語腳本再送 TTS 合成。

**Architecture:** `generateTTSScript()` 新增至 `src/lib/tts.ts`，以 `spawnSync` 呼叫 `claude --print`（stdin pipe），腳本快取為同目錄 `.tts-script.txt`。`scripts/tts-all.ts` 的 `processPost()` 替換原本的 `processTextForTTS()` 呼叫。CI/CD 不受影響（此功能僅本機使用）。

**Tech Stack:** TypeScript, Node.js `child_process.spawnSync`, Claude Code CLI (`claude --print`)

---

## File Map

| 檔案 | 動作 | 說明 |
|-----|------|------|
| `src/lib/tts.ts` | Modify | 新增 `generateTTSScript()` 函式、新增 `spawnSync` import |
| `scripts/tts-all.ts` | Modify | `processPost()` 改用 `generateTTSScript()`，更新 import |
| `.gitignore` | Modify | 加入 `*.tts-script.txt` |

---

## Task 1: 更新 .gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: 在 `.gitignore` 末尾加入 `*.tts-script.txt`**

在 `.gitignore` 的 `# TypeScript` 區段下加一行：

```
# TTS generated scripts (local cache, not committed)
*.tts-script.txt
```

- [ ] **Step 2: 驗證**

```bash
git check-ignore -v src/content/posts/tech/2026-05-20-foo.tts-script.txt
```

預期輸出包含 `.gitignore:XX:*.tts-script.txt`

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore *.tts-script.txt generated files"
```

---

## Task 2: 新增 `generateTTSScript()` 到 `src/lib/tts.ts`

**Files:**
- Modify: `src/lib/tts.ts`

- [ ] **Step 1: 在 import 區段加入 `spawnSync`**

將第 4 行：
```typescript
import { execSync } from 'node:child_process';
```
改為：
```typescript
import { execSync, spawnSync } from 'node:child_process';
```

- [ ] **Step 2: 在 `processTextForTTS()` 函式之前新增 prompt 常數與 `generateTTSScript()` 函式**

在 `src/lib/tts.ts` 的 `processTextForTTS` 函式定義之前插入：

```typescript
const ZH_TTS_PROMPT_TEMPLATE = `你是一位技術 Podcast 主持人，兼具廣播主播的清晰度與 Podcast 的個性感。
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
{content}`;

const EN_TTS_PROMPT_TEMPLATE = `You are a tech podcast host with the clarity of a radio broadcaster and the personality of a great storyteller.
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
{content}`;

/**
 * 用 claude --print CLI 將文章改寫為適合朗讀的腳本，快取為 outputPath。
 * 若 outputPath 已存在則直接回傳快取（冪等）。
 * 若 claude CLI 不可用，fallback 到 processTextForTTS()。
 */
export function generateTTSScript(
  title: string,
  tldr: string,
  content: string,
  lang: 'zh' | 'en',
  outputPath: string
): string {
  // 若快取已存在，直接回傳
  if (fs.existsSync(outputPath)) {
    console.log(`  📄 使用快取劇本: ${path.basename(outputPath)}`);
    return fs.readFileSync(outputPath, 'utf-8');
  }

  const template = lang === 'en' ? EN_TTS_PROMPT_TEMPLATE : ZH_TTS_PROMPT_TEMPLATE;
  const prompt = template
    .replace('{title}', title)
    .replace('{tldr}', tldr || '（無摘要）')
    .replace('{content}', content);

  try {
    console.log(`  🤖 LLM 生成劇本中...`);
    const result = spawnSync('claude', ['--print', '--dangerously-skip-permissions'], {
      input: prompt,
      encoding: 'utf8',
      timeout: 120_000,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || `exit code ${result.status}`);

    const script = (result.stdout as string).trim();
    if (!script) throw new Error('claude 回傳空字串');

    fs.writeFileSync(outputPath, script, 'utf-8');
    console.log(`  💾 劇本已存: ${path.basename(outputPath)}`);
    return script;
  } catch (e) {
    console.warn(`  ⚠️  LLM 劇本生成失敗，改用原始文字清理: ${e instanceof Error ? e.message : e}`);
    return processTextForTTS(title, tldr, content);
  }
}
```

- [ ] **Step 3: 確認 TypeScript 型別無誤**

```bash
cd /home/horus/Desktop/engineernews && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

預期：無錯誤輸出（或僅 Cloudflare worker 環境相關的既有警告）

- [ ] **Step 4: Commit**

```bash
git add src/lib/tts.ts
git commit -m "feat: add generateTTSScript() with claude --print LLM preprocessing"
```

---

## Task 3: 更新 `scripts/tts-all.ts` 使用新函式

**Files:**
- Modify: `scripts/tts-all.ts`

- [ ] **Step 1: 更新 import，加入 `generateTTSScript`**

將第 5 行：
```typescript
import { synthesizeWithFallback, processTextForTTS, DEFAULT_TTS_API_URL } from '../src/lib/tts';
```
改為：
```typescript
import { synthesizeWithFallback, generateTTSScript, DEFAULT_TTS_API_URL } from '../src/lib/tts';
```

- [ ] **Step 2: 更新 `processPost()` 函式**

在 `processPost()` 中，找到這段：
```typescript
  const ttsText = processTextForTTS(title, tldr, content);
  const audioUrl = await synthesizeWithFallback(ttsText, lang, slug, {
```

替換為：
```typescript
  const scriptPath = filePath.replace(/\.md$/, '.tts-script.txt');
  const ttsText = generateTTSScript(title, tldr, content, lang === 'en' ? 'en' : 'zh', scriptPath);
  const audioUrl = await synthesizeWithFallback(ttsText, lang, slug, {
```

- [ ] **Step 3: 確認 TypeScript 型別無誤**

```bash
cd /home/horus/Desktop/engineernews && npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

預期：無錯誤

- [ ] **Step 4: Commit**

```bash
git add scripts/tts-all.ts
git commit -m "feat: use generateTTSScript() in tts-all pipeline"
```

---

## Task 4: 端到端驗證

**Files:** 無新增修改

- [ ] **Step 1: 對單篇文章執行 TTS**

```bash
cd /home/horus/Desktop/engineernews
make tts-post FILE=src/content/posts/tech/2026-05-20-ai-agentharness.md
```

- [ ] **Step 2: 確認劇本檔案已產生**

```bash
cat src/content/posts/tech/2026-05-20-ai-agentharness.tts-script.txt | head -30
```

預期：
- 口語中文，無 Markdown 語法
- 不以「您好，歡迎收聽」開頭
- 程式碼區塊被轉為口語說明

- [ ] **Step 3: 確認音檔已合成並寫入 frontmatter**

```bash
grep "audio_url" src/content/posts/tech/2026-05-20-ai-agentharness.md
```

預期：`audio_url: "/api/tts/r2/tts/..."`

- [ ] **Step 4: 確認快取機制正常（再跑一次，應跳過 LLM）**

```bash
make tts-post FILE=src/content/posts/tech/2026-05-20-ai-agentharness.md
```

預期 log 出現：`📄 使用快取劇本:`，不再呼叫 LLM

- [ ] **Step 5: 測試英文文章**

```bash
make tts-post FILE=src/content/posts/tech/2026-05-20-ai-agentharness.en.md
```

確認 `.tts-script.txt` 產生的是英文腳本。

- [ ] **Step 6: 測試 fallback（用 PATH 覆蓋 claude 模擬不可用）**

```bash
# 先刪快取，確保會重新呼叫 LLM
rm -f src/content/posts/tech/2026-05-20-ai-agentharness.tts-script.txt

# 讓 claude 找不到，觀察 fallback
PATH=/usr/bin:/bin make tts-post FILE=src/content/posts/tech/2026-05-20-ai-agentharness.md 2>&1 | grep -E "⚠️|fallback|失敗"
```

預期：log 出現 `⚠️  LLM 劇本生成失敗，改用原始文字清理`，TTS 仍正常合成（音檔生成成功）

- [ ] **Step 7: 確認 .tts-script.txt 不被 git 追蹤**

```bash
git status src/content/posts/tech/2026-05-20-ai-agentharness.tts-script.txt
```

預期：`nothing to commit` 或該檔案未出現在 git status 中
