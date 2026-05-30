---
title: "會員專屬 4 月健身挑戰"
date: 2026-05-30T19:38:56.850Z
category: learning
tags: ["健身", "挑戰", "科技", "產品"]
lang: zh-TW
tldr: "參與 4 月健身挑戰"
description: "參與 4 月健身挑戰"

type: how-to
original_url: "https://www.youtube.com/watch?v=-TQWD0S5uLA"
draft: true
---

## TL;DR
如何使用 YouTube 影片標題和簡介建立一個基本的健身挑戰網頁。

## 前置條件
* 基本的 HTML、CSS 和 JavaScript 知識
* 了解如何使用 YouTube API
*有一個 YouTube 頻道和影片

## 步驟

### 1. 創建基本的 HTML 頁面
首先，創建一個新的 HTML 檔案，命名為 `index.html`。在檔案中，添加基本的 HTML 結構，包括 `head`、`body` 和 `title` 標籤。

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Members Only April Fitness Challenge!</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <!-- 內容會在這裡 -->
</body>
</html>
```

### 2. 添加 CSS 樣式
創建一個新的 CSS 檔案，命名為 `style.css`。在檔案中，添加基本的 CSS 樣式，包括字體、顏色和版面配置。

```css
body {
    font-family: Arial, sans-serif;
    background-color: #f2f2f2;
    margin: 0;
    padding: 0;
}

.container {
    max-width: 800px;
    margin: 40px auto;
    padding: 20px;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 10px;
}
```

### 3. 使用 YouTube API 取得影片標題和簡介
使用 YouTube API 取得影片的標題和簡介。首先，需要取得 YouTube API 金鑰。然後，使用 `fetch` API 發送請求取得影片資料。

```javascript
const apiKey = 'YOUR_API_KEY';
const videoId = 'VIDEO_ID';

fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`)
    .then(response => response.json())
    .then(data => {
        const title = data.items[0].snippet.title;
        const description = data.items[0].snippet.description;
        // 將標題和簡介加入 HTML 中
        document.querySelector('.title').textContent = title;
        document.querySelector('.description').textContent = description;
    })
    .catch(error => console.error(error));
```

### 4. 將標題和簡介加入 HTML 中
創建一個新的 HTML 元素，命名為 `.title` 和 `.description`。將標題和簡介加入這些元素中。

```html
<div class="container">
    <h1 class="title"></h1>
    <p class="description"></p>
</div>
```

## 完整範例
以下是完整的 HTML、CSS 和 JavaScript 代碼。

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Members Only April Fitness Challenge!</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1 class="title"></h1>
        <p class="description"></p>
    </div>
    <script src="script.js"></script>
</body>
</html>
```

```css
/* style.css */
body {
    font-family: Arial, sans-serif;
    background-color: #f2f2f2;
    margin: 0;
    padding: 0;
}

.container {
    max-width: 800px;
    margin: 40px auto;
    padding: 20px;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 10px;
}
```

```javascript
// script.js
const apiKey = 'YOUR_API_KEY';
const videoId = 'VIDEO_ID';

fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`)
    .then(response => response.json())
    .then(data => {
        const title = data.items[0].snippet.title;
        const description = data.items[0].snippet.description;
        document.querySelector('.title').textContent = title;
        document.querySelector('.description').textContent = description;
    })
    .catch(error => console.error(error));
```

## 常見問題
* 如何取得 YouTube API 金鑰？
* 如何使用 `fetch` API 發送請求取得影片資料？

## 參考資料
* [YouTube API 文件](https://developers.google.com/youtube/v3)
* [Fetch API 文件](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

## 技術結構圖

```mermaid
graph LR
  A[創建基本的 HTML 頁面] -->|包含head、body和title標籤|> B[添加 CSS 樣式]
  B -->|設定字體、顏色和版面配置|> C[使用 YouTube API 取得影片標題和簡介]
  C -->|取得 YouTube API 金鑰和使用fetch API 發送請求|> D[將標題和簡介加入 HTML 中]
  D -->|創建新的 HTML 元素和設定標題和簡介|> E[完整範例]
  E -->|完整的 HTML、CSS 和 JavaScript 代碼|> F[常見問題和參考資料]
  F -->|如何取得 YouTube API 金鑰和使用fetch API 發送請求|> G[結束]
```
- [Members Only April Fitness Challenge!](https://www.youtube.com/watch?v=-TQWD0S5uLA)