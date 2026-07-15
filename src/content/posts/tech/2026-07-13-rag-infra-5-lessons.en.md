---
title: "Building a Real RAG: 5 Infra Lessons from InfiniFlow's 2024 Year-in-Review"
date: "2026-07-13"
category: "tech"
tags: ["ai","llm","rag","chunking","reranker","hybrid-search","cloudflare","system-design"]
lang: en
type: "deep-dive"
draft: false
series:
  name: "RAG 系統架構"
  order: 2
key_points:
  - "InfiniFlow's 2024 year-in-review distills into 5 infra lessons: document parsing, chunk contextualization, three-lane hybrid search, tensor reranker, and GraphRAG."
  - "Pure length-based chunking has flat-lined — real gains come from letting an LLM tag each chunk with global context (Contextual Retrieval / dsRAG)."
  - "'Vector + sparse vector + BM25' three-lane hybrid is the recall ceiling; missing any lane leaves a clear gap."
  - "Tensor Rerankers (the ColBERT family) push reranking into the database layer and can rerank a much larger candidate set — but Cloudflare's stack doesn't natively support it yet."
  - "For engineer-news, the priority is Cross-Encoder Reranker + Contextual Retrieval first, then SQLite FTS5 for BM25; GraphRAG stays off the roadmap for now."
tldr: "The previous post zoomed out for a five-stage panorama of RAG. This one zooms in on the five infra lessons any real RAG has to face: document ingestion, contextualized chunking, three-lane hybrid search, tensor reranker, and GraphRAG's semantic gap. Each lesson is checked against engineer-news's current stack, ending with a priority list for a personal site."
description: "Condenses InfiniFlow (the RAGFlow team)'s 2024 RAG year-in-review into 5 engineering lessons, checked against engineer-news's Cloudflare D1 + Vectorize + bge-m3 stack, and closes with an evolution priority list for personal sites."
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
audio_url: "/api/tts/r2/tts/tts_20260713_133439_768370.mp3"
---

The previous post zoomed out for a five-stage panorama of RAG's two-year evolution. This one zooms in on the actual engineering decisions of building a working RAG. The material comes mostly from InfiniFlow (the RAGFlow team)'s late-2024 year-in-review, which I distill into "five infra lessons" — each cross-checked against engineer-news's current stack.

The previous post concluded the site sits at the Naive RAG edge. This post unpacks that sentence into a concrete checklist.

## Lesson 1: Document Ingestion Quality — Document Intelligence

Whether you're feeding pure text or a PDF full of tables, formulas and flowcharts to the LLM, there's a common prerequisite — input quality caps output quality. Garbage In, Garbage Out becomes **Quality In, Quality Out** in RAG.

Most enterprise data is PDFs, PPTs, Word docs, and magazines with mixed text and images — not plain text. Early LLMOps stacks (LangChain + vector DB + plain-text chunker) only handle plain text, which crushes RAG's ceiling.

This class of problems is historically called **Document Intelligence**, covering several subtasks:

- Layout Analysis
- Table Structure Recognition (TSR)
- Formula recognition
- Flowchart / pie chart recognition

Each used to have specialized models. RAG bundles them into a **broad-sense OCR** as the input layer. Two generations of approach:

**Gen 1 (CNN + traditional vision)**: PaddleOCR, RAGFlow DeepDoc, MinerU, Docling. CPU-friendly, cheap, but poor generalization — each scenario needs its own model, sometimes called "carving flowers."

**Gen 2 (Encoder-Decoder Transformer)**: Meta's Nougat, GOT-OCR 2.0, StructEqTable, M2Doc. A single generative model handles diverse document types with stronger generalization; needs GPU. Its architecture closely mirrors VLMs, and 2025 will likely see convergence into unified multimodal document parsing models.

**Against my site**: engineer-news only consumes Markdown (hand-written or AI-normalized), bypassing OCR entirely. This lesson is **N/A** — no gap. On the flip side, that limits what RAG can consume — if I ever want to ingest PDF papers, slides, or whiteboard photos, this layer needs to come back. Priority: very low.

## Lesson 2: Chunking Moves from Length-Split to Context-Augmented

Naive Text Chunking means "split by character count" — exactly what this site does today. `scripts/sync-to-d1.ts`'s `chunkText()`:

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

Merge paragraphs up to 1000 chars, done. This has a structural pain point — **chunks lack the article's full context**.

Example: an article about "solving D1 batch timeout" has a paragraph "just add this setting in `wrangler.jsonc`". Pulled out alone, you have no idea which D1, which timeout, or which setting is being discussed. A query "D1 batch timeout" struggles to hit that chunk.

2024 saw a wave of chunking improvements:

- **Late Chunking** (Jina): encode the whole document with the embedding model first, then split boundaries *before* the final mean pooling. Every token before the boundary can "see" context, preserving semantics better. Requires the embedding model to use mean pooling (bge-m3 is CLS pooling), so it doesn't just plug in.
- **dsRAG**: an LLM writes an auto-context for each chunk, fixing the "no clues in the chunk itself" problem.
- **Contextual Retrieval** (Anthropic): similar idea to dsRAG — an LLM writes a short chunk-specific context, concatenated with the original text before embedding. Effective, direct to implement, and has become a de-facto standard for context-augmented chunking since late 2024.
- **Meta-Chunking** (RUC & Shanghai AILab): an LLM decides sentence boundaries by logical coherence.
- **Mix-of-Granularity** (Shanghai AI + BUAA): multi-granularity chunking + dynamic traversal depth, minimizing context redundancy.

Bottom line: **tweaking chunk size has flat-lined**. The real value is **tagging chunks with context** — only LLMs can do this, and the cost is acceptable (one-time investment at sync).

**Against my site**: pure length-split is a clear gap. The most direct fix is Contextual Retrieval: at sync time, call llama-3.1-8b (or something smaller) once per chunk to generate a 50–100 char context blurb, concatenate with the chunk, then embed. Sync cost doubles, but it's offline and one-shot.

## Lesson 3: Hybrid Search — Vector + Sparse Vector + BM25

IBM Research's 2024 BlendedRAG proved one thing: **vector + sparse vector + BM25 three-lane hybrid is the recall ceiling**, beating any single lane or two-lane setup.

Why do we need all three?

- **Vector**: semantic recall. Great at "similar meaning, different wording." Inherently bad at precise matches — "our company's March 2024 financial plan" will happily recall content from other months.
- **Sparse vector** (like SPLADE): a pretrained model outputs a fixed-dim sparse vector — treat it as standardized keyword expansion. Great on general queries, but misses domain-specific terms (model numbers, internal codes) that weren't in pretraining vocabulary.
- **BM25**: a 30-year-old algorithm, the most direct answer for exact keyword matching. Sparse vectors can't replace it.

Three lanes, each specialized. Not one replacing another.

The hard engineering question isn't "does it support BM25" but **does it support proper BM25**:

- Phrase query — inverted indexes must store positions
- Dynamic pruning — prevent OR queries from exploding
- Chinese segmentation — including bigram tokenization, term weights, stop-word filtering

Elasticsearch is the gold standard here. RAGFlow picked ES as its sole backend from day one for these reasons. OpenAI's June 2024 Rockset acquisition was in large part because Rockset is cloud-native and offers close-to-ES full-text retrieval. Many pure vector DBs (Milvus, Qdrant) now claim BM25 support, but few actually deliver "phrase query + dynamic pruning + CJK tokenization."

**Against my site**: D1 is SQLite, and SQLite ships a very useful built-in full-text index — **FTS5**, supporting tokenizers, phrase queries, and rank functions. To add BM25:

1. At sync, create a `posts_fts` virtual table indexing `title + tldr + content`
2. In `/api/search`, add a lane: `SELECT ... FROM posts_fts WHERE posts_fts MATCH ? ORDER BY rank`
3. Merge vector-lane and BM25-lane results with RRF (Reciprocal Rank Fusion)

More work than a Reranker (build FTS5, handle mixed Chinese-English tokenization), but this is the watershed between "has hybrid search" and "doesn't." Sparse vectors can wait — Cloudflare's stack doesn't ship a SPLADE service.

## Lesson 4: Tensor Reranker — Late Interaction

Reranker evolved rapidly this year, in three generations:

**Cross-Encoder** (BGE-Reranker): concatenate query and doc into BERT, capture token interactions. High quality, moderate cost. The current mainstream.

**LLM-based Reranker** (gte-Qwen2-7B): a 7B LLM scores directly. Better quality but doubled inference cost.

**Late Interaction / Tensor Reranker** (the ColBERT family): store per-token embeddings at index time (one tensor per doc); at query time, sum pairwise similarities between query and doc tokens.

Tensor Reranker has an engineering advantage: **it can live in the database layer**. Query-time inference is just dot products, so it's fast. That means the coarse-ranking result set doesn't have to be tightly capped at 5–10 — it can expand to hundreds or thousands for reranking, salvaging poor coarse-ranking.

Vespa was the earliest DB to engineer tensor support; Infinity (RAGFlow's own) added it mid-2024. Model side: ColBERT / ColBERT v2 / JaColBERT (Japanese) / jina-colbert-v2 (multilingual) are all shipping fast.

**Against my site**: Cloudflare Workers AI currently offers `@cf/baai/bge-reranker-base` (Cross-Encoder); Tensor Reranker has no native support. So the pragmatic path is:

1. **Short-term**: add Cross-Encoder (BGE-Reranker) — already a huge upgrade
2. **Long-term**: wait for Cloudflare to ship the ColBERT family, or self-host an embedding service

Tensor Reranker's ROI at this site's stage (150 articles) is low; priority: low.

## Lesson 5: GraphRAG and the Semantic Gap

The previous post walked through GraphRAG's spectrum in detail (Microsoft GraphRAG → LightRAG → LazyGraphRAG → HippoRAG → KAG); here I add three engineering observations.

**RAPTOR is a pre-GraphRAG transition**: cluster the text, have an LLM summarize each cluster, then feed both summaries and originals into the search index. It's already tackling "cross-chunk macroscopic questions", just without an explicit graph. RAGFlow mid-year adopted RAPTOR as a GraphRAG stand-in.

**SiReRAG proposes a two-axis recall**: text has two dimensions — **similarity** (semantic distance) and **relatedness** (entity/relation association). RAPTOR sits on the similarity axis, GraphRAG on the relatedness axis; SiReRAG merges them. The framing is clean, and most Graph-RAG variants can be placed on this coordinate system.

**HybridRAG's schema insight**: a fully featured database doesn't actually need a graph DB to implement GraphRAG. Edges, entities, community summaries — they're all text, and one table with full-text + vector indexes can carry them all with a `type` column distinguishing kind. This is exactly why RAGFlow stuck with Elasticsearch / Infinity instead of adding Neo4j. Useful reminder for this site: if I ever want GraphRAG on D1, one table is enough.

**Against my site**: not yet. GraphRAG's fit is "strong cross-document association + global understanding" — 150 personal tech articles don't satisfy that. Once the corpus reaches thousands, or readers start asking "what does this site think about topic X overall", the investment starts making sense.

## Aside: Agentic + Memory in one line

Mem0 got a huge star bump just by defining a Memory API — evidence that Memory as a primitive is genuinely in demand. But the Memory infra itself is mature (real-time filter + search) — the scarce piece is "combining Memory with Reasoning". That's the hot space for 2025 but three to five years out for a personal site.

## Aside: Multimodal RAG in one line

VLMs went in two years from "recognize everyday objects" to "understand enterprise-grade multimodal documents". ColPali pioneered the "skip OCR, generate tensor embeddings directly from images" route, and paired with Tensor Reranker delivers end-to-end multimodal RAG. The ColPali paper recommends dropping OCR, but that's compared to Gen-1 CNN OCR — versus Gen-2 Encoder-Decoder OCR, both routes fit different scenarios and will run in parallel for a while.

## The five lessons, ranked for a personal site

Reranked from engineer-news's perspective:

| Priority | Lesson | Why |
|---|---|---|
| ★★★ | Reranker (start with Cross-Encoder, skip Tensor) | Workers AI already ships bge-reranker-base; an evening's work, immediate impact |
| ★★★ | Contextual Retrieval (chunk context-augmentation) | Offline at sync time, one-shot investment, directly closes the most basic semantic gap |
| ★★ | BM25 hybrid (via SQLite FTS5) | Essential rescue for proper nouns, moderate effort |
| ★ | Document Intelligence | Only ingest Markdown right now; N/A |
| ✕ | GraphRAG / Agentic RAG / Tensor Reranker | Corpus size and query complexity haven't crossed the threshold |

Principle: **do the "one-time change with permanent gain" work first** (Chunking, Reranker); then the "keeps costing to maintain" work (Hybrid Search needs FTS5 index upkeep); finally the "architectural change" work (GraphRAG).

## Closing: RAG is a whole-stack collaboration

The most valuable judgment from InfiniFlow's year-in-review:

> RAG is not a simple application. It's a complex system centered on search, orchestrating diverse data, foundational components, and models large and small to work together.

The previous post's System 1 → System 2 thesis is about the paradigm shift — where imagination's boundary lies. This post's five lessons are the foundation — before you can walk toward that boundary, every brick under your feet has to be laid straight.

RAG is like the database of old — the external interface is trivial, the internals are absurd. Real RAG quality isn't decided by which embedding model you picked, but by whether these five lessons have each been done well. engineer-news's next step is filling in this five-lesson checklist, one box at a time.

## References

- InfiniFlow — RAGFlow team's 2024 year-in-review on RAG
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
