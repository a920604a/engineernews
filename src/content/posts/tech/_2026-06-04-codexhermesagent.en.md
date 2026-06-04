---
title: "How to Use Codex, Hermes and Other Agent Tools for Free in the Long Run"
date: 2026-06-04T03:54:50.503Z
category: tech
tags: ["codex", "hermes", "agent-tools", "free-usage", "tutorial", "tech", "tools"]
lang: en
tldr: "Learn how to use Codex, Hermes and other Agent tools for free"
description: "A step-by-step guide on how to use Codex, Hermes and other Agent tools without spending a dime"

type: how-to
original_url: "https://www.youtube.com/watch?v=FwAQ75QCEoU"
draft: true
---

# TL;DR
This article will teach you how to use Codex, Hermes, and other Agent tools for free in the long term.

# Prerequisites
* Basic understanding of Linux operations
* A usable VPS or virtual machine
* Familiarity with Docker's basic operations

# Steps
### Step 1: Install Docker
Install Docker on your VPS or virtual machine. Refer to the official documentation for installation instructions.

### Step 2: Pull Agent Tool Docker Images
Use the following commands to pull the Docker images for Codex, Hermes, and other Agent tools:
```bash
docker pull codex:latest
docker pull hermes:latest
```
### Step 3: Start Agent Tools
Use the following commands to start Codex, Hermes, and other Agent tools:
```bash
docker run -d --name codex codex:latest
docker run -d --name hermes hermes:latest
```
### Step 4: Set Environment Variables
Set environment variables to access Agent tools:
```bash
export CODEx_URL=http://localhost:8080
export HERMES_URL=http://localhost:8081
```
### Step 5: Start Proxy Server
Start the proxy server to access Agent tools:
```bash
docker run -d --name proxy nginx:latest
```
### Step 6: Configure Proxy Server
Configure the proxy server to access Agent tools:
```bash
echo "http://localhost:8080" > /etc/nginx/conf.d/codex.conf
echo "http://localhost:8081" > /etc/nginx/conf.d/hermes.conf
nginx -s reload
```
### Step 7: Test Agent Tools
Test Agent tools to ensure they are working properly:
```bash
curl ${CODEx_URL}/healthcheck
curl ${HERMES_URL}/healthcheck
```
### Step 8: Schedule Updates
Schedule regular updates to ensure the latest version of Agent tools:
```bash
crontab -e
```
Add the following content:
```bash
0 0 * * * docker pull codex:latest
0 0 * * * docker pull hermes:latest
```
### Step 9: Schedule Restart
Schedule regular restarts to ensure Agent tools are running smoothly:
```bash
crontab -e
```
Add the following content:
```bash
0 0 * * * docker restart codex
0 0 * * * docker restart hermes
```
# Complete Example
Here is a complete Docker Compose file:
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
# Frequently Asked Questions
* Agent tools are not working properly: Check if Docker and the proxy server are running smoothly.
* Cannot access Agent tools: Check if the proxy server and environment variables are set correctly.

# References
* Docker official documentation: https://docs.docker.com/
* Codex official documentation: https://codex.com/docs/
* Hermes official documentation: https://hermes.com/docs/
* Nginx official documentation: https://nginx.org/en/docs/

## Technical Architecture Diagram

```mermaid
graph LR
    A[Install Docker] -->|Complete|> B[Pull Agent Tool Docker Images]
    B -->|Complete|> C[Start Agent Tools]
    C -->|Complete|> D[Set Environment Variables]
    D -->|Complete|> E[Start Proxy Server]
    E -->|Complete|> F[Configure Proxy Server]
    F -->|Complete|> G[Test Agent Tools]
    G -->|Complete|> H[Schedule Updates]
    H -->|Complete|> I[Schedule Restart]
    I -->|Complete|> J[Complete]

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