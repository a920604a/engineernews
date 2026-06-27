# TODO / Roadmap

## 英文聽力功能重構（English listening practice）

### 真實機制（先講清楚，免得又把前提搞錯）

聽力功能用的音檔與雙語字幕，**跟 YouTube 完全無關、也不動文章本身**。pipeline 是：

```
文章（zh）──post-translate──▶ 文章（en）
   │
   └─ generateTTSScript（LLM 把文章改寫成「聆聽逐字稿」）
        ├─ <slug>.tts-script.txt    （zh 稿）
        ├─ <slug>.en.tts-script.txt （en 稿）
        ├─ generateBilingualMap ──▶ bilingual-map.json（en↔zh 段級對齊）
        └─ TTS 合成 ──▶ mp3（audio_url）
```

- `BilingualView` 的雙語字幕 = 這兩份 **LLM 逐字稿**（`.tts-script.txt`），不是 YouTube 字幕。
- 音檔 = 逐字稿餵 TTS 的**合成音**，不是 native 原音。
- `srt_url` 目前全空：Edge TTS 的 `SynthesizeResult` 其實會回 `srt_url`，但沒被存檔／回寫 frontmatter，所以沒有句級時間軸。

### 一個必須誠實面對的天花板

因為音源**必然是合成音**（沒有 native 來源可換，且前提是「不變動文章、與 YouTube 無關」），
這個功能本質是 **「TTS 同步閱讀 / 跟讀練習」**，**無法**訓練真實英語的連音、弱化、吞音解碼——
那些東西 TTS 根本不產生。要真正練 native 聽力得另尋 native 音源，**那已超出本 TODO 範圍**。

→ 所以這裡的目標收斂成：在現有 TTS 音 + LLM 逐字稿上，把**同步、主動努力、句級重複**做好。

| 層 | 內容 | 在「合成音」前提下能做到嗎 |
|---|---|---|
| A. 可理解輸入 | 略高於程度、靠情境猜懂 | ✅ 逐字稿本就 i+1 |
| B. 解碼真實聲音流 | 連音、弱化、吞音 | ❌ 合成音做不到，放棄這層 |
| C. 主動努力 | 先預測再驗證 | ✅ 靠「預設藏中文／藏字」逼出來 |
| D. 句級重複 | 同句反覆聽、跟讀 | ✅ 靠句級同步 + loop |

### 任務清單（依槓桿排序）

- [ ] **#1 句級時間戳：把 TTS 合成的 `srt_url` 存檔並回寫 frontmatter** 🔥 最高槓桿
      `synthesizeWithFallback` 拿到的 `srt_url` 目前被丟掉。存進 R2 + 回寫 frontmatter，
      解鎖句級 loop / 跟讀 / 逐句 highlight 的前置。**完全在 TTS 步驟內，不碰文章。**
- [ ] **#2 BilingualView 預設折疊中文欄，改成 on-demand** 🔥 純前端、零後端、立即見效
      預設只顯示英文，中文做成點/hover 單句才浮出（查詢而非背景），逼出主動努力（C 層）。
- [ ] **#3 alignmentMap 從段級延伸到句級**
      `generateBilingualMap` 目前是段級對齊；延伸到句級，是聽力階梯與逐句 highlight 的共同基礎。
      （與 #1 的句級時間戳對齊：一個給「文字↔文字」、一個給「文字↔音檔」。）
- [ ] **#4 實作「聽力模式階梯」UI**（依賴 #1、#3）
      模式1 純聽 → 模式2 英文逐句同步 highlight（預設）→ 模式3 點句出中文 → 模式4 藏字，聽→跟讀→揭曉。
- [ ] **#5 句級 loop + 可調速 + 跟讀控制**（依賴 #1）
      單句 A/B loop、調速、shadowing。

**建議落地順序**：#1（句級時間戳，前置）→ #2（前端立即見效）→ #3 → #4 / #5。
**投入最小、效果最大的兩顆**：#1 與 #2。

### 相關檔案
- `src/lib/tts.ts` — `generateTTSScript`（LLM 逐字稿）、`generateBilingualMap`、`SynthesizeResult.srt_url`
- `scripts/tts-all.ts` — TTS pipeline（產生 `.tts-script.txt` / `bilingual-map.json` / mp3）
- `src/components/BilingualView.tsx` — 雙語對照檢視、`alignmentMap`、glossary hover
- `src/components/TTSPlayer.tsx` — 播放器、`initialSrtUrl`
- `src/pages/en/posts/[...slug].astro` — 讀 `.tts-script.txt` / `bilingual-map.json` 餵給 `BilingualView`
- `src/content.config.ts` — `audio_url` / `srt_url` frontmatter 欄位

---

## 降低閱讀門檻（「現代人不靜下心逐字讀」）

### 問題診斷（第一性原理）

原始動機是「智能語音導讀」，但拆到底層，「不逐字讀」其實混了三個不同痛點，
而語音只解其中一個：

| 痛點 | 解法 | 語音有用嗎 |
|---|---|---|
| ① 手眼忙碌（通勤、健身、家事） | 音頻 | ✅ 語音是最佳解 |
| ② 不確定值不值得花時間讀 → 想先篩選 | 文字分層 | ❌ 音頻最不能略讀 |
| ③ 只想知道某一件事 | RAG 問答 | ❌ 音頻無法跳到重點 |

核心洞察：音頻是所有媒介裡「最不能略讀」的，真正服務的是「手眼忙碌」族群，
不是「沒耐心」族群。所以「對話 TTS」是錦上添花（深聽層升級），
真正解「沒耐心」的主痛點要靠**文字分層（推）**與 **RAG 問答（拉）**。

### 決策（2026-06-27）

- **a、b、c 陸續實作**（依序 a → b → c）。
- **d（雙人對話 TTS）押後**，等 a 的播放數據證明有人在聽，再投。
- ffmpeg 已安裝（8.1.2），為 d 的逐句拼接鋪路。

### 任務清單

- [x] **a. 音頻播放埋點**（驗證假設）✅
      `TTSPlayer.tsx` 掛 play / progress(25·50·75%) / complete，sendBeacon → `/api/audio-events` → D1。
      - `migrations/0011_audio_events.sql`（本地 + 生產已套用）
      - `src/pages/api/audio-events.ts`、`src/components/TTSPlayer.tsx`

- [x] **b. 頂部「重點速覽 + 閱讀時間」**（解痛點②）✅
      `key_points` frontmatter（3 條短句，硬上限 zh≤45 字／en≤22 詞）+ 閱讀時間沿用 hero。
      - `src/content.config.ts`、zh/en post 頁渲染 + 樣式
      - backfill 腳本 `scripts/gen-key-points.ts`（含長度檢查 + 重試），已補 date≥2026-06-20 共 7 篇 ×（中英）
      - 已整進發文流程：`post` SKILL.md step 5、`post-translate`、frontmatter-schema 文件

- [x] **c. 文末「問這篇」**（解痛點③）✅
      `/api/search` 加 `postId` 分支：只用本文 chunks 當 context、跳過全站檢索、prompt 限定只引用本文。
      - `src/components/AskThisPost.tsx`、zh/en post 頁
      - ⚠️ 本地測試前需 `make sync` 灌 doc_chunks，否則答「還沒被索引」

- [ ] **d. 雙人對話 TTS（押後）** — 深聽層升級，非主痛點
      腳本改雙人對話（主持人問／來賓答），zh 用 HsiaoChen＋YunJhe、en 用 Ava＋Andrew，
      逐句合成 → ffmpeg 拼接成單一 mp3。綁 Edge TTS，CF fallback 退回單人稿。
      先挑一篇 `draft:false` 文章試跑。**等 a 數據支持再啟動。**
      - 改：`src/lib/tts.ts`、`scripts/tts-all.ts`
