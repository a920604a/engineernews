---
title: "我的首場直播"
date: 2026-06-09T02:58:26.440Z
category: learning
tags: ["直播", "分享", "AI", "科技"]
lang: zh-TW
tldr: "直播分享心得"
description: "直播分享心得"

type: how-to
original_url: "https://www.youtube.com/watch?v=p_RLNndfCVU"
draft: true
---

## TL;DR
本篇文章將教導如何使用 OBS Studio 進行第一個直播串流的設定與操作。

## 前置條件
* OBS Studio 安裝完成
* 熟悉 OBS Studio 基本操作
* 具備基本的電腦知識

## 步驟
### 步驟 1：設定 OBS Studio
首先，打開 OBS Studio，並點擊左上角的「設定」按鈕。切換到「串流」標籤，選擇你的串流平台（例如 YouTube、Twitch 等），並輸入你的串流金鑰。

### 步驟 2：設定視訊和音訊
點擊左上角的「來源」按鈕，新增一個「視訊擷取裝置」和一個「音訊輸入裝置」。選擇你的相機和麥克風作為輸入裝置。

### 步驟 3：設定畫面佈局
點擊左上角的「場景」按鈕，新增一個新的場景。將你的視訊和音訊來源拖曳到場景中，調整大小和位置。

### 步驟 4：開始串流
點擊左上角的「開始串流」按鈕，OBS Studio 會開始將你的視訊和音訊串流到你設定的平台。

## 完整範例
以下是一個簡單的 OBS Studio 設定範例：

```markdown
# OBS Studio 設定檔
[settings]
  [stream]
    platform = youtube
    key = your_stream_key
  [/stream]
  [video]
    device = your_camera
  [/video]
  [audio]
    device = your_microphone
  [/audio]
[/settings]

# 場景設定
[scene]
  [sources]
    [0]
      type = video_capture
      device = your_camera
      x = 0
      y = 0
      width = 1920
      height = 1080
    [/0]
    [1]
      type = audio_input
      device = your_microphone
      x = 0
      y = 0
    [/1]
  [/sources]
[/scene]
```

## 常見問題
* 串流延遲：檢查你的網路連線和串流平台的設定。
* 視訊和音訊不同步：檢查你的視訊和音訊來源的設定。

## 參考資料
* OBS Studio 官方文件：<https://obsproject.com/docs>
* YouTube 串流文件：<https://support.google.com/youtube/answer/9228391>
* Twitch 串流文件：<https://help.twitch.tv/s/article/Streaming-Requirements>

## 技術結構圖

```mermaid
flowchart LR
    A[設定 OBS Studio] -->|設定串流平台和金鑰|> B[設定視訊和音訊]
    B -->|新增視訊和音訊來源|> C[設定畫面佈局]
    C -->|新增場景和調整大小和位置|> D[開始串流]
    D -->|串流到設定的平台|> E[串流完成]
    style A fill:#f9f,stroke:#333,stroke-width:4px
    style B fill:#f9f,stroke:#333,stroke-width:4px
    style C fill:#f9f,stroke:#333,stroke-width:4px
    style D fill:#f9f,stroke:#333,stroke-width:4px
    style E fill:#f9f,stroke:#333,stroke-width:4px
```
- [First Live Stream](https://www.youtube.com/watch?v=p_RLNndfCVU)