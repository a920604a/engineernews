---
title: "Kafka 為什麼這麼快？（第二部分）：Partition、Replication 與 Consumer Group"
date: 2026-06-10T03:37:03.200Z
category: tech
tags: ["Kafka", "效能優化", "系統設計", "架構", "分散式系統"]
lang: zh-TW
tldr: "Kafka 的水平擴展能力來自 partition 設計：每個 partition 是獨立的 log，Consumer Group 讓多個消費者並行讀取，replication 在不犧牲太多效能的情況下保障可靠性。"
description: "Kafka 效能深潛第二篇：partition 如何讓 Kafka 水平擴展、Consumer Group 的並行消費機制、replica 同步對 latency 的影響，以及不同部署情境下的效能取捨。"
type: deep-dive
original_url: "https://www.youtube.com/shorts/la8tzEyg-hY"
draft: false
---

[第一部分](./2026-06-14-why-is-kafka-fast-part-1.md)講的是 Kafka 單一節點的效能：循序 I/O、Page Cache、Zero-Copy。這些設計讓一台機器就能處理極高的吞吐量。

但 Kafka 的真正能力在於水平擴展——加機器，吞吐量線性增加。這依賴的是 **partition** 設計。

## TL;DR

- **Partition**：每個 topic 切成多個 partition，各自是獨立的 append-only log，分散到不同 broker
- **Consumer Group**：一個 group 裡的 consumer 各自負責不同 partition，實現真正的並行消費
- **Replication**：每個 partition 有 leader 和多個 follower，寫入需等 ISR 確認，但可調整 acks 換取 latency
- **ISR（In-Sync Replicas）**：Kafka 的可靠性機制，只有跟上 leader 的 follower 才算 in-sync

## 設計哲學：Partition 是效能的基本單位

Kafka 的效能設計圍繞一個核心原則：**每個 partition 是完全獨立的**。不同 partition 的讀寫互不干擾，可以在不同 broker 上並行處理。

這和 RabbitMQ 的模型不同。RabbitMQ 的 queue 在 3.8 以前是單執行緒的——一個 queue 不管掛多少 consumer，都只有一個執行緒在 dispatch 訊息。Kafka 沒有這個限制：你想要多少並行，建多少 partition。

```
Topic: orders
├── Partition 0 → Broker 1 (leader), Broker 2 (replica)
├── Partition 1 → Broker 2 (leader), Broker 3 (replica)
└── Partition 2 → Broker 3 (leader), Broker 1 (replica)
```

三個 broker、三個 partition，讀寫負載均勻分散。加第四台 broker，rebalance 之後負載自動重新分配。

## Partition 的取捨

Partition 多一點，效能上限高一點，但也有代價：

**好處：**
- 更多 partition = 更多 consumer 並行消費
- 效能線性擴展（理論上）
- 每個 partition 更小，leader election 更快

**壞處：**
- 更多 partition = 更多 file handle、更多 OS thread
- Kafka broker 上每個 partition 有獨立的 log segment，partition 數量太多會讓 file 管理壓力增加
- End-to-end latency 不一定因為 partition 增加而改善，取決於瓶頸在哪

實務建議：每個 broker 不超過 100 個 partition（作為初始估算起點），不是越多越好。

## Consumer Group：並行消費的關鍵

Consumer Group 是 Kafka 的核心概念。一個 Consumer Group 裡的多個 consumer 分擔消費同一個 topic 的不同 partition：

```
Topic: orders (3 partitions)
Consumer Group: order-processors

Consumer A → Partition 0
Consumer B → Partition 1
Consumer C → Partition 2
```

如果 Consumer Group 只有 1 個 consumer，它要消費全部 3 個 partition。加到 3 個 consumer，每人負責 1 個，吞吐量理論上 3 倍。超過 3 個 consumer 就有人閒置（partition 數量是並行度上限）。

這也是為什麼「consumer 數量超過 partition 數量沒意義」——多餘的 consumer 會閒置，因為沒有 partition 可以分配給它。

**多個 Consumer Group 可以各自獨立消費同一個 topic**，各自維護自己的 offset。這是 Kafka 被用來做事件廣播（event broadcasting）的核心能力：一份資料，多個下游服務各自按照自己的速度消費，互不影響。

## Replication：可靠性的代價

每個 partition 有一個 leader 和若干個 follower（replica）。Producer 只和 leader 溝通，leader 把訊息寫入之後，follower 非同步地從 leader fetch 並複製。

Kafka 的 `acks` 設定決定了寫入確認的行為：

| acks | 語義 | Latency | 資料遺失風險 |
|------|------|---------|------------|
| `0` | 不等任何確認 | 最低 | 高（broker 宕機就丟） |
| `1` | 等 leader 確認 | 中 | 中（leader 宕機在複製前） |
| `all` (`-1`) | 等所有 ISR 確認 | 最高 | 最低 |

`acks=all` 配合 `min.insync.replicas=2`（至少需要 2 個 replica in-sync）是生產環境的常見設定，代表任何一個 broker 宕機都不會丟資料。

代價是：每次寫入都需要等 follower 確認，latency 增加。ISR 同步是 Kafka 效能調校的核心取捨點。

## ISR（In-Sync Replicas）機制

ISR 是「跟上 leader 的 follower」的集合。Kafka 用一個時間窗口（`replica.lag.time.max.ms`）定義「跟上」——在這個時間內沒有從 leader fetch 的 follower 會被踢出 ISR。

當 leader 宕機，Kafka Controller 從 ISR 中選一個 follower 做新的 leader。不從 ISR 中選，是為了確保新 leader 有全部的 committed 訊息（不丟資料）。

如果 ISR 縮減到只剩 leader，而 `min.insync.replicas` 設定要求 2 個，producer 用 `acks=all` 寫入會失敗。這是一個明確的設計選擇：寧可拒絕寫入，也不降低一致性保證。

## 跟常見替代方案比較

| 特性 | Kafka | RabbitMQ | Pulsar |
|------|-------|----------|--------|
| 儲存模型 | append-only log | queue（消費後刪除） | 分離儲存層（BookKeeper） |
| 水平擴展 | partition 線性擴展 | federation / shovel | topic 分片 |
| 訊息保留 | 設定時間/大小保留 | 消費後移除 | 設定保留策略 |
| Consumer 模型 | pull（Consumer 主動拉） | push（broker 推送） | 兩者都支援 |
| 順序保證 | partition 內有序 | queue 內有序 | partition 內有序 |
| 適合場景 | 高吞吐量 event stream | 複雜路由、task queue | 多租戶、雲原生 |

Kafka 最強的地方是高吞吐量 + 訊息保留 + Consumer Group 廣播。它不適合的場景是需要複雜訊息路由（Kafka 的路由很有限）或需要個別訊息優先級的情況。

## 適合用 Kafka 的情境

- 日誌 / 監控數據的 ingestion pipeline（每秒百萬筆）
- 事件溯源（event sourcing）
- 多個下游服務需要消費同一份事件流
- 需要 replay 歷史訊息（Kafka 可以保留資料讓 Consumer 從任意 offset 重新讀取）

## 不適合用 Kafka 的情境

- Task queue（每個任務只能被一個 worker 做）——RabbitMQ 或 AWS SQS 更合適
- 需要複雜路由或訊息過濾——RabbitMQ 的 exchange + binding 設計更靈活
- 訊息量不大但需要低延遲精確投遞——Kafka 有最低 overhead，不適合每秒幾十筆的低流量場景

## 整體來說

Kafka 的水平擴展能力建立在三個簡單的假設上：

1. 一個 topic 的資料可以切成多份（partition），各自獨立
2. 每個 Consumer Group 的不同成員可以並行消費不同 partition
3. 每個 partition 的讀寫都是循序的（Part 1 講的那些效能優化因此成立）

這讓 Kafka 在水平擴展時基本上是線性的，而不是像很多系統那樣加機器到某個點後協調成本開始主導。

## 參考資料

- [Kafka 如何達成如此高的效能？（第二部分）](https://www.youtube.com/shorts/la8tzEyg-hY)
- [Kafka Consumer Groups — Apache Kafka Documentation](https://kafka.apache.org/documentation/#consumerconfigs)
- [Kafka Replication — Confluent](https://developer.confluent.io/courses/architecture/replication/)
- [Kafka vs RabbitMQ vs Pulsar — Confluent Blog](https://www.confluent.io/blog/kafka-vs-rabbitmq-vs-pulsar/)
