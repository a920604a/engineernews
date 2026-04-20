---
title: "Stock MLOps"
description:
  background: "針對股票預測建立的 MLOps 專案，涵蓋資料擷取、特徵工程、模型訓練、部署與監控全流程。"
  challenge: "需建立可重複的訓練/部署流程、實驗追蹤與模型監控，確保能處理資料漂移並自動化 retraining。"
  solution: "以 Prefect 管理 ETL 與訓練流程，使用 MLflow 追蹤實驗，FastAPI 提供 inference API，並用 Evidently / Prometheus / Grafana 做模型與資料監控。"
  core_contributions:
    - "撰寫 ETL 與訓練流程，並以 Prefect 2 排程自動化流程執行。"
    - "將實驗結果與模型版本登錄到 MLflow，並以 MinIO/Artifact 存放模型檔案。"
    - "建置 FastAPI 推理服務，並整合 Evidently 與 Prometheus+Grafana 做指標與漂移監控。"
  outcome: "得到一套端到端的 MLOps 範例，可用於教學與實驗，並驗證模型運作與監控流程可行性。"
tags: ["mlops", "finance", "stock"]
skills: ["fastapi", "scikit-learn", "pandas", "mlflow", "prefect", "evidently", "prometheus", "grafana", "docker-compose", "python"]
github: "https://github.com/a920604a/stock-mlops"
tag: "stock-mlops"
pinned: false
---

Stock MLOps 是一個將課程學到的 MLOps 實務整合成完整範例的專案，涵蓋資料擷取、特徵工程、模型訓練、部署與監控流程。

背景：項目目標是建立可重複執行的 ML lifecycle，讓使用者能追蹤實驗、版本化模型並透過 API 提供推理服務。

挑戰：需要自動化 ETL 與訓練流程、實驗追蹤、模型監控與資料漂移偵測，並在本地或容器化環境中穩定執行。

解法與貢獻：以 Prefect 管理 ETL 與 retraining 流程；使用 MLflow 追蹤實驗與模型版本；搭配 FastAPI 建置推理服務，並以 Evidently + Prometheus + Grafana 做監控儀表板；提供 Docker Compose 範例以利部署。 

成果：建立了一套可復現的 MLOps 教學範例，支援實驗追蹤、模型註冊與監控，方便教學與研究用途。
