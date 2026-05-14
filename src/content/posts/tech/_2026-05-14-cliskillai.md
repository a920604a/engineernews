---
title: "告別一切重覆枯燥任務，CLI+Skill 搭建 AI 瀏覽器自動化框架"
date: 2026-05-14T11:18:29.269Z
category: tech
tags: ["自動化", "CLI", "Skill", "AI", "瀏覽器", "科技", "工具"]
lang: zh-TW
tldr: "使用 CLI 和 Skill 搭建 AI 瀏覽器自動化框架，減少重覆任務"
description: "使用 CLI 和 Skill 搭建 AI 瀏覽器自動化框架，減少重覆任務"

type: how-to
original_url: "https://www.youtube.com/watch?v=nlK7-zuYDcs"
draft: true
---

# TL;DR
本文將教你如何使用 CLI 和 Skill 搭建一個 AI 瀏覽器自動化框架，讓你告別重複枯燥的任務。

# 前置條件
* 熟悉 CLI 的基本操作
* 了解 Skill 的基礎概念
* 安裝 Node.js 和 npm

# 步驟
### 步驟 1：安裝所需套件
首先，安裝必要的套件。打開終端機，執行以下指令：
```bash
npm install -g skill-cli
```
### 步驟 2：初始化 Skill 專案
建立一個新的目錄，並初始化 Skill 專案：
```bash
mkdir my-skill
cd my-skill
skill init
```
### 步驟 3：安裝瀏覽器自動化套件
安裝瀏覽器自動化套件：
```bash
npm install -g puppeteer
```
### 步驟 4：建立 Skill 腳本
建立一個新的檔案，命名為 `browser-auto.js`，並加入以下程式碼：
```javascript
const puppeteer = require('puppeteer');

module.exports = async function () {
  // 啟動瀏覽器
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // 瀏覽器自動化程式碼
  await page.goto('https://www.example.com');
  await page.click('#my-button');

  // 關閉瀏覽器
  await browser.close();
};
```
### 步驟 5：配置 Skill
在 `skill.json` 檔案中加入以下程式碼：
```json
{
  "name": "browser-auto",
  "description": "瀏覽器自動化",
  "main": "browser-auto.js"
}
```
### 步驟 6：執行 Skill
執行 Skill 腳本：
```bash
skill run browser-auto
```
# 完整範例
以下是完整的 `browser-auto.js` 檔案：
```javascript
const puppeteer = require('puppeteer');

module.exports = async function () {
  // 啟動瀏覽器
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // 瀏覽器自動化程式碼
  await page.goto('https://www.example.com');
  await page.click('#my-button');

  // 關閉瀏覽器
  await browser.close();
};
```
# 常見問題
* 如果 Skill 腳本執行失敗，請檢查是否安裝必要的套件。
* 如果瀏覽器自動化程式碼無法執行，請檢查是否正確配置了 `puppeteer` 套件。

# 參考資料
* [Skill 官方文件](https://www.npmjs.com/package/skill-cli)
* [Puppeteer 官方文件](https://pptr.dev/)

## 技術結構圖

```mermaid
graph LR
    A[安裝 CLI 套件] -->|npm install -g skill-cli|> B[初始化 Skill 專案]
    B -->|mkdir & cd & skill init|> C[安裝瀏覽器自動化套件]
    C -->|npm install -g puppeteer|> D[建立 Skill 腳本]
    D -->|建立 browser-auto.js|> E[配置 Skill]
    E -->|編輯 skill.json|> F[執行 Skill]
    F -->|skill run browser-auto|> G[瀏覽器自動化]
    G -->|啟動瀏覽器 & 執行程式碼 & 關閉瀏覽器|> H[完成]

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#f9f,stroke:#333,stroke-width:2px
    style C fill:#f9f,stroke:#333,stroke-width:2px
    style D fill:#f9f,stroke:#333,stroke-width:2px
    style E fill:#f9f,stroke:#333,stroke-width:2px
    style F fill:#f9f,stroke:#333,stroke-width:2px
    style G fill:#ccf,stroke:#333,stroke-width:2px
    style H fill:#ccf,stroke:#333,stroke-width:2px
```

## 參考資料

- [告别一切重复枯燥任务，CLI+Skill搭建AI浏览器自动化框架](https://www.youtube.com/watch?v=nlK7-zuYDcs)