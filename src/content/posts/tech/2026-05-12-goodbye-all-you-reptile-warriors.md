---
title: "再見，所有的爬蟲勇士：Python 在 AI 時代的角色轉變"
date: 2026-05-12T02:51:16.245Z
category: tech
tags: ["Python", "AI", "程式語言", "開發工具", "LLM"]
lang: zh-TW
tldr: "Python 依然是 AI 開發的主力語言，但 AI 工具的普及讓「寫 Python 程式碼」和「做 AI 開發」這兩件事的界線越來越模糊——這篇文章探討 Python 在 AI 時代的定位轉變。"
description: "探討 Python 在 AI 時代的角色演變：從脫稿語言到 AI 基礎設施的主幹，以及 LLM 輔助程式開發如何改變 Python 工程師的工作方式。"
type: explainer
original_url: "https://www.youtube.com/watch?v=pa_DHVnj_uU"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260521_020917_189549.mp3"
---

「爬蟲勇士」——這是 Python 程式設計師的一個非正式稱號，因為 Python 的吉祥物是蟒蛇（Monty Python 梗），寫 Python 的人有時被戲稱為「蛇族」或「爬蟲類勇士」。而在 AI 工具鋪天蓋地的 2025 年，這個社群的工作方式正在發生根本性的改變——不是 Python 不重要了，而是「怎麼寫 Python」這件事本身在改變。

## TL;DR

- Python 仍是 AI/ML 開發最重要的語言，PyTorch、JAX、Hugging Face 生態系統完全以 Python 為核心
- 但 LLM 輔助程式開發（Cursor、GitHub Copilot、Claude Code）讓資深工程師花在寫語法的時間大幅減少，轉向系統設計和驗證
- 這改變了「Python 工程師」這個職位的意義，也改變了學習 Python 的優先順序
- 「再見爬蟲勇士」不是 Python 的終結，而是純粹靠手寫程式碼的工作方式在改變

## 是什麼

Python 自 1991 年由 Guido van Rossum 創建以來，經歷過幾個明顯的身份轉變：

1. **膠水語言時代（1990s-2000s）**：連接 C/C++ 函式庫的腳本工具
2. **Web 開發興起（2000s-2010s）**：Django、Flask 讓 Python 進入後端市場
3. **科學運算 / 資料科學（2010s）**：NumPy、Pandas、scikit-learn、Jupyter 讓 Python 成為資料科學家的標準工具
4. **深度學習時代（2016-）**：TensorFlow、PyTorch 讓 Python 成為 AI 研究的事實標準
5. **LLM 時代（2022-）**：Python 成為 LLM 應用開發的主力，同時 LLM 本身開始輔助 Python 的撰寫

## 為什麼重要

### Python 的 AI 時代地位

在 2025 年，問「AI 開發要用什麼語言」，答案幾乎一定是 Python。以下是關鍵原因：

**生態系統壟斷**：
- PyTorch（Meta AI）：主流深度學習框架
- JAX（Google）：高效數值運算，支援 TPU
- Hugging Face Transformers：LLM 的事實標準部署庫
- LangChain、LlamaIndex：RAG 和 AI Agent 框架
- vLLM、SGLang：高效能 LLM 推論服務

這些工具的 API 都是 Python 優先，部分甚至只有 Python 介面。想在 Rust 或 Go 裡直接用 PyTorch 訓練模型？你要先繞很多彎路。

**互動式開發的優勢**：
AI 開發高度依賴快速迭代——跑一個 prompt，看輸出，改一下，再跑。Jupyter Notebook 和 Python REPL 的即時執行特性非常適合這個工作流程。

### LLM 如何改變 Python 開發

這是更有趣的轉變。2025 年的 Python 工程師和 2020 年的有什麼不同？

**自動補全 → AI 結對程式設計**：
GitHub Copilot 在 2021 年出現時，大家把它當「聰明的自動補全」。但 Cursor（基於 VS Code 的 AI 編輯器）在 2024-2025 年的爆發，讓整個工作流程改變——工程師描述意圖，AI 生成完整函數甚至模組，工程師負責審查和整合。

對有足夠系統知識的工程師，生產力提升 25-50%（依 Cursor 官方數據，Fortune 500 企業導入後 PR 數量平均提升 25%，PR 大小翻倍）。

**語法知識的相對重要性下降**：
用 AI 工具寫 Python 時，你不需要記得 `functools.lru_cache` 的確切語法，你只需要知道「我需要一個 LRU 快取」，AI 會幫你寫。但你依然需要知道「什麼情況下應該用 LRU 快取、它的記憶體影響是什麼」。

換言之，底層原理和系統設計知識的重要性上升，語法記憶的重要性下降。

**Debug 和 Code Review 成為核心技能**：
AI 生成的程式碼不一定正確，而且可能看起來很有說服力但有微妙的邏輯錯誤。能快速識別 AI 幻覺、做出正確的程式碼審查，是 2025 年 Python 工程師最重要的差異化能力。

## 怎麼運作

### 現代 AI 輔助 Python 開發流程

```
描述需求（自然語言）
    ↓
AI 生成初稿（Cursor / Copilot）
    ↓
工程師審查架構設計
    ↓ 有問題
修改系統 prompt / 提供更多上下文
    ↓ 沒問題
單元測試（AI 也可以生成）
    ↓
整合與驗證
    ↓
提交 PR（AI 可生成 PR 描述）
```

### Python 在 AI 應用開發的典型架構

```python
# 典型的 LLM 應用架構（以 LangChain + FastAPI 為例）
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from fastapi import FastAPI

app = FastAPI()
llm = ChatAnthropic(model="claude-sonnet-4-6")
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一個技術文件助理"),
    ("user", "{question}")
])
chain = prompt | llm

@app.post("/ask")
async def ask(question: str):
    return {"answer": chain.invoke({"question": question}).content}
```

這個模式在 2025 年的 AI 應用開發中非常典型。Python 在這裡扮演的角色是「膠水」——把 LLM API、向量資料庫、REST 框架連接起來。

## 跟其他語言的差別

很多人預測 TypeScript 或 Rust 會取代 Python 在 AI 開發的地位：

- **TypeScript**：前端 / 全端開發者開始直接在 TS 裡呼叫 OpenAI API，Vercel AI SDK 讓這條路很順。但 ML 研究和訓練依然是 Python 的天下
- **Rust**：在 AI 推論引擎（candle、Burn）有進展，極度效能敏感的場景有優勢，但生態系統和 Python 差距很大
- **Go**：適合 AI 應用的基礎設施層（gRPC 服務、資料 pipeline），但不適合模型開發

結論：Python 的 AI 霸主地位不會在短期內動搖，但「純 Python 工程師」的定義在改變——懂 AI 工具的使用、懂系統設計，比只會寫語法更重要。

## 小結

「再見，爬蟲勇士」不是 Python 的告別演說，而是工作方式的轉型宣言。那個靠著手寫每一行程式碼來刷存在感的時代，正在讓位給「懂得指揮 AI 工具、驗證輸出、設計系統」的新型工程師。

Python 的生態系統護城河在 AI 時代反而更深——因為所有重要的 AI 框架都是 Python 優先。但「成為優秀 Python 工程師」的路徑在 2025 年已經和 2020 年不同了：更多系統思維，更少語法背誦，更多 AI 工具協作。

## 參考資料

- [Cursor 官方：AI 程式編輯器](https://cursor.com/)
- [Hugging Face Transformers 文件](https://huggingface.co/transformers/)
- [PyTorch 官方](https://pytorch.org/)
- [GitHub Copilot 效能報告](https://github.blog/2022-09-07-research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/)
- [原始影片](https://www.youtube.com/watch?v=pa_DHVnj_uU)
