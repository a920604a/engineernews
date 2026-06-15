---
title: "Why Is Kafka Fast? Sequential I/O and Zero-Copy Explained"
date: 2026-06-14T14:20:55.098Z
category: tech
tags: ["Kafka", "system design", "architecture", "performance", "message queue"]
lang: en
tldr: "Kafka's speed comes from two counterintuitive design choices: deliberately writing to disk (not memory) but using sequential I/O, and Zero-Copy to move data from disk to NIC without CPU involvement."
description: "Deep dive into Kafka's performance fundamentals: why sequential I/O beats random memory access, how Zero-Copy via sendfile() eliminates data movement overhead, and how Page Cache makes disk behave like memory."
type: explainer
original_url: "https://www.youtube.com/shorts/wvLdBJEl-wc"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_203011_214726.mp3"
---

Kafka deliberately writes data to disk, yet it's one of the fastest message queues in production. This seems contradictory—isn't disk far slower than memory?

Not necessarily. Fast or slow depends on *how* you access disk. Kafka's performance story is fundamentally about access patterns.

## TL;DR

- **Sequential I/O**: Disk's weakness is seek time. Kafka is append-only by design, eliminating seek entirely
- **Page Cache**: Linux automatically caches disk data in memory; consumers usually read from cache, not physical disk
- **Zero-Copy**: `sendfile()` moves data from disk directly to NIC, bypassing CPU and eliminating 2 memory copies and 2 context switches
- **Batching**: All of the above multiplied by batch processing = compounding throughput gains

## Disk Isn't Slow—Random Access Is

A traditional HDD has a mechanical arm. Seeking (moving the read head to the right track) costs 5–10ms. In that time, a modern CPU can execute tens of millions of instructions.

But with **sequential access**—each read/write continuing where the last one left off—seek time is near zero. Sequential disk throughput can reach 500+ MB/s on HDD, far higher on SSD.

More importantly, sequential reads enable the OS **read-ahead** mechanism: the kernel predicts what you'll need next and pre-loads it into Page Cache. This makes disk access feel like memory access.

A Kafka topic partition is an append-only log file. Producers append to the end; consumers read sequentially from an offset. The read head always moves in one direction.

## Page Cache: OS Manages Memory So Kafka Doesn't Have To

The Linux kernel maintains a Page Cache layer. When you read from disk, the kernel puts the data in memory. The next request for the same data comes from memory, not disk.

Kafka aggressively relies on this instead of managing its own in-memory buffer (as many systems do). Benefits:

1. **Low JVM GC pressure**: Kafka broker heap stays small; memory management is delegated to OS
2. **Cache survives broker restarts**: JVM heap clears on restart; OS Page Cache persists after the Kafka process restarts—consumers keep hitting cache
3. **Near-free consumption when consumers keep up**: A message just written by a producer is already in Page Cache; the consumer reads it without touching physical disk

This is why Kafka recommends giving most broker RAM to OS (not JVM heap): you want the OS to use it for Page Cache, not your application.

## Zero-Copy: Eliminating Unnecessary Data Movement

The traditional path for "read from disk, send over network" looks like:

```
Disk → kernel buffer (Page Cache) → user space buffer → socket buffer → NIC
```

Data is copied **4 times**, with **4 context switches** (user space ↔ kernel space).

Kafka uses the `sendfile()` syscall (Linux) or `transferTo()` (Java NIO):

```
Disk → kernel buffer (Page Cache) → NIC buffer → NIC
```

**2 copies**, **2 context switches**. More importantly, the CPU doesn't touch the data—transfer is handled by the DMA (Direct Memory Access) controller.

At high throughput—several GB/s—the eliminated copies and CPU cycles translate directly into measurable throughput and latency improvements.

## Batching Multiplies Everything

Every optimization above compounds with batching:

- Producer packs multiple messages into one batch before sending—one syscall for many messages
- Consumer pulls one batch at a time—fewer network round trips
- Compression works better on batches (similar-format messages compress far better together than individually)

Kafka supports gzip, snappy, lz4, and zstd. When network bandwidth is the bottleneck, compression can be the deciding factor in hitting throughput targets.

## Why This Works: The Kafka Design Bet

Kafka's model—append-only log with consumer offsets—is what makes all this possible. Because nothing is ever deleted or modified, read patterns are always sequential. Because consumers track their own position (offset), the broker doesn't need to maintain per-message delivery state.

This simplicity is what allows the sequential I/O assumption to hold, which is what makes Zero-Copy and Page Cache effective.

Part 2 covers Kafka's partition model, replication, and how Consumer Groups achieve horizontal scalability.

## References

- [Kafka 為什麼這麼快？（第一部分）](https://www.youtube.com/shorts/wvLdBJEl-wc)
- [Kafka Design — Apache Kafka Documentation](https://kafka.apache.org/documentation/#design)
- [The Log: What every software engineer should know — Jay Kreps](https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying)
