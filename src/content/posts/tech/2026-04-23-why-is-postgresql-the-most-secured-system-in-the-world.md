---
title: "PostgreSQL 的安全機制：360 度全方位的安全保護"
date: 2026-04-23
category: tech
tags: ["PostgreSQL", "安全", "資料庫", "AI", "科技"]
lang: zh-TW
tldr: "PostgreSQL 的安全機制是如何提供全方位的安全保護，包括身份驗證、授權、資料加密等"
description: "PostgreSQL 的安全機制是如何提供全方位的安全保護，包括身份驗證、授權、資料加密等"
original_url: "https://www.youtube.com/watch?v=S_Z8Y0vMSzo"
draft: false
---

## TL;DR
PostgreSQL 的安全機制是如何提供全方位的安全保護，包括身份驗證、授權、資料加密等。

目前，計算機行業對資料庫安全的重視程度嚴重不足。很多人認為後端是部署在自己家的，已經做好了安全防範，那後端連資料庫就不需要搞那么複雜了。這種侥幸心理的結果就是讓闖進家裡的人，不管是故意的還是不小心的，都直接手握了 admin 賬號這個核彈，毀天滅地就是一念之間。

PostgreSQL 的安全機制是圍繞著角色（role）這個概念來設計的。角色可以被授予不同的權限，包括資料庫、schema、table、column、row 等不同層面的權限。PostgreSQL 還提供了 search_path、GRANT、Row Level Security（RLS）等功能來實現動態的權限控制。

在 column 層面，PostgreSQL 提供了 GRANT 命令來授予角色對 column 的權限。CRUD（Create、Read、Update、Delete）權限需要分開授予。例如，某個用戶只需要讀取用戶的 ID 和名字，那就只授予 SELECT 權限。

在 row 層面，PostgreSQL 提供了 RLS 功能來實現動態的權限控制。RLS 可以在每個 transaction 發起時，實時地驗證角色對 row 的 CRUD 權限。例如，某個用戶只可以讀取自己的訂單，店家只能讀取不能寫入訂單。

總之，PostgreSQL 的安全機制提供了全方位的安全保護，包括身份驗證、授權、資料加密等。開發人員應該重視資料庫安全，使用 PostgreSQL 提供的安全功能來保護資料庫。

### PostgreSQL 的安全機制

PostgreSQL 的安全機制是圍繞著角色（role）這個概念來設計的。角色可以被授予不同的權限，包括資料庫、schema、table、column、row 等不同層面的權限。

#### Search Path

PostgreSQL 提供了 search_path 功能來給不同的角色制定不同 schema 的可見度。例如，可以讓不同部門的系統只可以看到自己部門的 schema。

```sql
CREATE SCHEMA my_schema;
GRANT USAGE ON SCHEMA my_schema TO my_role;
```

#### GRANT

PostgreSQL 提供了 GRANT 命令來授予角色對 column 的權限。CRUD（Create、Read、Update、Delete）權限需要分開授予。例如，某個用戶只需要讀取用戶的 ID 和名字，那就只授予 SELECT 權限。

```sql
GRANT SELECT (id, name) ON my_table TO my_role;
```

#### Row Level Security（RLS）

PostgreSQL 提供了 RLS 功能來實現動態的權限控制。RLS 可以在每個 transaction 發起時，實時地驗證角色對 row 的 CRUD 權限。例如，某個用戶只可以讀取自己的訂單，店家只能讀取不能寫入訂單。

```sql
CREATE POLICY my_policy ON my_table FOR SELECT TO my_role USING (current_user = 'my_user');
```

### 結論

PostgreSQL 的安全機制提供了全方位的安全保護，包括身份驗證、授權、資料加密等。開發人員應該重視資料庫安全，使用 PostgreSQL 提供的安全功能來保護資料庫。

## 參考資料

- [Why is PostgreSQL the Most Secured System In The World](https://www.youtube.com/watch?v=S_Z8Y0vMSzo)