---
title: "OpenAI 如何讓單一 PostgreSQL 撐起 8 億 ChatGPT 用戶：50 個讀取副本、PgBouncer、串聯複製"
date: 2026-06-08T03:55:01.515Z
category: tech
tags: ["postgresql", "database", "scaling", "openai", "infrastructure"]
lang: zh-TW
tldr: "OpenAI 的 ChatGPT 資料庫架構是一個單一主庫 + 近 50 個讀取副本的 PostgreSQL，搭配 PgBouncer 連線池和 Azure 的串聯複製（cascading replication）。核心洞察：讀多寫少的工作負載不需要分片，優化讀取路徑才是關鍵。"
description: "深度解析 OpenAI 的 PostgreSQL 擴展架構：如何用單一主庫 + 50 個讀取副本、PgBouncer 連線池和 Azure 串聯複製，讓 PostgreSQL 支撐每秒百萬級查詢和 8 億 ChatGPT 用戶。"
type: deep-dive
original_url: "https://www.youtube.com/watch?v=1zVLBRIwCr0"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260615_201833_553777.mp3"
---

當 ChatGPT 用戶數衝破 8 億，你的資料庫架構要怎麼設計？OpenAI 的答案出乎許多人意料：他們沒有分片（sharding），沒有換到 NoSQL，而是繼續跑 PostgreSQL——但做了幾個精準的工程決策讓它撐住了。

## TL;DR

OpenAI 的 ChatGPT 資料庫是單一主庫的 PostgreSQL，在 Azure 上跑，搭配近 50 個讀取副本分散查詢負載。連線池用 PgBouncer（每個副本一個獨立的 Kubernetes deployment），把連線時間從 50ms 壓到 5ms。寫入負載透過把高寫入量的子系統遷移到其他分散式儲存來管理。串聯複製（cascading replication）正在測試中，目標是讓副本數量可以擴展到 100+ 而不增加主庫的複製壓力。

## 開頭

OpenAI 在 2026 年 2 月發布了一篇技術部落格，公開了 ChatGPT 的 PostgreSQL 擴展架構。這篇文章是近年來最誠實的資料庫架構分享之一——不是在炫耀他們有多聰明，而是老老實實說明了他們遇到的問題和解法，以及他們故意選擇不做的事（例如分片）。

## 設計哲學

### 為什麼不分片？

分片（sharding）是把資料水平切割到多個資料庫節點的技術，通常被認為是超大規模系統的必要步驟。OpenAI 評估後選擇不做，原因很明確：

**ChatGPT 是讀多寫少的系統**。用戶主要是在讀取對話歷史、載入介面設定，寫入相對集中在幾個特定路徑。這種工作負載模式用讀取副本就能有效分散，不需要分片的複雜度。

**分片的工程成本極高**。要正確實作分片，需要修改幾百個應用程式端點，處理跨分片的交易一致性，以及跨分片的查詢路由。OpenAI 估計這會花費數月到數年的工程時間，而讀取副本方案的延遲問題有更輕量的解法。

### 讀取副本策略

```
                    ┌─ 讀取副本 1 (us-east)
主庫 (寫入) ───────┼─ 讀取副本 2 (us-east)
                    ├─ 讀取副本 3 (us-west)
                    │  ... (近 50 個)
                    └─ 讀取副本 N (eu-west)
```

近 50 個讀取副本分佈在多個地理區域，讓讀取查詢可以路由到最近的副本，降低延遲。應用程式層根據操作類型決定走主庫（強一致性讀寫）還是讀取副本（容忍輕微延遲的讀取）。

## 核心概念

### PgBouncer 連線池

PostgreSQL 的連線模型是每個連線對應一個 process，建立連線有約 50ms 的開銷。對於每秒數百萬個查詢的系統，這個開銷累積起來是顯著的瓶頸。

OpenAI 的解法是在每個讀取副本前加一個 PgBouncer deployment：

```
Application pods
      ↓ (少量長連線)
PgBouncer Kubernetes Deployment
  (transaction pooling mode)
      ↓ (連線池)
PostgreSQL Read Replica
```

**Transaction pooling 模式**：每個 query 或 transaction 完成後，底層連線立即回到連線池，不等待 client 斷開。這讓少量的底層連線可以服務大量的並發 application 請求。

**效果**：連線建立時間從 50ms 降到 5ms。

**部署架構**：每個讀取副本有一個獨立的 Kubernetes Service，背後跑多個 PgBouncer pod，透過 K8s 的 Service load balancing 分散流量。

### 串聯複製（Cascading Replication）

PostgreSQL 的標準主從複製是：主庫把 WAL（Write-Ahead Log）串流到所有副本。50 個副本就是主庫要維持 50 條 WAL 串流連線，這對主庫的網路和 CPU 是顯著的壓力。

OpenAI 跟 Azure PostgreSQL 團隊合作測試**串聯複製**：

```
主庫 → 中間副本 1 → 下游副本 1a, 1b, 1c
      → 中間副本 2 → 下游副本 2a, 2b, 2c
```

主庫只需要維持幾條到中間副本的連線，中間副本再把 WAL 轉發給下游副本。這讓副本數量從 50 擴展到 100+ 不會增加主庫的複製壓力。

### 寫入壓力管理

寫入瓶頸不能靠讀取副本解決。OpenAI 的做法是：

1. **遷移高寫入量的子系統**：把寫入頻繁的工作負載（例如用量統計、日誌、session 狀態）遷移到適合高寫入的分散式系統，讓 PostgreSQL 只負責它最適合的強一致性業務資料。

2. **速率限制大量更新**：對背景的批次更新和回填（backfill）操作設定寫入速率上限，避免突發大量寫入衝擊主庫。

3. **嚴格的操作紀律**：主庫上沒有人可以隨便跑大型的批次更新，所有大型資料操作都要先在測試環境驗證對主庫的影響。

## 跟常見替代方案的比較

| 方案 | 適用場景 | OpenAI 為何不選 |
|------|---------|---------------|
| 讀取副本 | 讀多寫少 | ✅ OpenAI 的選擇 |
| 分片 | 寫入瓶頸、資料量超大 | 工程成本太高，ChatGPT 主要是讀多 |
| NewSQL（Spanner/CockroachDB） | 需要全球分散式強一致性 | 遷移成本高，現有 PG 架構夠用 |
| NoSQL（DynamoDB/MongoDB） | key-value 或文件型查詢 | 需要關聯查詢，換資料庫代價太高 |

## 整體來說

OpenAI 的 PostgreSQL 架構的最大啟示不是技術細節，而是**工程決策的優先順序**：

1. 先弄清楚你的工作負載特性（讀多還是寫多？強一致性要求？）
2. 用最小的工程成本解決最大的瓶頸（連線池解決了延遲問題，讀取副本解決了讀取擴展）
3. 把工程成本極高的決策推遲到真正必要的時刻（分片留到讀取副本撐不住的時候再說）

對大多數的系統來說，「把 PostgreSQL 換掉」是最後的選項，不是第一個選項。優先把它用好。

## 參考資料

- [Scaling PostgreSQL to power 800 million ChatGPT users - OpenAI](https://openai.com/index/scaling-postgresql/)
- [How OpenAI Scaled to 800 Million Users With Postgres - ByteByteGo](https://blog.bytebytego.com/p/how-openai-scaled-to-800-million)
- [OpenAI Scales Single Primary PostgreSQL Instance to Millions of Queries per Second - InfoQ](https://www.infoq.com/news/2026/02/openai-runs-chatgpt-postgres/)
