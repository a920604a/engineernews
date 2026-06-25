---
title: "系統設計 Mock：書籍電商平台的架構決策"
date: 2026-06-03T13:22:21.272Z
category: tech
tags: ["system-design", "microservices", "e-commerce", "database", "caching", "api-design"]
lang: zh-TW
series:
  name: "系統設計 Mock 面試"
  order: 3
tldr: "設計一個書籍銷售平台時，關鍵決策是搜尋架構（Elasticsearch vs 全文搜尋）、庫存一致性（強一致 vs 最終一致）、以及訂單狀態機的設計。"
description: "系統設計 Mock 系列：從需求澄清到容量估算，完整走一遍書籍電商平台的架構設計，重點討論搜尋、庫存和訂單三個核心子系統的取捨。"
type: deep-dive
original_url: "https://www.youtube.com/watch?v=tkikiGfum58"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_200816_565057.mp3"
---

書籍銷售平台是系統設計面試的經典題目。它看起來和一般電商相似，但有幾個獨特的複雜度：書籍的搜尋需求遠比一般商品複雜（書名、作者、ISBN、類型、全文搜尋），庫存管理涉及實體書和電子書的混合，以及數位商品的授權和 DRM 問題。

這篇文章模擬一場系統設計 Mock 的討論過程，著重在架構決策的取捨邏輯，而不只是描述一個「正確答案」。

## TL;DR

書籍平台的三個核心設計決策：(1) 搜尋用 Elasticsearch，但要想清楚索引更新策略；(2) 庫存用悲觀鎖搭配 Redis 快取，避免超賣但保持讀取效能；(3) 訂單用有限狀態機（FSM）設計，所有狀態轉換要是冪等的。微服務架構看起來「現代」，但如果你的團隊不到 20 人，先從單體開始可能是更務實的選擇。

## 設計哲學

系統設計 Mock 的目的不是要你說出某個「標準答案」，而是展示你如何思考取捨。面試官想看到：

1. **需求澄清優先**：在開始畫架構圖之前，先確認規模要求（DAU、QPS）、功能邊界（是否支援賣家入駐？是否有訂閱方案？）、以及非功能性需求（資料一致性優先還是可用性優先）。

2. **容量估算的數感**：一個書籍平台，假設 100 萬 DAU，每人每天平均 5 次搜尋，10 次頁面瀏覽，0.1 次下單。搜尋 QPS 約 58，讀取 QPS 約 116，寫入 QPS 約 1.2。這個規模根本不需要微服務，一台 DB + 讀寫分離就夠了。

3. **針對瓶頸做設計**：不要每個地方都加快取、都用微服務，找到真正的瓶頸再做對應的設計。

## 核心子系統設計

### 搜尋服務

書籍搜尋的複雜度在於：用戶可能用書名、作者、ISBN 搜尋，也可能用模糊的描述（「那本講二戰的書，封面是紅色的」）。純粹的資料庫 LIKE 查詢在這裡完全不夠用。

**推薦架構**：主資料庫（PostgreSQL）+ Elasticsearch 雙寫。

```mermaid
graph LR
    A[用戶搜尋請求] --> B[搜尋服務]
    B --> C[Elasticsearch]
    C --> D[搜尋結果 書籍 ID 列表]
    D --> E[批次查詢書籍詳情]
    E --> F[PostgreSQL / Redis 快取]
    F --> G[組合回傳給用戶]
```

關鍵取捨：Elasticsearch 和 PostgreSQL 的資料會有短暫不一致。剛上架的書籍可能需要幾秒到幾十秒才出現在搜尋結果中，這對大多數書籍平台是可接受的。

### 庫存管理

實體書和電子書的庫存邏輯完全不同：
- **實體書**：有限庫存，需要嚴格防止超賣
- **電子書**：無限庫存，但需要管理授權（同時借閱數量限制）

對實體書，用 PostgreSQL 的 `SELECT ... FOR UPDATE` 悲觀鎖是最安全的選擇：

```sql
BEGIN;
SELECT stock FROM books WHERE id = :book_id FOR UPDATE;
-- 檢查 stock > 0
UPDATE books SET stock = stock - 1 WHERE id = :book_id;
INSERT INTO orders ...;
COMMIT;
```

高並發場景可以加 Redis 做「庫存預扣」的快取層，減少打到 DB 的請求，但要注意 Redis 和 DB 之間的一致性問題。

### 訂單狀態機

訂單的狀態轉換必須用有限狀態機（FSM）來設計，並且每個轉換都要是冪等的（重複請求不會導致重複操作）：

```
CREATED → PAYMENT_PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
                         ↓              ↓
                      CANCELLED     CANCELLED
```

每個狀態轉換對應一個事件（用戶付款、倉庫出貨），並且要記錄轉換的時間戳和原因。退款流程應該是另一個獨立的狀態機，不要把退款邏輯塞進訂單狀態機裡。

## 跟常見替代方案比較

| 架構選擇 | 優點 | 缺點 | 適用時機 |
| --- | --- | --- | --- |
| 單體架構 | 開發快、部署簡單、除錯容易 | 難以水平擴展特定模組 | 初期、團隊 < 10 人 |
| 微服務架構 | 可獨立擴展、技術棧靈活 | 分散式系統的複雜度（網路、事務） | 明確的擴展瓶頸、團隊 > 20 人 |
| 模組化單體 | 邏輯隔離又沒有分散式複雜度 | 仍共享同一個 DB | 中期過渡階段 |

真實的反例：Amazon 早期是單體，在業務達到相當規模後才遷移到服務化架構。過早的微服務化往往是工程效率的殺手。

## 適合 / 不適合的情境

**適合深入討論微服務的情境**：
- 搜尋服務的查詢量是訂單服務的 100 倍以上，需要獨立擴展
- 不同服務需要不同的技術棧（搜尋用 Elasticsearch，訂單用強一致 DB）
- 有獨立的團隊負責不同的業務領域

**不適合過度設計的情境**：
- DAU 不到 10 萬
- 單一工程師或小團隊維護
- 業務模型還在快速變化中

## 整體來說

書籍平台系統設計的面試重點，不在於你用了多少個微服務或快取層，而在於你能不能清楚說明每一個設計決策背後的取捨邏輯。在 Mock 面試中，「我選擇 X 而不是 Y，因為在這個規模下 X 的維護成本更低，而 Y 帶來的效能提升不值得這個複雜度」這樣的回答，遠比「我會用 Redis + Kafka + Elasticsearch + 微服務」更有說服力。

## 參考資料

- [Designing Data-Intensive Applications (DDIA) - Martin Kleppmann](https://dataintensive.net/)
- [System Design Interview - Alex Xu](https://www.amazon.com/System-Design-Interview-insiders-Second/dp/B08CMF2CQF)
- [PostgreSQL 鎖定機制文件](https://www.postgresql.org/docs/current/explicit-locking.html)
- [Elasticsearch 全文搜尋指南](https://www.elastic.co/guide/en/elasticsearch/reference/current/full-text-queries.html)
