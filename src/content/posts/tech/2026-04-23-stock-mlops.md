---
title: "Stock MLOps"
date: 2026-04-23T14:56:03+08:00
category: tech
type: case-study
tags: ["python", "react", "docker", "postgresql", "redis", "mlflow", "prometheus", "grafana", "CICD"]
lang: zh-TW
description: "端到端股價預測 MLOps 系統，整合 MLflow 實驗追蹤、Prefect 排程 ETL、Evidently 資料漂移監控與 GitHub Actions CI/CD。"
tldr: "端到端台美股 ML 系統：MLflow + Prefect + Evidently + CI/CD，從訓練到部署全程可追蹤。"
github: "https://github.com/a920604a/stock-mlops"
pinned: false
draft: false
---

Stock MLOps 以台股與美股歷史資料為基礎，實作完整的端到端 ML 系統，涵蓋 ETL 排程、模型訓練、版本管理、即時推理、漂移監控與 CI/CD，讓模型從訓練到部署全程可追蹤。

## 背景

機器學習課程中的模型往往停留在 Jupyter Notebook，缺乏生產化所需的版本管理、排程重訓與監控機制。這個專案以股價預測為主題，實作完整 MLOps 工作流，練習將實驗性代碼轉化為可維護的 ML 系統。

## 挑戰

需在單機 Docker Compose 環境中協調多個異質元件——Prefect 排程、Celery 非同步任務、Kafka 事件流、MLflow 模型版本管理、Evidently 漂移偵測與 Nginx 負載均衡——確保各元件在資料管線中正確串接，且推理與訓練請求能分流至不同後端。

## 解法

以 Docker Compose 統一部署，Nginx 負責路由分流，各元件職責單一：

- 以 **MLflow** 追蹤每次訓練實驗，管理模型版本與 artifact（存放於 MinIO）
- 以 **Prefect 2** 建置 ETL 排程，從 Yahoo Finance 爬取台股/美股資料並存入 ClickHouse
- 以 **FastAPI + Scikit-learn** 建置容器化推理 API，Nginx 依路由分流至預測/訓練後端
- 以 **Celery + Redis** 處理非同步訓練任務，Kafka 串接即時預測結果推送
- 以 **Evidently + Prometheus + Grafana** 建置資料漂移偵測與模型效能監控看板
- 以 **GitHub Actions** 建置 CI/CD，整合 pytest、Black、flake8 與 Discord 通知

## 架構圖

```mermaid
graph TD
  U[User Browser] -->|HTTP Requests| NG[Nginx\nReverse Proxy]
  NG -->|/api/predict| B1[backend1]
  NG -->|/api/train| B2[backend2]
  NG -->|Static files| Static[React Build]

  B1 & B2 -->|Query data| CH[(ClickHouse)]
  B1 & B2 -->|Push task| Redis[(Redis)]

  subgraph ETL
    Prefect[Prefect 2] -->|Fetch + Clean| CH
  end

  subgraph Training
    Celery[Celery Worker] -->|Read data| CH
    Celery -->|Track| MLflow[MLflow Registry]
    MLflow -->|Artifacts| MinIO[(MinIO)]
  end

  Redis --> Celery

  subgraph Monitoring
    Prometheus --> Grafana
    Evidently --> Prometheus
  end
```

## 流程圖

```mermaid
flowchart TD
  A([使用者送出預測請求]) --> B[Nginx 路由 /api/predict]
  B --> C[FastAPI 推理 API]
  C --> D[從 ClickHouse 取特徵]
  D --> E[Scikit-learn 模型推理]
  E --> F[推送結果至 Kafka]
  F --> G([回傳預測值])

  H([Prefect 每日排程]) --> I[Yahoo Finance 爬蟲]
  I --> J[清洗 + 存入 ClickHouse]
  J --> K[觸發 Celery 重訓任務]
  K --> L[MLflow 記錄實驗]
  L --> M[Evidently 漂移偵測]
```

## 成果

完成端到端 MLOps 工作流，涵蓋資料爬取、實驗追蹤、模型部署、漂移監控與 CI/CD，以台股（2330.TW）與美股（AAPL、TSM）為資料集驗證完整管線。
