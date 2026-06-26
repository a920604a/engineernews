---
title: "系統設計複盤：設計一個 Uber — 從需求拆解到架構取捨"
date: 2026-05-27T03:40:38.960Z
category: learning
tags: ["system-design", "architecture", "uber", "engineering", "interview-prep"]
lang: zh-TW
series:
  name: "系統設計 Mock 面試"
  order: 2
tldr: "設計 Uber 最核心的挑戰不是技術選型，而是把一個模糊的大問題拆解成可以討論的子問題"
description: "從直播複盤中整理出設計 Uber 的思維框架：如何釐清需求範圍、識別核心難點，以及在擴展性與一致性之間做取捨"
type: case-study
original_url: "https://www.youtube.com/watch?v=MNfU1tFLiOk"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_141420_299619.mp3"
---

「請你設計 Uber。」

這是一道系統設計面試的經典題目，也是很多人第一次聽到時最容易當場腦袋空白的那種問題——因為它太大、太模糊，不知道從哪裡開始。

這篇複盤整理自一次直播的系統設計練習，分享在面對這類開放題時，有效的思考框架是什麼。

## TL;DR

設計 Uber 的關鍵不是記住「要用哪些技術」，而是建立一套可以拆解任意系統問題的思維流程：釐清需求 → 識別核心難點 → 提出方案 → 分析取捨。

## 第一步：縮小範圍，聚焦核心功能

Uber 是一個完整的產品生態，有乘客 app、司機 app、後台管理、支付系統、地圖服務⋯⋯如果你試圖一次設計所有東西，你什麼都設計不好。

在面試中，第一件事是確認範圍：

- 這次只聚焦在「乘客發起叫車到司機接單」這個核心流程
- 不包含支付、歷史紀錄、評分系統（這些可以在時間允許的情況下延伸）
- 地圖服務假設使用第三方（Google Maps API），不自己設計

這個動作看起來簡單，但面試官其實在觀察你有沒有能力主動定義問題邊界，而不是等人告訴你。

## 第二步：識別核心難點

Uber 的技術挑戰，本質上是一個**位置匹配**問題：

1. 乘客在哪裡？
2. 附近的司機在哪裡？
3. 怎麼把最合適的司機派給最近的乘客？

這裡有幾個值得深入的子問題：

**即時位置更新**：司機的位置每隔幾秒就會改變，系統需要持續接收大量的位置資料（write-heavy workload）。

**附近司機查詢**：乘客叫車時，系統需要快速找到「附近 X 公里內」的空閒司機（geospatial query）。這類查詢用傳統的 SQL 效能很差，通常需要 geospatial index 或專門的地理空間資料庫。

**配對邏輯**：找到附近司機後，要怎麼決定派誰？最近的？評分最高的？等待時間最短的？這個邏輯會影響整體系統的設計。

## 第三步：資料模型與關鍵 API

**位置資料表**（Driver Location）：
```
driver_id    | VARCHAR
latitude     | FLOAT
longitude    | FLOAT
status       | ENUM (available, busy, offline)
updated_at   | TIMESTAMP
```

**叫車請求表**（Ride Request）：
```
request_id   | UUID
passenger_id | VARCHAR
pickup_lat   | FLOAT
pickup_lng   | FLOAT
status       | ENUM (pending, matched, completed, cancelled)
driver_id    | VARCHAR (nullable, filled after match)
created_at   | TIMESTAMP
```

核心 API：
- `POST /ride/request` — 乘客發起叫車
- `PATCH /driver/location` — 司機更新位置（高頻呼叫）
- `GET /ride/{id}/status` — 乘客輪詢或透過 WebSocket 接收配對結果

## 第四步：擴展性的取捨

**位置更新的寫入壓力**：假設有 100 萬名活躍司機，每 4 秒更新一次位置，每秒就有約 25 萬次寫入。直接打進關聯式資料庫（如 PostgreSQL）會是瓶頸。常見的做法是先寫進 Redis（in-memory，極低延遲），再非同步同步到持久化儲存。

**地理空間查詢**：可以使用 Redis 的 `GEO` 指令（底層是 sorted set + geohash），它支援直接查詢「以某點為圓心、半徑 N 公里內的所有 key」，效能遠優於在關聯式資料庫做範圍查詢。

**服務分離**：位置更新服務、配對服務、行程狀態服務應該獨立部署，這樣任一服務的流量高峰不會拖垮整體系統。

## 整體來說

設計 Uber 這道題，真正在測試的是你能不能用工程師的語言，把一個複雜的真實世界問題拆解成有邊界、可以逐步深入的子問題——而不是能不能背出「用 Kafka + Redis + Kubernetes」這個技術清單。

在面試中，展示清晰的思考流程、主動識別取捨，比說出正確答案更重要。因為系統設計本來就沒有標準答案，只有「在當前約束條件下合理的答案」。

## 參考資料

- [直播複盤：Design Uber](https://www.youtube.com/watch?v=MNfU1tFLiOk)
- [Redis GEO 指令文件](https://redis.io/docs/latest/commands/geosearch/)
- [Uber Engineering Blog](https://eng.uber.com/)
