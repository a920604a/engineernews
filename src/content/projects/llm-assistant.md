---
title: "LLM Assistant"
description:
  background: "一套針對 arXiv 與學術文件的知識檢索平台，包含資料擷取、向量索引、RAG 與可視化儀表板。"
  challenge: "請補充挑戰描述。"
  solution: "請補充解法摘要。"
  core_contributions:
    - "補充：列出 3–6 項核心貢獻或實作細項。"
  outcome: "請補充專案成果或量化指標。"
date: 2024-09-01
tags: ["llm", "assistant", "ai"]
skills: ["fastapi", "qdrant", "postgresql", "minio", "docker-compose", "prefect", "ollama", "python", "react"]
github: "https://github.com/a920604a/llm-assistant"
tag: "llm-assistant"
pinned: false
---

LLM Assistant（Arxiv Knowledge Assistant）是一個針對學術文件的知識檢索與問答平台，實作日常擷取、向量索引與 RAG 查詢流程。

背景：系統需每日擷取 arXiv metadata 與 PDF，將文本切片、製成 embeddings 並儲存到 Qdrant，以支援高品質的向量檢索與後續 LLM 回覆。

挑戰：處理大量 PDF 的擷取與解析、chunk 與 embedding 的穩定性、以及向量索引的可觀察性與模型回應質量的監控。

解法與貢獻：建立 ingestion pipeline（metadata → PDF → chunk → embed → Qdrant），以 FastAPI 提供 API 與 RAG service，使用 MinIO 儲存 artifacts 並以 Prefect 排程與監控流程；整合 Ollama / 本地 LLM 做回答與重排名。

成果：完成可運作的 RAG 原型，支援每日自動擷取、檢索與 Q&A，並提供基礎監控與擴充點以支援更多資料源。
