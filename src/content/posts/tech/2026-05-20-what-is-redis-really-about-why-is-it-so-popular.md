---
title: "Redis 到底是什麼？為什麼每個工程師都愛用它？"
date: 2026-05-20T03:28:46.983Z
category: tech
tags: ["redis", "nosql", "資料庫", "系統設計", "架構", "快取"]
lang: zh-TW
tldr: "Redis 是基於記憶體的資料結構伺服器，靠著單執行緒事件迴圈、豐富的資料型別和極低的延遲，成為快取、Session 管理、排行榜、速率限制等場景的首選——而且在 2026 年，它還成了 AI Agent 的記憶層基礎設施。"
description: "從架構原理到實際使用場景，完整解析 Redis 為什麼在工程師社群中長期維持極高評價，以及 2026 年它在 AI 工程中的新角色。"
type: explainer
original_url: "https://www.youtube.com/watch?v=z_NbVtbgBJw"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260522_235520_124143.wav"
---

Redis 在 Stack Overflow 開發者調查「最受喜愛的資料庫」排行裡，幾乎常駐前三。這不是因為它功能最多，也不是因為它最便宜。是因為它做它能做的事，做得極好，而且做得可預測。

## TL;DR

Redis（Remote Dictionary Server）是一個基於記憶體的資料結構伺服器：
- 資料存在 RAM → 讀寫延遲在微秒等級
- 單執行緒架構 → 操作原子性、無鎖衝突
- 豐富資料型別 → String、Hash、List、Set、Sorted Set、Stream 等
- 可選持久化 → 不完全是「關掉就消失」

## 它到底是什麼？

很多人第一次接觸 Redis 是把它當快取用，但這只描述了它功能的一小部分。官方定義是「in-memory data structure store」：

- **In-memory**：所有資料都在 RAM 裡
- **Data structure store**：不只是 key-value，支援多種資料型別
- **Store**：可以當資料庫（有持久化）、快取，或訊息佇列

## 為什麼這麼快？

### 單執行緒事件迴圈

Redis 的核心是單執行緒，這在直覺上聽起來像是缺點。傳統資料庫用多執行緒處理並發請求，Redis 怎麼行？

關鍵在於：Redis 的瓶頸不在 CPU，在 I/O。因為所有資料都在記憶體裡，每個操作都非常快，不需要多執行緒的並發。而單執行緒的好處是：沒有 lock、沒有 deadlock、沒有 race condition，每個命令都原子執行。

Redis 6.0 之後引入了多執行緒處理網路 I/O，但業務邏輯仍然是單執行緒——在保持簡單性的同時提升了吞吐量。

### 記憶體存取

Disk I/O 的延遲是毫秒等級，記憶體存取是奈秒等級，差了幾個數量級。Redis 把資料放在 RAM 裡，加上高效的資料結構實作，讓一般操作的延遲維持在 1ms 以下。

## 豐富的資料型別

這是 Redis 跟簡單 key-value store 最大的差別：

**String**：最基本，支援 `INCR`/`DECR` 操作，適合計數器、序號生成。

**Hash**：類似物件，適合儲存使用者資料：`HSET user:123 name Alice email alice@example.com`

**List**：有序列表，支援從兩端 push/pop，適合任務佇列、最新動態。

**Set**：無序不重複集合，支援交集/聯集/差集，適合標籤、共同好友。

**Sorted Set（ZSet）**：每個成員有分數，按分數排序，適合排行榜、帶優先級的佇列。

**HyperLogLog**：用極少記憶體估算集合的基數，適合「今天有多少不重複使用者」的統計。

**Stream**：持久化的訊息流，類似 Kafka 的輕量替代方案。

**Geospatial**：儲存地理座標，支援距離計算和範圍查詢。

## 持久化：不只是 Cache

Redis 有兩種持久化機制：

**RDB（Redis Database）**：定期把記憶體資料快照存到 disk。優點是恢復快、體積小；缺點是最後一次快照後的資料可能遺失。

**AOF（Append-Only File）**：每個寫入命令都追加到 log 檔，重啟時重放命令恢復資料。優點是資料更完整；缺點是檔案較大、恢復較慢。

也可以同時開啟兩種：用 AOF 保安全、用 RDB 加速恢復。

## 常見使用場景

**快取**：在資料庫前放一層 Redis，把熱點資料 cache 住，降低 DB 查詢壓力。這是最經典的用法。

**Session 管理**：Web 應用的使用者 session 存在 Redis，快速讀寫且支援 TTL 自動過期。

**速率限制（Rate Limiting）**：用 `INCR` + `EXPIRE` 做滑動視窗計數，實作 API 的速率限制，幾行程式碼就能搞定。

**排行榜**：Sorted Set 的天然應用，O(log N) 更新分數，O(log N + M) 取 top-K。

**Pub/Sub**：簡單的訊息發佈訂閱，適合通知推送、輕量的事件驅動架構。

**分散式鎖**：用 `SET NX EX` 實作分散式鎖，搭配 RedLock 演算法做高可用版本。

## 跟 Memcached 的差別

兩者都是 in-memory cache，但：

| | Redis | Memcached |
|---|---|---|
| 資料型別 | 多種（String/Hash/List/Set/…）| 只有 String |
| 持久化 | 有（RDB/AOF）| 無 |
| 叢集 | 原生支援 | 需要客戶端分片 |
| Pub/Sub | 支援 | 不支援 |
| 適合場景 | 快取 + 更多用途 | 純快取 |

除非你的使用場景極度單純（只需要 string 快取、不需要持久化、不需要任何進階功能），否則幾乎沒有選 Memcached 而不選 Redis 的理由。

## 2026 年的新角色：AI Agent 記憶層

Redis 在 2026 年 5 月宣布推出針對企業 AI Agent 的記憶層（Memory Layer）。這個方向很自然：AI Agent 需要在多個對話和任務之間維持狀態，Redis 的速度和豐富資料型別讓它成為儲存 Agent 工作記憶的理想選擇。

目前大約 43% 的企業 AI Agent 系統已經在使用 Redis 作為其中一個元件。

## 小結

Redis 流行的原因不神秘：它把一件事做到極致——讓你用各種資料結構，以記憶體速度存取資料。這個基礎夠紮實，衍生出十幾種使用場景。

如果你的系統有任何「需要快速、可靠、低延遲存取資料」的地方，Redis 幾乎都是值得優先考慮的選項。

## 參考資料

- [What Is Redis Really About? Why Is It So Popular?](https://www.youtube.com/watch?v=z_NbVtbgBJw)
- [Redis 官方網站](https://redis.io/)
- [Complete Guide to Redis in 2026](https://www.dragonflydb.io/guides/complete-guide-to-redis-architecture-use-cases-and-more)
- [Redis debuts the much-needed memory layer for enterprise AI agents](https://siliconangle.com/2026/05/18/redis-debuts-much-needed-memory-layer-enterprise-ai-agents/)
