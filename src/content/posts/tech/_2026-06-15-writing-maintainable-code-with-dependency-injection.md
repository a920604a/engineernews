---
title: "寫出好維護的程式碼～依賴注入"
date: 2026-06-15T15:20:44.214Z
category: tech
tags: ["程式碼設計", "依賴注入", "軟體工程", "職涯", "AI"]
lang: zh-TW
tldr: "使用依賴注入的技巧來寫出好維護的程式碼"
description: "使用依賴注入的技巧來寫出好維護的程式碼"

type: how-to
original_url: "https://www.youtube.com/shorts/Z072vUn5xMg"
draft: true
---

# TL;DR
本篇文章將介紹如何使用依賴注入（Dependency Injection）寫出好維護的程式碼。

# 前置條件
需要有基本的程式設計知識和對物件導向程式設計（OOP）的了解。

# 步驟
### 什麼是依賴注入？
依賴注入是一種軟體設計模式，旨在減少程式碼之間的耦合性。耦合性是指程式碼之間的相依程度，高耦合性意味著程式碼之間的修改會影響到其他程式碼。

### 依賴注入的優點
* 減少耦合性
* 提高程式碼的可測試性
* 提高程式碼的可維護性

### 依賴注入的實踐
#### 1. 定義介面
定義介面是依賴注入的第一步。介面定義了某個類別或物件的方法和屬性。

```typescript
interface Logger {
  log(message: string): void;
}
```

#### 2. 實作介面
實作介面是依賴注入的第二步。實作介面需要實作介面定義的方法和屬性。

```typescript
class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }
}
```

#### 3. 使用依賴注入
使用依賴注入是依賴注入的第三步。使用依賴注入需要在類別或物件中注入介面的實作。

```typescript
class Example {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  doSomething(): void {
    this.logger.log('做了一些事情');
  }
}
```

#### 4. 使用容器管理依賴
使用容器管理依賴是依賴注入的第四步。使用容器管理依賴需要在容器中注冊介面的實作。

```typescript
class Container {
  private logger: Logger;

  constructor() {
    this.logger = new ConsoleLogger();
  }

  getLogger(): Logger {
    return this.logger;
  }
}
```

### 完整範例

```typescript
interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }
}

class Example {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  doSomething(): void {
    this.logger.log('做了一些事情');
  }
}

class Container {
  private logger: Logger;

  constructor() {
    this.logger = new ConsoleLogger();
  }

  getLogger(): Logger {
    return this.logger;
  }
}

const container = new Container();
const example = new Example(container.getLogger());
example.doSomething();
```

# 常見問題
### 什麼是依賴注入的缺點？
依賴注入的缺點是增加了程式碼的複雜性和額外的工作量。

### 如何選擇依賴注入框架？
選擇依賴注入框架需要考慮框架的簡單性、效能和 community 的支持度。

# 參考資料
* [依賴注入（Dependency Injection）](https://zh.wikipedia.org/wiki/%E4%BE%9D%E8%B5%96%E6%B3%A8%E5%85%A5)
* [TypeScript 官方文件 - 依賴注入](https://www.typescriptlang.org/docs/handbook/classes.html#dependency-injection)

## 技術結構圖

```mermaid
graph LR
    A[介面定義] -->|實作介面|> B[Logger介面]
    B -->|實作介面|> C[ConsoleLogger類別]
    C -->|注入介面實作|> D[Example類別]
    D -->|使用依賴注入|> E[Container類別]
    E -->|註冊介面實作|> F[Container註冊ConsoleLogger]
    F -->|取得Logger實作|> G[Example取得Logger]
    G -->|呼叫Logger方法|> H[ConsoleLogger記錄訊息]
    style A fill:#f9f,stroke:#333,stroke-width:4px
    style B fill:#f9f,stroke:#333,stroke-width:4px
    style C fill:#f9f,stroke:#333,stroke-width:4px
    style D fill:#f9f,stroke:#333,stroke-width:4px
    style E fill:#f9f,stroke:#333,stroke-width:4px
    style F fill:#f9f,stroke:#333,stroke-width:4px
    style G fill:#f9f,stroke:#333,stroke-width:4px
    style H fill:#f9f,stroke:#333,stroke-width:4px
```

## 參考資料

- [寫出好維護的程式碼～依賴注入](https://www.youtube.com/shorts/Z072vUn5xMg)