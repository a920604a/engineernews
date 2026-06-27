# TODO / Roadmap

## 英文聽力功能重構（English listening practice）

### 問題診斷（第一性原理）

現況：`crawl.ts` 用 `--skip-download` 只抓字幕、丟掉 YouTube 原始母語音檔，改用 TTS 合成；
`BilingualView.tsx` 把中/英雙欄永遠並排；`srt_url` 在 254 篇全空（無 audio↔text 同步）。

這套設計優化的是「**讀懂內容**」，不是「**訓練耳朵**」。聽力習得拆到底層是四層：

| 層 | 內容 | 現況 |
|---|---|---|
| A. 可理解輸入 (i+1) | 略高於現有程度、靠情境猜懂 | ✅ 有（但靠中文翻譯給，不是靠耳朵）|
| B. 解碼聲音流 | chunking、弱化音 (gonna/wanna)、連音、吞音 | ❌ TTS 過度清晰，練錯對象 |
| C. 主動努力 | 先預測 → 再驗證 | ❌ 中文永遠在，被短路 |
| D. 句級重複 | 同句反覆聽、跟讀 | ❌ 無同步、無 loop |

核心洞察：聽力瓶頸不在「不懂意思」，在「聽不出聲音對應到哪個字」。真實英文的難點（連音、吞音、弱化）TTS 根本不產生；中文翻譯一旦免費，耳朵就停止努力。

三個漏洞：
1. **中文欄永遠在** → 短路掉主動努力（C 層）。雙字幕是理解輔助，不是聽力訓練器。
2. **丟原音用 TTS** → 練錯聲音流（B 層）。原始素材本來就是 native 音，卻被丟掉換成更差的合成音。
3. **無句級同步**（`srt_url` 全空）→ 做不了 loop / 跟讀 / 聽寫（D 層）。

### 任務清單（依槓桿排序）

- [ ] **#1 crawl.ts 保留 YouTube 原始 native 音檔**（移除 `--skip-download`）🔥 最高槓桿
      把聽力素材從「塑膠 TTS」換回「黃金原音」。素材已在 pipeline 內，近乎免費。
- [ ] **#2 用 YouTube 字幕時間軸寫入 `srt_url`**，做 audio↔text 句級同步
      解鎖句級 loop / 跟讀 / 聽寫 / 逐句 highlight 的前置。YouTube 來源自帶時間軸，不用自己對齊。
- [ ] **#3 BilingualView 預設折疊中文欄，改成 on-demand** 🔥 純前端、零後端、立即見效
      預設只顯示英文，中文做成點/hover 單句才浮出（查詢而非背景）。
- [ ] **#4 alignmentMap 從段級延伸到句級 + 時間戳**
      聽力模式階梯與逐句同步 highlight 的共同基礎設施。
- [ ] **#5 實作「聽力模式階梯」UI**（依賴 #2、#4）
      模式1 純聽 → 模式2 英文逐句同步 highlight（預設落這）→ 模式3 點句出中文 → 模式4 隱藏文字、聽→跟讀/聽寫→揭曉。逼大腦逐層脫離拐杖。
- [ ] **#6 句級 loop + 可調速 + 跟讀控制**（依賴 #2）
      單句 A/B loop、調速、shadowing。
- [ ] **#7 拆分「native 音聽力」與「中文 TTS 導讀」兩條 pipeline**（架構決策）
      導讀=自己的中文文章→TTS 合理；聽力=YouTube 來源→用 native 原音。拆開後 #1 才有乾淨落點。

**建議落地順序**：#7（先拆架構）→ #1 + #2（換回原音 + 同步）→ #3（前端立即見效）→ #4 → #5 / #6。
**投入最小、效果最大的兩顆**：#1 與 #3。

### 相關檔案
- `scripts/crawl.ts` — yt-dlp 抓字幕（`--skip-download` 在此）
- `src/components/BilingualView.tsx` — 雙語對照檢視、`alignmentMap`、glossary hover
- `src/components/TTSPlayer.tsx`、`src/lib/tts.ts`、`scripts/tts-all.ts` — TTS pipeline
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
