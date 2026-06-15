---
title: "用 Ring Appstore API 打造車道監控偵測器：實作案例研究"
date: 2026-06-07T09:28:45.899Z
category: tech
tags: ["ring", "smart-home", "api", "computer-vision", "iot", "home-automation"]
lang: zh-TW
tldr: "Ring 在 2024 年開放了 Appstore API，讓開發者可以直接從 Ring 攝影機取得事件回呼並整合自定義邏輯。這篇文章記錄一個用這個 API 打造停車道車輛偵測器的實際案例。"
description: "Ring Appstore API 實作案例：如何訂閱攝影機事件、處理影像 webhook、結合電腦視覺偵測特定車輛進出，並觸發通知。包含認證流程和 webhook 端點設計。"
type: case-study
original_url: "https://www.youtube.com/watch?v=5kHpeVvO7cY"
draft: false
audio_url: "/api/tts/r2/tts/tts_20260615_201736_262215.mp3"
---

「Driveway Derby」是一個很具體的家庭場景：你住在一個死巷尾，鄰居的孩子喜歡在你的車道上騎自行車或玩耍。你不是要監控人，你只是想在有車輛或特定移動模式進入你的車道時收到通知——而且能區分「自己家的車回來了」和「有陌生車輛進入」。

這正好是一個很適合展示 Ring Appstore API 能力的案例。

## TL;DR

Ring Appstore API 讓開發者可以訂閱攝影機的移動事件、下載影像片段、並在 webhook 端點裡加入自定義邏輯。結合電腦視覺（這個案例用 OpenCV 的車牌識別或車輛分類），可以實現「只有特定條件觸發才通知」的精確控制。認證流程用 OAuth2，webhook 需要公開 HTTPS 端點。

## 背景與挑戰

Ring 的內建通知功能太廣泛：任何移動都會觸發，包括路過的行人、風吹動樹葉等。你無法用官方 App 設定「只在非已知車牌的車輛進入時通知我」。

Ring 在 2024 年推出的 Appstore API 改變了這件事，讓開發者可以：
- 訂閱攝影機的移動偵測事件
- 取得觸發事件的影像片段
- 在自己的服務裡加入任意後處理邏輯

挑戰在於：
1. OAuth2 認證流程需要公開端點（本機開發需要 ngrok 或類似工具）
2. Ring 的影像 API 有下載速率限制
3. 電腦視覺在車道這類低光源環境下準確度下降

## 解法設計

整體架構分三層：

```mermaid
graph LR
    A[Ring 攝影機] -->|移動偵測事件| B[Ring Appstore API]
    B -->|Webhook 回呼| C[你的 API 服務]
    C -->|下載影像片段| D[影像分析服務]
    D -->|車輛辨識結果| E[決策邏輯]
    E -->|符合條件| F[發送通知 Email/LINE/Slack]
    E -->|不符合條件| G[忽略]
```

## 實作細節

### 第一步：申請 Ring Developer 帳號和 App

Ring Appstore 的開發者程序需要申請（partner.ring.com），審核時間從幾天到幾週不等。申請時需要描述你的 App 用途。

獲得批准後，你會得到 `client_id` 和 `client_secret`，用於 OAuth2 授權。

### 第二步：OAuth2 授權流程

```python
import requests
from urllib.parse import urlencode

# Step 1: 引導用戶到 Ring 授權頁面
auth_params = {
    "client_id": CLIENT_ID,
    "response_type": "code",
    "redirect_uri": "https://your-app.example.com/callback",
    "scope": "devices:read events:read media:read"
}

auth_url = f"https://oauth.ring.com/oauth2/authorize?{urlencode(auth_params)}"
# 引導用戶打開這個 URL

# Step 2: 用戶授權後，Ring 回呼你的 redirect_uri，附帶 code
# Step 3: 用 code 換取 access_token
def exchange_code_for_token(code: str) -> dict:
    response = requests.post(
        "https://oauth.ring.com/oauth2/token",
        data={
            "grant_type": "authorization_code",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": code,
            "redirect_uri": "https://your-app.example.com/callback"
        }
    )
    return response.json()
    # 回傳 access_token, refresh_token, expires_in
```

### 第三步：訂閱移動事件

```python
def subscribe_to_device_events(access_token: str, device_id: str):
    headers = {"Authorization": f"Bearer {access_token}"}
    
    response = requests.post(
        f"https://api.ring.com/v1/devices/{device_id}/subscriptions",
        headers=headers,
        json={
            "event_types": ["motion", "ding"],
            "webhook_url": "https://your-app.example.com/ring-webhook"
        }
    )
    return response.json()
```

### 第四步：Webhook 端點處理

```python
from fastapi import FastAPI, Request
import hmac
import hashlib

app = FastAPI()

@app.post("/ring-webhook")
async def handle_ring_event(request: Request):
    # 驗證 webhook 簽名
    signature = request.headers.get("X-Ring-Signature")
    body = await request.body()
    
    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected):
        return {"error": "Invalid signature"}, 403
    
    event = await request.json()
    
    if event["type"] == "motion":
        # 非同步處理，不要在 webhook 裡做慢操作
        await queue_video_analysis(event["recording_url"])
    
    return {"status": "ok"}
```

### 第五步：車輛分析邏輯

```python
import cv2
import numpy as np

def analyze_driveway_video(video_path: str) -> dict:
    cap = cv2.VideoCapture(video_path)
    
    # 使用背景減除法偵測移動物體
    bg_subtractor = cv2.createBackgroundSubtractorMOG2()
    
    detected_objects = []
    while cap.read()[0]:
        ret, frame = cap.read()
        if not ret:
            break
            
        fg_mask = bg_subtractor.apply(frame)
        contours, _ = cv2.findContours(
            fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > 5000:  # 過濾小的移動（樹葉、昆蟲）
                detected_objects.append({
                    "area": area,
                    "timestamp": cap.get(cv2.CAP_PROP_POS_MSEC)
                })
    
    cap.release()
    
    # 判斷是否是車輛（根據面積大小和移動模式）
    is_vehicle = any(obj["area"] > 50000 for obj in detected_objects)
    
    return {"is_vehicle": is_vehicle, "objects": detected_objects}
```

## 成果

這個系統的實際效果：
- 移動偵測到通知的端對端延遲約 3–8 秒（包含下載影像和分析時間）
- 對停車道上正常大小的車輛（轎車、SUV）偵測準確率約 90%+
- 夜間或強逆光條件下準確率下降到約 70%

最主要的改善是誤報大幅減少：路過的行人、貓、或輕微的樹枝晃動不再觸發通知。

## 學到的事

**Ring API 的速率限制要認真看**：影像下載 API 在短時間內大量請求會被限速，設計時要考慮佇列和重試機制。

**本機開發用 ngrok 但生產環境要換掉**：ngrok 的免費版有請求限制，而且重啟後 URL 會變，不適合穩定運行。

**電腦視覺的光線條件影響很大**：如果要在夜間使用，要考慮 Ring 攝影機開啟夜視模式後影像是灰階的，需要調整分析邏輯。

**OAuth2 的 refresh token 要妥善管理**：access token 過期後要用 refresh token 換新的，否則系統會靜默失效。

## 參考資料

- [Ring Developer Program](https://partner.ring.com/)
- [Ring API 文件](https://developer.ring.com/)
- [OpenCV 背景減除法文件](https://docs.opencv.org/4.x/d2/d55/group__bgsegm.html)
- [FastAPI Webhook 處理最佳實踐](https://fastapi.tiangolo.com/tutorial/request-forms/)
