---
title: "在本機跑 LLM：用 Ollama 五分鐘起步"
date: 2026-06-14T09:50:35.451Z
category: tech
tags: ["LLM", "Ollama", "本地推論", "隱私", "AI工具"]
lang: zh-TW
tldr: "用 Ollama 在本機跑 LLM 比你想像的簡單：一行安裝、一行下載模型、一行啟動。本文從安裝到實際使用，帶你跑起第一個本地 LLM。"
description: "完整的本機 LLM 入門指南：Ollama 安裝、模型選擇（Llama 3、Gemma、Mistral）、硬體需求、OpenAI-compatible API 設定，以及本機推論的實際限制。"
type: how-to
original_url: "https://www.youtube.com/watch?v=U8lGbSaCCYI"
draft: false
---

為什麼要在本機跑 LLM？主要有三個理由：**隱私**（敏感資料不出去）、**學習**（直接摸模型的行為，不隔著 API 抽象層）、**成本**（硬體 upfront，後續零 token 費用）。

工具生態已經很成熟，Ollama 是目前最容易上手的本地 LLM runtime。

## TL;DR

1. 安裝 Ollama（一行指令）
2. 下載模型（`ollama pull llama3.2`）
3. 在 terminal 跑（`ollama run llama3.2`）
4. 或用 REST API 整合進自己的程式

硬體需求：8GB RAM 跑得了 3B/7B 量化模型，16GB+ 才順跑 8B–14B。沒有 GPU 也能用，只是慢。

## 前置條件

### 硬體

| RAM | 可跑模型 | 速度體感 |
|-----|---------|---------|
| 8 GB | 3B（Llama 3.2 3B、Gemma 2 2B） | 流暢 |
| 16 GB | 7B–8B（Llama 3.2 8B、Mistral 7B） | 還可以 |
| 32 GB | 14B（Qwen2.5 14B、Llama 3.1 8B Q8） | 流暢 |
| 64 GB+ | 30B–70B | 視模型而定 |

GPU 加速：Ollama 自動偵測並使用 GPU（NVIDIA CUDA、Apple Metal、AMD ROCm）。有 GPU 的話，速度快 10–50 倍。沒有也能跑，用 CPU 推論。

### 作業系統

macOS、Linux、Windows（需 WSL2 或原生安裝）都支援。

## 安裝 Ollama

**macOS / Linux：**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**macOS（Homebrew）：**
```bash
brew install ollama
```

**Windows：** 到 ollama.com 下載安裝包。

安裝後確認：
```bash
ollama --version
# ollama version 0.x.x
```

## 下載並執行模型

下載模型（會自動下載量化版本）：
```bash
# 3B 模型，~2GB，適合測試
ollama pull llama3.2

# 8B 模型，~5GB，品質明顯提升
ollama pull llama3.2:8b

# 繁體中文能力不錯的選項
ollama pull qwen2.5:7b
```

直接在 terminal 互動：
```bash
ollama run llama3.2
# >>> 你好！
# 你好！我可以如何幫助你今天？
# >>> /bye
```

輸入 `/bye` 或按 Ctrl+D 結束對話。

## 用 REST API 整合進程式

Ollama 啟動後會在 `http://localhost:11434` 提供 OpenAI-compatible REST API：

```bash
# 啟動 Ollama server（通常安裝後會自動啟動）
ollama serve
```

**cURL 測試：**
```bash
curl http://localhost:11434/api/generate \
  -d '{
    "model": "llama3.2",
    "prompt": "解釋什麼是 Zero-Copy",
    "stream": false
  }'
```

**Python + OpenAI SDK（直接切換 base_url）：**
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # 任意字串，Ollama 不驗證
)

response = client.chat.completions.create(
    model="llama3.2",
    messages=[
        {"role": "user", "content": "解釋什麼是 Kafka 的 Zero-Copy？"}
    ]
)
print(response.choices[0].message.content)
```

這讓你可以把原本用 OpenAI API 的程式，換成本地 Ollama，只需改 `base_url`。

## 常用模型推薦

| 模型 | 大小 | 適合用途 |
|------|------|---------|
| `llama3.2:3b` | ~2GB | 快速測試、低硬體需求 |
| `llama3.2:8b` | ~5GB | 一般用途，CP 值高 |
| `qwen2.5:7b` | ~5GB | 中文能力較好 |
| `mistral:7b` | ~4GB | 英文推理、程式碼 |
| `codellama:7b` | ~4GB | 程式碼生成 |
| `nomic-embed-text` | ~300MB | 文字嵌入（RAG 用） |

查看已下載的模型：
```bash
ollama list
```

刪除模型：
```bash
ollama rm llama3.2
```

## 完整範例：本機 RAG pipeline

結合 Ollama 的 embedding 和 generate，可以在完全離線的環境做 RAG：

```python
import ollama
import numpy as np

def embed(text: str) -> list[float]:
    return ollama.embeddings(model="nomic-embed-text", prompt=text)["embedding"]

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# 建立小型本地知識庫
documents = [
    "Kafka 使用循序 I/O 達到高吞吐量",
    "Zero-Copy 讓資料從磁碟直接送到網路卡",
    "Ollama 讓你在本機跑開源 LLM",
]

doc_embeddings = [embed(doc) for doc in documents]

# 查詢
query = "Kafka 為什麼快？"
query_embedding = embed(query)

# 找最相關的文件
scores = [cosine_similarity(query_embedding, de) for de in doc_embeddings]
best_doc = documents[np.argmax(scores)]

# 生成回答
response = ollama.generate(
    model="llama3.2",
    prompt=f"根據以下資料回答問題：\n\n資料：{best_doc}\n\n問題：{query}"
)
print(response["response"])
```

## 常見問題

**模型跑很慢怎麼辦？**
- 確認 Ollama 是否有用到 GPU：`ollama ps` 看 GPU 欄位
- Apple Silicon：Metal 加速預設啟用，不需另外設定
- NVIDIA：確認 CUDA drivers 已安裝

**模型回答出現亂碼或奇怪輸出？**
- 量化版本（`q4_0`、`q8_0`）精度較低，試試非量化版本
- 中文輸出推薦用 `qwen2.5` 系列，繁體中文支援更好

**能不能多人共用一個 Ollama server？**
- 可以，Ollama 支援多個 concurrent request
- 但 GPU 記憶體是共用的，同時跑多個大模型可能 OOM

## 參考資料

- [在本地運行大型語言模型（LLM）](https://www.youtube.com/watch?v=U8lGbSaCCYI)
- [Ollama 官方網站](https://ollama.com)
- [Ollama 支援的模型列表](https://ollama.com/library)
- [Ollama REST API 文件](https://github.com/ollama/ollama/blob/main/docs/api.md)
