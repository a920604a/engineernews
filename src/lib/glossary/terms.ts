import { glossary as legacyGlossary } from '../../data/glossary';

export interface GlossaryLink {
  label: string;
  url: string;
}

export interface GlossaryEntry {
  term: string;
  aliases?: string[];
  /** Short Chinese translation, shown in the hover tooltip + card header. */
  zh?: string;
  /** Beginner-level explanation (zh). */
  definition?: string;
  /** Advanced / technical explanation (zh). */
  advanced?: string;
  /** Where the term typically shows up (zh). */
  context?: string;
  links?: GlossaryLink[];
  definition_en?: string;
  advanced_en?: string;
  context_en?: string;
  links_en?: GlossaryLink[];
}

/**
 * Curated, richly-annotated terms. These get bilingual beginner/advanced
 * explanations and reading links, and override any legacy lightweight entry
 * with the same term. Add a reusable term here when it shows up across many
 * posts; use a post's frontmatter `glossary` for one-off, article-specific terms.
 */
const RICH_TERMS: GlossaryEntry[] = [
  {
    term: 'RAG',
    aliases: ['Retrieval-Augmented Generation', '檢索增強生成'],
    zh: '檢索增強生成',
    definition: '先從知識庫找出相關資料，再把資料交給模型回答，降低模型只靠記憶亂猜的機率。',
    definition_en: 'Retrieves relevant information from a knowledge base first, then feeds it to the model — reducing the chance of the model guessing from memory alone.',
    advanced: 'RAG 通常包含 chunking、embedding、retrieval、reranking、generation 與 citation/grounding 檢查；品質瓶頸多半在檢索與上下文選擇，而非生成本身。',
    advanced_en: 'RAG typically spans chunking, embedding, retrieval, reranking, generation, and citation/grounding checks. Quality bottlenecks usually live in retrieval and context selection, not generation.',
    context: '常見於 AI 搜尋、知識庫問答、客服與文件助理。本站的 /search 就是一套 RAG。',
    context_en: 'Common in AI search, knowledge-base Q&A, support bots, and doc assistants. This site\'s /search is a RAG pipeline.',
    links: [{ label: '站內搜尋 RAG 文章', url: '/search?q=RAG' }],
    links_en: [{ label: 'Search RAG articles', url: '/en/search?q=RAG' }],
  },
  {
    term: 'embedding',
    aliases: ['embeddings', '向量嵌入'],
    zh: '向量嵌入',
    definition: '把文字轉成一串數字向量，讓系統能用「距離」判斷兩段文字語意上像不像。',
    definition_en: 'Turns text into a numeric vector so the system can judge how semantically similar two passages are by distance.',
    advanced: 'Embedding 模型把 token 序列投影到高維空間；實務上要同時顧及模型的語言能力、chunk 粒度、metadata filter 與索引更新策略。',
    advanced_en: 'Embedding models project token sequences into a high-dimensional space. In practice you balance the model\'s language ability, chunk granularity, metadata filters, and index refresh strategy.',
    context: '用於語意搜尋、推薦、去重與 RAG 檢索。本站用 bge-m3 產生 384 維向量。',
    context_en: 'Used in semantic search, recommendations, dedup, and RAG retrieval. This site uses bge-m3 (384-dim).',
    links: [{ label: '站內搜尋 embedding', url: '/search?q=embedding' }],
  },
  {
    term: 'Vectorize',
    aliases: ['Cloudflare Vectorize'],
    zh: '向量資料庫服務',
    definition: 'Cloudflare 的向量資料庫服務，用來存 embedding 並做相似度搜尋。',
    definition_en: 'Cloudflare\'s vector database for storing embeddings and running similarity search.',
    advanced: 'Vectorize 負責 ANN 近似向量查詢；在 RAG 中通常搭配 D1/FTS 做 hybrid search 與 metadata 補全。',
    advanced_en: 'Vectorize handles ANN approximate search; in RAG it\'s usually paired with D1/FTS for hybrid search and metadata enrichment.',
    context: '本站 RAG 檢索用 Vectorize 存文章與文件 chunk 的向量。',
    context_en: 'This site\'s RAG retrieval stores article/doc chunk vectors in Vectorize.',
  },
  {
    term: 'Cloudflare D1',
    aliases: ['D1'],
    zh: 'Serverless SQLite',
    definition: 'Cloudflare Workers 上的 serverless SQLite 資料庫，靠近邊緣、零維運。',
    definition_en: 'A serverless SQLite database on Cloudflare Workers — edge-local, zero ops.',
    advanced: 'D1 適合讀多寫少、單一 region 主寫的場景；批次寫入要注意 statement 數與 timeout 限制。',
    advanced_en: 'D1 fits read-heavy, single-primary workloads; batch writes need care around statement count and timeout limits.',
    context: '本站的 posts、page_views、search_logs、glossary_lookup_stats 都存在 D1。',
    context_en: 'This site keeps posts, page_views, search_logs, and glossary_lookup_stats in D1.',
  },
  {
    term: 'LLM',
    aliases: ['Large Language Model', '大型語言模型'],
    zh: '大型語言模型',
    definition: '用海量文字訓練、能依上下文預測下一個字的模型，像 GPT、Claude、Llama。',
    definition_en: 'A model trained on massive text that predicts the next token from context — e.g. GPT, Claude, Llama.',
    advanced: '自回歸 Transformer 為主流；推論成本由參數量、context 長度與 decoding 策略決定，常用 quantization 與 KV cache 降本。',
    advanced_en: 'Mostly autoregressive Transformers; inference cost is driven by params, context length, and decoding strategy, often cut with quantization and KV caching.',
    context: '出現在幾乎所有 AI 應用：聊天、摘要、抽取、Agent。',
    context_en: 'Shows up across nearly all AI apps: chat, summarization, extraction, agents.',
  },
  {
    term: 'token',
    aliases: ['tokens', 'tokenization', 'tokenizer'],
    zh: '詞元',
    definition: '模型處理文字的最小單位，可能是一個字、半個詞或一段符號；計費與長度上限都以 token 計。',
    definition_en: 'The smallest unit a model processes — a character, sub-word, or symbol chunk. Billing and context limits are counted in tokens.',
    advanced: '不同 tokenizer（BPE、SentencePiece）對 CJK 切分差異大，影響 context 用量與成本估算。',
    advanced_en: 'Different tokenizers (BPE, SentencePiece) split CJK very differently, affecting context usage and cost estimates.',
    context: '估算 API 成本、設計 prompt 長度時都要算 token。',
    context_en: 'Relevant when estimating API cost and budgeting prompt length.',
  },
  {
    term: 'AI Agent',
    aliases: ['agent', 'agents', 'AI 代理'],
    zh: 'AI 代理',
    definition: '能自己規劃步驟、呼叫工具、根據結果再決定下一步的 AI 系統，而不只是回一句話。',
    definition_en: 'An AI system that plans steps, calls tools, and decides what to do next from results — not just a single reply.',
    advanced: 'Agent 的工程重點在 harness：context 管理、工具定義、迴圈控制與失敗回復，而非單純的 prompt。',
    advanced_en: 'Agent engineering centers on the harness — context management, tool definitions, loop control, and failure recovery — more than the prompt itself.',
    context: '常見於 Claude Code、Codex、自動化工作流與多代理協作。',
    context_en: 'Common in Claude Code, Codex, automation workflows, and multi-agent setups.',
    links: [{ label: '站內搜尋 AI Agent', url: '/search?q=AI%20Agent' }],
  },
  {
    term: 'MCP',
    aliases: ['Model Context Protocol'],
    zh: '模型上下文協定',
    definition: '一套讓 AI 模型用統一方式連接外部工具與資料來源的開放協定。',
    definition_en: 'An open protocol that lets AI models connect to external tools and data sources in a uniform way.',
    advanced: 'MCP server 暴露 tools/resources，client（如 Claude Code）動態載入；好處是工具生態解耦、可重用。',
    advanced_en: 'MCP servers expose tools/resources that clients (e.g. Claude Code) load dynamically — decoupling and reusing the tool ecosystem.',
    context: '出現在 Claude Code、IDE 整合與 Agent 工具串接。',
    context_en: 'Shows up in Claude Code, IDE integrations, and agent tool wiring.',
  },
  {
    term: 'fine-tuning',
    aliases: ['finetune', 'fine tune', '微調'],
    zh: '微調',
    definition: '拿一個已訓練好的模型，再用特定領域的資料繼續訓練，讓它更擅長某類任務。',
    definition_en: 'Taking a pre-trained model and training it further on domain data so it gets better at a specific task.',
    advanced: '相對 RAG，fine-tuning 改的是模型權重；常用 LoRA/QLoRA 降低成本，但難以即時更新知識。',
    advanced_en: 'Unlike RAG, fine-tuning changes weights; LoRA/QLoRA cut cost, but knowledge is hard to update in real time.',
    context: '需要固定風格、格式或專業術語時常用；知識會過時則偏向用 RAG。',
    context_en: 'Used when you need a fixed style/format/jargon; prefer RAG when knowledge goes stale.',
  },
  {
    term: 'hallucination',
    aliases: ['hallucinate', '幻覺'],
    zh: '幻覺',
    definition: '模型自信地講出聽起來合理、但其實是錯的或捏造的內容。',
    definition_en: 'When a model confidently states something plausible-sounding that is actually wrong or made up.',
    advanced: '常因訓練資料截止、檢索缺失或 prompt 誘導；grounding、citation 與 RAG 可降低但無法完全消除。',
    advanced_en: 'Often from training cutoffs, missing retrieval, or leading prompts; grounding, citations, and RAG reduce but don\'t eliminate it.',
    context: '版本號、定價、API 名稱最容易出現幻覺，發文前要查證。',
    context_en: 'Version numbers, pricing, and API names are the most hallucination-prone — verify before publishing.',
  },
  {
    term: 'context window',
    aliases: ['context length', '上下文視窗'],
    zh: '上下文視窗',
    definition: '模型一次能讀進去的最大文字量（以 token 計），超過就會被截斷或遺忘。',
    definition_en: 'The maximum amount of text (in tokens) a model can read at once; beyond it, content is truncated or forgotten.',
    advanced: '長 context 不等於有效利用，存在 "lost in the middle"；context engineering 在挑選與壓縮最相關的資訊。',
    advanced_en: 'A long context isn\'t automatically used well ("lost in the middle"); context engineering is about selecting and compressing the most relevant info.',
    context: '設計 RAG、Agent 與長文件處理時的核心限制。',
    context_en: 'A core constraint when designing RAG, agents, and long-document processing.',
  },
  {
    term: 'quantization',
    aliases: ['quantized', '量化'],
    zh: '量化',
    definition: '把模型權重從高精度（如 FP16）壓成低精度（如 INT4），換取更小體積與更快推論。',
    definition_en: 'Compressing model weights from high precision (e.g. FP16) to low (e.g. INT4) for smaller size and faster inference.',
    advanced: 'AWQ、GPTQ、GGUF 各有取捨；過度量化會掉準確率，需在延遲、記憶體與品質間平衡。',
    advanced_en: 'AWQ, GPTQ, and GGUF trade off differently; over-quantizing hurts accuracy — balance latency, memory, and quality.',
    context: '在本機跑 LLM（Ollama、llama.cpp）時最常遇到。',
    context_en: 'Most relevant when running LLMs locally (Ollama, llama.cpp).',
  },
  {
    term: 'greenfield',
    aliases: ['greenfield project', '綠地專案'],
    zh: '綠地專案',
    definition: '從零開始、沒有既有系統包袱的新專案，設計自由度最高。',
    definition_en: 'A project built from scratch with no legacy system to accommodate — maximum design freedom.',
    advanced: '架構、技術選型、規範可以一次定齊；缺點是還沒有真實使用者驗證，容易過度設計或選錯抽象。Harness Engineering、微服務、DDD 這類方法在綠地上最容易落地。',
    advanced_en: 'Architecture, stack choices, and conventions can be set cleanly upfront — but without real usage feedback, teams often over-engineer or pick the wrong abstractions. Approaches like Harness Engineering, microservices, and DDD land most easily on greenfield.',
    context: '新產品、新服務、或內部工具從零重寫的情境。',
    context_en: 'New products, new services, and internal-tool rewrites from scratch.',
  },
  {
    term: 'brownfield',
    aliases: ['brownfield project', '棕地專案'],
    zh: '棕地專案',
    definition: '對既有系統做的改造、擴充或現代化；必須在不打破現況的前提下推進。',
    definition_en: 'Modernizing, extending, or refactoring an existing system without breaking what already works.',
    advanced: '典型限制包含技術債、隱性依賴、缺少測試、部署路徑僵化；常見策略是絞殺榕（strangler fig）、模組化切分、先補測試再重構。大多數團隊真實面對的都是棕地，而不是綠地。',
    advanced_en: 'Typical constraints: tech debt, hidden dependencies, missing test coverage, rigid deploy paths. Common strategies include the strangler fig pattern, modular carve-outs, and adding tests before refactoring. Most teams actually work in brownfield, not greenfield.',
    context: 'Legacy 系統重構、大版本升級、把 AI Agent 導入既有 codebase 的情境。',
    context_en: 'Legacy refactors, major upgrades, and rolling AI agents into an existing codebase.',
  },
];

function toLightweight(term: string, e: { zh: string; context?: string }): GlossaryEntry {
  return { term, zh: e.zh, definition: e.context ?? e.zh };
}

/**
 * All default terms = legacy lightweight entries (from src/data/glossary.ts)
 * overlaid with the curated RICH_TERMS (rich entries win on term collision).
 */
const byTerm = new Map<string, GlossaryEntry>();
for (const [term, e] of Object.entries(legacyGlossary)) {
  byTerm.set(term.toLowerCase(), toLightweight(term, e));
}
for (const e of RICH_TERMS) {
  byTerm.set(e.term.toLowerCase(), e);
}

export const DEFAULT_GLOSSARY_TERMS: GlossaryEntry[] = Array.from(byTerm.values());

/** term + every alias → entry (all lowercased), for matching and lookup. */
const lookup = new Map<string, GlossaryEntry>();
for (const e of DEFAULT_GLOSSARY_TERMS) {
  lookup.set(e.term.toLowerCase(), e);
  for (const alias of e.aliases ?? []) lookup.set(alias.toLowerCase(), e);
}

export function findDefaultGlossaryEntry(term: string): GlossaryEntry | undefined {
  return lookup.get(term.toLowerCase());
}

/** Returns the full match map (term + aliases → entry), keys lowercased. */
export function getGlossaryLookup(): Map<string, GlossaryEntry> {
  return lookup;
}
