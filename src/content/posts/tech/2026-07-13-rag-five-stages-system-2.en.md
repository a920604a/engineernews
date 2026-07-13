---
title: "RAG's Five Stages: From Pipeline to Reasoning Retrieval, and the Naive RAG on My Own Site"
date: "2026-07-13"
category: "tech"
tags: ["ai","llm","rag","graph-rag","agentic-rag","system-design","cloudflare"]
lang: en
type: "explainer"
draft: false
series:
  name: "RAG"
  order: 1
key_points:
  - "RAG completed a five-stage evolution (Naive → Advanced → Modular → Graph → Agentic) in two years, essentially by pulling reasoning deeper into the retrieval loop."
  - "The inflection point isn't stronger models — it's control shifting from pipeline to agent: from Retrieve-then-Read to Loop-until-Enough."
  - "Graph RAG closes the 'cross-document semantic gap'; Agentic RAG answers 'when to search, what to search, whether to search again'."
  - "engineer-news currently only runs a single vector lane with a keyword fallback — no rerank, no hybrid — so it sits right at the Naive RAG edge."
  - "For a personal site, the ROI of adding BGE-Reranker and BM25 hybrid is far higher than jumping straight to GraphRAG or Agentic."
tldr: "Over the past two years RAG evolved from a 'linear pipeline' to 'loop-based reasoning'. It maps cleanly to five stages: Naive, Advanced, Modular, Graph, Agentic. The real inflection point is control moving from pipeline to agent — a System 1 → System 2 shift. Looking back at engineer-news's own RAG stack, it's stuck at the Naive edge — so this post also lays out what to fix next."
description: "Maps RAG's two-year evolution across five stages (Naive → Advanced → Modular → Graph → Agentic) and locates engineer-news's own Cloudflare D1 + Vectorize + bge-m3 implementation on that spectrum."
glossary:
  - term: "HyDE"
    aliases: ["Hypothetical Document Embeddings", "假設文件嵌入"]
    zh: "假設文件嵌入"
    definition: "查詢時先讓 LLM「幻想」一份假想答案（Hypothetical Document），用假答案做向量檢索、而不是用原始 query。用來彌補 query 短且抽象、跟 doc 語意距離拉不近的問題。"
    advanced: "CMU / Waterloo 提出，Advanced RAG 的代表 query rewriting 技法之一。原始 query 通常是「怎麼修 D1 timeout」——很短，跟 doc 中「Cloudflare Workers runtime 中止 SQLite transaction 的機制」在向量空間差很遠；但 LLM 幻想的假答案語氣接近 doc，embed 距離自然近。代價是每個 query 多一輪 LLM call。"
    definition_en: "At query time, have an LLM \"hallucinate\" a hypothetical answer document first, then run vector search on that fake answer instead of the raw query. It closes the gap when the query is short and abstract while docs describe things concretely."
    advanced_en: "Proposed by CMU / Waterloo, HyDE is one of the canonical query-rewriting techniques in Advanced RAG. A raw query like \"how do I fix D1 timeout?\" is short and semantically far from a doc explaining \"the Cloudflare Workers runtime aborting a SQLite transaction\"; the LLM's fake answer speaks the doc's language, closing the embedding distance. Cost: one extra LLM call per query."
  - term: "GraphRAG"
    aliases: ["Graph RAG", "graph-rag"]
    zh: "圖增強 RAG"
    definition: "微軟 2024 年提出的架構：先用 LLM 從文檔抽取實體與關係、構建知識圖譜、用社群偵測演算法分群、預先為每個社群生成摘要；查詢時走社群摘要做 Map-Reduce 全域回答。解決傳統 RAG 無法處理「總結全書觀點」這類跨文件宏觀查詢的問題。"
    advanced: "核心步驟：(1) LLM 抽取實體+關係 (2) Leiden 演算法做 hierarchical community detection (3) LLM 為每個社群寫摘要 (4) 查詢時 Map-Reduce 走摘要。變種光譜包括：LightRAG（拿掉社群）、Fast GraphRAG（用個性化 PageRank 隨機遊走）、LazyGraphRAG（連 LLM 抽取都拿掉、改用共現統計）、HippoRAG（海馬體索引理論）、KAG（螞蟻，強化可解釋性）。工程上其實不需要圖資料庫——一張具備全文+向量索引的表就能承載。"
    definition_en: "Microsoft's 2024 architecture: an LLM extracts entities and relations from documents into a knowledge graph, a community detection algorithm clusters it, and community summaries are pre-generated with an LLM. At query time, a Map-Reduce over community summaries produces global answers — solving traditional RAG's inability to handle cross-document synthesis queries like \"summarize the whole book's views.\""
    advanced_en: "Core steps: (1) LLM extracts entities + relations, (2) Leiden algorithm builds hierarchical communities, (3) LLM writes per-community summaries, (4) query-time Map-Reduce over summaries. Variants: LightRAG (drops communities), Fast GraphRAG (personalized PageRank random walk), LazyGraphRAG (drops LLM extraction entirely, uses co-occurrence stats), HippoRAG (hippocampal indexing theory), KAG (Ant Group, explainability-first). Engineering-wise you don't need a graph DB — a single table with full-text + vector indexes suffices."
  - term: "Agentic RAG"
    aliases: ["agentic-rag"]
    zh: "代理式 RAG"
    definition: "RAG 從線性 pipeline 變成迴圈：模型自己決定要搜什麼、搜幾次、什麼時候停、搜錯了怎麼糾。核心特徵是自主規劃、自我糾錯、過程監督。相對於 System 1 的 Naive RAG，Agentic RAG 是 System 2 的慢思考版本。"
    advanced: "Phase 5 的內部三層演化：(1) 顯式糾錯（CRAG 三分類 Evaluator、Self-RAG 的 Reflection Tokens）——工業落地成本最低 (2) RL 驅動的推理（Search-R1 用結果監督 GRPO/PPO 訓練，Search-o1 用 Reason-in-Documents 去噪）——湧現多步搜尋能力 (3) 過程監督（DecEx-RAG 建模成 MDP，Decision/Execution 雙模組解耦、Rollout 打分、剪枝）——數據利用率是 Search-R1 的 6 倍。"
    definition_en: "RAG evolves from a linear pipeline into a loop: the model decides what to search, how many times, when to stop, and how to correct wrong retrievals. Core traits are autonomous planning, self-correction, and process supervision. Compared to Naive RAG (System 1), Agentic RAG is the System 2 slow-thinking version."
    advanced_en: "Three internal layers of Phase 5: (1) Explicit correction — CRAG's three-class evaluator, Self-RAG's Reflection Tokens; lowest industrial deployment cost. (2) RL-driven reasoning — Search-R1 uses outcome-supervised GRPO/PPO training; Search-o1 uses Reason-in-Documents to denoise; multi-step search emerges. (3) Process supervision — DecEx-RAG models it as MDP with Decision/Execution modules, Rollout-based scoring, and pruning; achieves 6× data efficiency over Search-R1."
  - term: "Reflection Tokens"
    aliases: ["reflection token", "反思 token"]
    zh: "反思 Token"
    definition: "Self-RAG 引入的特殊控制 token（如 [IsRel], [IsSup]），讓模型在生成每一句話時「自問」——這句話跟檢索到的內容相關嗎？有依據嗎？把自我反省變成生成流程本身的一部分，而不是外掛檢查器。"
    advanced: "Self-RAG（ICLR '24）的核心機制。訓練階段就把這些 token 加入 vocabulary、用標註資料教模型什麼時候該產生它們。跟 CRAG 的差異：CRAG 是外掛一個 Evaluator 判斷檢索結果好壞（訓練成本低但推理時多一次模型呼叫），Self-RAG 把判斷內建進模型本身（訓練成本高但推理更順暢）。兩者都屬於 Agentic RAG 的 Level 1「顯式糾錯」層。"
    definition_en: "Special control tokens introduced by Self-RAG (e.g. [IsRel], [IsSup]) that let the model \"self-ask\" as it generates each sentence — is this sentence relevant to the retrieved content? Is it grounded? Turns self-reflection into part of the generation process itself rather than an external checker."
    advanced_en: "Core mechanism of Self-RAG (ICLR '24). During training, these tokens are added to the vocabulary and the model learns when to emit them via labeled data. Vs CRAG: CRAG attaches an external Evaluator to judge retrieval quality (lower training cost but one extra model call at inference); Self-RAG bakes the judgment into the model itself (higher training cost but smoother inference). Both belong to Agentic RAG Level 1 — explicit correction."
audio_url: "/api/tts/r2/tts/tts_20260713_132736_189380.mp3"
---

Recently I came across an interactive RAG tutorial on wenaidev that lays out RAG's evolution on a timeline in three generations: Advanced RAG in 2023 (query rewriting, reranking, preprocessing), GraphRAG in 2024, and Agentic RAG in 2025. Clear structure — but it made me want to zoom in one more level. If you fold in the industrial pain points, the timeline actually splits into five stages: **Naive → Advanced → Modular → Graph → Agentic**.

This isn't a straight translation. I'm reviewing the last two years of key papers and industry practice while looking back at my own site, engineer-news — which runs a RAG stack on Cloudflare D1 + Vectorize + bge-m3 + qwen-14b. Placed on the same spectrum, it sits at the far left: **the Naive RAG edge**. That contrast gives the evolution story an anchor, and doubles as a checklist for what a personal site should add next.

## One yardstick: how deep does Reasoning reach?

There's a simple way to read the two-year evolution: ask **how far does the brain (Reasoning) reach into the loop?**

- **Naive RAG**: Retrieve-then-Read, one shot, the brain doesn't touch retrieval decisions.
- **Advanced RAG**: Add stages around retrieval — rewrite the query up front, rerank results at the back. The brain helps polish query and results.
- **Modular RAG**: Break into modules; a Router decides which pipeline to run. The brain decides which lane this query takes.
- **Graph RAG**: Introduce a knowledge graph to solve cross-document association. The brain works at graph construction (entity/relation extraction) and query-time traversal.
- **Agentic RAG**: A loop where the model itself controls search strategy. The brain decides whether to search again, what to search, and when to stop.

One-line thesis underneath: **RAG is moving from System 1 (fast, pipeline) to System 2 (slow, looped reasoning)**.

One stage at a time.

## Phase 1 — Naive RAG: the Retrieve-then-Read baseline

Facebook AI's 2020 NeurIPS paper *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks* set the paradigm: Query Encoder + Document Encoder map into the same vector space, MIPS (Maximum Inner Product Search) fetches Top-K docs, and a Generator (BART in the original paper) concatenates and produces the answer.

Industry usually adopts only the **inference paradigm** — LangChain / LlamaIndex + FAISS/Milvus + a fixed prompt. This solved LLMs' stale-knowledge + hallucination problem from 0 to 1.

The pain point is blunt: **recall is the ceiling**. If Top-k doesn't fetch the right doc, or fetches irrelevant noise, the answer is wrong. And vector retrieval itself has two structural limits:

1. Proper nouns, model numbers, product codes, identifiers — vectors are inherently bad at these.
2. One chunk = one vector, i.e. a semantic compression of the whole passage, which by design cannot express exact literal matches.

## Phase 2 — Advanced RAG: Precision Matters

Industry quickly realized Naive RAG was weak, and started piling tricks around retrieval. Three canonical moves:

### Hybrid Search

Vector retrieval (semantic) + BM25 (keyword). BM25 is 30 years old, but RAG has resuscitated it — because vectors can't guarantee precise recall, and BM25 was literally designed for keyword matching.

IBM Research's 2024 BlendedRAG went further: **vector + sparse vector + full-text search** is the recall ceiling. Sparse vectors (like SPLADE) handle generic queries but miss domain-specific words; BM25 fills that gap. The three lanes each specialize and cannot substitute for each other.

### Reranker

The Bi-Encoder (embedding model) encodes query and doc separately, then just measures distance — fast but coarse.
A Cross-Encoder (reranker) concatenates query and doc into BERT to capture pairwise token interactions — slow but precise.

The canonical work is BAAI's **BGE-Reranker** (C-Pack paper). The engineering pattern: vector retrieval fetches Top-50 for coarse ranking, a Cross-Encoder refines to Top-5, and only that goes to the LLM. A few hundred milliseconds of extra latency for a qualitative jump in ranking.

By late 2024, the MTEB leaderboard's top slots started being taken over by **LLM-based Rerankers** (like gte-Qwen2-7B), doubling inference cost. That prompted a middle ground — **Tensor / Late Interaction Rerankers** (the ColBERT family): store per-token vectors at index time, then at query time sum pairwise similarities between query and doc tokens. Quality approaches Cross-Encoder, and it can live inside the database (supported by Vespa, Infinity).

### Query Rewriting / HyDE

CMU's HyDE (Hypothetical Document Embeddings) is a clever move: **let an LLM hallucinate a fake answer first, then run vector search on that fake answer**.

Why does this work? Because queries and documents often phrase things very differently — a user asks "how do I fix D1 batch timeout?", while the doc says "when a SQLite transaction exceeds 30 seconds, the Cloudflare Workers runtime aborts it." Not close in vector space. But the LLM's hallucinated answer speaks like the doc, so their embeddings land nearby. Searching with the fake answer's embedding beats searching with the raw query's.

Advanced RAG's overall move can be summarized in one line: **squeeze the recall ceiling with more tricks around retrieval**. But the backbone is still a linear pipeline — the brain optimizes at both ends without entering the decision loop.

## Phase 3 — Modular RAG: Dynamic Routing

When the business gets complex (query internal KB, search the web, call an API — all in one), a linear RAG breaks. The response is to break RAG into modules: **Search / Memory / Routing / Tool as separate pieces**, with a Router dispatching by query intent.

The canonical work is Stanford NLP's **DSPy**. It treats RAG as a programming problem:

- `Signatures` declare I/O declaratively
- `Modules` are composable building blocks
- `Teleprompter` auto-optimizes prompts and few-shot examples

Meaning: no more hand-tuning prompts — the framework compiles the optimal combination like source code. Prompt Engineering evolves into Prompt Compilation.

The most typical industry example is ChatGPT Plugins / Ernie Bot's tool routing — user asks "Beijing weather today", the Router identifies intent → routes to a weather API → fills the result into the prompt. Looks like just adding an if-else, but the "if-else" decision moves from the dev's hands to the LLM's. That's the first qualitative moment of "the brain entering the loop."

## Phase 4 — Graph RAG: Global Understanding

Phases 1–3 all deal in **fragments** — each chunk is on its own, unable to answer "summarize the whole book's views" or "what do these companies have in common" — the so-called **Global Query**.

Microsoft's 2024 paper *From Local to Global: A Graph RAG Approach to Query-Focused Summarization* is the watershed. Core pipeline:

```
Source Documents
  → LLM extracts entities and relations
  → Leiden algorithm runs community detection (hierarchical communities)
  → LLM pre-generates a summary for each community
  → At query time, Map-Reduce over the community summaries: each answers once, then aggregate
```

What it solves is another structural pain point of RAG — **the semantic gap**. Search systems have always had this problem: queries and docs phrase things differently, and direct matches miss. When RAG replaces keywords with full-sentence questions, the gap widens. GraphRAG uses "LLM reads everything up front, extracts entities, builds a graph, writes community summaries" to fossilize cross-document associations offline, so query-time answers walk on those pre-generated summaries.

After Microsoft open-sourced GraphRAG, a whole spectrum of variants appeared, mostly aiming at **cutting token cost**:

- **Fast GraphRAG**: drop community summaries; use personalized PageRank random walks on the graph to fetch a subgraph, then let the LLM answer from it.
- **LightRAG** (HKU): drop the community layer, keep it lightweight.
- **LazyGraphRAG** (Microsoft, late 2024): drop even the LLM extraction — use a local small model for noun extraction + co-occurrence stats to build communities, and only generate summaries **at query time**. The other extreme: minimize preprocessing cost, defer everything to query time.
- **HippoRAG**: borrows the hippocampal indexing theory from neuroscience — personalized PageRank on the graph simulates human recall via random walks.
- **KAG** (Ant Group): the opposite direction — heavy on explainability, requires human curation of the knowledge graph, aimed at finance / risk-control where "why" needs to be explained.

Graph RAG's comfort zone is **strong cross-document association + need for global understanding**:

- **Financial risk control**: querying "black-market groups". Text RAG only finds one account's violation; Graph RAG follows the graph out to the entire related account cluster.
- **Enterprise knowledge management**: cross-team, cross-project associations.
- **Intelligence analysis**: relationship networks between entities.

What isn't it good at? **Detail Q&A on a single long article** — that's chunking + rerank's comfort zone, and force-fitting Graph RAG is overengineering.

## Phase 5 — Agentic RAG: System 2 Reasoning

The first four phases still do "fill-in-the-blanks" (Retrieve → Fill Context → Generate). Agentic RAG starts doing "word problems" — it isn't a Pipeline, it's a Loop.

Three defining features:

- **Autonomous planning**: the model decides what to search, how many times, when to stop.
- **Self-correction**: if a search misses, it re-searches automatically.
- **Process supervision**: every step of the reasoning chain is scored.

Ordered by autonomy depth, Phase 5 has three internal layers:

### Level 1: Explicit Correction

Pain point: traditional RAG blindly trusts retrieval, causing "retrieval-error-induced hallucinations". The fix here is **a patch** — bolt on an external check.

- **CRAG** (Corrective RAG, USTC & Google, ICLR '24): add a lightweight Evaluator that three-way classifies retrieval results:
  - `Correct` → refine, generate directly
  - `Incorrect` → discard the results, forcibly trigger Web Search
  - `Ambiguous` → combine retrieved knowledge with the model's parametric knowledge
- **Self-RAG** (ICLR '24): train the model to emit **Reflection Tokens** (`[IsRel]`, `[IsSup]`), so as it generates each sentence it self-asks "does this sentence have evidence? is it relevant?", making self-reflection part of generation itself.

Level 1 is currently the cheapest Agentic form to deploy in industry — it doesn't need RL, only Prompt Engineering + a classifier.

### Level 2: Reasoning with RL

Pain point: prompt-driven or rule-driven search hits a ceiling fast. Can the model, like AlphaGo, learn "how to search" by itself?

- **Search-R1** (Google Cloud AI, COLM '25): imports DeepSeek-R1's approach into RAG. The model actively emits a `<search>` token during `<think>`, making tool calls part of the reasoning chain. Uses **outcome reward** — no per-step labels, only the final answer's correctness — trained at scale with GRPO/PPO. Multi-step search, evidence sifting, and verify-reflect strategies emerge from training.
- **Search-o1** (RUC & Tsinghua): targets the long-reasoning problem of "retrieved content too long, too noisy". Introduces a **Reason-in-Documents** module — after retrieval, don't dump directly into context; first reason and denoise in an isolated module, extract the core logic chain, then feed the main model. Avoids blowing the context window and reduces noise.

### Level 3: Process Supervision

Pain point: Search-R1's outcome supervision has a huge exploration space, converges slowly, and long chains invite Reward Hacking (the model learns to "look like it's searching" rather than searching correctly). Switch to process-level control.

- **DecEx-RAG** (Xiaohongshu & TJU): models RAG as a strict MDP (Markov Decision Process). Two decoupled modules:
  - **Decision Module**: the "commander" — each step outputs `<terminate?>` and `<retrieve?>`
  - **Execution Module**: the "worker" — generates the concrete query or answer
  - **Process Reward**: unlike Search-R1's final-only reward, uses Rollouts to score every intermediate decision node
  - **Pruning Strategy**: if a step's score is too low, prune immediately instead of wasting compute

The three Levels in one line each:

- **Search-R1**: "Let it learn by failing." — huge exploration space, slow convergence
- **DecEx-RAG**: "Guide it step-by-step." — high exploration efficiency, 6× data efficiency

Phase 5's three internal layers are themselves a miniature RAG evolution:
- CRAG / Self-RAG solves "dare to use retrieval" (explicit correction)
- Search-R1 / o1 solves "learn to use retrieval" (autonomous planning)
- DecEx-RAG solves "use retrieval efficiently" (process-level pruning)

## One thesis: from System 1 to System 2

Zooming out, the main line of the evolution is **from static to dynamic, from mindless to mindful**.

Old RAG was System 1: chase millisecond latency, take whatever it retrieves.
Current Agentic RAG is System 2: spend 5–10 seconds or more Thinking, search multiple times, self-reflect, and finally guarantee answer quality.

Three implications:

**1. Test-time Compute is the next battleground**

LLM competition used to be about "parameter count and pretraining loss" — training-time compute. Agentic RAG shifts the fight to "how much compute you're willing to spend at inference for Reasoning." DeepSeek-R1 and o1 already demoed this; Agentic RAG is that paradigm landing in retrieval.

**2. Long Context won't replace RAG**

When Gemini 1.5 Pro opened up 1M+ tokens, people briefly asked whether RAG was still needed. The answer is clearly yes. Long Context solves "needle in a haystack" but not:

- **Live knowledge updates**: model knowledge is frozen after training; RAG is the only source of running water
- **TB / PB-scale corpora**: 1M tokens can't fit an enterprise-scale dataset
- **Cost**: stuffing 1M tokens per request every time is a nasty bill

Future architectures will be **Long Context LLM + Agentic RAG** — the LLM provides Reasoning and local long context, RAG provides scalable, updatable knowledge access.

**3. Process Supervision Data is the new moat**

The **process supervision data** DecEx-RAG mentions — trajectories of "how humans solve complex problems through iterative search" — will be the new asset. Whoever holds this (search giants, browser vendors, coding-agent companies) leads in the Agentic era. That's also why OpenAI acquired Rockset and Anthropic invested heavily in Computer Use — everyone is grabbing first-hand process trajectories.

## Comparing my own site: where is engineer-news?

Time to turn the camera on myself. This blog runs on Astro + Cloudflare Workers, with a RAG stack. Opening `scripts/sync-to-d1.ts` and `src/pages/api/search.ts` and mapping against the five stages:

| Layer | engineer-news implementation | Stage |
|---|---|---|
| Chunking | Paragraph-merged with a 1000-char cap (pure length split) | Naive |
| Embedding | `@cf/baai/bge-m3` | Naive |
| Retrieval | Single vector lane, `topK=8` | Naive |
| Rerank | None | Missing Advanced |
| Hybrid Search | SQL `LIKE` fallback only when vector returns nothing | Half Advanced |
| Query Rewriting | None | Missing Advanced |
| Generation | qwen1.5-14b (site-wide) / llama-3.3-70b (single article) | — |
| Router / Agent Loop | None | — |
| Graph / KG | None | — |

The `/api/search` flow is literally three steps:

1. `bge-m3` embeds the query
2. Vectorize `topK=8`
3. Join `doc_chunks` + `posts`, dedupe by source, dump into the prompt, qwen generates

The "ask this article" feature has one small twist: it skips vector retrieval, assembles all of a single article's chunks in order into context, and feeds them to Llama-3.3-70B. This qualifies as **routing to a specialized pipeline after intent detection** — the seed of Modular RAG — but only for this one special case.

In other words, **this site sits right at the Naive RAG edge, without even a complete Advanced RAG stage**.

### What to add next

The paper spectrum makes GraphRAG and Agentic RAG tempting. But for a personal site, the actual ROI order should be:

1. **BGE-Reranker (Cross-Encoder)** — rerank the `topK=8` results. Implementation is just an extra Workers AI call (Workers AI has `@cf/baai/bge-reranker-base`), a few hundred ms of extra latency for a qualitative jump in ranking. **Cost = one evening, Gain = immediately noticeable**. This is the absolute priority.
2. **BM25 hybrid** — Cloudflare D1 is SQLite, and SQLite's built-in **FTS5** can serve as the keyword lane directly. More work than the reranker, but it solves queries about proper nouns, product names, and version numbers that vectors aren't naturally good at.
3. **HyDE** — let an LLM hallucinate a fake answer before embedding the query. Implementation is minimal (one extra LLM call). Best for short, vague queries (e.g. "how do I solve D1 timeout").
4. **Contextual Retrieval** — Anthropic's approach: use an LLM to generate a short context snippet per chunk, concatenate it with the original text before embedding, closing the semantic gap. Medium effort at sync time (one LLM call per chunk), strong results.
5. **GraphRAG / Agentic RAG** — not yet. At ~150 articles, cross-document association is weak; Agentic loop's token cost, latency, and debugging complexity haven't crossed the threshold for investment.

The principle behind the ordering: **a personal site's RAG evolution should track data volume + user complexity**, not the paper spectrum. GraphRAG suits TB-scale cross-team data; Agentic RAG suits open-domain deep research. Both are overengineering for "one personal tech site".

## Closing: RAG is the next-generation database

There's a great line from InfiniFlow (the RAGFlow team)'s late-2024 year-in-review:

> RAG is a very complex system. It hasn't attracted the flood of capital LLMs have, yet in real usage it's not only indispensable — it's incredibly complex.

The name RAG is well chosen — it stands for an **architectural pattern**, not a product, not an application. Just like databases in the past: the external interface is trivially simple (`SELECT`), while the internals are absurdly complex (optimizer, index, B-tree, transaction isolation, MVCC).

RAG's external interface is equally trivial — "ask a question, get an answer" — but internally packs chunking / embedding / hybrid search / rerank / KG / agent loop / memory all together. **RAG is the LLM-era database.**

The last two years have been that "new database" going from v0.1 to v1.0. Zoom back into engineer-news, and its RAG is only v0.2. Next time I touch it, I'll start with the Reranker.

## References

- Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al., NeurIPS 2020) — the original Naive RAG paper
- C-Pack: Packed Resources For General Chinese Embeddings (BAAI) — introduces BGE-Reranker
- Precise Zero-Shot Dense Retrieval without Relevance Labels (CMU / Waterloo) — HyDE
- DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines — https://github.com/stanfordnlp/dspy
- From Local to Global: A Graph RAG Approach to Query-Focused Summarization (Microsoft, 2024)
- Fast GraphRAG / LightRAG / LazyGraphRAG — cost-reduction variants of GraphRAG from Microsoft and the community
- HippoRAG (2024) — hippocampal indexing theory
- KAG (Ant Group) — https://github.com/OpenSPG/KAG
- Corrective Retrieval Augmented Generation (CRAG, ICLR '24)
- Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection (ICLR '24)
- Search-R1: Training LLMs to Reason and Leverage Search Engines with Reinforcement Learning (Google Cloud, COLM '25)
- Search-o1: Agentic Search-Enhanced Large Reasoning Models (RUC & Tsinghua)
- DecEx-RAG: Boosting Agentic RAG with Decision and Execution Optimization via Process Supervision (Xiaohongshu & TJU)
- Contextual Retrieval (Anthropic) — https://www.anthropic.com/news/contextual-retrieval
- Blended RAG: Improving RAG Accuracy with Semantic Search and Hybrid Query-Based Retrievers (IBM Research, 2024)
- InfiniFlow — RAGFlow team's 2024 year-in-review on RAG
- wenaidev interactive tutorial — https://www.wenaidev.com/interactive/rag
