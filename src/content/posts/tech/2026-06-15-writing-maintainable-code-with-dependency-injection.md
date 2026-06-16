---
title: "依賴注入實戰：寫出真正好維護的程式碼"
date: 2026-06-15T15:20:44.214Z
category: tech
tags: ["程式碼設計", "依賴注入", "軟體工程", "typescript", "測試"]
lang: zh-TW
tldr: "依賴注入不只是「把東西傳進去」，它是讓程式碼可測試、可替換、可演進的核心手法。"
description: "深入解析依賴注入的設計哲學、實作手法與常見誤區，並以 TypeScript 示範從手動注入到容器管理的完整流程。"
type: how-to
original_url: "https://www.youtube.com/shorts/Z072vUn5xMg"
draft: false
---

程式碼很難維護，通常不是因為邏輯複雜，而是因為各個模組之間耦合太緊，改一個地方就要追整條鏈。依賴注入（Dependency Injection，DI）是解開這條鏈的關鍵手法。

## TL;DR

依賴注入的核心思想：**不要讓類別自己建立它所需要的東西，而是從外部傳入**。這讓你在測試時可以換掉真實實作，在需求改變時可以替換元件，而不需要動到使用者的程式碼。

## 前置條件

- 理解 TypeScript 介面（interface）與類別（class）的基本語法
- 知道什麼是建構子（constructor）
- 對「單元測試」有基本概念更好，但非必須

## 問題從哪裡來

先看一段有問題的程式碼：

```typescript
class OrderService {
  private logger = new ConsoleLogger(); // 直接 new

  processOrder(orderId: string) {
    this.logger.log(`Processing order: ${orderId}`);
    // ... 業務邏輯
  }
}
```

`OrderService` 自己建立 `ConsoleLogger`，這造成兩個問題：

1. **難以測試**：你沒辦法在單元測試裡換掉 `logger`，每次跑測試都會真的把 log 印出來，或更糟，寫進真實系統
2. **難以替換**：有一天你想換成 `CloudLogger`，你要改 `OrderService` 的內部實作，不是加功能，而是改它

## 步驟一：定義介面

先把「我需要什麼能力」抽成介面，而不是綁定具體實作：

```typescript
interface Logger {
  log(message: string): void;
  error(message: string, err?: Error): void;
}
```

介面是一份合約：只要實作了 `log` 和 `error`，我就接受。

## 步驟二：實作介面

```typescript
class ConsoleLogger implements Logger {
  log(message: string) {
    console.log(`[INFO] ${message}`);
  }
  error(message: string, err?: Error) {
    console.error(`[ERROR] ${message}`, err);
  }
}

class SilentLogger implements Logger {
  log(_message: string) {}
  error(_message: string, _err?: Error) {}
}
```

`SilentLogger` 什麼都不做，但它實作了介面。測試時可以用它來消音。

## 步驟三：透過建構子注入

```typescript
class OrderService {
  constructor(private logger: Logger) {}

  processOrder(orderId: string) {
    this.logger.log(`Processing order: ${orderId}`);
    // ... 業務邏輯
  }
}
```

`OrderService` 不再知道 logger 的具體型別，它只知道「我有一個實作 Logger 介面的東西」。

使用時：

```typescript
// 正式環境
const service = new OrderService(new ConsoleLogger());

// 測試環境
const service = new OrderService(new SilentLogger());
```

## 步驟四：容器管理依賴（進階）

當依賴鏈變長（A 依賴 B，B 依賴 C），手動組裝變得繁瑣。這時可以用簡單的容器：

```typescript
class Container {
  private singletons = new Map<string, unknown>();

  register<T>(key: string, factory: () => T): void {
    this.singletons.set(key, factory());
  }

  resolve<T>(key: string): T {
    if (!this.singletons.has(key)) {
      throw new Error(`Dependency not registered: ${key}`);
    }
    return this.singletons.get(key) as T;
  }
}

const container = new Container();
container.register('logger', () => new ConsoleLogger());
container.register('orderService', () =>
  new OrderService(container.resolve<Logger>('logger'))
);

const orderService = container.resolve<OrderService>('orderService');
```

生產環境通常會用成熟的 DI 框架（如 [tsyringe](https://github.com/microsoft/tsyringe) 或 [InversifyJS](https://inversify.io/)）來做這件事，但理解手動實作的原理更重要。

## 完整範例

```typescript
interface Logger {
  log(message: string): void;
  error(message: string, err?: Error): void;
}

class ConsoleLogger implements Logger {
  log(message: string) {
    console.log(`[INFO] ${message}`);
  }
  error(message: string, err?: Error) {
    console.error(`[ERROR] ${message}`, err);
  }
}

class SilentLogger implements Logger {
  log(_: string) {}
  error(_: string, __?: Error) {}
}

class OrderService {
  constructor(private logger: Logger) {}

  processOrder(orderId: string): boolean {
    try {
      this.logger.log(`Processing order: ${orderId}`);
      // 業務邏輯...
      return true;
    } catch (err) {
      this.logger.error(`Failed to process order: ${orderId}`, err as Error);
      return false;
    }
  }
}

// 使用
const prod = new OrderService(new ConsoleLogger());
prod.processOrder('order-001');

// 測試（不會有任何 console 輸出）
const test = new OrderService(new SilentLogger());
const result = test.processOrder('order-002');
console.assert(result === true);
```

## 常見問題

**Q：這樣不是多寫很多 interface 很麻煩？**

只有在需要替換實作的地方才值得抽介面。如果一個類別只有一個實作，而且你確定不會換，直接傳類別也沒問題。不要過度設計。

**Q：DI 框架要選哪個？**

TypeScript 生態常見的選項：
- [tsyringe](https://github.com/microsoft/tsyringe)（微軟出品，輕量）
- [InversifyJS](https://inversify.io/)（功能完整，適合大型專案）
- NestJS 內建 DI 容器（如果你在用 NestJS）

先搞懂手動注入的概念，再選框架。

**Q：跟 React 的 Context 有什麼關係？**

React Context 其實是一種 DI 機制：讓子元件可以取得從上層注入的依賴（如 auth state、theme），而不需要逐層傳 props。概念完全一樣，只是框架不同。

## 參考資料

- [YouTube：寫出好維護的程式碼～依賴注入](https://www.youtube.com/shorts/Z072vUn5xMg)
- [tsyringe - Lightweight dependency injection container for TypeScript](https://github.com/microsoft/tsyringe)
- [InversifyJS 官方文件](https://inversify.io/)
