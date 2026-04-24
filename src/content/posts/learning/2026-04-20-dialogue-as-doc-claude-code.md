---
title: "對話即文件：用 Claude Code 把 Debug 過程直接變成文章"
date: 2026-04-21T08:03:40+08:00
category: learning
tags: ["ai", "claude-code", "debugging", "writing-automation"]
lang: zh-TW
description: "示範如何把對話與除錯歷程透過 Claude Code 自動整理為技術文章，包含 prompt 設計與常見調整技巧。"
tldr: "把對話當成可寫成文章的材料：用結構化 prompt 與範本，讓 Claude Code 自動把 debugging thread 轉為可發佈的技術文章。"
draft: false
pinned: true
---

## TL;DR
用 Claude Code（結構化 prompt + 範本）把互動式除錯記錄轉成清晰、可發佈的技術文章，優點是速度與可追溯；缺點需人工校對與隱私過濾。

## 情境
在多人協作或 Chat-based debugging 時，對話充滿斷點、嘗試與環節，直接複製會雜亂且不利閱讀。想把這些過程轉成一篇可以放到部落格或知識庫的文章。

## 問題
1. 訊息雜亂：對話包含多次嘗試、程式碼片段、錯誤訊息，缺少結構。  
2. 隱私/敏感資訊：log 或 token 需要被移除或遮蔽。  
3. 表述需要精簡、補足背景與結論。

## 嘗試過程
- 用 prompt 把原始對話扔給 Claude，要求它「做摘要」與「列步驟」，結果不夠連貫。  
- 改用 Claude Code 的範本輸出（有明確欄位：背景、問題、嘗試、解法、教訓），並在前置 prompt 補上敏感詞移除與碼格化規則。  
- 加入人為檢查步驟：清理敏感資訊 → 讓模型重寫段落 → 最後人工微調。

## 解法
1. 定義輸入管線：匯出對話（純文字）→ 正規化時間戳與行為標記 → 以範本包裝進 prompt。  
2. 使用 Claude Code 的欄位化範本，要求欄位輸出為 YAML 或 Markdown，便於直接貼入 frontmatter 或文章段落。  
3. 加上品質控制：步驟標號、程式碼標註語言、關鍵錯誤訊息保留、敏感資訊過濾器。  

## 為什麼會這樣
基於對話的生成模型傾向於自由敘述，沒有明確格式會產生不一致輸出。使用範本與欄位約束能強制模型回傳結構化結果，降低後處理成本。

## 學到的事
- Prompt 應該把輸出格式（YAML/Markdown）指定清楚。  
- 把自動化當作加速器，不是完全替代人力：人工審查很重要。  
- 保留原始對話的索引（時間戳、訊息 id），便於回溯。

## 參考資料
- Claude Code 範例與文件（範例）：https://www.anthropic.com/
- Prompt design 教學（範例）：https://platform.openai.com/docs/guides/prompting
