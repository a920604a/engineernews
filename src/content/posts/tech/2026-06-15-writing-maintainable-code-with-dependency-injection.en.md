---
title: "Dependency Injection in Practice: Writing Code That's Actually Maintainable"
date: 2026-06-15T15:20:44.215Z
category: tech
tags: ["code-design", "dependency-injection", "software-engineering", "typescript", "testing"]
lang: en
tldr: "DI isn't just 'passing things in' — it's the core technique that makes code testable, swappable, and evolvable."
description: "A practical guide to dependency injection in TypeScript: from constructor injection to container management, with a focus on testability and real-world patterns."
type: how-to
original_url: "https://www.youtube.com/shorts/Z072vUn5xMg"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260616_060606_756001.mp3"
---

Hard-to-maintain code is rarely about logic complexity. It's usually about tight coupling — changing one thing requires you to trace a chain of dependencies and touch things that shouldn't need to change. Dependency Injection (DI) is the primary tool for breaking that chain.

## TL;DR

The core idea: **don't let a class create what it needs — pass it in from the outside**. This lets you swap implementations at test time, replace components when requirements change, and do both without touching the code that uses them.

## Prerequisites

- TypeScript interfaces and classes (basic syntax)
- Constructors
- Basic awareness of unit testing is helpful but not required

## The Problem

```typescript
class OrderService {
  private logger = new ConsoleLogger(); // tightly coupled

  processOrder(orderId: string) {
    this.logger.log(`Processing order: ${orderId}`);
    // business logic...
  }
}
```

`OrderService` creates its own `ConsoleLogger`. Two problems:

1. **Untestable**: you can't replace the logger in unit tests — every test run will actually log, or worse, write to a real system
2. **Hard to swap**: switching to `CloudLogger` means changing `OrderService`'s internals, not just wiring

## Step 1: Define an Interface

Extract the capability into an interface instead of binding to a concrete type:

```typescript
interface Logger {
  log(message: string): void;
  error(message: string, err?: Error): void;
}
```

This is a contract: anything that implements `log` and `error` is acceptable.

## Step 2: Implement the Interface

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

`SilentLogger` does nothing — and that's exactly what you want in tests.

## Step 3: Inject via Constructor

```typescript
class OrderService {
  constructor(private logger: Logger) {}

  processOrder(orderId: string): boolean {
    try {
      this.logger.log(`Processing order: ${orderId}`);
      // business logic...
      return true;
    } catch (err) {
      this.logger.error(`Failed: ${orderId}`, err as Error);
      return false;
    }
  }
}
```

`OrderService` no longer knows or cares which logger it gets. It only knows it satisfies the `Logger` interface.

```typescript
// production
const service = new OrderService(new ConsoleLogger());

// test — no console output
const service = new OrderService(new SilentLogger());
```

## Step 4: Container Management (Advanced)

When dependency chains get long (A needs B, B needs C), wiring by hand gets tedious. A simple container helps:

```typescript
class Container {
  private singletons = new Map<string, unknown>();

  register<T>(key: string, factory: () => T): void {
    this.singletons.set(key, factory());
  }

  resolve<T>(key: string): T {
    if (!this.singletons.has(key)) {
      throw new Error(`Not registered: ${key}`);
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

In production, use a mature DI library like [tsyringe](https://github.com/microsoft/tsyringe) or [InversifyJS](https://inversify.io/). But understanding manual wiring first makes the framework choices obvious.

## FAQ

**Isn't this more code for no gain?**

Only add interfaces where you actually need to swap implementations. A class with one implementation that will never change? Pass the class directly. DI is a tool, not a religion.

**Which DI framework for TypeScript?**

- [tsyringe](https://github.com/microsoft/tsyringe) — Microsoft, lightweight, decorator-based
- [InversifyJS](https://inversify.io/) — full-featured, better for large projects
- NestJS built-in — if you're already using NestJS

Understand manual injection first, then pick a framework.

**How does this relate to React Context?**

React Context is a DI mechanism: child components receive dependencies injected from above (auth state, theme, config) without prop-drilling. Same concept, different surface.

## References

- [YouTube: Writing Maintainable Code with Dependency Injection](https://www.youtube.com/shorts/Z072vUn5xMg)
- [tsyringe — Lightweight DI container for TypeScript](https://github.com/microsoft/tsyringe)
- [InversifyJS official docs](https://inversify.io/)
- [Dependency injection (Wikipedia)](https://en.wikipedia.org/wiki/Dependency_injection)
