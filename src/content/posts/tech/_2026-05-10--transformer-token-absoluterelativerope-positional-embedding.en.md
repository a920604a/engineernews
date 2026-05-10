---
title: "How to Inform Transformer of Input Token Order"
date: 2026-05-10T04:00:23.072Z
category: tech
tags: ["transformer", "positional-embedding", "nlp", "machine-learning", "ai", "deep-learning"]
lang: en
tldr: "Exploring different positional embedding methods in Transformer models"
description: "Discover the various approaches to implementing positional embedding in Transformer models"

type: explainer
original_url: "https://www.youtube.com/watch?v=Ll-wk8x3G_g"
draft: true
---

How to Let Transformer Know the Order of Input Tokens? Absolute, Relative, RoPE, and No Positional Embedding
====================================================================

## TL;DR
Understand the Positional Embedding technique in Transformer models to make the model aware of the order of input tokens.

## What is it
Positional Embedding is a technique used in Transformer models to add positional information to the input tokens, allowing the model to understand the order of the input tokens. It is an additional embedding vector added to the input token's embedding vector to capture the token's positional information.

## Why is it important
In Transformer models, the self-attention mechanism allows the model to attend to any position in the input sequence. However, this also makes it difficult for the model to distinguish the order of the tokens. Positional Embedding solves this problem by allowing the model to understand the order of the input tokens, thus better understanding the semantic meaning of the input sequence.

## How it works
The working principle of Positional Embedding is as follows:

```mermaid
graph LR
    A[Input Token] -->|Embedding Vector|> B[Token Embedding Vector]
    C[Positional Information] -->|Positional Embedding Vector|> D[Positional Embedding Vector]
    B -->|Addition|> E[Input Embedding Vector]
    E -->|Input to Transformer|> F[Transformer Model]
```

Here, the positional embedding vector (Positional Embedding) is an additional embedding vector calculated based on the token's position and added to the token's embedding vector to capture the token's positional information.

## Difference from Relative Positional Embedding
Relative Positional Embedding is another type of Positional Embedding technique that only considers the relative position between tokens, rather than absolute position. This allows the model to better handle long-distance dependencies.

```mermaid
graph LR
    A[Input Token] -->|Embedding Vector|> B[Token Embedding Vector]
    C[Relative Positional Information] -->|Relative Positional Embedding Vector|> D[Relative Positional Embedding Vector]
    B -->|Addition|> E[Input Embedding Vector]
    E -->|Input to Transformer|> F[Transformer Model]
```

## Difference from RoPE
RoPE (Rotary Positional Embedding) is a type of Positional Embedding technique based on rotation, which uses a rotation matrix to capture the token's positional information. RoPE can better handle long-distance dependencies and has higher computational efficiency.

```mermaid
graph LR
    A[Input Token] -->|Embedding Vector|> B[Token Embedding Vector]
    C[Rotation Matrix] -->|Rotation|> D[Rotated Embedding Vector]
    B -->|Addition|> E[Input Embedding Vector]
    E -->|Input to Transformer|> F[Transformer Model]
```

## Difference from No Positional Embedding
Without Positional Embedding, the Transformer model cannot understand the order of the input tokens, thus failing to understand the semantic meaning of the input sequence.

## Conclusion
Positional Embedding is an essential component of Transformer models, allowing the model to understand the order of the input tokens and better comprehend the semantic meaning of the input sequence. Different Positional Embedding techniques, such as Absolute, Relative, and RoPE, have their own advantages and disadvantages, and are suitable for different scenarios.

## References

* [Transformer Official Documentation](https://huggingface.co/transformers/)
* [Relative Positional Embedding](https://arxiv.org/abs/1803.02155)
* [RoPE](https://arxiv.org/abs/2104.09864)