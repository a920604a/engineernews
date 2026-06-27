---
title: "DeepSeek V4: 1.6 Trillion Parameter Open-Source Model Challenges GPT-5, Runs on Huawei Chips"
date: 2026-05-23T19:22:34.019Z
category: tech
tags: ["ai", "deepseek", "llm", "open-source", "china-tech"]
lang: en
tldr: "DeepSeek V4 is a 1.6T parameter MoE open-source model with 1M token context that claims to outperform GPT-5.2 on some benchmarks — and is DeepSeek's first model optimized for Huawei Ascend chips."
description: "DeepSeek V4 deep dive: 1.6 trillion parameter MoE architecture, 1M token context, Huawei Ascend optimization, and what it means for open-source AI and the US-China AI competition."
type: explainer
original_url: "https://www.youtube.com/watch?v=LpXhy2iiaQE"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260615_195144_023317.mp3"
---

On April 24, 2026 — almost exactly one year after DeepSeek-R1 shook Silicon Valley — DeepSeek released its V4 series. Bigger model, longer context, more aggressive pricing, and one technically significant detail that most coverage buried: V4 is DeepSeek's first model optimized for **Huawei Ascend chips**.

## TL;DR

DeepSeek V4 ships in two variants: **V4 Flash** (lightweight, high-speed) and **V4 Pro** (flagship). Pro is currently the largest open-weight mixture-of-experts model available, with 1.6T total parameters (49B active) and 1M token context. Pricing: V4 Flash at $0.14/M input tokens, $0.28/M output — undercutting GPT-5.4 Nano, Gemini 3.1 Flash, and Claude Haiku 4.5. Performance: V4-Pro-Max claims to outperform GPT-5.2 and Gemini 3.0 Pro on reasoning benchmarks.

## What It Is

DeepSeek V4 is a Mixture of Experts (MoE) architecture. The core idea: despite a massive total parameter count, only a subset of "expert" sub-networks activates during each inference pass. This keeps compute costs significantly lower than a comparable dense model.

| Variant | Total Params | Active Params | Context Window | Pricing (in/out) |
|---------|-------------|---------------|----------------|------------------|
| V4 Flash | Undisclosed | Undisclosed | 1M tokens | $0.14 / $0.28 per M tokens |
| V4 Pro | 1.6T | 49B | 1M tokens | Undisclosed |
| V4-Pro-Max | 1.6T | 49B | 1M tokens | Undisclosed |

A 1M token context window means you can fit entire large codebases or lengthy documents into a single prompt — particularly useful for cross-file code understanding tasks.

## Why It Matters

### Open-source pricing pressure continues

V4 Flash undercuts GPT-5.4 Nano, Gemini 3.1 Flash, GPT-5.4 Mini, and Claude Haiku 4.5 on price. This is DeepSeek's consistent strategy: use aggressive pricing to pressure OpenAI and Google, while the open-source version lets the community self-host, further compressing competitors' commercial headroom.

### Performance claims

DeepSeek claims V4-Pro-Max outperforms GPT-5.2 and Gemini 3.0 Pro on reasoning benchmarks and leads in coding evaluations. Note: these numbers are currently primarily from DeepSeek's own evaluations. Independent third-party benchmarks are in progress. Historical context: DeepSeek-R1's claimed performance was largely validated by the community, so V4's numbers deserve serious attention — while awaiting independent confirmation.

### Huawei Ascend optimization: the geopolitical technical marker

This is the most strategically significant detail in the release, and the most overlooked.

US export controls on Nvidia GPUs have forced Chinese AI companies to seek alternative hardware. V4 is DeepSeek's first model formally optimized for **Huawei Ascend chips**. If this optimization's real-world performance matches the claimed figures, it represents a meaningful milestone: China's top AI companies can train and deploy frontier models without depending on Nvidia A100/H100/H200.

## How It Works

V4's MoE architecture builds on V3 with several key improvements:

**Extended context handling**: V4 uses a new design for efficiently processing long sequences, addressing the memory explosion problem that affects Transformer models with very long contexts. Technical specifics haven't been fully disclosed.

**Enhanced reasoning**: V4 was trained with reinforced chain-of-thought supervision, producing significant improvements on math and complex reasoning tasks.

**Agentic tasks**: V4 has specific training for tool use and multi-step task planning, making it well-suited as a backbone for AI agent systems.

## Comparison

| Dimension | DeepSeek V4-Pro | GPT-5.2 | Gemini 3.0 Pro |
|-----------|----------------|---------|----------------|
| Open source | Yes | No | No |
| Total params | 1.6T (MoE) | Undisclosed | Undisclosed |
| Context window | 1M tokens | Undisclosed | Undisclosed |
| Self-hostable | Yes | No | No |
| Ascend support | Yes | No | No |

The largest differentiator remains the **open source + low pricing** combination: enterprises can download V4 and self-host without any API dependency, ensuring data never leaves their infrastructure. For data-sensitive applications (finance, healthcare, legal), this attribute is difficult to quantify in benchmark terms.

## Bottom Line

DeepSeek V4 continues to challenge the assumption that open-source models must lag behind closed-source frontiers. Regardless of final benchmark results, its release creates immediate pricing pressure across the AI market and technically validates China's ability to advance frontier AI without Nvidia's latest GPUs.

For developers and technical decision-makers, the relevant question now is: in your specific use case, does V4 Flash's pricing and performance combination already replace the closed-source API you're currently using?

## References

- [Three reasons why DeepSeek's new model matters - MIT Technology Review](https://www.technologyreview.com/2026/04/24/1136422/why-deepseeks-v4-matters/)
- [DeepSeek previews new AI model that 'closes the gap' with frontier models - TechCrunch](https://techcrunch.com/2026/04/24/deepseek-previews-new-ai-model-that-closes-the-gap-with-frontier-models/)
- [DeepSeek Unveils Newest Flagship AI Model - Bloomberg](https://www.bloomberg.com/news/articles/2026-04-24/deepseek-unveils-newest-flagship-a-year-after-ai-breakthrough)
