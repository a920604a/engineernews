---
title: "長期免費使用 Codex、Hermes 等 Agent 工具，保姆級攻略"
date: 2026-06-04T03:54:50.503Z
category: tech
tags: ["Codex", "Hermes", "Agent 工具", "免費使用", "保姆級攻略", "科技", "工具"]
lang: zh-TW
tldr: "教你如何長期免費使用 Codex、Hermes 等 Agent 工具"
description: "教你如何長期免費使用 Codex、Hermes 等 Agent 工具"

type: how-to
original_url: "https://www.youtube.com/watch?v=FwAQ75QCEoU"
draft: true
---

# TL;DR
本文將教你如何長期免費使用 Codex、Hermes 等 Agent 工具。

# 前置條件
* 了解基本的 Linux 操作
* 有一個可用的 VPS 或虛擬機器
* 熟悉 Docker 的基本操作

# 步驟
### 步驟 1：安裝 Docker
在你的 VPS 或虛擬機器上安裝 Docker。安裝方法請參考官方文件。

### 步驟 2：拉取 Agent 工具的 Docker Image
使用以下指令拉取 Codex、Hermes 等 Agent 工具的 Docker Image：
```bash
docker pull codex:latest
docker pull hermes:latest
```
### 步驟 3：啟動 Agent 工具
使用以下指令啟動 Codex、Hermes 等 Agent 工具：
```bash
docker run -d --name codex codex:latest
docker run -d --name hermes hermes:latest
```
### 步驟 4：設定環境變數
設定環境變數以便於存取 Agent 工具：
```bash
export CODEx_URL=http://localhost:8080
export HERMES_URL=http://localhost:8081
```
### 步驟 5：啟動代理伺服器
啟動代理伺服器以便於存取 Agent 工具：
```bash
docker run -d --name proxy nginx:latest
```
### 步驟 6：設定代理伺服器
設定代理伺服器以便於存取 Agent 工具：
```bash
echo "http://localhost:8080" > /etc/nginx/conf.d/codex.conf
echo "http://localhost:8081" > /etc/nginx/conf.d/hermes.conf
nginx -s reload
```
### 步驟 7：測試 Agent 工具
測試 Agent 工具是否正常運行：
```bash
curl ${CODEx_URL}/healthcheck
curl ${HERMES_URL}/healthcheck
```
### 步驟 8：設定定期更新
設定定期更新 Agent 工具以保證最新版本：
```bash
crontab -e
```
加入以下內容：
```bash
0 0 * * * docker pull codex:latest
0 0 * * * docker pull hermes:latest
```
### 步驟 9：設定定期重啟
設定定期重啟 Agent 工具以保證正常運行：
```bash
crontab -e
```
加入以下內容：
```bash
0 0 * * * docker restart codex
0 0 * * * docker restart hermes
```
# 完整範例
以下是完整的 Docker Compose 檔案：
```yaml
version: '3'
services:
  codex:
    image: codex:latest
    ports:
      - "8080:8080"
    restart: always
  hermes:
    image: hermes:latest
    ports:
      - "8081:8081"
    restart: always
  proxy:
    image: nginx:latest
    ports:
      - "80:80"
    restart: always
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
```
# 常見問題
* Agent 工具無法正常運行：請檢查 Docker 和代理伺服器是否正常運行。
* 無法存取 Agent 工具：請檢查代理伺服器和環境變數是否設定正確。

# 參考資料
* Docker 官方文件：https://docs.docker.com/
* Codex 官方文件：https://codex.com/docs/
* Hermes 官方文件：https://hermes.com/docs/
* Nginx 官方文件：https://nginx.org/en/docs/

## 技術結構圖

```mermaid
graph LR
    A[安裝 Docker] -->|完成後|> B[拉取 Agent 工具的 Docker Image]
    B -->|完成後|> C[啟動 Agent 工具]
    C -->|完成後|> D[設定環境變數]
    D -->|完成後|> E[啟動代理伺服器]
    E -->|完成後|> F[設定代理伺服器]
    F -->|完成後|> G[測試 Agent 工具]
    G -->|完成後|> H[設定定期更新]
    H -->|完成後|> I[設定定期重啟]
    I -->|完成後|> J[完成]

    style A fill:#f9f,stroke:#333,stroke-width:4px
    style B fill:#f9f,stroke:#333,stroke-width:4px
    style C fill:#f9f,stroke:#333,stroke-width:4px
    style D fill:#f9f,stroke:#333,stroke-width:4px
    style E fill:#f9f,stroke:#333,stroke-width:4px
    style F fill:#f9f,stroke:#333,stroke-width:4px
    style G fill:#f9f,stroke:#333,stroke-width:4px
    style H fill:#f9f,stroke:#333,stroke-width:4px
    style I fill:#f9f,stroke:#333,stroke-width:4px
    style J fill:#f9f,stroke:#333,stroke-width:4px
```

## 參考資料

- [长期免费使用Codex，Hermes等Agent工具，保姆级攻略](https://www.youtube.com/watch?v=FwAQ75QCEoU)