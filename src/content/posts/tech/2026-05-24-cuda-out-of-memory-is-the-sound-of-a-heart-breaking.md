---
title: "CUDA Out of Memory：遇到 GPU 記憶體爆炸時，你真正需要做的事"
date: 2026-05-24T04:17:50.362Z
category: tech
tags: ["cuda", "pytorch", "gpu", "deep-learning", "debugging"]
lang: zh-TW
tldr: "CUDA OOM 錯誤背後有五個常見的根本原因：batch size 過大、梯度累積在計算圖中、中間張量沒有釋放、多 GPU 不均衡、以及記憶體碎片化。正確的診斷比加 `empty_cache()` 有效得多。"
description: "深入解析 CUDA Out of Memory 的常見原因與修復方法：從梯度計算圖洩漏、batch size 調整，到混合精度訓練與梯度檢查點，完整的 GPU 記憶體優化清單。"
type: debug
original_url: "https://www.youtube.com/shorts/Q5w61PXKuTM"
draft: true
audio_url: "/api/tts/r2/tts/tts_20260615_195544_452341.mp3"
---

`RuntimeError: CUDA out of memory. Tried to allocate 2.00 GiB...`

這個錯誤訊息在深度學習訓練中幾乎每個人都遇過。第一反應通常是加一行 `torch.cuda.empty_cache()`，結果還是掛掉。這篇文章解釋為什麼，以及真正有效的修復方式。

## TL;DR

`empty_cache()` 只清理 PyTorch 的快取分配器，對真正佔用記憶體的張量完全沒效。CUDA OOM 的根本原因通常是：梯度計算圖沒有釋放、batch size 沒有對應到顯存大小、推論時沒有關 `grad`、或是記憶體碎片讓大塊連續分配失敗。解法按嚴重程度排：先減少 batch size，然後開 `torch.no_grad()`，再來用混合精度，最後用梯度檢查點。

## 情境

在使用 PyTorch 訓練一個 Transformer 模型（或是跑推論），突然在某個 batch 或某個 epoch 之後遇到 CUDA OOM，導致整個訓練中斷。

## 問題

```
RuntimeError: CUDA out of memory. Tried to allocate 512.00 MiB
(GPU 0; 23.69 GiB total capacity; 21.34 GiB already allocated;
 391.31 MiB free; 22.10 GiB reserved in total by PyTorch)
```

特別值得注意的是錯誤訊息通常顯示「剩餘空間夠，但分配失敗」——這是記憶體碎片化的典型表現，不是真的沒記憶體了。

## 嘗試過程

### 錯誤嘗試 1：加 `empty_cache()`

```python
# 這個沒用
torch.cuda.empty_cache()
```

`empty_cache()` 把 PyTorch 快取但尚未使用的記憶體還給 CUDA driver，讓其他程序可以用。但已經被你的張量佔用的記憶體完全不受影響。這是最常見的錯誤認知。

### 錯誤嘗試 2：設 `set_per_process_memory_fraction`

```python
torch.cuda.set_per_process_memory_fraction(0.8)
```

這只是限制你的程序使用上限，並不能讓你使用更少的記憶體。如果原本就 OOM，限制上限只會讓你更快 OOM。

## 解法

### 根本原因 1：推論時沒有關閉梯度計算

這是最容易忽略也是記憶體浪費最大的問題。推論不需要計算梯度，但如果你沒有明確告訴 PyTorch，它會存儲整個計算圖。

```python
# 錯誤：即使是推論也在計算梯度
output = model(input)

# 正確：推論時關閉梯度
with torch.no_grad():
    output = model(input)
```

記憶體影響：視模型大小，這一行可以省下 30-50% 的 GPU 記憶體。

### 根本原因 2：在迴圈中累積損失

```python
# 錯誤：total_loss 保留了整個計算圖的參考
total_loss = 0
for batch in dataloader:
    loss = criterion(model(batch), labels)
    total_loss += loss  # ← 這行讓計算圖無法釋放！

# 正確：只取純數值
total_loss += loss.item()
```

### 根本原因 3：Batch size 太大

最直接的方法是減小 `batch_size`。但如果需要維持大的有效 batch size（例如訓練穩定性），可以用梯度累積：

```python
accumulation_steps = 4  # 等效 batch size × 4
optimizer.zero_grad()

for i, (inputs, labels) in enumerate(dataloader):
    outputs = model(inputs)
    loss = criterion(outputs, labels) / accumulation_steps
    loss.backward()

    if (i + 1) % accumulation_steps == 0:
        optimizer.step()
        optimizer.zero_grad()
```

### 根本原因 4：沒有使用混合精度訓練

FP32 每個數值佔 4 bytes；FP16 只佔 2 bytes。對大多數模型，混合精度訓練可以讓記憶體用量減半，同時速度也更快：

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

### 根本原因 5：超長序列 Transformer 需要梯度檢查點

Transformer 的記憶體消耗跟序列長度的平方成正比。梯度檢查點（gradient checkpointing）用計算時間換記憶體：不存中間激活值，而是在 backward pass 時重新計算：

```python
from torch.utils.checkpoint import checkpoint_sequential

model = checkpoint_sequential(model, segments=4)
```

記憶體可以從 O(n) 降到 O(√n)，代價是訓練時間增加約 30%。

## 為什麼會這樣

PyTorch 的記憶體管理分兩層：

1. **CUDA driver 層**：實際的 GPU 記憶體
2. **PyTorch 快取分配器**：PyTorch 從 CUDA 申請大塊記憶體，然後自己管理分配

當你釋放一個張量，記憶體先回到 PyTorch 的快取池，不立即還給 CUDA。這讓重新分配更快，但也是為什麼 `nvidia-smi` 顯示記憶體被佔用，但 PyTorch 報告有空閒快取的原因。

「記憶體夠但分配失敗」通常是**記憶體碎片化**：雖然總空閒量夠，但沒有足夠大的連續塊。這在長時間訓練後特別常見。

## 學到的事

診斷 CUDA OOM 的正確順序：

1. **先看 OOM 訊息**：`already allocated` vs `reserved` 的比例，判斷是真的沒記憶體還是碎片化
2. **確認推論路徑都有 `torch.no_grad()`**
3. **檢查迴圈中有沒有 `.item()` 漏掉**
4. **考慮開混合精度**，幾乎零成本的記憶體優化
5. **減小 batch size + 梯度累積**，作為最後手段

```python
# 診斷用：打印記憶體使用狀況
print(f"Allocated: {torch.cuda.memory_allocated() / 1024**3:.2f} GB")
print(f"Reserved:  {torch.cuda.memory_reserved() / 1024**3:.2f} GB")
print(f"Max allocated: {torch.cuda.max_memory_allocated() / 1024**3:.2f} GB")
```

## 參考資料

- [PyTorch CUDA Semantics — 官方文件](https://pytorch.org/docs/stable/notes/cuda.html)
- [CUDA out of memory is the sound of a heart breaking](https://www.youtube.com/shorts/Q5w61PXKuTM)
