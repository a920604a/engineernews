---
title: "[系統設計Mock] 回顧 DoorDash 的捐贈活動"
date: 2026-04-29T19:42:20.716Z
category: tech
tags: ["系統設計", "Mock", "工程", "技術"]
lang: zh-TW
tldr: " DoorDash 的捐贈活動系統設計"
description: " DoorDash 的捐贈活動系統設計"
audio_url: "/api/tts/r2/tts/2026-04-29-mock-doordash-donation-event.mp3"
type: deep-dive
original_url: "https://www.youtube.com/watch?v=xbnrvkVf0s8"
draft: false
---

# 系統設計Mock：複盤 DoorDash 捐贈活動

 DoorDash 的捐贈活動是一個複雜的系統，涉及多個服務、數據庫和第三方API。這篇文章將深入探討 DoorDash 捐贈活動的系統設計，包括其設計哲學、核心概念、架構圖和與常見替代方案的比較。讀者將了解 DoorDash 如何設計這個系統，及其背後的考量和取捨。

## TL;DR
 DoorDash 捐贈活動的系統設計是一個微服務架構，使用事件驅動設計，實現高可用性和高擴展性。

## 設計哲學
 DoorDash 的系統設計哲學是基於事件驅動設計（Event-Driven Design），旨在實現高可用性和高擴展性。這個哲學的核心思想是將系統分解為多個微服務，每個服務負責一個特定的業務邏輯，並通過事件消息進行通信。這樣的設計可以實現系統的高可用性和高擴展性，並且可以更好地應對業務需求的變化。

## 核心概念
 DoorDash 捐贈活動的系統架構如下所示：
```mermaid
graph LR
  A[用戶端] -->|訂單|> B[訂單服務]
  B -->|創建訂單|> C[訂單數據庫]
  C -->|訂單事件|> D[事件總線]
  D -->|訂單事件|> E[捐贈服務]
  E -->|創建捐贈|> F[捐贈數據庫]
  F -->|捐贈事件|> D
  D -->|捐贈事件|> G[通知服務]
  G -->|發送通知|> H[用戶端]
```
系統的核心概念包括：

* 訂單服務：負責處理用戶的訂單請求，創建訂單並保存到訂單數據庫。
* 訂單數據庫：儲存用戶的訂單信息。
* 事件總線：負責傳遞訂單事件和捐贈事件。
* 捐贈服務：負責處理捐贈請求，創建捐贈並保存到捐贈數據庫。
* 捐贈數據庫：儲存捐贈信息。
* 通知服務：負責發送通知給用戶。

## 跟常見替代方案比較
| 方案 | DoorDash | 常見替代方案 |
| --- | --- | --- |
| 架構 | 微服務架構 | 單體架構 |
| 通信方式 | 事件驅動設計 | API請求 |
| 可用性 | 高可用性 | 低可用性 |
| 擴展性 | 高擴展性 | 低擴展性 |

常見替代方案包括單體架構和 API請求方式。單體架構的缺點是可用性和擴展性較低，而 API請求方式的缺點是通信效率較低。

## 適合 / 不適合的情境
 DoorDash 的系統設計適合於高可用性和高擴展性要求的業務場景，不適合於小型業務或實驗性質的專案。

## 整體來說
 DoorDash 的系統設計是一個典型的微服務架構，使用事件驅動設計，實現高可用性和高擴展性。這個設計適合於高可用性和高擴展性要求的業務場景，但需要考慮到系統的複雜性和運維成本。

## 參考資料
* [DoorDash 的技術部落格](https://doordash.engineering/)
* [事件驅動設計](https://en.wikipedia.org/wiki/Event-driven_architecture)
- [[系统设计Mock] 复盘 Doordash donation event](https://www.youtube.com/watch?v=xbnrvkVf0s8)