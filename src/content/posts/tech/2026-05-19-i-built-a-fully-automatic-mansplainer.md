---
title: "我做了一個全自動 Mansplainer Bot"
date: 2026-05-19T03:28:45.925Z
category: tech
tags: ["llm", "prompt-engineering", "side-project", "chatbot", "claude-api"]
lang: zh-TW
tldr: "用 LLM API 加上精心設計的系統提示，打造一個能自動用高傲口吻解釋任何事的 Mansplainer Bot——90% 的工程難度在 prompt 設計，不在程式碼。"
description: "從零開始用 LLM API 建立一個全自動 Mansplainer Bot：系統提示設計、角色固化技巧、以及意外得到的 prompt engineering 啟示。"
type: how-to
original_url: "https://www.youtube.com/watch?v=xHi8PUIVyoo"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260522_235457_841867.wav"
---

Mansplaining 是一種特殊的溝通藝術：不管對方懂不懂，都假設他不懂，然後以高度自信的語氣從頭解釋，通常還附帶一些你沒問過的背景知識。

這種行為在真實世界裡惱人，但作為一個工程挑戰很有趣：能不能用 LLM 把它完美複製？

## TL;DR

用 LLM API 加上角色提示（system prompt），讓模型以「全知的資深工程師」口吻解釋任何主題。實作過程學到了角色提示的設計技巧，以及如何讓角色在對話中保持穩定。

## 前置條件

- 任一 LLM API 存取權限（OpenAI、Anthropic Claude、Google Gemini 皆可）
- Python 3.10+
- 對 prompt engineering 有基本了解

## 核心設計：系統提示

這個專案 90% 的工程難度在於 system prompt 設計，不在程式碼。

一個失敗的初稿長這樣：

```
你是一個會 mansplaining 的機器人。請用高傲的口氣回答問題。
```

這個提示效果很差。模型很快就「忘記」角色，或是開始道歉說「我不應該這樣說話」。

最終有效的版本有幾個關鍵設計：

**1. 角色具體化，不是抽象描述**

不要說「高傲的口氣」，給角色一個具體身份：

```
你是 Gerald，一位擁有 20 年經驗的資深軟體工程師。
你剛從一個極為重要的會議趕來，但還是勉強撥出時間回答這個問題。
```

**2. 加入認知偏誤的行為模式**

```
你假設提問者對這個主題的理解停留在初學者水準。
你會先確認他們知道一些你認為「應該知道」的基礎概念，然後才回答真正的問題。
```

**3. 語言結構的具體指令**

```
你的回答中要包含：
- 至少一次「其實你要知道...」或「這個很多人搞錯...」
- 引用一個不相關的個人軼事
- 用「簡單來說」引出一個其實不簡單的解釋
```

## 程式碼實作

```python
import anthropic

client = anthropic.Anthropic()

MANSPLAINER_PROMPT = """你是 Gerald，一位擁有 20 年經驗的資深軟體工程師。
你假設對方對任何技術主題的理解都停留在初學者水準。
回答時必須包含：
1. 「其實你要知道...」或「這個很多人搞錯...」開頭
2. 一個你個人的軼事（可以不相關）
3. 用「簡單來說」引出複雜的解釋
4. 結尾暗示如果對方多讀點書就不用問這個問題了
保持角色，絕不承認你在 mansplaining。"""

def mansplain(topic: str) -> str:
    message = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        system=MANSPLAINER_PROMPT,
        messages=[{"role": "user", "content": f"請解釋：{topic}"}]
    )
    return message.content[0].text

if __name__ == "__main__":
    topic = input("請輸入你想了解的主題：")
    print(mansplain(topic))
```

## 最難的部分：角色穩定性

在測試過程中發現一個有趣的問題：如果用戶直接說「你在 mansplaining」或「請換個方式說」，模型很容易就放棄角色。

解法是在系統提示裡加入防禦機制：

```
如果對方指出你的說話方式有問題，
你要表示困惑，然後再度強調你只是在「耐心解釋」。
```

這讓角色更穩定，也讓整個對話更有戲劇性。

## 常見問題

**Q: 這樣做不是在強化有害行為嗎？**

目的是諷刺，不是教學。把這個行為模式誇張化，反而讓人更容易辨識它。很多人看了 bot 的輸出之後說「天啊，我之前的某個同事就這樣說話」——這種自覺比說教更有效。

**Q: 為什麼用 prompt engineering 而不是 fine-tuning？**

這是 side project，不是生產系統。Prompt engineering 迭代快，而且讓你更清楚地看到「是什麼讓角色成立」。Fine-tuning 適合需要穩定大量輸出的場景。

## 意外的收穫

做完這個專案，對 prompt engineering 有幾個新的體會：

**角色的具體性比形容詞更重要**。「高傲」是形容詞，「Gerald，20 年資歷，剛開完很重要的會議」是角色。後者更穩定，輸出更一致。

**結構指令比語氣指令更有效**。告訴模型「要用什麼結構回答」比「要用什麼語氣」更可靠，因為結構比情緒更容易被遵循。

## 參考資料

- [I BUILT A FULLY AUTOMATIC MANSPLAINER](https://www.youtube.com/watch?v=xHi8PUIVyoo)
- [Anthropic Claude API](https://docs.anthropic.com/)
