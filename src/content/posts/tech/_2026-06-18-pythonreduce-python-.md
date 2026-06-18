---
title: "Python 高階函數的 reduce 用法"
date: 2026-06-18T03:51:49.631Z
category: tech
tags: ["Python", "高階函數", "reduce", "科技", "工具"]
lang: zh-TW
tldr: "了解 Python 高階函數的 reduce 用法"
description: "了解 Python 高階函數的 reduce 用法"

type: explainer
original_url: "https://www.youtube.com/shorts/1Ytv1b7CN1E"
draft: true
---

**使用 Python 高階函數的 reduce 用法，提升程式碼效率**

## TL;DR
使用 Python 的 `reduce` 函數可以簡化迭代運算，提升程式碼效率。

## 是什麼
`reduce` 是 Python 的一種高階函數，屬於 `functools` 模組的一部分。它可以將一個可迭代的物件（如列表、元組等）中的元素進行累積運算，返回一個單一值。

## 為什麼重要
在程式設計中，經常需要對資料進行迭代運算，例如累加、累乘等。使用 `reduce` 函數可以簡化這些運算，減少程式碼的複雜度，提高可讀性。

## 怎麼運作
`reduce` 函數的運作原理如下：

```mermaid
graph LR
    A[可迭代物件] -->|迭代|> B[函數]
    B -->|累積運算|> C[結果]
```

使用 `reduce` 函數的基本語法如下：

```python
from functools import reduce

def add(x, y):
    return x + y

numbers = [1, 2, 3, 4, 5]
result = reduce(add, numbers)
print(result)  # 輸出：15
```

在這個範例中，`add` 函數是累積運算的函數，`numbers` 是可迭代物件，`reduce` 函數會將 `numbers` 中的元素依次傳入 `add` 函數，最後返回累積運算的結果。

## 跟 `for` 迴圈的差別
`reduce` 函數和 `for` 迴圈都可以用來進行迭代運算，但是 `reduce` 函數更為高效和簡潔。以下是兩者的比較：

|  | `reduce` 函數 | `for` 迴圈 |
| --- | --- | --- |
| 語法 | `reduce(函數, 可迭代物件)` | `for 變數 in 可迭代物件:` |
| 運作原理 | 累積運算 | 迭代賦值 |
| 效率 | 高 | 低 |
| 可讀性 | 高 | 低 |

## 小結
`reduce` 函數適用於需要進行累積運算的場景，例如累加、累乘等。它可以簡化程式碼，提高效率和可讀性。當需要進行迭代運算時，建議使用 `reduce` 函數。

## 參考資料
* [Python 官方文件 - functools.reduce](https://docs.python.org/3/library/functools.html#functools.reduce)
* [W3Schools - Python functools.reduce() 函數](https://www.w3schools.com/python/ref_func_reduce.asp)
- [Python高阶函数的reduce用法   #python #编程 #程序 #计算机 #代码](https://www.youtube.com/shorts/1Ytv1b7CN1E)