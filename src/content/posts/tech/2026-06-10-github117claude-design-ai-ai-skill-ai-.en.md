---
title: "GitHub Hot Projects #117: Design Tools, AI Context Compression, English Learning, Build-Your-Own AI"
date: 2026-06-10T12:27:07.655Z
category: tech
tags: ["GitHub", "open source", "AI", "design tools", "developer tools"]
lang: en
tldr: "This week's GitHub trending picks: Penpot as an open-source Figma alternative, LLMLingua for prompt compression, an AI aesthetics prompt course, FSRS-based spaced repetition for language learning, and Andrej Karpathy's nanoGPT."
description: "GitHub open-source weekly roundup #117: five projects worth an engineer's attention—covering design tooling, AI context optimization, prompt engineering, language learning, and building LLMs from scratch."
type: listicle
original_url: "https://www.youtube.com/watch?v=Oruwe_eBbfw"
draft: false
---

Weekly GitHub Trending, filtered for engineers. Issue #117 spans design, AI toolchain, language learning, and AI education—something for frontend designers, AI engineers, and developers who want to understand models at a deeper level.

## TL;DR

Five projects this week: Penpot (open-source Figma alternative), LLMLingua (LLM context compression), an AI aesthetics prompt course, an FSRS-powered language learning tool, and nanoGPT for building GPT from scratch.

---

## 1. Penpot: Open-Source Figma Alternative

**GitHub:** [penpot/penpot](https://github.com/penpot/penpot)

Adobe's 2022 Figma acquisition attempt (blocked on regulatory grounds) accelerated demand for open-source design tooling. Penpot is the most complete option currently.

**Why it matters:**
- Fully web-based (Clojure/ClojureScript), self-hostable
- Native SVG format (not proprietary)—your design files are genuinely portable
- Supports design tokens, component libraries, prototype flows
- Self-host with a single `docker-compose up`

```bash
git clone https://github.com/penpot/penpot
cd penpot
docker-compose -p penpot -f docker/images/docker-compose.yaml up -d
```

**vs. Figma:** Plugin ecosystem is smaller, but for teams that want data sovereignty or don't want Adobe involvement, Penpot is now a viable option.

---

## 2. LLMLingua: AI Context Compression

**GitHub:** [microsoft/LLMLingua](https://github.com/microsoft/LLMLingua)

Context windows keep growing, but so do token costs and latency. LLMLingua (Microsoft Research) solves: **compress your prompt without significantly degrading output quality.**

**How it works:** A small language model (e.g., Llama 2 7B) scores each token in the prompt for information density, removes low-value tokens, and produces a compressed version.

**Reported results:**
- Up to 20x compression ratio (1000 tokens → 50 tokens)
- Under 5% quality loss on reasoning benchmarks (GSM8K)
- Best results on RAG-retrieved context with a lot of redundancy

```python
from llmlingua import PromptCompressor

llm_lingua = PromptCompressor("microsoft/llmlingua-2-bert-base-multilingual-cased-meetingbank")
compressed = llm_lingua.compress_prompt(
    context,
    instruction=instruction,
    question=question,
    target_token=200,
)
print(compressed["compressed_prompt"])
```

If your RAG pipeline produces long retrieved contexts before sending to an LLM, LLMLingua plugs in cleanly between retrieval and generation.

---

## 3. AI Aesthetics Prompt Engineering Course

**Type:** Educational GitHub repo

A course on producing visually compelling output from AI image generators (Midjourney, DALL-E, Stable Diffusion) trended this week. Written for designers and engineers who want results, not magic-word tutorials.

**Topics covered:**
- **Style references**: using reference images, color palettes, and artist names to guide generation style
- **Negative prompts**: explicitly excluding unwanted elements (blur, overexposure, cartoon style)
- **CFG Scale and Sampling Steps** in Stable Diffusion: the creativity vs. fidelity dial
- **Inpainting and Outpainting**: local edits and image extension

Written for technically-minded readers who want to understand what the parameters actually do.

---

## 4. FSRS: Smarter Spaced Repetition for Language Learning

**Type:** Learning tool

A language learning tool built on FSRS 4.5 (Free Spaced Repetition Scheduler) trending over Anki-based alternatives this week.

**FSRS vs. SM-2 (Anki's classic algorithm):**
- SM-2 uses a fixed forgetting curve model
- FSRS uses ML to learn your personal forgetting curve from your actual review history
- Same retention, fewer reviews—reported reduction of ~20–30% in daily review load

**To use FSRS in Anki today** (no extra plugin needed since Anki 23.10+):
`Tools → Preferences → Review → Scheduler → FSRS`

---

## 5. nanoGPT: Build GPT from Scratch

**GitHub:** [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT)

Andrej Karpathy's (former Tesla AI Director, OpenAI co-founder) teaching repo: implement a working GPT-2 in ~300 lines of PyTorch. Paired with his YouTube series "Let's Build GPT from Scratch"—the best resource for understanding Transformers at the implementation level.

**Why it keeps trending:**
- Extremely clean code, no unnecessary abstractions—read it and you understand what attention actually does
- Trainable on a MacBook (small version, minutes)—no GPU farm required
- Karpathy explains math in terms of intuition, not formulas

**Learning path:**
1. nanoGPT → GPT architecture
2. [micrograd](https://github.com/karpathy/micrograd) → backpropagation
3. [llm.c](https://github.com/karpathy/llm.c) → GPU performance (C implementation)

---

## Trend Signal

These five projects map to five distinct engineer needs: data-sovereign design tooling, lower token costs, better AI aesthetics output, more efficient language learning, and understanding LLMs at the implementation level.

GitHub Trending is a decent market signal: many people solving the same problem at the same time usually means an industry pain point is getting attention.

## References

- [GitHub Hot Projects Weekly #117](https://www.youtube.com/watch?v=Oruwe_eBbfw)
- [Penpot](https://github.com/penpot/penpot)
- [LLMLingua — Microsoft Research](https://github.com/microsoft/LLMLingua)
- [nanoGPT — Andrej Karpathy](https://github.com/karpathy/nanoGPT)
- [FSRS spaced repetition](https://github.com/open-spaced-repetition/fsrs4anki)
