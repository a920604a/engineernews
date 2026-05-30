---
title: "April Fitness Challenge for Members"
date: 2026-05-30T19:38:56.851Z
category: learning
tags: ["fitness", "challenge", "tech", "product"]
lang: en
tldr: "Join the April fitness challenge"
description: "Join the April fitness challenge"

type: how-to
original_url: "https://www.youtube.com/watch?v=-TQWD0S5uLA"
draft: true
---

# TL;DR
Create a basic fitness challenge webpage using YouTube video titles and descriptions.

## Prerequisites
* Basic knowledge of HTML, CSS, and JavaScript
* Understanding of how to use the YouTube API
* A YouTube channel and video

## Steps

### 1. Create a basic HTML page
First, create a new HTML file named `index.html`. In the file, add the basic HTML structure, including the `head`, `body`, and `title` tags.

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
    <!-- Content will go here -->
</body>
</html>
```

### 2. Add CSS styles
Create a new CSS file named `style.css`. In the file, add basic CSS styles, including font, color, and layout settings.

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

### 3. Use the YouTube API to get video titles and descriptions
Use the YouTube API to get the title and description of a video. First, get a YouTube API key. Then, use the `fetch` API to send a request to get the video data.

```javascript
const apiKey = 'YOUR_API_KEY';
const videoId = 'VIDEO_ID';

fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`)
    .then(response => response.json())
    .then(data => {
        const title = data.items[0].snippet.title;
        const description = data.items[0].snippet.description;
        // Add the title and description to the HTML
        document.querySelector('.title').textContent = title;
        document.querySelector('.description').textContent = description;
    })
    .catch(error => console.error(error));
```

### 4. Add the title and description to the HTML
Create a new HTML element named `.title` and `.description`. Add the title and description to these elements.

```html
<div class="container">
    <h1 class="title"></h1>
    <p class="description"></p>
</div>
```

## Complete Example
Here is the complete HTML, CSS, and JavaScript code.

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

## Frequently Asked Questions
* How to get a YouTube API key?
* How to use the `fetch` API to send a request to get video data?

## References
* [YouTube API documentation](https://developers.google.com/youtube/v3)
* [Fetch API documentation](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

## Technical Architecture Diagram

```mermaid
graph LR
  A[Create basic HTML page] -->|Include head, body, and title tags|> B[Add CSS styles]
  B -->|Set font, color, and layout settings|> C[Use YouTube API to get video title and description]
  C -->|Get YouTube API key and use fetch API to send request|> D[Add title and description to HTML]
  D -->|Create new HTML elements and set title and description|> E[Complete example]
  E -->|Complete HTML, CSS, and JavaScript code|> F[Frequently asked questions and references]
  F -->|How to get YouTube API key and use fetch API to send request|> G[End]
```