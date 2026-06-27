---
title: "被遺忘的開發者如何拯救 JavaScript：Douglas Crockford 與 JSON 的故事"
date: 2026-05-31T08:57:39.266Z
category: tech
tags: ["javascript", "json", "web", "history", "open-source"]
lang: zh-TW
tldr: "Douglas Crockford 不是創造 JavaScript 的人，但他可能是讓 JavaScript 從一個被嘲笑的腳本語言變成現代 web 基礎的最關鍵貢獻者：他發現了 JSON、創造了 JSLint、寫了《JavaScript: The Good Parts》——一本讓開發者理解 JavaScript 其實有好的那一面的書。"
description: "Douglas Crockford 如何透過 JSON 規範、JSLint 和《JavaScript: The Good Parts》改變了 JavaScript 的命運：從一個被專業開發者嘲笑的玩具語言，到現代 web 開發的核心技術。"
type: explainer
original_url: "https://www.youtube.com/watch?v=JfPWbttemYE"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260615_200504_126658.mp3"
---

Brendan Eich 在 1995 年 10 天內創造了 JavaScript，這個故事大家都知道。但有一個更少被提及的故事：在 JavaScript 誕生後的最初十年，它基本上被嚴肅的開發者視為一個玩具。

改變這個局面的，不是語言本身的升級，而是一個人的作品。

## TL;DR

Douglas Crockford 是 Yahoo! 的架構師，他做了三件讓 JavaScript 起死回生的事：(1) 在 2001 年「發現」了 JSON 格式並正式化了它，讓 web API 從 XML 的噩夢中解脫出來；(2) 創造了 JSLint，第一個讓 JavaScript 有代碼品質標準的工具；(3) 在 2008 年出版了《JavaScript: The Good Parts》，展示了在那些糟糕部分之下，JavaScript 其實有一個優雅的核心。

## 是什麼

Douglas Crockford 是一位從 1980 年代就開始寫軟體的工程師，2000 年代在 Yahoo! 擔任 JavaScript Architect。他不是 JavaScript 的創造者，但他是讓 JavaScript 被嚴肅對待的人。

在 2000 年代初期，JavaScript 的聲譽很差。它充斥著設計缺陷：`==` 和 `===` 的混亂、`this` 的不可預測行為、全域命名空間汙染、缺少模組系統。很多後端開發者把它當成「初學者語言」，能不用就不用。

## 為什麼重要

### JSON 的誕生

2001 年，Crockford 需要一個讓瀏覽器和伺服器能夠互相傳遞資料的方式。當時的標準做法是 XML + SOAP，但那個組合的實作成本和解析複雜度讓他覺得荒謬。

他注意到 JavaScript 的物件字面量語法（`{key: value}`）本身就是一個完美的資料格式——易讀、輕量、而且每個 JavaScript 環境都能原生解析。他申請了 `json.org` 域名，寫下了這個格式的完整規範，然後推廣它。

2006 年，JSON 正式成為 IETF RFC 4627 標準。

今天，JSON 是幾乎所有 web API 的預設資料格式。你每天都在使用它，不管是 RESTful API、設定檔還是前後端通訊。Crockford 沒有發明 JSON 的語法（它就是 JavaScript 物件字面量），但他正式化了它，並讓整個產業接受了它。

### JSLint：讓 JavaScript 有了品質標準

2002 年，Crockford 發布了 JSLint——一個靜態分析工具，掃描 JavaScript 程式碼並標出可能的錯誤和不良實踐。

他的描述很有名：「JSLint 會傷害你的感情。」因為它非常嚴格，幾乎任何「隨手寫」的 JavaScript 都會被它挑出一堆問題。

但這正是它的價值所在：在 JSLint 之前，JavaScript 沒有任何靜態分析工具，沒有代碼風格標準，整個生態系是「能跑就好」的狀態。JSLint 是第一個強制說「JavaScript 可以有品質標準」的工具。今天的 ESLint 是 JSLint 的精神後繼者。

### 《JavaScript: The Good Parts》：一本改變認知的書

2008 年，Crockford 出版了一本只有 176 頁的書，標題是《JavaScript: The Good Parts》。

這本書的核心論點，用 Crockford 自己的話說，是「21 世紀最重要的發現之一」——JavaScript 裡面其實有一個設計良好的語言，但它被大量糟糕的設計決定包圍著。如果你選擇只使用那些「好的部分」（原型繼承、閉包、函式式特性），JavaScript 是一個優雅的語言。

這個觀點在當時是真正的異端——大多數人的看法是「JavaScript 整個語言都很糟糕」。Crockford 說不，問題是你用錯了它。

這本書改變了一整個世代開發者看待 JavaScript 的方式，也是 JavaScript 被嚴肅對待的文化起點。

## 跟 Brendan Eich 的差別

Brendan Eich 創造了 JavaScript，這無可爭議。但他的貢獻是在語言存在的前 10 年被大量負面評價所掩蓋的。

Crockford 的貢獻是在那個低谷期，用工具和論述重新定義了「什麼是好的 JavaScript」，為後來 Node.js、V8 引擎、npm 生態系的爆發打好了文化基礎。

如果沒有 Crockford 的 JSON 規範，web API 現在可能還在用 XML。如果沒有 JSLint 和《The Good Parts》，JavaScript 可能要等更久才能被後端開發者嚴肅對待。

## 小結

Douglas Crockford 不在 JavaScript 的起源故事裡，但他在 JavaScript 的救贖故事裡。

這個故事的另一層意義是：有時候語言或技術的成功不取決於它的原始設計，而取決於有沒有人花時間整理它的使用方式、建立它的最佳實踐、並且說出「它值得被認真對待」。

## 參考資料

- [Douglas Crockford - Wikipedia](https://en.wikipedia.org/wiki/Douglas_Crockford)
- [Big Thinkers: Douglas Crockford – The Man Behind JSON and JSLint](https://build5nines.com/big-thinkers-douglas-crockford-the-man-behind-json-and-jslint/)
- [When Was JSON Invented? Complete History & Timeline](https://www.merge-json-files.com/blog/when-json-was-invented-and-who-invented-it)
- [The forgotten developer who saved JavaScript...](https://www.youtube.com/watch?v=JfPWbttemYE)
