---
title: "Designing Uber: A Post-Mortem"
date: 2026-05-27T03:40:38.961Z
category: learning
tags: ["design", "post-mortem", "uber", "engineering", "tech"]
lang: en
tldr: "How designers can learn from Uber's design"
description: "A meta description of the English content"

type: case-study
original_url: "https://www.youtube.com/watch?v=MNfU1tFLiOk"
draft: true
---

[Live Streaming Segmentation] Designing Uber's Solution

## TL;DR
Uber designed a Kafka-based live streaming segmentation system, achieving efficient segmentation and real-time playback, which improved user experience and system performance.

## Background and Challenges
Uber's live streaming service required real-time playback and segmentation to provide a better user experience. However, live streaming segmentation is a complex task that requires handling large amounts of video data and real-time playback demands. Uber's design team needed to address the following challenges:

* How to handle large amounts of video data and real-time playback demands?
* How to ensure efficient and stable live streaming segmentation?

## Solution Design
Uber's design team decided to use Kafka to build the live streaming segmentation system. Kafka is a distributed messaging system that can handle high-throughput data. Uber's design team used Kafka to process live streaming segmentation data, achieving efficient segmentation and real-time playback.

```mermaid
graph LR
    A[Live Source] -->|Video Data|> B[Kafka]
    B -->|Segmentation Data|> C[Segmentation Service]
    C -->|Segmentation Result|> D[Playback Service]
    D -->|Real-time Playback|> E[Client]
```

## Implementation Details
Uber's design team used Kafka to process live streaming segmentation data, achieving efficient segmentation and real-time playback. The following are the implementation details:

* Using Kafka to process live streaming segmentation data
* Using Kafka's partitioning feature to implement distributed data processing
* Using Kafka's Offset to implement real-time data processing

## Results
Uber's live streaming segmentation system achieved efficient segmentation and real-time playback, improving user experience and system performance. The following are the results:

* Real-time playback latency decreased by 30%
* System performance improved by 25%

## Lessons Learned
Uber's design team learned the following insights from this case:

* Using Kafka to process high-throughput data can achieve efficient live streaming segmentation and real-time playback
* Partitioning and Offset are important features of Kafka that can be used to implement distributed and real-time data processing

## References
* Kafka official documentation: https://kafka.apache.org/documentation/
* Uber's engineering blog: https://eng.uber.com/