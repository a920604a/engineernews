---
title: "System Design Mock: Architecture Decisions for a Book E-Commerce Platform"
date: 2026-06-03T13:22:21.272Z
category: tech
tags: ["system-design", "microservices", "e-commerce", "database", "caching", "api-design"]
lang: en
series:
  name: "系統設計 Mock 面試"
  order: 3
tldr: "For a book selling platform, the key decisions are search architecture (Elasticsearch vs full-text search), inventory consistency (strong vs eventual), and order state machine design."
description: "System design mock series: from requirements clarification to capacity estimation, a complete walkthrough of a book e-commerce platform's architecture, focusing on search, inventory, and order subsystem tradeoffs."
type: deep-dive
original_url: "https://www.youtube.com/watch?v=tkikiGfum58"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260615_200752_839332.mp3"
---

A book sales platform is a classic system design interview problem. It looks similar to a general e-commerce platform, but has specific complexity: book search requirements are far richer than typical products (title, author, ISBN, genre, full-text), inventory management involves mixing physical books and ebooks, and digital goods need licensing and DRM handling.

This post simulates a system design mock interview discussion, focusing on the reasoning behind architectural trade-offs rather than presenting a single "correct answer."

## TL;DR

Three core design decisions for a book platform: (1) use Elasticsearch for search, but think through the index update strategy; (2) use pessimistic locking with a Redis cache layer for inventory to prevent overselling while maintaining read performance; (3) design orders as a finite state machine (FSM) where every state transition is idempotent. Microservices look "modern" but if your team is under 20 people, starting with a monolith is probably the more pragmatic choice.

## Design Philosophy

The point of a system design mock isn't to produce a "standard answer" — it's to show how you reason about trade-offs. Interviewers want to see:

1. **Clarify requirements first**: Before drawing an architecture diagram, confirm scale requirements (DAU, QPS), feature boundaries (seller marketplace? subscription plans?), and non-functional requirements (consistency vs. availability priority).

2. **Numerical intuition for capacity**: For a book platform with 1M DAU, assume 5 searches/day, 10 page views/day, 0.1 orders/day per user. Search QPS: ~58, read QPS: ~116, write QPS: ~1.2. At this scale, a single DB with read replicas is more than sufficient. You don't need microservices.

3. **Design around actual bottlenecks**: Don't add caching everywhere or split everything into services. Find the real bottleneck and design specifically for it.

## Core Subsystem Designs

### Search Service

Book search complexity: users might search by title, author, ISBN, or vague descriptions ("that red-covered book about WWII"). Database LIKE queries are completely inadequate here.

**Recommended architecture**: Primary database (PostgreSQL) + Elasticsearch dual-write.

```mermaid
graph LR
    A[User search request] --> B[Search service]
    B --> C[Elasticsearch]
    C --> D[Result book ID list]
    D --> E[Batch fetch book details]
    E --> F[PostgreSQL / Redis cache]
    F --> G[Assembled response to user]
```

Key trade-off: Elasticsearch and PostgreSQL will have brief inconsistencies. A newly added book may take seconds to tens of seconds to appear in search results — acceptable for most book platforms.

### Inventory Management

Physical books and ebooks have completely different inventory logic:
- **Physical books**: finite inventory, strict oversell prevention needed
- **Ebooks**: unlimited inventory, but licensing management (concurrent borrow limits) needed

For physical books, PostgreSQL's `SELECT ... FOR UPDATE` pessimistic locking is the safest choice:

```sql
BEGIN;
SELECT stock FROM books WHERE id = :book_id FOR UPDATE;
-- Check stock > 0
UPDATE books SET stock = stock - 1 WHERE id = :book_id;
INSERT INTO orders ...;
COMMIT;
```

For high-concurrency scenarios, add a Redis "pre-deduct" cache layer to reduce DB hits — but be careful about Redis/DB consistency issues.

### Order State Machine

Order state transitions must be designed as a finite state machine (FSM), with every transition idempotent (repeated requests don't cause duplicate operations):

```
CREATED → PAYMENT_PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
                         ↓              ↓
                      CANCELLED     CANCELLED
```

Each state transition corresponds to an event (user payment, warehouse dispatch). Record the timestamp and reason for each transition. Refund flow should be a separate FSM — don't stuff refund logic into the order state machine.

## Comparison of Architecture Approaches

| Architecture | Advantages | Disadvantages | When to use |
| --- | --- | --- | --- |
| Monolith | Fast to develop, simple to deploy, easy to debug | Hard to scale specific modules independently | Early stage, team < 10 |
| Microservices | Independent scaling, flexible tech stack | Distributed systems complexity (networking, transactions) | Clear scaling bottlenecks, team > 20 |
| Modular monolith | Logical isolation without distributed complexity | Still shares a single DB | Mid-stage transition |

A real counter-example: Amazon started as a monolith and migrated to a service-oriented architecture only after reaching significant scale. Premature microservices are often an engineering efficiency killer.

## Summary

The point of a book platform system design interview isn't how many microservices or cache layers you use — it's whether you can clearly articulate the trade-off reasoning behind each design decision. In a mock interview, "I chose X over Y because at this scale X has lower maintenance overhead while Y's performance gain doesn't justify the complexity" is far more convincing than "I'll use Redis + Kafka + Elasticsearch + microservices."

## References

- [Designing Data-Intensive Applications (DDIA) - Martin Kleppmann](https://dataintensive.net/)
- [System Design Interview - Alex Xu](https://www.amazon.com/System-Design-Interview-insiders-Second/dp/B08CMF2CQF)
- [PostgreSQL locking documentation](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Elasticsearch full-text search guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/full-text-queries.html)
