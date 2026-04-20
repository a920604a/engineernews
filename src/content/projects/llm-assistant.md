---
title: "LLM Assistant"
description:
  background: "一套針對 arXiv 與學術文件的知識檢索平台，包含資料擷取、向量索引、RAG 與可視化儀表板。"
  challenge: "需自動化擷取大量 PDF、解析與 chunk，再建立高品質向量索引以支援 RAG 查詢，並處理模型/索引的可觀察性與版本管理。"
  solution: "建立 ingestion pipeline（抓取 metadata、PDF、chunk、embed → Qdrant），以 FastAPI 提供查詢 API，MinIO 保存 artifacts，並用 Prefect 排程與監控流程。"
  core_contributions:
    - "實作每日擷取流程，下載 arXiv metadata 與 PDF、解析與分段並建立 embeddings，存入 Qdrant。"
    - "建置 FastAPI API 層與 RAG service，整合 Ollama / 本地 LLM 作回覆與重排名。"
    - "以 MinIO 儲存原始 PDF 與 artifacts，使用 Postgres 保存 metadata，並加上監控、測試與部署範例。"
  outcome: "完成可運作的 RAG 平台原型，支援學術文件的檢索、Q&A 與每日自動擷取流程，並具備擴充到更多資料源的基礎。"
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
