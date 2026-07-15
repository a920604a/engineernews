---
title: "RAG 五階段：從流水線到會思考的檢索，以及我站上那個 Naive RAG"
date: "2026-07-13"
category: "tech"
tags: ["ai","llm","rag","graph-rag","agentic-rag","system-design","cloudflare"]
type: "explainer"
draft: false
series:
  name: "RAG 系統架構"
  order: 1
key_points:
  - "RAG 兩年內完成 Naive → Advanced → Modular → Graph → Agentic 五階段演進，本質是把大腦（Reasoning）持續拉進檢索迴圈。"
  - "分水嶺不是模型變強，而是控制權從 Pipeline 移交給 Agent：從 Retrieve-then-Read 變成 Loop-until-Enough。"
  - "Graph RAG 解決『跨文件語意鴻溝』，Agentic RAG 解決『什麼時候該搜、搜什麼、要不要再搜』。"
  - "engineer-news 目前只有單路向量 + fallback keyword，rerank 與 hybrid 都還沒，實際定位在 Naive RAG 邊界。"
  - "從個人站的角度，補 BGE-Reranker 與 BM25 三路混合的性價比，遠高於直接跳 GraphRAG 或 Agentic。"
tldr: "RAG 這兩年從『線性流水線』演化到『循環推理』，可以用五階段梳理：Naive、Advanced、Modular、Graph、Agentic。分水嶺是控制權從管線移交給 Agent，範式從 System 1 進到 System 2。回頭看 engineer-news 這個站的實作，其實還卡在 Naive RAG 邊界——這篇順便把它的下一步應該補什麼寫清楚。"
description: "從 Naive、Advanced、Modular、Graph 到 Agentic 五階段梳理 RAG 兩年來的演進，並對照 engineer-news 目前 Cloudflare D1 + Vectorize + bge-m3 的實作定位。"
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
audio_url: "/api/tts/r2/tts/tts_20260713_132939_609095.mp3"
---

最近看到 wenaidev 做了一個 RAG 的互動教學頁面，用時間軸把 RAG 的演進切成三代：2023 的進階 RAG（查詢重寫、重排、預處理）、2024 的 GraphRAG、2025 的 Agentic RAG。結構夠清楚，也讓人想把粒度再細一點——如果把工業界的實作痛點加進來，其實可以切成五個階段：**Naive → Advanced → Modular → Graph → Agentic**。

這篇不是純翻譯。我一邊回顧兩年來的重要論文與工業實踐，一邊回頭看自己維護的這個站 engineer-news——它跑了一套 Cloudflare D1 + Vectorize + bge-m3 + qwen-14b 的 RAG。對照下來，它其實還卡在最左邊：**Naive RAG 的邊界**。這個對照會讓演進主線更有錨點，也順便釐清「個人站的下一步該補什麼」。

## 一個判準：Reasoning 介入的深度

有一個很簡單的方式看 RAG 兩年的演進，就是問一個問題——**大腦（Reasoning）介入的程度到哪裡？**

- **Naive RAG**：Retrieve-then-Read，一次到位，大腦完全不參與檢索決策。
- **Advanced RAG**：檢索前後加料，前面重寫查詢、後面重排結果。大腦介入的是「怎麼把 query 變好、怎麼把結果篩好」。
- **Modular RAG**：拆解成模組，Router 決定跑哪一條路。大腦介入的是「這個 query 應該走哪條管線」。
- **Graph RAG**：引入知識圖譜，解決跨文件關聯。大腦介入的是「建圖階段抽取實體與關係、查詢階段走圖」。
- **Agentic RAG**：Loop 迴圈，模型自主控制搜尋策略。大腦介入的是「要不要再搜、搜什麼、什麼時候停」。

底層一句話論點是：**RAG 正從 System 1（快思考、流水線）走向 System 2（慢思考、循環推理）**。

下面一階段一階段拆。

## Phase 1 — Naive RAG：Retrieve-then-Read 的 baseline

2020 年 Facebook AI 那篇 NeurIPS 論文《Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks》定調了整個範式：Query Encoder + Document Encoder 映射到同一個向量空間，用 MIPS（最大內積搜尋）找 Top-K 文件，拼接進 Generator（原始論文用 BART）生成答案。

工業界落地時通常只用它的**推論範式**——LangChain / LlamaIndex + FAISS/Milvus + Fixed Prompt。它解決了 LLM 「知識過時 + 幻覺」的從 0 到 1 問題。

痛點很直接：**召回率即上限**。Top-k 沒撈到正確文件，或者撈到了不相關文件干擾模型，回答必錯。而向量檢索本身有兩個結構性限制：

1. 專有名詞、型號、產品碼、代號——這些向量本身就不擅長。
2. 一個 chunk 只有一個向量，代表這段文字的「語意壓縮」，天然無法表達精確的字面匹配。

## Phase 2 — Advanced RAG：Precision Matters

工業界很快發現 Naive RAG 效果很差，開始在「檢索前」和「檢索後」堆 trick。三招最有代表性：

### Hybrid Search

向量檢索（語意）+ BM25（關鍵字匹配）雙路。BM25 是 30 年前的老技術，但 RAG 把它重新救回來——因為向量沒辦法保證精確召回，而 BM25 天生就是為關鍵字匹配設計的。

2024 年 IBM Research 的 BlendedRAG 進一步證明：**向量 + 稀疏向量 + 全文搜尋** 三路混合，才是召回品質的上限。稀疏向量（如 SPLADE）解決通用查詢，但遇到 domain 專有詞會漏；BM25 補上這一塊。三路各有所長、無法相互取代。

### Reranker（重排序）

Bi-Encoder（Embedding 模型）分別編碼 query 和 doc，只算向量距離——快但粗。
Cross-Encoder（Reranker）把 query 和 doc 拼在一起送進 BERT，捕捉 token 兩兩交互——慢但精。

代表工作是 BAAI 的 **BGE-Reranker**（C-Pack 論文）。工程上通常這樣搭：向量檢索先撈 Top-50 粗排，Cross-Encoder 精排到 Top-5 再送 LLM。多加幾百毫秒延遲，換排序品質質變。

到了 2024 下半年，MTEB 榜單前排開始被**基於 LLM 的 Reranker**（例如 gte-Qwen2-7B）佔據，代價是推理成本翻倍。所以中間出現一個折衷方案——**Tensor / Late Interaction Reranker**（ColBERT 家族）：索引時保留每個 token 的向量，查詢時算 query token 與 doc token 兩兩相似度再累加。品質接近 Cross-Encoder，但可以放進資料庫層做（Vespa、Infinity 支援）。

### Query Rewriting / HyDE

CMU 那篇 HyDE（Hypothetical Document Embeddings）是很聰明的一手：**讓 LLM 先幻想一份假答案，用假答案去做向量檢索**。

為什麼有用？因為 query 和 document 的表述方式常常差很遠——user 問「怎麼修 D1 batch timeout」，doc 裡寫的是「當 SQLite transaction 超過 30 秒會被 Cloudflare Workers runtime 中止」。兩者向量距離不近。但用 LLM 幻想的假答案，語氣就會接近 doc，向量距離自然拉近。用假答案 embed 去搜，比原始 query embed 搜好得多。

Advanced RAG 這一階段的整體策略可以總結成一句：**用更多手段去逼近召回率上限**。但骨幹還是線性 pipeline——大腦只是站在 pipeline 兩端幫忙優化，並沒有介入決策。

## Phase 3 — Modular RAG：Dynamic Routing

當業務變複雜（既要查內部 KB、又要搜網、還要調 API），線性 RAG 跑不通了。開始拆模組：**Search / Memory / Routing / Tool 各自獨立**，Router 根據 query 意圖分發任務。

代表工作是 Stanford NLP 的 **DSPy**。它把 RAG 當成編程問題來對待：

- `Signatures` 定義輸入輸出（宣告式）
- `Modules` 是可組合的 building block
- `Teleprompter` 自動最佳化 Prompt 和 Few-shot Examples

意思是：不再手調 Prompt，而是像編譯代碼一樣，讓框架自動搜尋最優組合。Prompt Engineering 進化成 Prompt Compilation。

工業界最典型的例子是 ChatGPT Plugins / 文心一言的 Tool Routing——user 問「今天北京天氣」，Router 識別意圖 → 路由到天氣 API → 結果填進 Prompt。看起來只是加了個 if-else，但這個「if-else」的決策權從 dev 手裡交到了 LLM 手裡。這是「大腦介入」的第一次質變。

## Phase 4 — Graph RAG：Global Understanding

Phase 1-3 的 RAG 都是「碎片化」的——每個 chunk 各自為政，無法回答「總結全書觀點」或「這幾家公司關係的共同點」這種 **Global Query**。

微軟 2024 年那篇《From Local to Global: A Graph RAG Approach to Query-Focused Summarization》是分水嶺。核心 pipeline：

```
Source Documents
  → LLM 抽取實體與關係
  → Leiden 演算法做社群偵測（Hierarchical Communities）
  → LLM 為每個社群預先生成摘要
  → 查詢時走 Map-Reduce：每個社群摘要各回答一次、再彙整
```

它解決的是 RAG 的另一個結構性痛點——**語意鴻溝**。搜尋系統本身就有這個問題：query 和 doc 的表述方式不同，直接匹配容易漏。RAG 把 query 從關鍵字換成「一整句提問」後，鴻溝更大。GraphRAG 用「LLM 事先讀過所有文件、抽取實體、建圖、寫社群摘要」的方式，把跨文件的關聯資訊事先固化下來，查詢時直接走這些預生成的摘要。

微軟開源 GraphRAG 之後，短時間內出現一整光譜的變種，主線都在**降低 token 成本**：

- **Fast GraphRAG**：拿掉社群摘要，用個性化 PageRank 在圖上隨機遊走取子圖，再讓 LLM 基於子圖回答。
- **LightRAG**（港大）：拿掉社群這一層，更輕量。
- **LazyGraphRAG**（微軟，2024 底）：連 LLM 抽取都拿掉，改用本地小模型抽名詞 + 共現統計建社群，摘要在**查詢時才動態生成**。走另一個極端：所有預處理成本降到最低，把成本延到 query time。
- **HippoRAG**：借鑑神經科學的海馬體索引理論，在知識圖譜上用個性化 PageRank 模擬「人類回憶」的隨機遊走。
- **KAG**（螞蟻）：走另一個方向——把可解釋性做重，引入人工介入維護知識圖譜的完整性，服務金融、風控這種需要「說得出為什麼」的場景。

Graph RAG 的舒適區是**跨文件關聯強、需要全域理解**的場景：

- **金融風控**：查「黑產團伙」。文字 RAG 只能查到單個帳號違規，Graph RAG 順藤摸瓜找到整串關聯帳戶。
- **企業內部知識管理**：跨部門、跨專案的關聯資訊。
- **情報分析**：多個實體的關係網。

它不擅長什麼？**單篇長文的細節問答**——那本來就是 chunking + rerank 的舒適區，硬套 Graph RAG 是過度工程。

## Phase 5 — Agentic RAG：System 2 Reasoning

前四階段還在做「填空題」（Retrieve → Fill Context → Generate）。Agentic RAG 開始做「應用題」——它不是 Pipeline，是 Loop。

核心特徵有三：

- **自主規劃**：模型自己決定搜什麼、搜幾次、什麼時候停。
- **自我糾錯**：搜回來發現不對，自動重搜。
- **過程監督**：對推理鏈條的每一步打分。

按「自主性」的深度，Phase 5 內部可以再切三層：

### Level 1：顯式糾錯（Explicit Correction）

痛點：傳統 RAG 對檢索結果盲目信任，容易出現「因為檢索錯導致的幻覺」。這一層的思路是**打補丁**——外掛一個檢查模組。

- **CRAG**（Corrective RAG，USTC & Google，ICLR '24）：加一個輕量 Evaluator，把檢索結果三分類：
  - `Correct` → 執行 Refine，直接生成
  - `Incorrect` → 拋棄檢索結果，強制觸發 Web Search 重找
  - `Ambiguous` → 結合檢索知識與模型內部知識
- **Self-RAG**（ICLR '24）：訓練模型輸出**Reflection Tokens**（`[IsRel]`, `[IsSup]`），生成每句話時自問「這句話有依據嗎？相關嗎？」，讓自省變成生成流程的一部分。

Level 1 是目前工業界落地成本最低的 Agentic 形態——因為它不需要 RL 訓練，只需要 Prompt Engineering + 一個判別器。

### Level 2：強化學習驅動的推理（Reasoning with RL）

痛點：靠 Prompt 或規則指導搜尋，天花板太低。能不能讓模型像 AlphaGo 一樣，自己學會「怎麼搜」？

- **Search-R1**（Google Cloud AI，COLM '25）：把 DeepSeek-R1 的思路搬進 RAG。模型在 `<think>` 過程中主動生成 `<search>` token，工具呼叫變成推理鏈的一部分。用**結果監督**（Outcome Reward）——不標每一步搜得對不對，只看最後答案對不對，用 GRPO/PPO 大規模 RL。模型湧現出「多步搜尋」、「去偽存真」、「驗證反思」的策略。
- **Search-o1**（人大 & 清華）：針對長推理鏈中「檢索內容太長、噪聲太大」的問題，設計 **Reason-in-Documents** 模組——搜到之後不直接扔進 context，而是先在獨立模組內對文件做推理去噪，抽出核心邏輯鏈再喂主模型。避免 context window 爆掉、也降噪。

### Level 3：過程監督（Process Supervision）

痛點：Search-R1 的結果監督探索空間太大、收斂慢，長鏈路容易出現 Reward Hacking（模型學到「假裝在搜」而不是真的搜對）。改成過程級控制。

- **DecEx-RAG**（小紅書 & TJU）：把 RAG 建模成嚴格的 MDP（馬可夫決策過程）。雙模組解耦：
  - **Decision Module**：負責「指揮」，每一步輸出 `<是否終止>` 和 `<是否需要檢索>`
  - **Execution Module**：負責「幹活」，生成具體 query 或答案
  - **Process Reward**：不像 Search-R1 只給最終獎勵，而是用 Rollout 對中間每個決策節點打分
  - **Pruning Strategy**：某一步分數過低直接剪枝，不繼續浪費算力

三個 Level 的差異，可以用一句話講清楚：

- **Search-R1**："Let it learn by failing." — 探索空間大、收斂慢
- **DecEx-RAG**："Guide it step-by-step." — 探索效率高、數據利用率 ×6

Phase 5 內部這三層自己就是一個小版的 RAG 演進：
- CRAG / Self-RAG 解決「敢不敢用」（顯式糾錯）
- Search-R1 / o1 解決「會不會用」（自主規劃）
- DecEx-RAG 解決「能不能高效用」（過程剪枝）

## 一個論點：從 System 1 到 System 2

回頭看整個演進主線——**從靜態到動態，從無腦到有腦**。

以前的 RAG 是 System 1：追求毫秒級響應，搜到啥就是啥。
現在的 Agentic RAG 是 System 2：花 5-10 秒甚至更久 Thinking，多次搜尋、自我反思，最終保證答案品質。

這意味著三件事：

**1. Test-time Compute 是下一個戰場**

以前 LLM 的競爭焦點是「參數量、預訓練 loss」——訓練階段的計算。Agentic RAG 把競爭拉到「推理時願意花多少算力去 Reasoning」。DeepSeek-R1 和 o1 已經先示範了，Agentic RAG 是這個範式在檢索場景的落地。

**2. Long Context 不會取代 RAG**

Gemini 1.5 Pro 開了 1M+ tokens 之後，一度有人問 RAG 是不是不需要了。答案很清楚：還需要。Long Context 解決了「大海撈針」，但解決不了：

- **知識即時更新**：模型訓練好後知識就凍住了，RAG 是唯一的活水
- **TB / PB 級全網資料**：1M tokens 也塞不下企業級的全量資料
- **成本**：把 1M tokens 每次都塞進去，用量帳單會很難看

未來的架構一定是 **Long Context LLM + Agentic RAG** 的組合——LLM 提供 Reasoning 能力和局部長 context，RAG 負責可擴展、可更新的知識存取。

**3. Process Supervision Data 是新護城河**

DecEx-RAG 提到的**過程監督資料**——「人類如何一步一步透過搜尋解決複雜問題」的 Trajectory——會成為大廠的新資產。誰有這種資料（搜尋大廠、瀏覽器廠、Coding Agent 廠），誰在 Agentic 時代領先。這也是為什麼 OpenAI 收購 Rockset、Anthropic 大力做 Computer Use——都是在搶第一手的過程軌跡。

## 對照本站：engineer-news 現在在哪

寫到這裡，把鏡頭轉回自己。這個部落格用 Astro + Cloudflare Workers，跑了一套 RAG。實際打開 `scripts/sync-to-d1.ts` 和 `src/pages/api/search.ts` 對照五階段：

| 層 | engineer-news 實作 | 對照五階段 |
|---|---|---|
| Chunking | 段落合併到 1000 字上限（純長度切分） | Naive |
| Embedding | `@cf/baai/bge-m3` | Naive |
| Retrieval | 向量單路 `topK=8` | Naive |
| Rerank | 無 | 缺 Advanced |
| Hybrid Search | 只有向量無結果時 fallback SQL `LIKE` | 半 Advanced |
| Query Rewriting | 無 | 缺 Advanced |
| Generation | qwen1.5-14b（全站）/ llama-3.3-70b（單篇） | — |
| Router / Agent Loop | 無 | — |
| Graph / KG | 無 | — |

`/api/search` 的實際流程就三步：

1. `bge-m3` embed query
2. Vectorize `topK=8`
3. Join `doc_chunks` + `posts` 表，同來源去重，塞進 prompt，qwen 生成

「問這篇」功能有個小巧思：跳過向量檢索，把整篇文章的所有 chunks 依序組成 context，餵給 Llama-3.3-70B。這算是**識別意圖後路由到專用管線**——Modular RAG 的雛形——但只有這一個特例。

換句話說，**這個站落在 Naive RAG 的邊界，甚至還沒完成 Advanced RAG**。

### 下一步該補什麼

按照論文光譜，GraphRAG、Agentic RAG 都很誘人。但對個人站的實際狀況，性價比排序應該是：

1. **BGE-Reranker（Cross-Encoder）** — 把 `topK=8` 撈上來的結果重排。實作只是加一層 Workers AI 呼叫（Workers AI 有 `@cf/baai/bge-reranker-base`），延遲增加幾百毫秒，排序品質差異巨大。**Cost = 一個晚上，Gain = 明顯感覺**。這是絕對優先。
2. **BM25 三路混合** — Cloudflare D1 是 SQLite，可以直接用內建的 **FTS5** 全文索引補上關鍵字檢索。工作量比 rerank 大，但解決專有名詞、產品名、版本號這類向量本身不擅長的查詢。
3. **HyDE** — 查詢前先讓 LLM 生成假想答案再 embed。實作極簡（多一輪 LLM call）。適合 query 短而模糊的場景（例如「怎麼解決 D1 timeout」）。
4. **Contextual Retrieval** — Anthropic 提的方案。用 LLM 給每個 chunk 生成一小段上下文摘要，跟原文一起 embed，緩解語意鴻溝。實作中等（sync 階段每個 chunk 多一次 LLM call）、效果偏好。
5. **GraphRAG / Agentic RAG** — 暫時輪不到。這個站目前 150 篇左右的文章，跨文件關聯需求不夠強；Agentic 迴圈的 token 成本、延遲、debugging 複雜度也還沒到值得投入的臨界點。

排序背後的判準：**個人站的 RAG 演進，應該跟著資料量 + 使用者複雜度走**，而不是跟著論文光譜衝。GraphRAG 適合 TB 級跨部門資料，Agentic RAG 適合開放域深度研究——兩者對「一個個人技術站」都是過度工程。

## 結：RAG 是新一代的資料庫

InfiniFlow（RAGFlow 團隊）在 2024 年底那篇年度總結裡有一句話講得很好：

> RAG 是個非常複雜的系統，它並沒有像 LLM 那樣吸引海量的資金，但在真正使用中，不僅不可或缺，還非常複雜。

RAG 這個名字取得好——它代表一種**架構模式**，不是產品、不是應用。就像過去的資料庫：對外暴露的介面無比簡單（`SELECT`），內部無比複雜（optimizer、index、B-tree、事務隔離、MVCC）。

RAG 的對外介面也無比簡單——「問一句、答一句」——內部卻塞了 chunking / embedding / hybrid search / rerank / KG / agent loop / memory 一整套。**它是 LLM 時代的資料庫**。

過去兩年就是這個「新資料庫」從 v0.1 走到 v1.0 的過程。回頭看 engineer-news 這個站的 RAG，還只是 v0.2。下次動它的時候，會從 Reranker 開始補起。

## 參考資料

- Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (Lewis et al., NeurIPS 2020) — Naive RAG 的原始論文
- C-Pack: Packed Resources For General Chinese Embeddings (BAAI) — 引入 BGE-Reranker
- Precise Zero-Shot Dense Retrieval without Relevance Labels (CMU / Waterloo) — HyDE
- DSPy: Compiling Declarative Language Model Calls into Self-Improving Pipelines — https://github.com/stanfordnlp/dspy
- From Local to Global: A Graph RAG Approach to Query-Focused Summarization (Microsoft, 2024)
- Fast GraphRAG / LightRAG / LazyGraphRAG — Microsoft 及社群對 GraphRAG 的降本變種
- HippoRAG (2024) — 借鑑海馬體索引理論
- KAG (Ant Group) — https://github.com/OpenSPG/KAG
- Corrective Retrieval Augmented Generation (CRAG, ICLR '24)
- Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection (ICLR '24)
- Search-R1: Training LLMs to Reason and Leverage Search Engines with Reinforcement Learning (Google Cloud, COLM '25)
- Search-o1: Agentic Search-Enhanced Large Reasoning Models (人大 & 清華)
- DecEx-RAG: Boosting Agentic RAG with Decision and Execution Optimization via Process Supervision (小紅書 & TJU)
- Contextual Retrieval (Anthropic) — https://www.anthropic.com/news/contextual-retrieval
- Blended RAG: Improving RAG Accuracy with Semantic Search and Hybrid Query-Based Retrievers (IBM Research, 2024)
- InfiniFlow — 万字长文梳理 2024 年的 RAG（RAGFlow 團隊年度總結）
- wenaidev 互動教學頁 — https://www.wenaidev.com/interactive/rag
