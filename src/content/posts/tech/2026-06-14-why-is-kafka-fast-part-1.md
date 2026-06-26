---
title: "Kafka 為什麼這麼快？循序 I/O 與 Zero-Copy 原理解析"
date: 2026-06-14T14:20:55.098Z
category: tech
tags: ["Kafka", "系統設計", "架構", "效能優化", "訊息佇列"]
lang: zh-TW
series:
  name: "Kafka 為什麼這麼快"
  order: 1
glossary:
  - term: "Zero-Copy"
    aliases: ["zero copy", "零拷貝"]
    zh: "零拷貝"
    definition: "讓資料從磁碟直接送到網路卡，不經過 CPU 在使用者空間與核心空間之間反覆複製。"
    advanced: "透過 sendfile() syscall 讓資料在核心空間內從 page cache 直達 socket buffer，避免 user-space 來回搬運；Kafka 用它把 log segment 直接送給 consumer。"
    definition_en: "Sends data straight from disk to the network card without the CPU copying it between user space and kernel space."
    advanced_en: "Via the sendfile() syscall, data moves within kernel space from the page cache to the socket buffer, skipping user-space round-trips; Kafka uses it to ship log segments to consumers."
  - term: "Page Cache"
    aliases: ["page cache", "頁快取"]
    zh: "頁快取"
    definition: "作業系統把最近讀寫過的磁碟資料暫存在記憶體裡，下次存取直接命中記憶體、不用再碰磁碟。"
    advanced: "由 OS 核心管理；Kafka 刻意把快取交給 page cache 而非自建 JVM heap 快取，避免 GC 壓力並讓多個 consumer 共享同一份熱資料。"
    definition_en: "The OS keeps recently accessed disk data in RAM so the next read hits memory instead of disk."
    advanced_en: "Kernel-managed; Kafka deliberately relies on the page cache instead of a JVM-heap cache to avoid GC pressure and let consumers share hot data."
tldr: "Kafka 的速度來自兩個不直覺的設計：刻意寫磁碟（而非記憶體）但用循序 I/O，以及 Zero-Copy 讓資料從磁碟直達網路卡不經 CPU 搬運。"
description: "深入解析 Kafka 效能的底層原理：循序 I/O 為何比隨機記憶體存取更快、Zero-Copy 透過 sendfile() syscall 消除 CPU 複製、以及 Page Cache 如何讓磁碟行為像記憶體。"
type: explainer
original_url: "https://www.youtube.com/shorts/wvLdBJEl-wc"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_203046_307980.mp3"
---

Kafka 是一個「刻意設計成把資料寫到磁碟」的系統，卻是業界最快的訊息佇列之一。初次接觸這個事實的人通常覺得矛盾——磁碟不是比記憶體慢好幾個數量級嗎？

不一定。快或慢，取決於你怎麼存取磁碟。Kafka 的效能故事，本質上是一個關於「存取模式」的故事。

## TL;DR

- **循序 I/O** vs. 隨機存取：磁碟的弱點是尋道（seek），Kafka 設計成只做 append，完全避開尋道
- **Page Cache**：Linux 核心自動把磁碟資料快取到記憶體，Kafka 消費者多半直接讀快取，不碰實體磁碟
- **Zero-Copy**：`sendfile()` syscall 讓資料從磁碟直接送到 NIC，不需 CPU 在 user space 搬運，減少 2 次記憶體複製和 2 次 context switch
- 批次處理和壓縮是乘數效應：上述優化乘上批次之後，吞吐量繼續疊加

## 磁碟其實不慢，隨機存取才慢

傳統 HDD 有機械臂，尋道（讀寫頭移動到正確磁軌）耗時 5–10 ms。在這個時間裡，現代 CPU 可以執行數千萬個指令。

但如果存取模式是**循序的**——每次讀寫都接著上一次的位置繼續——尋道時間幾乎為零，磁碟的吞吐量可以達到 500 MB/s 以上（HDD），SSD 則更高。

更重要的是：循序讀取讓 OS 的**預讀（read-ahead）**機制能夠預測你接下來要什麼，提前把資料讀進 Page Cache。這讓磁碟存取在感知上像是記憶體存取。

Kafka 的 topic partition 就是一個 append-only 的 log 檔案。Producer 把訊息 append 到檔案末尾，Consumer 從某個 offset 開始循序讀取。整個系統的設計讓讀寫頭永遠往一個方向走。

## Page Cache：OS 幫你把磁碟變記憶體

Linux 核心有一個 Page Cache 層。當你讀取磁碟上的資料，核心會把它放進記憶體；下次再讀同樣的資料，直接從記憶體回傳，不碰磁碟。

Kafka 積極利用這個機制，而不是自己做記憶體管理（很多系統會在應用層維護自己的 in-memory buffer）。好處：

1. **JVM GC 壓力小**：Kafka broker 的 heap 相對小，記憶體管理交給 OS 的 Page Cache
2. **Broker 重啟後 Cache 不消失**：JVM heap 重啟就清空，但 OS Page Cache 在 Kafka process 重啟後依然存在，Consumer 繼續命中 Cache
3. **Consumer 跟得上 Producer 時幾乎免費**：新消息 Producer 剛寫進磁碟，就進了 Page Cache，Consumer 立刻讀到的是 Cache，不是磁碟 I/O

這解釋了為什麼 Kafka 建議把 broker 記憶體的大半留給 OS（不設定成 JVM heap），而不是像 Redis 那樣把資料全放進 JVM。

## Zero-Copy：消除沒必要的搬運

傳統的「從磁碟讀資料、送出網路」長這樣：

```
磁碟 → kernel buffer（Page Cache）→ user space buffer → socket buffer → NIC
```

資料被搬了**4 次**，發生**4 次 context switch**（user space ↔ kernel space 切換）。

Kafka 使用 `sendfile()` syscall（Linux）或 `transferTo()`（Java NIO）：

```
磁碟 → kernel buffer（Page Cache）→ NIC buffer → NIC
```

資料只搬**2 次**，context switch 只有**2 次**。更重要的是，**CPU 不需要搬運資料**——傳輸由 DMA（Direct Memory Access）控制器完成，CPU 只需要發出指令。

在高吞吐量場景下，這個差異非常顯著。當你每秒要送出幾 GB 的資料，省掉的 2 次記憶體複製和 CPU 時間直接反映在吞吐量和 latency 上。

## 批次與壓縮是乘數

上述所有優化的效益，都在批次處理下被放大：

- Producer 把多筆訊息打包成一個 batch 再送，一次 syscall 傳送多筆
- Consumer 一次拉取一個 batch，減少網路來回次數
- 壓縮在 batch 層面做，compression ratio 高（多筆類似格式的訊息壓縮效果遠好於單筆）

Kafka 支援 gzip、snappy、lz4、zstd 壓縮。在網路頻寬是瓶頸的情況下，壓縮可以直接決定你能不能達到目標吞吐量。

## 跟其他 MQ 的設計差別

RabbitMQ 和傳統 AMQP 訊息佇列的設計假設訊息被消費後就刪除，並為每個 Consumer 維護獨立佇列狀態。這帶來了複雜的 index 管理，讀寫模式更接近隨機存取。

Kafka 的設計假設訊息要保留一段時間（數天甚至數週），Consumer 用 offset 追蹤自己讀到哪裡，不需要 broker 記錄每個訊息的投遞狀態。這讓 Kafka 的 broker 端實作非常簡單，也讓循序 I/O 的假設成立。

簡單說：**Kafka 用 "log + offset" 模型換來了循序存取的效能，代價是不支援訊息被個別刪除**。

## 小結

Kafka 快不是因為用了更快的硬體，而是因為設計讓它在普通硬體上就能達到很高的吞吐量：

1. **循序 I/O**：append-only log 讓磁碟存取變成線性的
2. **Page Cache**：OS 自動處理記憶體快取，Kafka 不自己管
3. **Zero-Copy**：`sendfile()` 消除不必要的資料搬運
4. **批次處理**：把多筆訊息打包，讓每個 syscall 的效益最大化

Part 2 會深入 Kafka 的 partition 機制、replication，以及 Consumer Group 如何在水平擴展時保持效能。

## 參考資料

- [Kafka 為什麼這麼快？（第一部分）](https://www.youtube.com/shorts/wvLdBJEl-wc)
- [Kafka Design — Apache Kafka Documentation](https://kafka.apache.org/documentation/#design)
- [Zero-Copy in Kafka — Confluent Blog](https://www.confluent.io/blog/kafka-producer-internals-preparing-event-for-production/)
- [The Log: What every software engineer should know about real-time data — Jay Kreps](https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying)
