---
name: mine-daily
description: 定期挖多個外部技術/AI 部落格的每日新文，判斷哪些主題值得研究/改寫成 Engineer News 素材。內建預設 sources（Meta AI Blog、AlphaSignal、Claude Blog、OpenAI Research），也可用第一個參數指定單一站。per-URL 記住上次抓到的最新 pubDate，避免重複挖。
---

# mine-daily skill

自動巡一組外部技術/AI 部落格，挑出「值得研究、可能改寫進 Engineer News」的新主題。

## 觸發時機

- 使用者說「挖今天的新文」「看看 XX 有什麼新東西」「巡一下部落格」。
- 綁在 `/loop 24h /mine-daily` 或 `/schedule` 上跑排程。
- 使用者直接呼叫 `/mine-daily` 或 `/mine-daily <url>`。

## 參數

```
/mine-daily              # 巡全部 preset sources（逐站獨立）
/mine-daily <url>        # 只挖指定站（可以是 preset 或全新站）
```

日期不需要參數，state 自己記。

## Preset sources

無參數時依序處理下列站，每站獨立 state，互不影響。

| # | Source | URL | 預設 strategy |
|---|--------|-----|---------------|
| 1 | Meta AI Blog | `https://ai.meta.com/blog/` | HTML scrape（已確認無 RSS） |
| 2 | AlphaSignal | `https://alphasignal.ai/` | 先試 RSS → fallback HTML |
| 3 | Claude Blog | `https://claude.com/blog` | 先試 RSS → fallback HTML |
| 4 | OpenAI Research | `https://openai.com/research/index/` | HTML scrape |

要新增 source → 直接編輯這張表；有 RSS 的把 strategy 改回 RSS-first。

## State file

`.claude/skills/mine-daily/state.json`（相對本專案根目錄）。schema：

```json
{
  "https://ai.meta.com/blog/": {
    "last_pub_date": "2026-07-15T00:00:00.000Z",
    "last_run_at": "2026-07-16T10:23:11.000Z",
    "last_seen_guids": [
      "https://ai.meta.com/blog/some-post-slug/"
    ]
  }
}
```

- key 是 URL（跟參數/preset 表原樣存），避免不同站互相污染。
- `last_pub_date` = 上次跑完後這站文章中最新的 `pubDate`（ISO 8601, UTC）。
- `last_seen_guids` = 同 `last_pub_date` 那批的所有 link，防同一天多篇時漏抓或重抓。

第一次跑某 URL（state 無此 key 或整個檔不存在）→ 「初始化模式」，只抓最近 **3 天**，避免爆量。

## 執行步驟

### 0. 決定要跑哪些 URL

- 有參數 → 只跑該 URL（若不在 preset，一律走 RSS 探測 → HTML fallback）。
- 無參數 → 逐一跑 preset 表（**序列，不平行**，避免爆 rate limit）。
- 對每個 URL 都獨立完成步驟 1–6，再繼續下一個。

### 1. 讀 state

- Read `.claude/skills/mine-daily/state.json`。不存在 → 視為 `{}`。
- 從 URL key 拿 `last_pub_date`；沒有 → 走「初始化」路徑，`last_pub_date` = 今天 - 3 天（UTC 00:00）。

### 2. 抓 feed

依 preset strategy（或動態探測）走：

**RSS-first**：依序試
1. `{origin}/rss.xml` `{origin}/feed.xml` `{origin}/atom.xml` `{origin}/index.xml`
2. `{url}/rss` `{url}/feed`（TLDR 用的是這種）
3. 都 404 → 轉 HTML fallback

**HTML fallback**（Meta AI / OpenAI Research 走這條）：
- 用 `WebFetch` 打 URL，prompt：

```
List every article visible on this blog/index page. For each output:
TITLE: <full title>
DATE: <ISO YYYY-MM-DD if visible, else "unknown">
LINK: <absolute URL>
BLURB: <one-line description if visible, else empty>
---
Only actual posts/research entries (not nav, footer, related links). Sort newest first. Include ALL you can see.
```

- 把回應 parse 成統一結構 `{title, link, pub_date, blurb}`。
- 抓不到（0 篇 or WebFetch 失敗）→ 明確講出來，state 不更新，繼續下一站。

用 `Bash` `curl -sL --max-time 15` 探 feed；curl 不在 `$PATH` 時，此環境用絕對路徑 `/Users/chenyuan/anaconda3/bin/curl`。

### 3. Parse + filter

- 過濾條件：`pubDate > last_pub_date`（嚴格大於）；`pubDate == last_pub_date` 用 `last_seen_guids` 去重。
- 日期是 `unknown`（HTML 抓不到 date）→ 進「日期未知」side channel，不參與 state 比較。仍列出讓使用者判斷，但**不寫進 state**。
- 沒新文 → 「無新文」，不寫 state（避免抖動）。

### 4. 判斷主題相關性

對每篇打分（直接你判斷，不跑外部 LLM）：

| 分數 | 意義 | 例子 |
|------|------|------|
| **A**（強推） | 直接對應 Engineer News 主軸：AI/RAG/Agent、engineering deep dive、cloud/infra、product tech decision、learning path | Claude 新 model 發表、Meta LLM paper、PostgreSQL deep dive |
| **B**（可考慮） | 有技術骨幹但角度偏軟、公司行銷味重、或已有類似文章 | 「AI helping X industry」、產品 launch overview |
| **C**（跳過） | 純政策/PR、投資消息、活動宣傳、無技術內容 | earnings call, partnership PR, event announcement |

**Aggregator 新聞信（TLDR / AlphaSignal）**：一期是 bundle，通常內含 5–15 則子新聞。skill 不點進每期抓子新聞（省 token），把整期當一個 item 判斷，用標題/blurb 掃出關鍵字打分；A 級才在報表 blurb 標出關鍵子題。

判斷時參考本站 categories（`tech` / `product` / `learning` / `creative` / `life`）與 CLAUDE.md 的 "技術決策即文件" 定位。

### 5. 產出報表

**單站**：

```
## mine-daily @ <url>

上次抓到：<last_pub_date>（<N> 天前 / 初始化）
本次新文：<M> 篇

### A — 值得研究
- **<title>** (<pubDate>)
  <link>
  → why: 一行說明可以怎麼接進 Engineer News

### B — 可考慮
- **<title>** — 一行摘要與保留原因

### C — 跳過
- <title>（一行原因）

### 日期未知（HTML 抽不到 date）
- **<title>** — <link>
```

**多站**（無參數呼叫時）：

```
# mine-daily report — <UTC now>

## 1. Meta AI Blog — https://ai.meta.com/blog/
<單站報表區塊，省略 wrapper 標題>

## 2. AlphaSignal — https://alphasignal.ai/
...

## 3. Claude Blog — ...

## 4. OpenAI Research — ...

---
### 總覽
- A 級候選：<X> 篇（跨站）
- B 級：<Y> 篇
- 失敗 sources：<列出（若有）>
```

### 6. 更新 state

- 只有「本次真的有新文且成功處理」才寫 state。
- `last_pub_date` = 本站本批中最大的 `pubDate`（日期未知者不計入）。
- `last_seen_guids` = 本站本批中 `pubDate == 新 last_pub_date` 的所有 link。
- `last_run_at` = 現在 UTC。
- 保留其他 URL 的 entry 不動。
- 多站時：每站處理完就寫一次 state（不要等全部跑完；避免中途錯誤時丟前面進度）。

### 7. 別做的事

- **不要自動建立 post**。A 級主題只回報，交由使用者呼叫 `/post` 或 `make ingest`。
- **不要抓超過 30 篇/站**。RSS 若回一整年，只取 pubDate 由新到舊前 30。
- **不要靜默失敗**。抓不到 feed / HTML → 明確講出來，state 不更新。
- **不要點進 aggregator 每期子連結**。整期當一個 item 評分。
- **不要平行打多站**。序列跑，逐站處理，減少 rate limit 風險。
- **不要為了「補齊」而放寬時間窗**。沒新文就寫「無新文」。

## 排程用法

```bash
/loop 24h /mine-daily                          # 每天巡全部 preset
/loop 24h /mine-daily https://tldr.tech/       # 只巡指定站
```

state 是 per-URL 的，多次不同參數呼叫互不干擾。

## 相關檔案

- `state.json`（此目錄，執行時建立/更新）— 各站上次抓到的 pubDate。
- `.gitignore` — 已在專案根加入 `.claude/skills/mine-daily/state.json` 排除。
