---
title: "被遺忘的開發者如何拯救 JavaScript：Jeremy Ashkenas、Underscore.js 與 CoffeeScript"
date: "2026-05-31T08:57:39.266Z"
category: "tech"
tags: ["javascript","coffeescript","underscore-js","web","history","open-source"]
type: "explainer"
original_url: "https://www.youtube.com/watch?v=JfPWbttemYE"
draft: false
tldr: "2009 年的 JavaScript 沒有標準函式庫、沒有模組、沒有類別，每個瀏覽器行為還不一樣。Jeremy Ashkenas 用 Underscore.js 補齊工具函式、再用 CoffeeScript 直接繞過語言本身的爛設計，成為讓 JavaScript 被認真對待的關鍵人物之一。"
description: "從 Underscore.js 到 CoffeeScript：Jeremy Ashkenas 如何在 2009 年前後，用兩個專案改變開發者看待 JavaScript 的方式。"
key_points:
  - "Underscore.js 提供約 60 個處理陣列與物件的工具函式，補上當時 IE 缺少的 map/reduce/forEach"
  - "CoffeeScript 編譯成 JavaScript，讓開發者不必等標準委員會或瀏覽器廠商就能繞過語言的爛設計"
  - "CoffeeScript 在 Rails 3.1（2011）成為預設前端預處理器，GitHub、Dropbox 等早期新創也採用"
---

2009 年，JavaScript 幾乎是所有工程師心照不宣討厭的語言。

它由 Brendan Eich 在 10 天內設計出來，這件事本身已經成了業界笑話——用過的人常會懷疑他第二天之後到底在幹嘛。更糟的是，當時每個瀏覽器對它的解讀都不一樣，沒有標準函式庫、沒有模組、也沒有類別。如果你的主要工作就是寫 JavaScript，在那個年代甚至會被當成上不了檯面的「script kiddie」。

但接下來十年，情況徹底反轉：JavaScript 從一個沒人想直接碰的語言，變成世界上數一數二熱門的程式語言；寫 JavaScript 的人，也從被看不起的角色，變成被認真對待的工程師。

這場轉變有很多原因。而其中一個被嚴重低估、甚至幾乎被時間遺忘的推手，是同一個人——**Jeremy Ashkenas**。

## 一個被逼著寫 JavaScript 的 Ruby 開發者

2009 年，Jeremy Ashkenas 在 DocumentCloud 工作，負責一個大量倚賴 client-side JavaScript 的應用程式——在當時，這種「重前端」的專案其實還很少見。

他的背景是 Ruby，卻被迫每天寫 JavaScript。多數人在這種處境下會選擇忍耐，得了一種「JavaScript 斯德哥爾摩症候群」。但 Ashkenas 不一樣——他真的相信自己能修好它，然後也真的動手去做。

## 第一步：Underscore.js，補上不存在的標準函式庫

他要解決的第一個問題，是 JavaScript 根本沒有標準函式庫。

這一點在 2009 年很關鍵。當時 Firefox 已經支援了一些陣列輔助方法，像是 `map`、`reduce`、`forEach`；但 Internet Explorer 還沒有。也就是說，除非你自己寫 polyfill，否則根本不能安心使用這些方法。

為了解決這件事，Ashkenas 發布了 **Underscore.js**——一個「工具腰帶」型的函式庫，收錄了大約 60 個輔助函式，讓處理陣列與物件變得容易許多。

以今天的標準看，這聽起來一點都不刺激。但在那個開發網頁極其痛苦的年代，Underscore 實實在在幫了很多人。它後來紅到一個程度：許多功能被直接吸收進 JavaScript 語言本身——最終反而讓 Underscore 自己變得多餘。這其實是開源工具最好的結局之一。

## 第二步：CoffeeScript，乾脆換一種語言

Underscore 只是 Ashkenas 的第一發。

他接著想：與其用一個新函式庫去「修補」JavaScript，不如直接做一個全新的語言，給自己更大的自由度。於是有了 **CoffeeScript**——一個會編譯成 JavaScript 的語言。

要理解這個決定，必須記得 2009 年的 JavaScript 有多不一樣：

- **沒有 class。** 繼承得靠一種手動模式——把屬性掛到每個函式都能存取的隱藏物件 `prototype` 上。
- **變數宣告的作用域規則很詭異。** 宣告會被 hoist 到函式頂端，不管你有沒有意識到。
- **相等運算子（equality）與嚴格相等運算子（identity）的差別沒人真的搞懂或在意。** 於是到處都在發生你沒察覺的 type coercion。
- **連定義一個簡單函式，都得每次乖乖打出 `function` 這個字。** 程式碼因此又臭又長。

透過「編譯成 JavaScript」這個做法，Ashkenas 得以繞過整條漫長的路徑：他不必等標準委員會，也不必等各家瀏覽器廠商跟上，就能自己把語言修好。更棒的是，他可以把 JavaScript 那些糟糕的部分，留在 Brendan Eich 當年那 10 天的房間裡，不帶出來。

```mermaid
flowchart LR
    A[你寫的 CoffeeScript] --> B[編譯器]
    B --> C[產出的 JavaScript]
    C --> D[瀏覽器執行]
```

這個思路的核心，是「不與現況正面對抗，而是在它之上疊一層」——你保留 JavaScript 的執行環境與相容性，只換掉開發者實際要寫的那一層語法。

## CoffeeScript 曾經無所不在

有一段時間，CoffeeScript 非常火。

Rails 之父 **DHH** 幾乎是一夜之間就採用了它。2011 年，CoffeeScript 作為預設的 JavaScript 預處理器，隨 **Rails 3.1** 一起出貨——這意味著當時全世界每一個新建立的 Rails 專案，前端預設都是用 CoffeeScript 寫的。

GitHub、Dropbox，以及一長串 2010 年代初期的新創公司，也都採用了它。有那麼幾年，它幾乎是預設的選擇。

## 小結

JavaScript 的翻身，從來不是靠某一次語言層級的官方升級一步到位。它是一群人在最低谷時，用工具、用新語言、用一套「這東西值得認真對待」的態度慢慢累積出來的。

Jeremy Ashkenas 不在 JavaScript 的起源故事裡，但他在它的救贖故事裡。Underscore.js 幫大家撐過了沒有標準函式庫的年代，並把好用的模式一路推進到語言本身；CoffeeScript 則示範了一件更重要的事——當現有工具爛到不行時，你不一定要坐等別人修，你可以自己在上面疊一層，先把日子過好。

## 參考資料

- [The forgotten developer who saved JavaScript...](https://www.youtube.com/watch?v=JfPWbttemYE)
