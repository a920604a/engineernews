---
title: "Why Is Kafka Fast? Part 2: Partitions, Replication, and Consumer Groups"
date: 2026-06-10T03:37:03.200Z
category: tech
tags: ["Kafka", "performance", "system design", "architecture", "distributed systems"]
lang: en
tldr: "Kafka's horizontal scalability comes from partition design: each partition is an independent log, Consumer Groups enable parallel consumption, and replication provides durability without a large performance penalty."
description: "Kafka performance deep-dive part 2: how partitions enable linear horizontal scaling, Consumer Group parallel consumption mechanics, ISR replication's impact on latency, and comparison with RabbitMQ and Pulsar."
type: deep-dive
original_url: "https://www.youtube.com/shorts/la8tzEyg-hY"
draft: false
---

[Part 1](./2026-06-14-why-is-kafka-fast-part-1.en.md) covered single-node Kafka performance: sequential I/O, Page Cache, Zero-Copy. These allow one machine to handle very high throughput.

But Kafka's real capability is horizontal scaling—add machines, throughput scales linearly. That depends on **partitions**.

## TL;DR

- **Partition**: Each topic is split into partitions, each an independent append-only log distributed across brokers
- **Consumer Group**: Members each own different partitions, enabling true parallel consumption
- **Replication**: Each partition has a leader and followers; writes wait for ISR confirmation; `acks` controls latency vs. durability tradeoff
- **ISR (In-Sync Replicas)**: Kafka's reliability mechanism—only replicas keeping up with the leader count as in-sync

## Design Philosophy: Partition Is the Unit of Performance

Kafka's performance model rests on one principle: **each partition is completely independent**. Reads and writes across different partitions don't interfere; they can run in parallel on different brokers.

This differs from RabbitMQ queues (pre-3.8): a single queue regardless of how many consumers attached was single-threaded on dispatch. Kafka has no such limit—if you want more parallelism, add more partitions.

```
Topic: orders
├── Partition 0 → Broker 1 (leader), Broker 2 (replica)
├── Partition 1 → Broker 2 (leader), Broker 3 (replica)
└── Partition 2 → Broker 3 (leader), Broker 1 (replica)
```

Three brokers, three partitions, load evenly distributed. Add a fourth broker and partitions rebalance automatically.

## Partition Count Tradeoffs

More partitions raise the throughput ceiling but add overhead:

**Benefits:**
- More partitions = more consumers can run in parallel
- Near-linear performance scaling
- Smaller individual partitions = faster leader elections

**Costs:**
- More partitions = more file handles and OS threads per broker
- Each partition has its own log segment; too many partitions increases file management pressure
- End-to-end latency doesn't necessarily improve with more partitions; depends where the bottleneck is

Practical starting point: no more than 100 partitions per broker—not more-is-better.

## Consumer Groups: The Key to Parallel Consumption

A Consumer Group's members share consumption of a topic, each owning different partitions:

```
Topic: orders (3 partitions)
Consumer Group: order-processors

Consumer A → Partition 0
Consumer B → Partition 1
Consumer C → Partition 2
```

One consumer in the group processes all 3 partitions. Three consumers, one each—throughput scales 3x (theoretically). More than 3 consumers and the extras sit idle; partition count is the parallelism ceiling.

**Multiple Consumer Groups can independently consume the same topic**, each maintaining its own offsets. This is Kafka's event broadcasting capability: one event stream, multiple downstream services consuming at their own pace without blocking each other.

## Replication: The Cost of Durability

Each partition has one leader and n followers. Producers talk only to the leader. The leader writes the message; followers asynchronously fetch and replicate.

The `acks` setting controls write confirmation behavior:

| acks | Semantics | Latency | Data Loss Risk |
|------|-----------|---------|----------------|
| `0` | No confirmation | Lowest | High (broker crash = lost) |
| `1` | Leader confirmed | Medium | Medium (leader crash before replication) |
| `all` (`-1`) | All ISR confirmed | Highest | Lowest |

`acks=all` with `min.insync.replicas=2` is common in production: any single broker failure won't lose data. The tradeoff is every write waits for follower confirmation, increasing latency. ISR synchronization is the core tuning knob in Kafka performance.

## ISR Mechanism

ISR is the set of replicas "keeping up" with the leader. Kafka uses a time window (`replica.lag.time.max.ms`) to define "keeping up"—a follower that hasn't fetched from the leader within this window gets dropped from ISR.

When a leader fails, Kafka's Controller elects a new leader from ISR only. Choosing from ISR guarantees the new leader has all committed messages (no data loss).

If ISR shrinks to just the leader but `min.insync.replicas` requires 2, `acks=all` writes fail. This is an explicit design choice: refuse writes rather than lower consistency guarantees.

## Comparison with RabbitMQ and Pulsar

| Feature | Kafka | RabbitMQ | Pulsar |
|---------|-------|----------|--------|
| Storage model | Append-only log | Queue (delete after consume) | Separate storage (BookKeeper) |
| Horizontal scaling | Linear with partitions | Federation/shovel | Topic sharding |
| Message retention | Time/size-based | Removed after consumption | Configurable |
| Consumer model | Pull | Push | Both |
| Ordering guarantee | Within partition | Within queue | Within partition |
| Best for | High-throughput event streams | Complex routing, task queues | Multi-tenant, cloud-native |

## When to Use Kafka

- Log/metrics ingestion pipelines (millions/second)
- Event sourcing
- Multiple downstream services consuming the same event stream
- Historical replay (consumers can re-read from any offset)

## When Not to Use Kafka

- Task queues (each task done by exactly one worker)—SQS or RabbitMQ fits better
- Complex message routing or filtering—RabbitMQ's exchange + binding model is more flexible
- Low-traffic, low-latency point-to-point delivery—Kafka's overhead is non-trivial at low volumes

## References

- [Kafka 如何達成如此高的效能？（第二部分）](https://www.youtube.com/shorts/la8tzEyg-hY)
- [Kafka Consumer Groups — Apache Kafka Documentation](https://kafka.apache.org/documentation/#consumerconfigs)
- [Kafka Replication — Confluent](https://developer.confluent.io/courses/architecture/replication/)
