# 對話攝取工具

將 Claude / GPT 的工程對話紀錄一鍵轉成技術文章。

## 使用方式

```bash
# 把對話紀錄貼到 txt 檔案
# 例如：從 Claude 複製對話 → 存成 conversation.txt

pnpm ingest conversation.txt
```

工具會：
1. 讀取對話紀錄
2. 呼叫 Workers AI（`llama-3.1-8b-instruct`）分析內容
3. 自動產生：標題、TL;DR、tags、category
4. 讓你確認或修改標題
5. 輸出 `.md` 到 `src/content/posts/`

## 範例

```bash
$ pnpm ingest debug-session.txt

讀取對話紀錄... (2847 字元)
正在用 Workers AI 分析對話...

分析結果：
  標題：Cloudflare D1 本地測試環境設定
  摘要：解決 wrangler d1 local 無法連線的問題
  標籤：cloudflare, d1, wrangler, debug
  分類：debug

標題 (Enter 確認，或輸入新標題): 

✅ 文章已生成：src/content/posts/2026-04-20-cloudflare-d1-本地測試環境設定.md
   執行 git add . && git push 即可發布。
```

## 前置需求

需要在環境變數設定 Cloudflare 憑證：

```bash
# .dev.vars
CLOUDFLARE_ACCOUNT_ID=xxxxx
CLOUDFLARE_API_TOKEN=xxxxx
```

## 攝取後手動調整

工具產生的 frontmatter 可能需要微調：

```markdown
---
title: "Cloudflare D1 本地測試環境設定"
date: "2026-04-20"
category: "debug"
tags: ["cloudflare", "d1", "wrangler"]
lang: "zh-TW"
tldr: "解決 wrangler d1 local 無法連線的問題"
draft: false          # 改成 true 先存草稿
type: "debug"         # 手動加上 type
---
```

建議：先設 `draft: true` 檢視效果，確認後再改 `false` 並 push。
