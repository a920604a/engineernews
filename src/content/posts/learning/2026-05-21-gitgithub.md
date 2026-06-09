---
title: "從零開始學 Git 與 GitHub：版本控制的第一堂課"
date: 2026-05-21T12:20:28.876Z
category: learning
tags: ["git", "github", "版本控制", "工具", "開發"]
lang: zh-TW
tldr: "用白話解釋 Git 的核心概念，從初始化到分支合併，讓初學者真正看懂版本控制在做什麼。"
description: "一篇給初學者的 Git + GitHub 入門指南，從安裝、建立倉庫、提交變更，到分支與合併，用實際操作帶你走過整個流程。"
type: how-to
original_url: "https://www.youtube.com/watch?v=bWUUHBVg-7E"
draft: false
---

第一次接觸 Git 的人，通常會有同一個問題：「我為什麼需要這個？」

答案很簡單：有了 Git，你再也不用把檔案存成 `final.docx`、`final_v2.docx`、`final_真的最終版.docx`。每一次提交（commit）都是一個時間點的快照，你可以隨時回到任何一個版本，看看當時改了什麼、為什麼改。和別人協作的時候，更不用擔心「我改的版本把你的蓋掉了」這類悲劇。

## TL;DR

Git 是版本控制工具，GitHub 是放 Git 專案的雲端平台。學會「add → commit → push」這個循環，你就掌握了 90% 的日常使用場景。

## 前置條件

- 安裝 Git：前往 [git-scm.com](https://git-scm.com/) 下載對應你作業系統的版本
- 建立一個 GitHub 帳號：[github.com](https://github.com/)
- 能夠開啟終端機（macOS 的 Terminal、Windows 的 PowerShell 或 Git Bash）

安裝完成後，在終端機輸入 `git --version`，看到版本號就表示安裝成功了。

## 核心概念先搞清楚

Git 有三個「工作區」，搞懂這個，很多操作就不會再看不懂：

**工作目錄（Working Directory）**：你實際編輯檔案的地方，就是你電腦上的資料夾。

**暫存區（Staging Area）**：準備要提交的變更的集中地。`git add` 就是把檔案放進這裡。

**本地倉庫（Repository）**：提交過的歷史紀錄都存在這裡。`git commit` 就是把暫存區的內容永久記錄進來。

## 步驟一：建立你的第一個倉庫

在 GitHub 上點右上角的「+」，選「New repository」，填上名稱，按「Create repository」。

然後在你的電腦上：

```bash
# 在想要的位置建立一個新資料夾
mkdir my-project
cd my-project

# 初始化 Git
git init

# 連結到你剛建立的 GitHub 倉庫
git remote add origin https://github.com/你的帳號/my-project.git
```

## 步驟二：做出第一次提交

```bash
# 建立一個檔案
echo "Hello, Git!" > README.md

# 把它加入暫存區
git add README.md

# 提交，並寫下說明
git commit -m "第一次提交：新增 README"

# 推送到 GitHub
git push -u origin main
```

`-u origin main` 的意思是「設定這個分支預設推送到 GitHub 的 main」，之後只需要 `git push` 就夠了。

## 步驟三：用分支做實驗，不影響主線

分支（Branch）是 Git 最強大的功能之一。你可以把分支想成「平行宇宙」：在新分支上改東改西，確定沒問題後再合併回主線，主線永遠是穩定的版本。

```bash
# 建立並切換到新分支
git checkout -b feature/add-login

# 做一些修改
echo "Login page" > login.html
git add login.html
git commit -m "新增登入頁面"

# 切回主分支
git checkout main

# 把 feature/add-login 合併進來
git merge feature/add-login
```

合併完成後，這個分支就可以刪掉了：

```bash
git branch -d feature/add-login
```

## 遇到合併衝突怎麼辦？

如果兩個分支都修改了同一個檔案的同一行，Git 就不知道要留哪個版本，會標記「衝突」，要你手動決定。

衝突的檔案會長這樣：

```
<<<<<<< HEAD
這是主分支的版本
=======
這是 feature 分支的版本
>>>>>>> feature/add-login
```

你只要手動編輯，留下你想要的內容，刪掉那些標記符號，然後再 `git add` 和 `git commit` 就解決了。

## 幾個常用的查看指令

```bash
# 查看目前狀態（哪些檔案有改動）
git status

# 查看提交歷史（簡潔版）
git log --oneline

# 查看某次提交的詳細內容
git show <commit-hash>
```

## 常見問題

**push 時出現 permission denied，怎麼辦？**
通常是認證問題。GitHub 目前建議使用 Personal Access Token，到帳號設定頁面產生一組，push 時用它當密碼即可。

**commit 訊息寫錯了，能改嗎？**
如果還沒 push 出去，可以用 `git commit --amend` 修改最後一次的訊息。已經 push 的話就不建議改了，因為會影響到和你協作的人的歷史紀錄。

**怎麼讓 Git 忽略某些檔案？**
在專案根目錄建立一個 `.gitignore` 檔案，把不想追蹤的路徑寫進去，例如 `node_modules/` 或 `.env`。GitHub 有提供各語言的 `.gitignore` 範本，可以直接拿來用。

## 參考資料

- [Git 官方文件](https://git-scm.com/doc)
- [GitHub 官方文件](https://docs.github.com/)
- [Pro Git（免費中文書）](https://git-scm.com/book/zh-tw/v2)
