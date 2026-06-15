---
title: "CUDA Out of Memory: What Actually Works (And Why empty_cache() Doesn't)"
date: 2026-05-24T04:17:50.362Z
category: tech
tags: ["cuda", "pytorch", "gpu", "deep-learning", "debugging"]
lang: en
tldr: "CUDA OOM errors have five common root causes: oversized batch, gradients accumulating in the computation graph, unreleased intermediate tensors, multi-GPU imbalance, and memory fragmentation. Correct diagnosis beats adding empty_cache() every time."
description: "Practical guide to debugging CUDA Out of Memory errors in PyTorch: computation graph leaks, batch size tuning, mixed precision training, gradient checkpointing — a complete GPU memory optimization checklist."
type: debug
original_url: "https://www.youtube.com/shorts/Q5w61PXKuTM"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_195515_586578.mp3"
---

`RuntimeError: CUDA out of memory. Tried to allocate 2.00 GiB...`

Almost every deep learning practitioner has seen this. The first instinct is usually to add `torch.cuda.empty_cache()`. It still crashes. Here's why, and what actually fixes it.

## TL;DR

`empty_cache()` only clears PyTorch's cached allocator — it has zero effect on tensors actually holding memory. CUDA OOM root causes are typically: gradients not being released from the computation graph, batch size exceeding VRAM, no `grad` disabled during inference, or fragmentation preventing large contiguous allocations. Fix priority: reduce batch size first, then `torch.no_grad()`, then mixed precision, finally gradient checkpointing.

## Context

Training a Transformer model (or running inference) with PyTorch on GPU. At some point — during a specific batch or after several epochs — CUDA OOM crashes the whole run.

## Problem

```
RuntimeError: CUDA out of memory. Tried to allocate 512.00 MiB
(GPU 0; 23.69 GiB total capacity; 21.34 GiB already allocated;
 391.31 MiB free; 22.10 GiB reserved in total by PyTorch)
```

The key detail: "enough free space but allocation failed" — classic memory fragmentation. The total free memory is sufficient, but no single contiguous block is large enough.

## Failed Attempts

### Wrong fix 1: empty_cache()

```python
# This doesn't help
torch.cuda.empty_cache()
```

`empty_cache()` returns PyTorch's cached-but-unused memory back to the CUDA driver for other processes. It doesn't touch memory held by your tensors. Most common misconception in CUDA debugging.

### Wrong fix 2: set_per_process_memory_fraction

```python
torch.cuda.set_per_process_memory_fraction(0.8)
```

This caps your process's memory ceiling — it doesn't reduce how much your model actually needs. If you're already OOMing, a lower cap just makes you OOM faster.

## Actual Fixes

### Root cause 1: Gradient computation during inference

This is the most commonly missed issue and the biggest memory waste. Inference doesn't need gradients, but PyTorch computes and stores them unless explicitly told not to.

```python
# Wrong: computing gradients even during inference
output = model(input)

# Correct: disable gradients for inference
with torch.no_grad():
    output = model(input)
```

Memory impact: 30-50% reduction depending on model size.

### Root cause 2: Accumulating loss in a loop

```python
# Wrong: total_loss holds a reference to the full computation graph
total_loss = 0
for batch in dataloader:
    loss = criterion(model(batch), labels)
    total_loss += loss  # ← prevents graph from being freed!

# Correct: extract scalar value
total_loss += loss.item()
```

### Root cause 3: Batch size

Most direct fix: reduce `batch_size`. To maintain large effective batch size (e.g., for training stability), use gradient accumulation:

```python
accumulation_steps = 4  # effective batch size × 4
optimizer.zero_grad()

for i, (inputs, labels) in enumerate(dataloader):
    outputs = model(inputs)
    loss = criterion(outputs, labels) / accumulation_steps
    loss.backward()

    if (i + 1) % accumulation_steps == 0:
        optimizer.step()
        optimizer.zero_grad()
```

### Root cause 4: FP32 when FP16 works

FP32 uses 4 bytes per value; FP16 uses 2. Mixed precision training cuts memory roughly in half with near-zero accuracy cost for most models:

```python
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()

for inputs, labels in dataloader:
    with autocast():
        outputs = model(inputs)
        loss = criterion(outputs, labels)

    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

### Root cause 5: Long-sequence Transformers need gradient checkpointing

Transformer memory scales quadratically with sequence length. Gradient checkpointing trades compute for memory — instead of storing intermediate activations, it recomputes them during the backward pass:

```python
from torch.utils.checkpoint import checkpoint_sequential

model = checkpoint_sequential(model, segments=4)
```

Memory can drop from O(n) to O(√n), at the cost of ~30% longer training time.

## Why This Happens

PyTorch memory management has two layers:

1. **CUDA driver layer**: actual GPU memory
2. **PyTorch caching allocator**: PyTorch requests large blocks from CUDA, then manages sub-allocations internally

When you free a tensor, memory returns to PyTorch's cache pool — not immediately to CUDA. This speeds up re-allocation but explains why `nvidia-smi` shows memory as occupied while PyTorch reports free cache.

"Enough total free but allocation failed" = **memory fragmentation**: total free space is sufficient, but no single contiguous block is large enough. Gets worse during long training runs.

## What I Learned

Correct CUDA OOM diagnosis order:

1. **Read the OOM message**: ratio of `already allocated` to `reserved` tells you whether it's genuine OOM or fragmentation
2. **Verify all inference paths have `torch.no_grad()`**
3. **Check for missing `.item()` calls in loops**
4. **Enable mixed precision** — near-zero-cost memory optimization
5. **Reduce batch size + gradient accumulation** as a last resort

```python
# Diagnostic: print current memory state
print(f"Allocated: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
print(f"Reserved:  {torch.cuda.memory_reserved() / 1024**3:.2f} GB")
print(f"Max allocated: {torch.cuda.max_memory_allocated() / 1024**3:.2f} GB")
```

## References

- [PyTorch CUDA Semantics — Official Docs](https://pytorch.org/docs/stable/notes/cuda.html)
- [CUDA out of memory is the sound of a heart breaking](https://www.youtube.com/shorts/Q5w61PXKuTM)
