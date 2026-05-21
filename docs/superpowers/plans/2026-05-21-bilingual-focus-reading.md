# 雙語切換 + 精讀模式 實作計劃

> **給 agentic worker：** 必須使用 `superpowers:subagent-driven-development`（推薦）或 `superpowers:executing-plans` 以 task-by-task 方式執行本計劃。步驟使用核取方塊（`- [ ]`）語法追蹤進度。

**目標：** 在英文文章頁面加入「左右雙語對照」與「hover 詞彙定義」兩個獨立開關，幫助用戶練習英文閱讀。

**架構：** Build time 在 `getStaticPaths` 查出對應中文文章並作為 prop 傳入，兩份 Content 都渲染進 HTML，以 CSS class toggle 控制顯示。詞庫為靜態 TS 檔（~150 詞），精讀模式啟動時 JS TreeWalker 走 `.prose` text node 包 `<span>` tooltip。

**Tech Stack：** Astro v5、React（client component）、純 CSS tooltip、TS

**Spec：** `docs/superpowers/specs/2026-05-21-bilingual-focus-reading-design.md`

---

## 檔案清單

| 動作 | 路徑 | 說明 |
|------|------|------|
| 新建 | `src/data/glossary.ts` | 技術詞彙詞庫 ~150 詞 |
| 新建 | `src/components/ReadingModeBar.tsx` | 雙語 / 精讀開關 React 元件（含 walker） |
| 修改 | `src/pages/en/posts/[...slug].astro` | 加 zhPost prop、渲染中文欄、掛載元件、加 CSS |

---

## Task 1：建立詞庫 `src/data/glossary.ts`

**Files：**
- 新建：`src/data/glossary.ts`

- [ ] **Step 1：建立目錄並寫詞庫檔案**

```bash
mkdir -p /home/horus/Desktop/engineernews/src/data
```

建立 `src/data/glossary.ts`，完整內容如下：

```ts
export const glossary: Record<string, string> = {
  // 系統設計
  "latency": "延遲",
  "throughput": "吞吐量",
  "distributed system": "分散式系統",
  "idempotent": "冪等",
  "eventual consistency": "最終一致性",
  "sharding": "分片",
  "circuit breaker": "熔斷器",
  "load balancer": "負載均衡器",
  "microservice": "微服務",
  "monolith": "單體架構",
  "scalability": "可擴展性",
  "horizontal scaling": "水平擴展",
  "vertical scaling": "垂直擴展",
  "concurrency": "並行",
  "parallelism": "平行",
  "race condition": "競態條件",
  "deadlock": "死鎖",
  "mutex": "互斥鎖",
  "semaphore": "信號量",
  "bottleneck": "瓶頸",
  "cold start": "冷啟動",
  "edge computing": "邊緣運算",
  "service mesh": "服務網格",
  // API / 協議
  "endpoint": "端點",
  "payload": "負載資料",
  "middleware": "中介軟體",
  "REST": "表述性狀態傳輸",
  "GraphQL": "圖形化查詢語言",
  "gRPC": "遠端程序呼叫",
  "webhook": "網路鉤子",
  "polling": "輪詢",
  "long polling": "長輪詢",
  "websocket": "WebSocket 連線",
  "pub/sub": "發布/訂閱",
  "message queue": "訊息佇列",
  "event-driven": "事件驅動",
  // 儲存 / 快取
  "cache": "快取",
  "CDN": "內容傳遞網路",
  "buffer": "緩衝區",
  "queue": "佇列",
  "heap": "堆積",
  "stack": "堆疊",
  "garbage collection": "垃圾回收",
  "memory leak": "記憶體洩漏",
  // 安全
  "authentication": "認證",
  "authorization": "授權",
  "token": "令牌",
  "JWT": "JSON Web Token",
  "OAuth": "開放授權",
  "encryption": "加密",
  "hashing": "雜湊",
  // 開發流程
  "deployment": "部署",
  "rollback": "回滾",
  "canary release": "金絲雀發布",
  "blue-green deployment": "藍綠部署",
  "feature flag": "功能旗標",
  "refactoring": "重構",
  "technical debt": "技術債",
  "code review": "程式碼審查",
  "pull request": "拉取請求",
  "dependency": "依賴",
  "version control": "版本控制",
  "repository": "儲存庫",
  "branch": "分支",
  "regression": "回歸",
  "unit test": "單元測試",
  "integration test": "整合測試",
  "end-to-end test": "端到端測試",
  "test coverage": "測試覆蓋率",
  "mocking": "模擬",
  "CI/CD": "持續整合/持續部署",
  "pipeline": "管道",
  // 容器 / 雲端
  "container": "容器",
  "cluster": "叢集",
  "namespace": "命名空間",
  "infrastructure": "基礎設施",
  "serverless": "無伺服器",
  "bandwidth": "頻寬（或：精力餘裕）",
  "observability": "可觀測性",
  "telemetry": "遙測",
  "logging": "日誌記錄",
  "metrics": "指標",
  "SLA": "服務等級協議",
  "SLO": "服務等級目標",
  "uptime": "可用時間",
  "incident": "事故",
  "on-call": "待命",
  "runbook": "操作手冊",
  // AI / ML
  "embedding": "向量嵌入",
  "fine-tuning": "微調",
  "inference": "推論",
  "training": "訓練",
  "neural network": "神經網路",
  "transformer": "轉換器架構",
  "attention mechanism": "注意力機制",
  "context window": "上下文視窗",
  "hallucination": "幻覺（AI 錯誤輸出）",
  "RAG": "檢索增強生成",
  "vector database": "向量資料庫",
  "semantic search": "語義搜尋",
  "prompt": "提示詞",
  "few-shot": "少樣本學習",
  "zero-shot": "零樣本學習",
  "LLM": "大型語言模型",
  "benchmark": "基準測試",
  "overfitting": "過擬合",
  "underfitting": "欠擬合",
  "tokenizer": "分詞器",
  "checkpoint": "檢查點",
  "quantization": "量化",
  "distillation": "知識蒸餾",
  // 職場英文
  "stakeholder": "利害關係人",
  "alignment": "共識對齊",
  "deliverable": "交付成果",
  "scope creep": "範圍蔓延",
  "sprint": "衝刺（開發週期）",
  "backlog": "待辦清單",
  "milestone": "里程碑",
  "retrospective": "回顧會議",
  "standup": "站立會議",
  "blockers": "阻礙事項",
  "roadmap": "路線圖",
  "OKR": "目標與關鍵結果",
  "KPI": "關鍵績效指標",
  "MVP": "最小可行產品",
  "prototype": "原型",
  "iterate": "迭代",
  "leverage": "善用（資源/優勢）",
  "pain point": "痛點",
  "tradeoff": "取捨",
  "trade-off": "取捨",
};
```

- [ ] **Step 2：Commit**

```bash
cd /home/horus/Desktop/engineernews
git add src/data/glossary.ts
git commit -m "feat: add bilingual/focus reading mode glossary data"
```

---

## Task 2：建立 `ReadingModeBar.tsx`

**Files：**
- 新建：`src/components/ReadingModeBar.tsx`

- [ ] **Step 1：建立元件檔案**

建立 `src/components/ReadingModeBar.tsx`，完整內容如下：

```tsx
import { useState, useEffect } from 'react';
import { glossary } from '../data/glossary';

interface Props {
  hasZh: boolean;
}

// 詞庫 walker — 模組層級，只套用一次
let glossaryApplied = false;

function applyGlossary() {
  if (glossaryApplied) return;
  const enCol = document.querySelector('.en-col .prose');
  if (!enCol) return;

  // 最長詞優先，避免 "distributed system" 被 "system" 搶先匹配
  const keys = Object.keys(glossary).sort((a, b) => b.length - a.length);
  const escapedKeys = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escapedKeys.join('|')})\\b`, 'gi');

  const markedTerms = new Set<string>();

  const walker = document.createTreeWalker(
    enCol,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        // 跳過 code/pre/a/heading 內的文字節點（含深層巢狀）
        if (parent.closest('code, pre, a, h1, h2, h3, h4, h5, h6, .gloss')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  // 先蒐集所有 text node，避免 DOM 修改影響 walker
  const nodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    nodes.push(node);
  }

  for (const textNode of nodes) {
    const text = textNode.textContent ?? '';
    regex.lastIndex = 0;
    if (!regex.test(text)) continue;
    regex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const term = match[0].toLowerCase();
      const def = glossary[term];
      if (!def) continue;

      // 匹配前的純文字
      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      if (!markedTerms.has(term)) {
        // 第一次出現：包 span
        markedTerms.add(term);
        const span = document.createElement('span');
        span.className = 'gloss';
        span.dataset.def = def;
        span.textContent = match[0];
        fragment.appendChild(span);
      } else {
        // 已標記過：純文字
        fragment.appendChild(document.createTextNode(match[0]));
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    if (fragment.childNodes.length > 0) {
      textNode.parentNode?.replaceChild(fragment, textNode);
    }
  }

  glossaryApplied = true;
}

function removeGlossary() {
  document.querySelectorAll('.gloss').forEach(span => {
    span.replaceWith(document.createTextNode(span.textContent ?? ''));
  });
  glossaryApplied = false;
}

export function ReadingModeBar({ hasZh }: Props) {
  const [bilingual, setBilingual] = useState(false);
  const [focus, setFocus] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1140);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const grid = document.querySelector('.article-grid');
    grid?.classList.toggle('bilingual-on', bilingual);
  }, [bilingual]);

  useEffect(() => {
    const grid = document.querySelector('.article-grid');
    grid?.classList.toggle('focus-on', focus);
    if (focus) {
      applyGlossary();
    } else {
      removeGlossary();
    }
  }, [focus]);

  const bilingualDisabled = !hasZh || isMobile;
  const bilingualTitle = !hasZh
    ? 'No Chinese version available'
    : isMobile
    ? 'Available on larger screens'
    : 'Toggle bilingual view';

  return (
    <div className="reading-mode-bar">
      <button
        className={`rm-btn${bilingual ? ' active' : ''}`}
        onClick={() => !bilingualDisabled && setBilingual(b => !b)}
        disabled={bilingualDisabled}
        title={bilingualTitle}
        aria-pressed={bilingual}
      >
        ⇄ Bilingual
      </button>
      <button
        className={`rm-btn${focus ? ' active' : ''}`}
        onClick={() => setFocus(f => !f)}
        title="Toggle focus reading mode"
        aria-pressed={focus}
      >
        📖 Focus
      </button>
    </div>
  );
}
```

- [ ] **Step 2：TypeScript 型別驗證**

```bash
cd /home/horus/Desktop/engineernews
pnpm exec tsc --noEmit 2>&1 | head -30
```

預期輸出：無錯誤（或只有既有的不相關警告）。

- [ ] **Step 3：Commit**

```bash
git add src/components/ReadingModeBar.tsx
git commit -m "feat: add ReadingModeBar component with bilingual toggle and focus reading mode"
```

---

## Task 3：修改 `[...slug].astro` — 資料層

**Files：**
- 修改：`src/pages/en/posts/[...slug].astro`（第 1–30 行）

- [ ] **Step 1：在 `getStaticPaths` 加入 zhPost 查詢**

找到 `getStaticPaths` 內的 `return posts.map(...)` 區塊（目前約第 22–26 行），改成：

```ts
  return posts.map(post => {
    const zhId = post.id.replace(/\.en$/, '').replace(/en$/, '');
    const zhPost = allPosts.find(
      p => p.data.lang === 'zh-TW' && p.id === zhId
    );
    return {
      params: { slug: normalizeEnglishPostId(post.id) },
      props: { post, allPosts, zhPost },
    };
  });
```

- [ ] **Step 2：加入 zhPost 渲染與 import**

在 frontmatter 區塊頂部的 import 列表加入：

```ts
import { ReadingModeBar } from '../../../components/ReadingModeBar';
```

找到第 29–30 行：
```ts
const { post, allPosts } = Astro.props;
const { Content, headings } = await render(post);
```

改成：
```ts
const { post, allPosts, zhPost } = Astro.props;
const { Content, headings } = await render(post);
const zhRendered = zhPost ? await render(zhPost) : null;
const ZhContent = zhRendered?.Content;
```

- [ ] **Step 3：TypeScript 驗證**

```bash
pnpm exec tsc --noEmit 2>&1 | head -30
```

預期：無新增錯誤。

---

## Task 4：修改 `[...slug].astro` — HTML 結構

**Files：**
- 修改：`src/pages/en/posts/[...slug].astro`（prose 區塊，目前約第 132 行）

- [ ] **Step 1：替換 prose 區塊為雙語 wrapper**

找到：
```astro
    <div class="prose"><Content /></div>
```

替換為：
```astro
    <ReadingModeBar client:load hasZh={!!ZhContent} />
    <div class="bilingual-wrapper">
      <div class="en-col">
        <div class="prose"><Content /></div>
      </div>
      {ZhContent && (
        <div class="zh-col">
          <p class="zh-label">中文版</p>
          <div class="prose"><ZhContent /></div>
        </div>
      )}
    </div>
```

- [ ] **Step 2：確認 Astro build 正常**

```bash
cd /home/horus/Desktop/engineernews
make build 2>&1 | tail -20
```

預期輸出：build 完成，無 error（warning 可忽略）。

---

## Task 5：加入 CSS

**Files：**
- 修改：`src/pages/en/posts/[...slug].astro`（`<style>` 區塊，目前約第 217 行）

- [ ] **Step 1：在 `<style>` 區塊末尾加入新樣式**

在 `</style>` 前插入：

```css
  /* ── ReadingModeBar ── */
  .reading-mode-bar {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
  }

  .rm-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: var(--radius-full);
    border: 0.5px solid var(--separator);
    background: var(--bg-secondary);
    color: var(--label-secondary);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .rm-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
  }

  .rm-btn.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .rm-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ── 雙語 wrapper（預設：只顯示英文） ── */
  .bilingual-wrapper {
    display: block;
  }

  .zh-col {
    display: none;
  }

  .zh-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--label-tertiary);
    margin: 0 0 12px;
    padding-bottom: 8px;
    border-bottom: 0.5px solid var(--separator);
  }

  /* ── bilingual-on（≥ 1140px） ── */
  @media (min-width: 1140px) {
    .article-grid.bilingual-on {
      grid-template-columns: 1fr;
    }

    .article-grid.bilingual-on .article-toc-sidebar {
      display: none;
    }

    .article-grid.bilingual-on .bilingual-wrapper {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      align-items: start;
    }

    .article-grid.bilingual-on .zh-col {
      display: block;
    }
  }

  /* ── 精讀模式 Tooltip ── */
  .gloss {
    border-bottom: 1px dashed var(--accent);
    cursor: help;
    position: relative;
    display: inline;
  }

  .gloss::after {
    content: attr(data-def);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--bg-secondary);
    border: 0.5px solid var(--separator);
    border-radius: var(--radius-sm);
    padding: 4px 8px;
    font-size: 12px;
    color: var(--label);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .gloss:hover::after {
    opacity: 1;
  }
```

- [ ] **Step 2：Final build 驗證**

```bash
make build 2>&1 | tail -20
```

預期：build 成功，無 error。

- [ ] **Step 3：Commit**

```bash
git add src/pages/en/posts/[...slug].astro
git commit -m "feat: add bilingual toggle and focus reading mode to English post page"
```

---

## Task 6：手動測試

- [ ] **Step 1：啟動 dev server**

```bash
make dev
```

- [ ] **Step 2：開啟有中文對應版本的英文文章**

瀏覽 `http://localhost:4321/en/posts/career/2026-04-27-alruckqq_pw`

- [ ] **Step 3：測試 Bilingual 模式**

1. 點「⇄ Bilingual」按鈕 → 按鈕變藍色、頁面展開成左右兩欄
2. 左欄顯示英文，右欄頂部有「中文版」標籤且內容為中文
3. 滾動頁面 → 兩欄同步滾動
4. 再點一次 → 恢復單欄

- [ ] **Step 4：測試 Focus 模式**

1. 點「📖 Focus」按鈕 → 按鈕變藍色
2. 英文正文中出現有虛線底線的詞（如 "latency"、"deployment" 等）
3. Hover 虛線詞 → 出現中文定義 tooltip
4. 再點一次 → 虛線消失

- [ ] **Step 5：測試沒有中文版的英文文章**

開啟一篇只有英文版的文章，確認「⇄ Bilingual」按鈕呈灰色且不可點擊（title 顯示 "No Chinese version available"）。

- [ ] **Step 6：測試手機寬度**

縮小瀏覽器視窗到 < 1140px，確認「⇄ Bilingual」按鈕灰色（title 顯示 "Available on larger screens"），點擊無效。
