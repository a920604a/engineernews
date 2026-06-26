---
title: "Python functools.reduce 到底什麼時候該用？"
date: 2026-06-18T03:51:49.631Z
category: tech
tags: ["python", "higher-order-functions", "functools", "programming", "tools"]
lang: zh-TW
tldr: "reduce() 不是讓程式碼「更有效率」，而是讓累積運算更具聲明式風格——但 Python 官方其實不太鼓勵你用它"
description: "深入解析 Python functools.reduce：它真正的用途、與 for 迴圈和 list comprehension 的差異，以及 Guido van Rossum 為什麼把它從內建函數移出去"
type: explainer
original_url: "https://www.youtube.com/shorts/1Ytv1b7CN1E"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260620_083402_120522.mp3"
---

`reduce()` 是 Python 裡一個有趣的函數——它存在、有人在用，但 Python 之父 Guido van Rossum 卻曾公開說他「幾乎不用它」，並且在 Python 3 把它從內建函數移到了 `functools` 模組。這個故事本身就值得思考一下。

## TL;DR

`reduce(f, iterable)` 把一個二元函數反覆套用在一個序列上，將它「折疊」成單一值。它在函數式編程背景下很自然，但在 Python 裡幾乎都有更可讀的替代方案。知道它怎麼運作，選擇性地使用它。

## 是什麼

`reduce` 來自 `functools` 模組，語法如下：

```python
from functools import reduce

reduce(function, iterable[, initializer])
```

它的運作邏輯：把序列的前兩個元素傳給 `function`，得到結果，再把結果和第三個元素傳給 `function`，依此類推，直到整個序列只剩一個值。

最基本的例子，累加：

```python
from functools import reduce

numbers = [1, 2, 3, 4, 5]
total = reduce(lambda x, y: x + y, numbers)
# 過程：((((1+2)+3)+4)+5) = 15
print(total)  # 15
```

加上 `initializer`（初始值）：

```python
product = reduce(lambda x, y: x * y, [1, 2, 3, 4], 10)
# 過程：((((10*1)*2)*3)*4) = 240
print(product)  # 240
```

initializer 有兩個用途：提供空序列時的預設值，以及作為累積的起點。

## 幾個真實的使用情境

**累乘（沒有 `math.prod` 的時候）：**

```python
from functools import reduce
import operator

numbers = [2, 3, 4, 5]
product = reduce(operator.mul, numbers)  # 120
```

**巢狀字典取值（深層 key 存取）：**

```python
data = {'a': {'b': {'c': 42}}}
keys = ['a', 'b', 'c']

value = reduce(lambda d, k: d[k], keys, data)
print(value)  # 42
```

這個用法在處理任意深度的巢狀結構時比遞迴更簡潔。

**合併多個字典：**

```python
dicts = [{'a': 1}, {'b': 2}, {'c': 3}]
merged = reduce(lambda x, y: {**x, **y}, dicts)
# {'a': 1, 'b': 2, 'c': 3}
```

**函數組合（compose）：**

```python
def compose(*fns):
    return reduce(lambda f, g: lambda x: f(g(x)), fns)

double = lambda x: x * 2
add_one = lambda x: x + 1

double_then_add = compose(add_one, double)
print(double_then_add(3))  # 7
```

這個是 `reduce` 最「函數式」的用法，把多個函數串成一個 pipeline。

## 跟 for 迴圈和 list comprehension 的真正差別

先更正一個常見誤解：`reduce` **不比 `for` 迴圈快**。在 CPython 實作裡，`reduce` 本身有函數呼叫的開銷，通常比直接的 `for` 迴圈還慢一點。

差別在於**表達方式**，不在效能：

```python
# for 迴圈：命令式，清楚描述「怎麼做」
total = 0
for n in numbers:
    total += n

# reduce：聲明式，描述「這個操作的結構」
total = reduce(lambda x, y: x + y, numbers)

# 但 Python 慣用的寫法通常是：
total = sum(numbers)
```

對於簡單的累加或累乘，Python 內建函數（`sum`、`max`、`min`、`math.prod`）都比 `reduce` 更清楚。`reduce` 有意義的地方在於**那些沒有對應內建函數的累積操作**。

## Guido 為什麼不喜歡它

Python 的哲學是「應該有一種明顯的方法來做某件事」（There should be one obvious way to do it）。`reduce` 的問題是它讓簡單的累加看起來複雜，讓複雜的操作看起來神奇。

Guido 在 Python 3 把 `reduce` 移出內建函數時說：「除了 `+` 和 `*` 的情況，我需要花一點時間才能想清楚 `reduce` 在做什麼。」這是一個很誠實的反省。

## 什麼時候用，什麼時候不用

**值得用：**
- 動態組合函數（compose/pipe pattern）
- 對任意深度的巢狀結構做遍歷
- 在函數式風格的程式碼裡，搭配 `operator` 模組

**避免用：**
- 累加、累乘、最大值——用 `sum`、`math.prod`、`max`
- 建構列表——用 list comprehension
- 任何用 `for` 迴圈能清楚表達的東西

一個簡單的判斷標準：如果你需要花超過 3 秒思考 `reduce` 在做什麼，那就換成 `for` 迴圈。可讀性是 Python 最核心的價值。

## 參考資料

- [Python 官方文件 — functools.reduce](https://docs.python.org/3/library/functools.html#functools.reduce)
- [Guido van Rossum: The fate of reduce() in Python 3000](https://www.artima.com/weblogs/viewpost.jsp?thread=98196)
- [Python高阶函数的reduce用法 (YouTube Shorts)](https://www.youtube.com/shorts/1Ytv1b7CN1E)
