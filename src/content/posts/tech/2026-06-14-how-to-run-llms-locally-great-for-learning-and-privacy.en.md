---
title: "Running LLMs Locally with Ollama: A Getting-Started Guide"
date: 2026-06-14T09:50:35.451Z
category: tech
tags: ["llm", "ollama", "local-inference", "privacy", "ai-tools"]
lang: en
tldr: "Running an LLM locally with Ollama is simpler than you think: one line to install, one line to pull a model, one line to chat. This guide takes you from install to a working local RAG pipeline."
description: "Complete guide to running LLMs locally with Ollama: installation, model selection (Llama 3, Gemma, Mistral), hardware requirements, OpenAI-compatible API setup, and a working local RAG example."
type: how-to
original_url: "https://www.youtube.com/watch?v=U8lGbSaCCYI"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260615_202921_855700.mp3"
---

Three reasons to run an LLM locally: **privacy** (sensitive data stays on your machine), **learning** (interact with model behavior directly, no API abstraction layer), and **cost** (hardware is upfront; inference is free after).

The tooling has matured significantly. Ollama is the easiest local LLM runtime to get started with.

## TL;DR

1. Install Ollama (one command)
2. Pull a model (`ollama pull llama3.2`)
3. Chat in terminal (`ollama run llama3.2`)
4. Or use the REST API in your own code

Hardware requirement: 8GB RAM handles 3B/7B quantized models; 16GB+ for smooth 8B–14B. No GPU required—just slower.

## Prerequisites

### Hardware

| RAM | Models | Speed |
|-----|--------|-------|
| 8 GB | 3B (Llama 3.2 3B, Gemma 2 2B) | Smooth |
| 16 GB | 7B–8B (Llama 3.2 8B, Mistral 7B) | Acceptable |
| 32 GB | 14B (Qwen2.5 14B) | Smooth |
| 64 GB+ | 30B–70B | Model-dependent |

GPU acceleration: Ollama auto-detects NVIDIA CUDA, Apple Metal, and AMD ROCm. With GPU: 10–50x faster. Without: CPU inference works, just slower.

### OS

macOS, Linux, Windows (native or WSL2) all supported.

## Install Ollama

**macOS / Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**macOS (Homebrew):**
```bash
brew install ollama
```

**Windows:** Download the installer at ollama.com.

Verify:
```bash
ollama --version
```

## Pull and Run a Model

```bash
# 3B model, ~2GB, good for testing
ollama pull llama3.2

# 8B model, ~5GB, meaningfully better quality
ollama pull llama3.2:8b

# Better multilingual support
ollama pull qwen2.5:7b
```

Chat interactively:
```bash
ollama run llama3.2
# >>> What is Zero-Copy in Kafka?
# Zero-Copy is a technique where...
# >>> /bye
```

Type `/bye` or Ctrl+D to exit.

## Use the REST API

Ollama runs an OpenAI-compatible REST API at `http://localhost:11434`:

```bash
# Start Ollama (usually auto-starts after install)
ollama serve
```

**cURL:**
```bash
curl http://localhost:11434/api/generate \
  -d '{
    "model": "llama3.2",
    "prompt": "Explain Zero-Copy in one paragraph",
    "stream": false
  }'
```

**Python with OpenAI SDK (drop-in replacement):**
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # any string—Ollama doesn't validate
)

response = client.chat.completions.create(
    model="llama3.2",
    messages=[{"role": "user", "content": "Explain Kafka's partition model"}]
)
print(response.choices[0].message.content)
```

This lets you swap OpenAI API calls for local Ollama by changing only `base_url`.

## Model Selection

| Model | Size | Best For |
|-------|------|---------|
| `llama3.2:3b` | ~2GB | Quick tests, low-RAM machines |
| `llama3.2:8b` | ~5GB | General purpose, best value |
| `qwen2.5:7b` | ~5GB | Chinese text, multilingual |
| `mistral:7b` | ~4GB | English reasoning, code |
| `codellama:7b` | ~4GB | Code generation |
| `nomic-embed-text` | ~300MB | Text embeddings (RAG) |

```bash
ollama list   # show downloaded models
ollama rm llama3.2  # delete a model
```

## Complete Example: Local RAG Pipeline

Combine Ollama embeddings and generation for a fully offline RAG setup:

```python
import ollama
import numpy as np

def embed(text: str) -> list[float]:
    return ollama.embeddings(model="nomic-embed-text", prompt=text)["embedding"]

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# Local knowledge base
documents = [
    "Kafka uses sequential I/O to achieve high throughput",
    "Zero-Copy sends data from disk to NIC without CPU involvement",
    "Ollama lets you run open-source LLMs locally",
]

doc_embeddings = [embed(doc) for doc in documents]

# Query
query = "How does Kafka achieve performance?"
query_embedding = embed(query)

# Find most relevant document
scores = [cosine_similarity(query_embedding, de) for de in doc_embeddings]
best_doc = documents[np.argmax(scores)]

# Generate answer
response = ollama.generate(
    model="llama3.2",
    prompt=f"Based on the following, answer the question:\n\nContext: {best_doc}\n\nQuestion: {query}"
)
print(response["response"])
```

## Common Issues

**Model is slow?**
- Check GPU usage: `ollama ps` shows the GPU column
- Apple Silicon: Metal acceleration is on by default
- NVIDIA: ensure CUDA drivers are installed

**Garbled output or poor quality?**
- Quantized versions (`q4_0`) have lower precision; try a less-quantized variant
- For Chinese text, `qwen2.5` series has better support

**Multi-user Ollama server?**
- Ollama handles concurrent requests
- GPU memory is shared; running multiple large models simultaneously may OOM

## References

- [Running LLMs Locally—Great for Learning and Privacy](https://www.youtube.com/watch?v=U8lGbSaCCYI)
- [Ollama](https://ollama.com)
- [Ollama model library](https://ollama.com/library)
- [Ollama REST API docs](https://github.com/ollama/ollama/blob/main/docs/api.md)
