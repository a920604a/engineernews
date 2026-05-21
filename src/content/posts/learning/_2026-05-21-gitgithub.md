---
title: "Git+Github 核心概念大整理，从零到一全攻略，詳細實戰教程"
date: 2026-05-21T12:20:28.876Z
category: learning
tags: ["Git", "Github", "版本控制", "科技", "工具"]
lang: zh-TW
tldr: "一步步學習 Git 與 Github 的核心概念"
description: "一步步學習 Git 與 Github 的核心概念"

type: how-to
original_url: "https://www.youtube.com/watch?v=bWUUHBVg-7E"
draft: true
---

## TL;DR
本文將帶領讀者從零開始學習 Git 和 GitHub 的核心概念，透過實戰教程了解版本控制和協作開發的精髓。

## 前置條件
* 熟悉基本的命令列操作
* 有一個 GitHub 帳號

## 步驟
### 步驟 1：安裝 Git
在開始之前，請確保你已經安裝了 Git。如果你還沒有安裝，請前往 [Git 官網](https://git-scm.com/) 下載安裝程式。

安裝完成後，請打開終端機或命令提示字元，輸入 `git --version` 確認 Git 已經成功安裝。

### 步驟 2：建立 GitHub 帳號和建立倉庫
如果你還沒有 GitHub 帳號，請前往 [GitHub 官網](https://github.com/) 註冊一個帳號。

建立帳號後，請點擊右上角的「+」按鈕，選擇「New repository」建立一個新的倉庫。填寫倉庫名稱、描述和選擇公開或私人後，點擊「Create repository」建立倉庫。

### 步驟 3：初始化 Git 並連結 GitHub 倉庫
在本地端，建立一個新的目錄並進入該目錄。輸入 `git init` 初始化 Git，然後輸入 `git remote add origin https://github.com/your_username/your_repo_name.git` 連結 GitHub 倉庫。

### 步驟 4：新增檔案、提交變更和推送到 GitHub
新增一個檔案（例如 `hello.txt`），然後輸入 `git add .` 新增所有變更。輸入 `git commit -m "Initial commit"` 提交變更，然後輸入 `git push -u origin master` 推送變更到 GitHub 倉庫。

### 步驟 5：建立分支、合併分支和解決衝突
輸入 `git branch feature/new-feature` 建立一個新的分支，然後輸入 `git checkout feature/new-feature` 切換到新分支。

新增一個檔案（例如 `new-feature.txt`），然後輸入 `git add .` 新增所有變更。輸入 `git commit -m "Add new feature"` 提交變更。

切換回主分支（`master`），然後輸入 `git merge feature/new-feature` 合併新分支。如果出現衝突，請手動解決衝突後輸入 `git add .` 和 `git commit -m "Merge feature/new-feature"` 提交變更。

## 完整範例
以下是完整的 Git 命令列操作範例：
```bash
# 初始化 Git
git init

# 連結 GitHub 倉庫
git remote add origin https://github.com/your_username/your_repo_name.git

# 新增檔案
touch hello.txt

# 新增所有變更
git add .

# 提交變更
git commit -m "Initial commit"

# 推送變更到 GitHub 倉庫
git push -u origin master

# 建立新的分支
git branch feature/new-feature

# 切換到新分支
git checkout feature/new-feature

# 新增檔案
touch new-feature.txt

# 新增所有變更
git add .

# 提交變更
git commit -m "Add new feature"

# 切換回主分支
git checkout master

# 合併新分支
git merge feature/new-feature

# 解決衝突
# 手動解決衝突後
git add .
git commit -m "Merge feature/new-feature"
```
## 常見問題
* 如何解決 Git 衝突？
 解決 Git 衝突需要手動修改檔案內容，然後新增變更並提交。
* 如何刪除 Git 分支？
 可以使用 `git branch -d` 刪除本地分支，或者使用 `git push origin --delete` 刪除遠端分支。

## 參考資料
* [Git 官網](https://git-scm.com/)
* [GitHub 官網](https://github.com/)
* [Git Tutorial by Codecademy](https://www.codecademy.com/learn/learn-git)

## 技術結構圖

```mermaid
graph LR
    A[安裝 Git] -->|成功安裝後|> B[建立 GitHub 帳號和倉庫]
    B -->|建立倉庫後|> C[初始化 Git 並連結 GitHub 倉庫]
    C -->|初始化 Git 後|> D[新增檔案、提交變更和推送到 GitHub]
    D -->|提交變更後|> E[建立分支、合併分支和解決衝突]
    E -->|合併分支後|> F[完成]

    style A fill:#f9f,stroke:#333,stroke-width:4px
    style B fill:#f9f,stroke:#333,stroke-width:4px
    style C fill:#f9f,stroke:#333,stroke-width:4px
    style D fill:#f9f,stroke:#333,stroke-width:4px
    style E fill:#f9f,stroke:#333,stroke-width:4px
    style F fill:#f9f,stroke:#333,stroke-width:4px
```
- [Git+Github核心概念大串讲，从零到一全攻略，详细实战教程](https://www.youtube.com/watch?v=bWUUHBVg-7E)