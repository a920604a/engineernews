---
title: "幫助社交焦慮的粉絲，我創建了一個視訊通話平台"
date: 2026-05-12T11:24:47.018Z
category: tech
tags: ["視訊通話", "社交焦慮", "開發專案", "AI", "科技"]
lang: zh-TW
tldr: "創建視訊通話平台幫助社交焦慮的粉絲"
description: "創建視訊通話平台幫助社交焦慮的粉絲"

type: how-to
original_url: "https://www.youtube.com/watch?v=M1bifAQSVcY"
draft: true
---

# TL;DR
本文將介紹如何建立一套簡單的視訊通話平台，以幫助社交焦慮的粉絲們。

## 前置條件
* Node.js（>=14）
* Express.js（>=4）
* Socket.IO（>=4）
* WebRTC
* JavaScript 基本知識

## 步驟
### 1. 設定 Express.js 伺服器
首先，建立一個新的 Node.js 專案，並安裝 Express.js：
```bash
npm init -y
npm install express
```
建立 `app.js` 檔案，設定 Express.js 伺服器：
```javascript
const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
```
### 2. 設定 Socket.IO
安裝 Socket.IO：
```bash
npm install socket.io
```
在 `app.js` 中設定 Socket.IO：
```javascript
const io = require('socket.io')(app);
```
### 3. 設定 WebRTC
在 `public/index.html` 中新增以下代碼，設定 WebRTC 的視訊通話功能：
```html
<video id="localVideo" width="640" height="480"></video>
<video id="remoteVideo" width="640" height="480"></video>

<script>
  const localVideo = document.getElementById('localVideo');
  const remoteVideo = document.getElementById('remoteVideo');

  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      localVideo.srcObject = stream;
    })
    .catch(error => {
      console.error('Error getting user media:', error);
    });

  // 處理遠端視訊
  socket.on('offer', offer => {
    // 處理offer
  });

  socket.on('answer', answer => {
    // 處理answer
  });

  socket.on('candidate', candidate => {
    // 處理candidate
  });
</script>
```
### 4. 處理 Socket.IO 事件
在 `app.js` 中處理 Socket.IO 事件：
```javascript
io.on('connection', socket => {
  console.log('Client connected');

  // 處理offer
  socket.on('offer', offer => {
    // 處理offer
  });

  // 處理answer
  socket.on('answer', answer => {
    // 處理answer
  });

  // 處理candidate
  socket.on('candidate', candidate => {
    // 處理candidate
  });
});
```
## 完整範例
完整的程式碼可以在 [GitHub](https://github.com/[你的GitHub帳號]/video-calling-platform) 上找到。

## 常見問題
* 如何處理視訊通話中的音訊同步問題？
* 如何處理視訊通話中的延遲問題？

## 參考資料
* [WebRTC 官方文件](https://webrtc.org/)
* [Socket.IO 官方文件](https://socket.io/docs/)

## 技術結構圖

```mermaid
graph LR
    A[使用者] -->|連線|> B[Express.js 伺服器]
    B -->|設定|> C[Socket.IO]
    C -->|設定|> D[WebRTC]
    D -->|取得用戶媒體|> E[取得視訊]
    E -->|處理遠端視訊|> F[Socket.IO 事件]
    F -->|處理offer|> G[處理offer]
    F -->|處理answer|> H[處理answer]
    F -->|處理candidate|> I[處理candidate]
    G -->|傳送offer|> J[用戶端]
    H -->|傳送answer|> J
    I -->|傳送candidate|> J
    J -->|顯示視訊|> K[視訊通話]
    K -->|處理音訊同步|> L[音訊同步]
    K -->|處理延遲|> M[延遲處理]
```
- [To help my socially anxious fans, I created a video calling platform.](https://www.youtube.com/watch?v=M1bifAQSVcY)