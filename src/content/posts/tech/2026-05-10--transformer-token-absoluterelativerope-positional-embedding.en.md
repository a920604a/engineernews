---
title: "How Does a Transformer Know Word Order? From Absolute Encoding to RoPE"
date: 2026-05-10T04:00:23.072Z
category: tech
tags: ["transformer", "rope", "positional-encoding", "nlp", "machine-learning", "deep-learning"]
lang: en
tldr: "Transformer self-attention is inherently orderless — positional encoding is the fix. From sinusoidal absolute encoding, to learnable absolute encoding, to relative positional encoding, to RoPE (Rotary Position Embedding): modern LLMs almost universally use RoPE because it requires no parameters, naturally encodes relative distances, and can be extended to longer sequences."
description: "A systematic introduction to the four main positional encoding schemes in Transformers: sinusoidal absolute encoding, learnable absolute encoding, relative positional encoding (T5, ALiBi), and the mathematical intuition and engineering advantages of RoPE."
type: explainer
original_url: "https://www.youtube.com/watch?v=Ll-wk8x3G_g"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260711_001709_731127.mp3"
---

Feed "cat bites dog" and "dog bites cat" into a Transformer — without positional information, these two sentences are identical to the model: just the tokens "cat," "bites," "dog" in some order. Self-attention lets each token attend to all others, but that "fully connected" design loses the concept of sequence order entirely. Positional Encoding was introduced in the original Transformer paper as the fix, but from 2017 to today, the solution to this problem has evolved through several generations.

## TL;DR

- **Sinusoidal absolute positional encoding** (original Transformer): computes position vectors using sine/cosine functions, no training needed, but can't extrapolate beyond training sequence length
- **Learnable absolute positional encoding** (GPT-2, BERT): trains position vectors as parameters, some flexibility but equally unable to extrapolate
- **Relative positional encoding** (T5, ALiBi): attention directly perceives relative distance between tokens, more friendly for long sequences
- **RoPE** (LLaMA, Mistral, Qwen, DeepSeek, most modern LLMs): multiplies positional information into Query and Key using rotation matrices — parameter-free, naturally encodes relative distance, extendable via YaRN and similar techniques — currently the dominant approach

## The Problem

### Why Positional Encoding Is Needed

The self-attention computation is:

```
Attention(Q, K, V) = softmax(QK^T / √d_k) × V
```

This computation is **permutation-invariant** over the input token order. Shuffle the input sequence and each token's output vector simply rearranges — the values don't change. That's fine for image patch classification or set problems, but in language, word order carries enormous semantic information.

Positional encoding's task: inject position information into token representations without modifying the attention mechanism itself.

## How Each Approach Works

### Approach 1: Sinusoidal Absolute Positional Encoding (Vaswani et al., 2017)

The original Transformer paper's method: for each position `pos`, each dimension `i`, compute:

```
PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
```

This vector is **added** directly to the token embedding, and the position information is carried implicitly through all subsequent computations.

**Intuition**: Different dimensions use sine waves of different frequencies, analogous to binary counting — low-frequency dimensions capture coarse position (is this in the first half or second half?), high-frequency dimensions capture fine position (which exact slot?).

**Downside**: Training only sees sequences up to a certain length. At inference time, positions beyond that length have no learned PE, and performance drops sharply.

### Approach 2: Learnable Absolute Positional Encoding (GPT-2, BERT)

Instead of formulas, build a `max_seq_len × d_model` embedding table where each position's vector is trained via backpropagation. BERT and GPT-2 both use this.

**Advantage**: The model can learn position representations suited to the task.

**Disadvantages:**
1. Increases parameter count
2. Still can't extrapolate — no vectors beyond position 512
3. The "relative relationship" between position 1 and position 2 isn't explicitly modeled; the model has to learn it

### Approach 3: Relative Positional Encoding

**T5's approach (Shaw et al., 2018)**: Instead of adding position to embeddings, directly add a relative position bias to the attention computation for each (query token, key token) pair. This makes the attention scores themselves carry relative distance information.

**ALiBi (Press et al., 2021)**: A cleaner relative encoding — for each attention head, add a negative linear bias proportional to relative distance directly to the attention logit. No extra parameters needed; more distant tokens get a larger negative penalty (effectively decaying). ALiBi performs relatively robustly when extrapolating to longer sequences.

### Approach 4: RoPE — Rotary Positional Embedding (Su et al., 2021)

RoPE is the most widely adopted positional encoding scheme today, used by LLaMA, Mistral, Qwen, DeepSeek, PaLM 2, and nearly all modern LLMs.

**Core idea**: **Multiply** positional information into Query and Key vectors, rather than **adding** it to token embeddings. Done via rotation matrices:

For a token at position m, rotate each pair of dimensions (q_{2i}, q_{2i+1}) of its Q vector:

```
[q_{2i}' ]   [cos(mθ_i)  -sin(mθ_i)] [q_{2i}  ]
[q_{2i+1}'] = [sin(mθ_i)   cos(mθ_i)] [q_{2i+1}]
```

where θ_i = 10000^(-2i/d_model) — a frequency design similar to sinusoidal.

**Why does this work?** When computing the dot product of Q at position m with K at position n:

```
Q_m^T · K_n = f(q, m)^T · f(k, n) = depends only on (q, k, m-n)
```

The dot product result **depends only on the relative position m-n**, not on the absolute position. This naturally encodes relative distance into the attention computation without modifying the attention formula itself.

**RoPE's engineering advantages:**
- **Parameter-free**: No additional learnable parameters
- **Naturally encodes relative distance**: Dot product value depends only on relative position
- **Extendable**: With techniques like YaRN (Yet another RoPE extensioN) and Positional Interpolation, the training context window can be extended severalfold — Llama 3.1 uses RoPE + long-context fine-tuning to reach 128K context

```
               Absolute Positional Encoding
               ┌──────────────────────────────┐
               │ Sinusoidal (additive)        │ ← original Transformer
               │ Learnable embedding (additive)│ ← BERT, GPT-2
               └──────────────────────────────┘

               Relative Positional Encoding
               ┌──────────────────────────────┐
               │ T5 Bias (attention)          │ ← T5
               │ ALiBi (linear decay)         │ ← BLOOM, MPT
               └──────────────────────────────┘

               Rotary Encoding (multiplicative)
               ┌──────────────────────────────┐
               │ RoPE                         │ ← LLaMA, Mistral,
               │                              │   Qwen, DeepSeek
               └──────────────────────────────┘
```

## What About No Positional Encoding?

Some 2023 research explored whether Transformers without positional encoding could work. The conclusion: for specific tasks with few tokens (classification), models can infer position implicitly from causal masking. But for language generation, models without positional encoding have higher training loss and significantly worse generation quality. Non-Transformer architectures like Mamba and RWKV encode position implicitly through SSM (State Space Model) or RNN time steps — that's a different path.

## Summary

| Scheme | Parameters | Extrapolation | Relative Distance | Modern LLM Adoption |
|--------|-----------|--------------|-------------------|---------------------|
| Sinusoidal | None | Poor | Indirect | Rare |
| Learnable absolute | Yes | Poor | Indirect | Rare (BERT era) |
| T5 Bias | Few | Medium | Direct | T5 family |
| ALiBi | None | Good | Direct (linear) | BLOOM, MPT |
| RoPE | None | Good (with help) | Direct (rotation) | LLaMA, Mistral, Qwen... |

RoPE's dominance isn't accidental — it simultaneously satisfies "parameter-free," "relative distance," and "extendable," and has been validated across a large number of LLM training runs. Understanding RoPE's mathematical principle also helps explain why long-context extrapolation techniques like YaRN work: fundamentally, it's adjusting θ frequencies so the model acts as if it's still within its training position range.

## References

- [RoFormer paper (arXiv 2104.09864)](https://arxiv.org/abs/2104.09864)
- [EleutherAI Blog: Rotary Embeddings](https://blog.eleuther.ai/rotary-embeddings/)
- [LearnOpenCV: Inside RoPE](https://learnopencv.com/rope-position-embeddings/)
- [labml.ai: RoPE implementation and explanation](https://nn.labml.ai/transformers/rope/index.html)
- [Medium: Rotary Positional Embeddings in detail](https://medium.com/ai-insights-cobet/rotary-positional-embeddings-a-detailed-look-and-comprehensive-understanding-4ff66a874d83)
- [Original video](https://www.youtube.com/watch?v=Ll-wk8x3G_g)
