---
title: "想蓋一個能用的 RAG：InfiniFlow 2024 年度總結給我的 5 個 infra 功課"
date: "2026-07-13"
category: "tech"
tags: ["ai","llm","rag","chunking","reranker","hybrid-search","cloudflare","system-design"]
type: "deep-dive"
draft: false
series:
  name: "RAG"
  order: 2
key_points:
  - "InfiniFlow 2024 年度總結可以濃縮成 5 個 infra 功課：文件解析、Chunking 上下文化、三路混合搜尋、Tensor Reranker、GraphRAG。"
  - "純長度切分的 chunking 已到頂，真正有價值的是用 LLM 給 chunk 補上下文標籤（Contextual Retrieval / dsRAG）。"
  - "『向量 + 稀疏向量 + BM25』三路混合是召回品質上限，缺一路都會留下明顯缺口。"
  - "Tensor Reranker（ColBERT 家族）把重排放進資料庫層做，能對更大的粗排結果做精排——但 Cloudflare 生態暫時沒有原生支援。"
  - "engineer-news 的優先順序：先補 Cross-Encoder Reranker 和 Contextual Retrieval，其次 SQLite FTS5 走 BM25，GraphRAG 短期不做。"
tldr: "上一篇拉高看 RAG 五階段全景，這篇拉近看實際想蓋一個 RAG 要面對的 5 個 infra 功課：文件入口解析、Chunking 上下文化、三路混合搜尋、Tensor Reranker、GraphRAG 語意鴻溝。每個功課都對照 engineer-news 現況，收尾給出對個人站的優先順序清單。"
description: "把 InfiniFlow（RAGFlow 團隊）2024 年度 RAG 總結收斂成 5 個工程功課，並用 engineer-news 的 Cloudflare D1 + Vectorize + bge-m3 實作做對照，給出個人站的 RAG 演進優先順序。"
glossary:
  - term: "BM25"
    aliases: ["bm25", "Best Match 25"]
    zh: "BM25"
    definition: "1994 年提出的關鍵字檢索排序演算法，把「這個詞在文件裡出現幾次、在整個語料庫裡有多罕見」量化成分數。RAG 混合搜尋裡負責精確關鍵字匹配那一路。"
    advanced: "TF-IDF 家族的改良版，用飽和函數避免長文件因為詞頻高而佔便宜。工程上需要倒排索引（含位置資訊才能做短語查詢）+ 動態剪枝才能達到生產可用。SQLite FTS5、Elasticsearch 內建。"
    definition_en: "A 1994 keyword retrieval ranking algorithm that scores how often a term appears in a document weighted by how rare it is in the corpus. In hybrid RAG, it handles the exact keyword matching lane."
    advanced_en: "An improved TF-IDF variant using a saturation function to prevent long documents from gaming term frequency. Production use requires inverted indexes (with positions for phrase queries) and dynamic pruning. Built into SQLite FTS5 and Elasticsearch."
  - term: "Cross-Encoder"
    aliases: ["cross encoder", "交叉編碼器"]
    zh: "交叉編碼器"
    definition: "把 query 和 document 拼在一起送進同一個 BERT 模型，讓兩者的 token 相互看到，最後輸出一個「這對相關嗎」的分數。RAG 精排最常用的 Reranker 架構。"
    advanced: "跟 Bi-Encoder（分別編碼）比，Cross-Encoder 捕捉 query-doc token 兩兩交互，排序品質高很多，但每個 query-doc pair 都要跑一次模型，成本高——所以只能用來精排（top-50 → top-5），不能用來粗排。代表：BGE-Reranker、jina-reranker。"
    definition_en: "Concatenates query and document into a single BERT input so their tokens can attend to each other, outputting one relevance score. The most common reranker architecture in RAG's fine-ranking stage."
    advanced_en: "Compared to bi-encoders (which encode query and doc separately), cross-encoders capture pairwise token interactions and rank much better, but each query-doc pair needs a full model pass — so they're only used for fine-ranking (top-50 → top-5), not coarse retrieval. Examples: BGE-Reranker, jina-reranker."
  - term: "Late Interaction Reranker"
    aliases: ["Tensor Reranker", "ColBERT", "延遲交互"]
    zh: "延遲交互重排"
    definition: "介於 Bi-Encoder 和 Cross-Encoder 之間的第三種排序架構：索引階段就把文件每個 token 的 embedding 存下來（一份文件用一個 tensor 表示），查詢時只算 query token 和 doc token 兩兩相似度再累加。"
    advanced: "代表是 Stanford 的 ColBERT 系列（v1 SIGIR 2020、v2 2021）以及 jina-colbert-v2、JaColBERT。品質接近 Cross-Encoder、但線上推理只做內積、可以放進資料庫層（Vespa、Infinity 已支援），適合對更大的粗排結果做重排。多模態 RAG（ColPali）也用同樣思路。"
    definition_en: "A third reranker architecture between bi-encoder and cross-encoder: at indexing time, store the token-level embedding of every document (one tensor per doc); at query time, only compute pairwise similarities between query and doc tokens and sum them."
    advanced_en: "Represented by Stanford's ColBERT family (v1 SIGIR 2020, v2 2021), jina-colbert-v2 and JaColBERT. Quality approaches cross-encoders but online inference is just dot products, letting it live inside the database (supported by Vespa, Infinity). Enables reranking a much larger candidate set. ColPali applies the same idea to multimodal RAG."
  - term: "Contextual Retrieval"
    aliases: ["contextual chunking", "上下文檢索"]
    zh: "上下文檢索"
    definition: "Anthropic 在 2024 年 9 月提出的做法：sync 階段讓 LLM 為每個 chunk 生成一小段「這個 chunk 在原文中討論什麼」的上下文說明，跟原文串接後一起 embed，用來緩解 chunk 缺乏全文語境導致的檢索漏召。"
    advanced: "跟 dsRAG 的 auto-context、Jina 的 Late Chunking 目標一致——都是為了緩解語意鴻溝。實作最直接：sync 時每個 chunk 多呼叫一次 LLM，離線成本翻倍但只做一次。已成為 2024 下半年 chunking 上下文化的事實標準之一。"
    definition_en: "Anthropic's September 2024 approach: during indexing, an LLM generates a short piece of context for each chunk (\"what this chunk is discussing in the source doc\"), which is concatenated with the original text before embedding. Reduces missed retrievals caused by chunks lacking global context."
    advanced_en: "Shares the goal of dsRAG's auto-context and Jina's Late Chunking — closing the semantic gap. Simplest to implement: one extra LLM call per chunk at sync time, doubling offline cost but done only once. Became a de facto standard for context-augmented chunking in late 2024."
audio_url: "/api/tts/r2/tts/tts_20260713_133545_108012.mp3"
---

上一篇用五階段全景梳理 RAG 兩年演進，鏡頭拉高看趨勢。這一篇拉近，看實際想蓋一個 RAG 系統要面對哪些工程決策。素材主要來自 InfiniFlow（RAGFlow 團隊）2024 年底那篇年度總結，我把它整理成「五個 infra 功課」，每個功課配上對照 engineer-news 這個站的現況與缺口。

上一篇說本站落在 Naive RAG 邊界，這一篇是那句話的展開清單。

## 功課 1：文件入口的品質——Document Intelligence

不論是把純文字餵給 LLM、還是把包含表格公式流程圖的 PDF 餵給 LLM，都有一個共同前提——資料入口品質決定最終品質。Garbage In, Garbage Out 在 RAG 場景變成 **Quality In, Quality Out**。

企業內部大部分資料都是 PDF、PPT、Word、圖文混排的雜誌，不是純文字。用早期 LLMOps 那套（LangChain + 向量庫 + 純文字 chunker）只能處理純文字，這就把 RAG 的商業價值天花板壓得很低。

過去這類問題叫做 **Document Intelligence（文件智能）**，涉及多個子任務：

- 文件布局辨識（Layout Analysis）
- 表格結構辨識（TSR）
- 公式辨識
- 流程圖、餅圖辨識

過去這些任務各自獨立、有專用模型。RAG 把它們整合起來，形成**廣義 OCR**，作為 RAG 的入口層。方法上分兩代：

**第一代（CNN + 傳統視覺）**：PaddleOCR、RAGFlow DeepDoc、MinerU、Docling。可跑在 CPU、成本低，但對不同場景泛化差——每個場景要單獨訓一個模型，被戲稱為「雕花」。

**第二代（Encoder-Decoder Transformer）**：Meta 的 Nougat、GOT-OCR 2.0、StructEqTable、M2Doc。用生成式模型統一處理各種文檔，泛化能力更強、需 GPU。這條路線跟 VLM 的架構高度相似，2025 年很可能收斂成統一的多模態文件解析模型。

**對照本站**：engineer-news 只吃 Markdown（作者手寫或 AI 整理成 Markdown），完全繞過 OCR 這一層。這個功課對本站來說是 **N/A**，不欠。反過來說，這也限制了 RAG 能吃的資料類型——如果之後想擴展到 PDF 論文、投影片、白板照片，就得補這一層。目前這條路徑優先度極低。

## 功課 2：Chunking 從長度切分走向上下文化

Naive Text Chunking 就是「按字數硬切」——這是本站現在的做法。`scripts/sync-to-d1.ts` 的 `chunkText()`：

```typescript
function chunkText(text: string, maxLength = 1000): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';
  for (const p of paragraphs) {
    if ((current + p).length > maxLength) {
      if (current) chunks.push(current.trim());
      current = p;
    } else {
      current += (current ? '\n\n' : '') + p;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}
```

段落合併到 1000 字上限，就這樣。這種切法有一個結構性痛點——**chunk 內部沒有全文語境**。

例子：一篇文章講「D1 batch timeout 的解法」，其中一段寫「在 wrangler.jsonc 加上這個設定即可」。這段 chunk 拿出來單獨看，完全不知道在講什麼 D1、什麼 timeout、什麼設定。檢索時 query「D1 batch timeout」很難命中這段。

2024 年 Chunking 這一層有一系列進化：

- **Late Chunking**（Jina）：先用 Embedding 模型對整份文檔做編碼，在最後 mean pooling 之前才切邊界。Chunk 邊界之前的所有 token 都能「看到」上下文，語意保留更完整。但要求 Embedding 模型是 mean pooling（bge-m3 是 CLS pooling），不能直接搭。
- **dsRAG**：LLM 為每個 chunk 補一段 auto-context，解決本文缺線索的問題。
- **Contextual Retrieval**（Anthropic）：概念跟 dsRAG 類似——LLM 給每個 chunk 生成一小段 chunk-specific 的上下文說明，跟原文一起 embed。這個做法效果好、實作直觀，已經是 2024 下半年的事實標準之一。
- **Meta-Chunking**（人大 & 上海算法創新研究院）：LLM 判斷句子邊界，尋找有邏輯連結的句子集合。
- **Mix-of-Granularity**（上海 AI + 北航）：多粒度 chunking + 動態遍歷深度，避免上下文冗餘。

整體結論：**單純調整 chunk 大小的收益已經到頂了**。真正有價值的是**給 chunk 補上下文標籤**——這件事只有 LLM 能做，而且成本可以接受（sync 階段一次性投入）。

**對照本站**：純長度切分是明確缺口。最直接補法是走 Contextual Retrieval：sync 階段每個 chunk 呼叫一次 llama-3.1-8b（或更小的模型），生成 50-100 字的上下文摘要跟原文串接後 embed。sync 成本翻倍，但可以離線做、只做一次。

## 功課 3：混合搜尋——向量 + 稀疏向量 + BM25

2024 年 IBM Research 的 BlendedRAG 論證了一件事：**向量 + 稀疏向量 + BM25 三路混合是召回品質的上限**，比任何單路或兩路都好。

為什麼一定要三路？

- **向量**：語意召回，擅長「意思相近但用詞不同」。天生無法處理精確查詢——「2024 年 3 月我們公司財務計畫」很可能召回其他時間段的內容。
- **稀疏向量**（如 SPLADE）：由預訓練模型輸出固定維度的稀疏向量，可以看作標準化的關鍵字擴展。通用查詢表現好，但遇到 domain-specific 詞彙（型號、代號、內部術語）會漏——因為那些詞不在預訓練詞彙中。
- **BM25**：30 年前的老演算法，對精確關鍵字匹配最直接。稀疏向量取代不了它。

三路各有所長，不是誰替代誰的關係。

工程上真正難的不是「支援 BM25」，而是**支援合格的 BM25**：

- 短語查詢（phrase query）——需要倒排索引保存位置資訊
- 動態剪枝——避免 OR 查詢因為關鍵字太多而爆炸
- 中文分詞——包括二元分詞、詞權重、停用詞過濾

Elasticsearch 是這方面的黃金標準。RAGFlow 一開始就選 ES 當唯一後端，理由就是這些。2024 年 6 月 OpenAI 收購 Rockset，很大原因就是 Rockset 是雲原生、又能提供接近 ES 的全文檢索能力。純向量資料庫（Milvus、Qdrant）宣稱支援 BM25 的越來越多，但真正能滿足「短語查詢 + 動態剪枝 + 中文分詞」的很少。

**對照本站**：D1 是 SQLite，SQLite 有一個非常好用的內建全文索引——**FTS5**，支援 tokenizer、phrase query、rank function。要補 BM25 這一路，可以：

1. sync 時額外建一張 `posts_fts` 虛擬表，索引 `title + tldr + content`
2. `/api/search` 加一路：`SELECT ... FROM posts_fts WHERE posts_fts MATCH ? ORDER BY rank`
3. 用 RRF（Reciprocal Rank Fusion）合併向量路和 BM25 路的結果

工作量比 Reranker 大（要建 FTS5 表、處理中英混合 tokenizer），但這是「有沒有 hybrid search」的分水嶺。稀疏向量那一路暫時可以先不做，Cloudflare 生態沒有直接的 SPLADE 服務。

## 功課 4：Tensor Reranker——延遲交互模型

Reranker 這一年也在快速演化，分成三代：

**Cross-Encoder**（BGE-Reranker）：query 和 doc 拼在一起送進 BERT，捕捉 token 交互。品質高、成本適中。目前主流。

**LLM-based Reranker**（gte-Qwen2-7B）：用 7B 級 LLM 直接打分。品質更好但推理成本翻倍。

**Late Interaction / Tensor Reranker**（ColBERT 系列）：索引階段就把每個 token 的 embedding 存下來，一份文件用一個 tensor（多向量）表示。查詢時只算 query token 和 doc token 兩兩相似度再累加。

Tensor Reranker 有一個工程優勢：**它可以放進資料庫層做**。查詢階段沒有 LLM 推理，只有 tensor 內積，可以做得很快。這意味著粗排結果不需要嚴格控制到 5-10 個，可以擴大到幾百、上千個做 rerank，補救粗排品質不佳的情況。

Vespa 是最早工程化 tensor 的資料庫，Infinity（RAGFlow 團隊自家）2024 年中補上。ColBERT / ColBERT v2 / JaColBERT（日文）/ jina-colbert-v2（多語言）系列模型也在快速就緒。

**對照本站**：Cloudflare Workers AI 目前有 `@cf/baai/bge-reranker-base`（Cross-Encoder），Tensor Reranker 這一層沒有原生支援。所以本站的實務路徑是：

1. **短期**：先加 Cross-Encoder（BGE-Reranker），這已經是巨大進步
2. **長期**：等 Cloudflare 推出 ColBERT 系列，或自架 embedding service

Tensor Reranker 對本站現階段（150 篇文章）投入產出比不高，優先度低。

## 功課 5：GraphRAG 與語意鴻溝

上一篇已經詳細講過 GraphRAG 的光譜（微軟 GraphRAG → LightRAG → LazyGraphRAG → HippoRAG → KAG），這裡只補三個工程觀察。

**RAPTOR 是 GraphRAG 之前的過渡**：先做文本聚類，然後用 LLM 為每個聚類生成摘要，這些摘要跟原文一起餵給搜尋系統。它已經在解決「跨 chunk 的宏觀提問」問題，只是沒有明確的圖結構。RAGFlow 中期加入 RAPTOR 作為 GraphRAG 的替代。

**SiReRAG 提出雙軸召回**：文本之間有兩個維度——**相似度**（語意距離）和**相關性**（實體/關係關聯）。RAPTOR 走相似度側，GraphRAG 走相關性側，SiReRAG 把兩者合起來。這個切分很清晰，之後的 Graph-RAG 變種基本都可以放到這個座標系裡看。

**HybridRAG 的 schema 洞見**：一個功能完備的資料庫，其實不需要圖資料庫來實作 GraphRAG。邊、實體、社群摘要——這些都是文字，只要一張具備全文索引 + 向量索引的表就能承載，多加一個 `type` 欄位區分類型即可。這也是為什麼 RAGFlow 選擇繼續用 Elasticsearch / Infinity，而不是加入 Neo4j。這對本站來說是重要提示：如果哪天真的要做 GraphRAG，D1 一張表也就夠了。

**對照本站**：暫時不做。GraphRAG 的適用場景是「跨文件關聯強、需要全域理解」——這對 150 篇個人技術文的規模不成立。等資料量上千、或者讀者開始問「這個站對 XXX 主題整體是什麼觀點」這類問題，才值得投入。

## 番外：Agentic + Memory 一句話

Mem0 只定義了一組 memory 管理 API 就爆紅，說明 memory 這個 primitive 需求很強。但 Memory 本身的 infra 已經很成熟（實時過濾 + 搜尋而已）——真正稀缺的是「怎麼把 Memory 跟 Reasoning 結合」。這是 2025 年的熱區，但對個人站來說是三五年後才要面對的問題。

## 番外：多模態 RAG 一句話

VLM 兩年內從「識別日常用品」進化到「理解企業級多模態文檔」。ColPali 開創了「跳過 OCR、直接對圖片生成 tensor embedding」的路線，配合 Tensor Reranker，可以做到多模態端到端 RAG。ColPali 論文推薦丟掉 OCR，但那是跟第一代 CNN OCR 比的——跟第二代 Encoder-Decoder OCR 比，兩條路線各有適用場景，會並行很久。

## 五個功課的優先順序（對個人站）

用 engineer-news 的視角回頭排序：

| 優先度 | 功課 | 為什麼 |
|---|---|---|
| ★★★ | Reranker（先 Cross-Encoder，不用等 Tensor） | Workers AI 已有 bge-reranker-base，一晚能加，效果立即可見 |
| ★★★ | Contextual Retrieval（chunk 上下文化） | sync 階段離線做，一次性投入，直接補「語意鴻溝」最基礎的一層 |
| ★★ | BM25 三路混合（走 SQLite FTS5） | 專有名詞救援必備，工作量中等 |
| ★ | Document Intelligence | 目前只吃 Markdown，暫時 N/A |
| ✕ | GraphRAG / Agentic RAG / Tensor Reranker | 資料量與需求未到 |

排序背後的原則：**先做「單次修改能永久改善」的功課**（Chunking、Reranker），再做「持續投入才有回報」的功課（Hybrid Search 需要維護 FTS5 索引），最後才是「需要架構級改動」的功課（GraphRAG）。

## 結：RAG 是一整個 infra 棧的協同

InfiniFlow 那篇年度總結裡最有價值的一個判斷是：

> RAG 並不是一個簡單的應用，它是一個以搜尋為中心，結合各類資料、基礎組件、各類大模型小模型在一起協同工作的複雜系統。

上一篇的 System 1 → System 2 論點講的是「範式轉移」——想像力的邊界在哪。這一篇的五個功課講的是「地基」——想去那邊之前，先把腳下每一塊磚鋪穩。

RAG 就像過去的資料庫——對外的介面極簡，內部極複雜。真正決定 RAG 品質的，不是選了哪個 embedding 模型，而是這五個功課有沒有分別做好。engineer-news 這個站的下一步，就從「五個功課清單」開始一格一格填。

## 參考資料

- InfiniFlow — 万字长文梳理 2024 年的 RAG（RAGFlow 團隊年度總結）
- Blended RAG: Improving RAG Accuracy with Semantic Search and Hybrid Query-Based Retrievers (IBM Research, 2024)
- PaddleOCR — https://github.com/PaddlePaddle/PaddleOCR
- MinerU — https://github.com/opendatalab/MinerU
- Docling — https://github.com/DS4SD/docling
- Nougat (Meta) — https://github.com/facebookresearch/nougat
- GOT-OCR 2.0 — https://github.com/Ucas-HaoranWei/GOT-OCR2.0
- StructEqTable — https://github.com/UniModal4Reasoning/StructEqTable-Deploy
- M2Doc: A Multi-Modal Fusion Approach for Document Layout Analysis (AAAI 2024)
- Late Chunking: Contextual Chunk Embeddings Using Long-Context Embedding Models (Jina)
- dsRAG — https://github.com/D-Star-AI/dsRAG
- Contextual Retrieval (Anthropic) — https://www.anthropic.com/news/contextual-retrieval
- Meta-Chunking: Learning Efficient Text Segmentation via Logical Perception
- Mix-of-Granularity: Optimize the Chunking Granularity for Retrieval-Augmented Generation
- ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT (SIGIR 2020)
- ColBERT v2: Effective and Efficient Retrieval via Lightweight Late Interaction
- Vespa — https://github.com/vespa-engine/vespa
- Infinity (RAGFlow) — https://github.com/infiniflow/infinity
- Jina ColBERT v2 — https://huggingface.co/jinaai/jina-colbert-v2
- JaColBERT — https://huggingface.co/answerdotai/JaColBERTv2.5
- RAPTOR: Recursive Abstractive Processing for Tree Organized Retrieval
- SiReRAG: Indexing Similar and Related Information for Multihop Reasoning
- HybridRAG: Integrating Knowledge Graphs and Vector Retrieval Augmented Generation (ACM AI in Finance, 2024)
- ColPali: Efficient Document Retrieval with Vision Language Models
- SQLite FTS5 — https://www.sqlite.org/fts5.html
