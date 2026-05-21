# 雙語模式全面改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 TTS 腳本搬移至 `src/tts/`、以配對模式生成英中腳本與段落對齊映射、並重做雙語版面為 Podcast 卡片風格，支援跨欄段落高亮與詞彙點擊卡片。

**Architecture:** `tts-all.ts` 改為以配對（EN+ZH）為單位處理，確保每篇文章同時生成英文腳本、中文腳本、及 `bilingual-map.json`。新元件 `BilingualView.tsx` 接管雙語版面渲染，`ReadingModeBar.tsx` 只保留開關按鈕。`src/data/glossary.ts` 資料結構從純字串擴充為含 `context` 的物件，支援詞彙點擊卡片。

**Tech Stack:** TypeScript、Astro SSR、React 18、gray-matter、Claude CLI（`spawnSync`）

---

## 檔案地圖

| 狀態 | 檔案 | 責任 |
|------|------|------|
| 新增 | `scripts/migrate-tts-scripts.sh` | 一次性搬移現有腳本至 `src/tts/` |
| 修改 | `src/lib/tts.ts` | 新增 `getTTSDir`、`getTTSBasename`、`generateBilingualMap` |
| 修改 | `src/data/glossary.ts` | schema 從 `Record<string,string>` 升級為 `Record<string,GlossEntry>` |
| 修改 | `scripts/tts-all.ts` | 改為配對模式，輸出至 `src/tts/` |
| 新增 | `src/components/BilingualView.tsx` | 雙語卡片 UI、跨欄高亮、詞彙卡片 |
| 修改 | `src/pages/en/posts/[...slug].astro` | 讀取路徑改 `src/tts/`、載入 alignmentMap、換用 BilingualView |
| 修改 | `src/components/ReadingModeBar.tsx` | 移除 applyGlossary，只保留按鈕 |

---

## Task 1: 執行遷移腳本

**Files:**
- 新增: `scripts/migrate-tts-scripts.sh`

- [ ] **Step 1: 建立遷移腳本**

```bash
cat > scripts/migrate-tts-scripts.sh << 'EOF'
#!/usr/bin/env bash
# 將 src/content/posts/ 下的 .tts-script.txt 搬移至 src/tts/
set -euo pipefail
find src/content/posts -name "*.tts-script.txt" | while read src; do
  rel="${src#src/content/posts/}"
  cat_dir="src/tts/$(dirname "$rel")"
  mkdir -p "$cat_dir"
  mv "$src" "$cat_dir/$(basename "$rel")"
  echo "moved: $src -> $cat_dir/$(basename "$rel")"
done
echo "遷移完成。"
EOF
chmod +x scripts/migrate-tts-scripts.sh
```

- [ ] **Step 2: 執行並確認**

```bash
bash scripts/migrate-tts-scripts.sh
```

預期輸出（範例）：
```
moved: src/content/posts/career/2026-04-27-alruckqq_pw.en.tts-script.txt -> src/tts/career/2026-04-27-alruckqq_pw.en.tts-script.txt
...
遷移完成。
```

- [ ] **Step 3: 確認 src/content/posts 下已無腳本檔**

```bash
find src/content/posts -name "*.tts-script.txt" | wc -l
```

預期輸出：`0`

```bash
find src/tts -name "*.tts-script.txt" | wc -l
```

預期輸出應等於原來的腳本總數（約 49）。

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-tts-scripts.sh src/tts/
git commit -m "chore: 將 TTS 腳本遷移至 src/tts/"
```

---

## Task 2: 新增路徑輔助函式至 src/lib/tts.ts

**Files:**
- 修改: `src/lib/tts.ts`（在 `export const R2_BUCKET_NAME` 之後插入）

- [ ] **Step 1: 在 `src/lib/tts.ts` 的 `R2_BUCKET_NAME` 宣告後插入兩個函式**

找到這一行：
```ts
export const R2_BUCKET_NAME = 'engineer-news-og-images';
```

在其後插入：
```ts
/**
 * 回傳指定分類的 TTS 輸出目錄（src/tts/<category>/）
 */
export function getTTSDir(category: string): string {
  return path.join(process.cwd(), 'src/tts', category);
}

/**
 * 從 EN slug 移除 .en 後綴，得到配對基礎名稱
 * 例：'2026-04-27-slug.en' → '2026-04-27-slug'
 */
export function getTTSBasename(enSlug: string): string {
  return enSlug.replace(/\.en$/, '');
}
```

- [ ] **Step 2: 快速驗證（不依賴外部服務）**

```bash
node -e "
const path = require('path');
function getTTSDir(cat) { return path.join(process.cwd(), 'src/tts', cat); }
function getTTSBasename(s) { return s.replace(/\\.en\$/, ''); }
console.assert(getTTSDir('career').endsWith('src/tts/career'), 'getTTSDir failed');
console.assert(getTTSBasename('2026-04-27-slug.en') === '2026-04-27-slug', 'getTTSBasename failed');
console.log('OK');
"
```

預期輸出：`OK`

- [ ] **Step 3: Commit**

```bash
git add src/lib/tts.ts
git commit -m "feat: 新增 getTTSDir、getTTSBasename 路徑輔助函式"
```

---

## Task 3: 擴充 src/data/glossary.ts 資料結構

**Files:**
- 修改: `src/data/glossary.ts`

- [ ] **Step 1: 以下列完整內容取代 `src/data/glossary.ts`**

```ts
export interface GlossEntry {
  zh: string;
  context?: string;
}

export const glossary: Record<string, GlossEntry> = {
  // 系統設計
  "latency": { zh: "延遲", context: "影響使用者感知速度的關鍵指標，通常以 p50/p99 衡量。" },
  "throughput": { zh: "吞吐量", context: "系統每秒能處理的請求量，橫向擴展可提升。" },
  "distributed system": { zh: "分散式系統", context: "多台機器協同工作，需處理網路分區與一致性問題。" },
  "idempotent": { zh: "冪等", context: "同一操作執行多次結果相同，重試安全的 API 設計基礎。" },
  "eventual consistency": { zh: "最終一致性", context: "分散式系統中，節點最終會同步但不保證即時一致。" },
  "sharding": { zh: "分片", context: "將資料水平切割到多個節點，解決單機儲存上限問題。" },
  "circuit breaker": { zh: "熔斷器", context: "下游服務異常時自動切斷請求，避免雪崩效應。" },
  "load balancer": { zh: "負載均衡器", context: "將流量分配到多台伺服器，提升可用性與吞吐量。" },
  "microservice": { zh: "微服務", context: "將應用拆成多個獨立部署的小服務，各自有獨立資料庫。" },
  "monolith": { zh: "單體架構", context: "所有功能打包成一個應用，簡單但難以獨立擴展。" },
  "scalability": { zh: "可擴展性", context: "系統在負載增加時維持效能的能力。" },
  "horizontal scaling": { zh: "水平擴展", context: "增加機器數量提升容量，比垂直擴展更具成本效益。" },
  "vertical scaling": { zh: "垂直擴展", context: "升級單機 CPU/記憶體，有上限且通常代價較高。" },
  "concurrency": { zh: "並行", context: "多個任務交錯執行，需注意共享狀態的競態問題。" },
  "parallelism": { zh: "平行", context: "多個任務真正同時執行，需要多核或多機。" },
  "race condition": { zh: "競態條件", context: "多執行緒同時讀寫共享資料導致結果不確定。" },
  "deadlock": { zh: "死鎖", context: "兩個執行緒互相等待對方釋放鎖，導致雙雙卡住。" },
  "mutex": { zh: "互斥鎖", context: "保證同一時間只有一個執行緒存取共享資源。" },
  "semaphore": { zh: "信號量", context: "控制同時存取資源的執行緒數量上限。" },
  "bottleneck": { zh: "瓶頸", context: "系統中限制整體效能的最慢環節。" },
  "cold start": { zh: "冷啟動", context: "Serverless 函式首次執行時的初始化延遲。" },
  "edge computing": { zh: "邊緣運算", context: "在靠近使用者的節點執行運算，降低延遲。" },
  "service mesh": { zh: "服務網格", context: "微服務間的通訊基礎設施，處理認證、負載均衡、追蹤。" },
  // API / 協議
  "endpoint": { zh: "端點", context: "API 的具體路徑，如 /api/users 對應特定資源操作。" },
  "payload": { zh: "負載資料", context: "HTTP 請求或回應的主體內容，通常為 JSON。" },
  "middleware": { zh: "中介軟體", context: "請求與處理邏輯之間的插件，常用於認證、日誌、限流。" },
  "webhook": { zh: "網路鉤子", context: "事件發生時主動推送 HTTP 請求到指定 URL。" },
  "polling": { zh: "輪詢", context: "客戶端定期詢問伺服器是否有新資料，效率較低。" },
  "long polling": { zh: "長輪詢", context: "伺服器掛起請求直到有新資料再回應，比輪詢更即時。" },
  "pub/sub": { zh: "發布/訂閱", context: "發布者與訂閱者解耦，透過訊息系統傳遞事件。" },
  "message queue": { zh: "訊息佇列", context: "生產者與消費者之間的非同步緩衝，如 Kafka、RabbitMQ。" },
  "event-driven": { zh: "事件驅動", context: "系統行為由事件觸發而非直接呼叫，提升解耦性。" },
  // 儲存 / 快取
  "cache": { zh: "快取", context: "將昂貴計算或查詢結果暫存，以空間換時間。" },
  "cdn": { zh: "內容傳遞網路", context: "全球分散的靜態資源伺服器，降低使用者存取延遲。" },
  "buffer": { zh: "緩衝區", context: "暫存資料以平滑生產與消費速度差異的記憶體區域。" },
  "queue": { zh: "佇列", context: "先進先出的資料結構，常用於任務排隊。" },
  "heap": { zh: "堆積", context: "用於動態記憶體分配的記憶體區域，GC 管理的主要對象。" },
  "garbage collection": { zh: "垃圾回收", context: "自動釋放不再使用的記憶體，避免手動管理錯誤。" },
  "memory leak": { zh: "記憶體洩漏", context: "程式未釋放不再需要的記憶體，長期運行會耗盡資源。" },
  // 安全
  "authentication": { zh: "認證", context: "確認「你是誰」，如帳號密碼、JWT、OAuth。" },
  "authorization": { zh: "授權", context: "確認「你能做什麼」，如角色權限控制。" },
  "encryption": { zh: "加密", context: "將資料轉換為只有持有密鑰者才能讀取的形式。" },
  "hashing": { zh: "雜湊", context: "將資料轉為固定長度摘要，不可逆，常用於密碼儲存。" },
  // 開發流程
  "deployment": { zh: "部署", context: "將程式碼從開發環境推送到正式環境的過程。" },
  "rollback": { zh: "回滾", context: "部署出問題時快速恢復到前一個穩定版本。" },
  "canary release": { zh: "金絲雀發布", context: "先將新版本推給少數用戶，確認無誤再全量。" },
  "blue-green deployment": { zh: "藍綠部署", context: "同時運行新舊兩套環境，切換流量零停機。" },
  "feature flag": { zh: "功能旗標", context: "不改程式碼即可動態開關功能，支援 A/B 測試。" },
  "refactoring": { zh: "重構", context: "改善程式碼結構而不改變外部行為，減少技術債。" },
  "technical debt": { zh: "技術債", context: "為快速交付而採用的次優解，未來需花時間償還。" },
  "code review": { zh: "程式碼審查", context: "同儕審查程式碼品質與正確性，也是知識傳遞途徑。" },
  "pull request": { zh: "拉取請求", context: "請求將分支合併到主線的機制，也是程式碼審查的載體。" },
  "dependency": { zh: "依賴", context: "程式碼所依賴的外部套件或服務，版本管理是常見痛點。" },
  "version control": { zh: "版本控制", context: "追蹤程式碼變更歷史，支援協作與回滾。" },
  "repository": { zh: "儲存庫", context: "版本控制系統中的專案容器，如 GitHub repo。" },
  "branch": { zh: "分支", context: "從主線分出的獨立開發線，合併前不影響主線。" },
  "regression": { zh: "回歸", context: "新版本引入的已知功能缺陷，迴歸測試用來防範。" },
  "unit test": { zh: "單元測試", context: "針對單一函式或模組的隔離測試，執行快速。" },
  "integration test": { zh: "整合測試", context: "測試多個元件協同工作的行為，比單元測試慢。" },
  "end-to-end test": { zh: "端到端測試", context: "模擬真實用戶流程的全鏈路測試。" },
  "test coverage": { zh: "測試覆蓋率", context: "程式碼被測試執行到的比例，高覆蓋率不等於高品質。" },
  "mocking": { zh: "模擬", context: "以假物件替代真實依賴，讓測試隔離且快速。" },
  "pipeline": { zh: "管道", context: "CI/CD 自動化流程，從提交到部署的一系列步驟。" },
  // 容器 / 雲端
  "container": { zh: "容器", context: "打包應用與其依賴的輕量虛擬化單元，如 Docker。" },
  "cluster": { zh: "叢集", context: "多台機器組成的運算集合，Kubernetes 管理容器叢集。" },
  "namespace": { zh: "命名空間", context: "隔離資源的邏輯分區，Kubernetes 中用於多租戶隔離。" },
  "infrastructure": { zh: "基礎設施", context: "支撐應用運行的硬體、網路、儲存等底層資源。" },
  "serverless": { zh: "無伺服器", context: "按需執行函式，無需管理伺服器，但有冷啟動限制。" },
  "observability": { zh: "可觀測性", context: "透過日誌、指標、追蹤了解系統內部狀態的能力。" },
  "telemetry": { zh: "遙測", context: "自動收集系統運行資料傳送到監控平台。" },
  "logging": { zh: "日誌記錄", context: "記錄系統事件以供除錯與審計。" },
  "metrics": { zh: "指標", context: "可量化的系統健康數據，如 QPS、錯誤率、延遲。" },
  "uptime": { zh: "可用時間", context: "系統正常運行的時間比例，99.9% = 每年約 8.7 小時停機。" },
  "incident": { zh: "事故", context: "影響用戶的生產環境問題，有完整的處置與回顧流程。" },
  "runbook": { zh: "操作手冊", context: "特定情境下的標準操作步驟，減少事故應對時間。" },
  "bandwidth": { zh: "頻寬（或：精力餘裕）", context: "技術上指網路傳輸容量，職場中也比喻個人可用精力。" },
  // AI / ML
  "embedding": { zh: "向量嵌入", context: "將文字或物件轉為數值向量，用於語義搜尋與相似度計算。" },
  "fine-tuning": { zh: "微調", context: "在預訓練模型基礎上用特定資料繼續訓練，適應特定任務。" },
  "inference": { zh: "推論", context: "使用訓練好的模型對新輸入產生預測或輸出。" },
  "neural network": { zh: "神經網路", context: "模仿人腦神經元連接的機器學習模型。" },
  "transformer": { zh: "轉換器架構", context: "現代 LLM 的核心架構，基於自注意力機制。" },
  "attention mechanism": { zh: "注意力機制", context: "讓模型聚焦於輸入中最相關部分的機制。" },
  "context window": { zh: "上下文視窗", context: "模型單次能處理的最大 token 數量。" },
  "hallucination": { zh: "幻覺（AI 錯誤輸出）", context: "LLM 產生看似合理但實際錯誤的內容。" },
  "vector database": { zh: "向量資料庫", context: "專門儲存與檢索向量嵌入的資料庫，如 Pinecone、Vectorize。" },
  "semantic search": { zh: "語義搜尋", context: "基於語意相似度而非關鍵字匹配的搜尋方式。" },
  "prompt": { zh: "提示詞", context: "給 LLM 的輸入指令，影響輸出品質的關鍵。" },
  "few-shot": { zh: "少樣本學習", context: "在 prompt 中提供少量範例，引導模型理解任務。" },
  "zero-shot": { zh: "零樣本學習", context: "不提供範例直接要求模型完成未見過的任務。" },
  "benchmark": { zh: "基準測試", context: "用標準測試集評估模型或系統效能的比較基準。" },
  "overfitting": { zh: "過擬合", context: "模型在訓練資料上表現好但泛化能力差。" },
  "underfitting": { zh: "欠擬合", context: "模型太簡單，連訓練資料的規律都學不到。" },
  "tokenizer": { zh: "分詞器", context: "將文字切成 token 的工具，影響模型的輸入處理方式。" },
  "quantization": { zh: "量化", context: "降低模型權重精度以減少記憶體與計算需求。" },
  "distillation": { zh: "知識蒸餾", context: "用大模型的輸出訓練小模型，壓縮同時保留能力。" },
  "fine-tune": { zh: "微調", context: "同 fine-tuning，在預訓練模型上繼續訓練適應特定任務。" },
  "rag": { zh: "檢索增強生成", context: "將外部知識庫檢索結果注入 prompt，提升準確性。" },
  "llm": { zh: "大型語言模型", context: "使用巨量文字訓練的生成式 AI 模型，如 GPT、Claude。" },
  // 職場英文
  "stakeholder": { zh: "利害關係人", context: "對專案有影響力或關切的人，如 PM、客戶、高層。" },
  "alignment": { zh: "共識對齊", context: "確保團隊成員對目標、方向有一致理解。" },
  "deliverable": { zh: "交付成果", context: "可交付給客戶或利害關係人的具體產物。" },
  "scope creep": { zh: "範圍蔓延", context: "專案需求在執行中不斷擴大，侵蝕時程與資源。" },
  "sprint": { zh: "衝刺（開發週期）", context: "Scrum 中固定長度的迭代開發週期，通常 1-2 週。" },
  "backlog": { zh: "待辦清單", context: "所有待完成功能或任務的優先排序清單。" },
  "milestone": { zh: "里程碑", context: "專案中的重要時間節點，通常對應可交付成果。" },
  "retrospective": { zh: "回顧會議", context: "Sprint 結束後檢討做得好與可改進之處。" },
  "standup": { zh: "站立會議", context: "每日短暫同步進度的例行會議，通常 15 分鐘。" },
  "blockers": { zh: "阻礙事項", context: "阻止任務推進的問題，需要立即處理或升級。" },
  "roadmap": { zh: "路線圖", context: "產品或專案的長期規劃，呈現功能優先順序與時程。" },
  "mvp": { zh: "最小可行產品", context: "以最少功能驗證核心假設的初始版本。" },
  "prototype": { zh: "原型", context: "用於驗證設計或概念的早期粗糙版本。" },
  "iterate": { zh: "迭代", context: "基於反饋持續改進產品或功能的循環過程。" },
  "leverage": { zh: "善用（資源/優勢）", context: "充分利用已有的工具、關係或優勢達到更大效果。" },
  "pain point": { zh: "痛點", context: "用戶或流程中明顯的問題或摩擦點。" },
  "tradeoff": { zh: "取捨", context: "在兩個相互衝突的目標間做選擇，沒有完美解。" },
  "trade-off": { zh: "取捨", context: "同 tradeoff，在衝突目標間的必要選擇。" },
  "okr": { zh: "目標與關鍵結果", context: "設定雄心目標並以可量化結果追蹤進展的管理框架。" },
  "kpi": { zh: "關鍵績效指標", context: "衡量特定業務目標達成程度的量化指標。" },
};
```

- [ ] **Step 2: 確認型別編譯無誤**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep glossary || echo "glossary OK"
```

預期輸出：`glossary OK`

- [ ] **Step 3: Commit**

```bash
git add src/data/glossary.ts
git commit -m "feat: 擴充 glossary 資料結構，新增 GlossEntry 型別與 context 欄位"
```

---

## Task 4: 新增 generateBilingualMap 至 src/lib/tts.ts

**Files:**
- 修改: `src/lib/tts.ts`

- [ ] **Step 1: 在 `generateTTSScript` 函式定義之前插入 ALIGNMENT_PROMPT 常數**

找到這一段（約在 `generateTTSScript` 上方的 `EN_TTS_PROMPT_TEMPLATE` 之後）：

```ts
/**
 * 用 claude --print CLI 將文章改寫為適合朗讀的腳本，快取為 outputPath。
```

在其前插入：

```ts
const ALIGNMENT_PROMPT_TEMPLATE = `你是雙語 Podcast 腳本的對齊專家。以下是同一篇文章的英文版與中文版腳本，各段落已標上索引。

英文段落：
{enParagraphs}

中文段落：
{zhParagraphs}

請根據語意對應關係，輸出 JSON 對齊映射。規則：
- 只輸出 JSON，不加任何說明或 markdown 標記
- 格式：{"pairs": [{"en": 0, "zh": 0}, ...]}
- "en" 與 "zh" 的值可以是單一數字，或多個數字組成的陣列（多對一或一對多）
- 省略無明確語意對應的段落（如開頭/結尾的格式標記行）`;

```

- [ ] **Step 2: 在 `generateTTSScript` 函式之後插入 `generateBilingualMap`**

找到 `generateTTSScript` 函式結束的 `}` 之後，插入：

```ts
/**
 * 透過 LLM 對齊英中腳本段落，輸出 bilingual-map.json。
 * 若已存在則跳過（冪等）。失敗時退化為 identity map。
 */
export async function generateBilingualMap(
  enScript: string,
  zhScript: string,
  outputPath: string
): Promise<void> {
  if (fs.existsSync(outputPath)) {
    console.log(`  📄 使用快取對齊映射: ${path.basename(outputPath)}`);
    return;
  }

  const enParas = enScript.split('\n\n').filter(p => p.trim());
  const zhParas = zhScript.split('\n\n').filter(p => p.trim());

  const enParagraphs = enParas.map((p, i) => `[${i}]: ${p.slice(0, 200)}`).join('\n');
  const zhParagraphs = zhParas.map((p, i) => `[${i}]: ${p.slice(0, 200)}`).join('\n');

  const prompt = ALIGNMENT_PROMPT_TEMPLATE
    .replace('{enParagraphs}', enParagraphs)
    .replace('{zhParagraphs}', zhParagraphs);

  try {
    console.log(`  🤖 LLM 生成段落對齊映射...`);
    const result = spawnSync('claude', ['--print', '--dangerously-skip-permissions'], {
      input: prompt,
      encoding: 'utf8',
      timeout: 60_000,
    });

    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr?.trim() || `exit code ${result.status}`);

    const output = result.stdout?.trim() ?? '';
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('LLM 回傳內容不含 JSON');

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.pairs)) throw new Error('JSON 格式不符：缺少 pairs 陣列');

    fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2), 'utf-8');
    console.log(`  💾 對齊映射已存: ${path.basename(outputPath)}`);
  } catch (e) {
    console.warn(`  ⚠️  對齊映射生成失敗，使用 identity map: ${e instanceof Error ? e.message : e}`);
    const len = Math.min(enParas.length, zhParas.length);
    const fallback = { pairs: Array.from({ length: len }, (_, i) => ({ en: i, zh: i })) };
    fs.writeFileSync(outputPath, JSON.stringify(fallback, null, 2), 'utf-8');
  }
}
```

- [ ] **Step 3: 確認編譯**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep "tts.ts" || echo "tts.ts OK"
```

預期輸出：`tts.ts OK`

- [ ] **Step 4: Commit**

```bash
git add src/lib/tts.ts
git commit -m "feat: 新增 generateBilingualMap 段落對齊函式"
```

---

## Task 5: 改寫 scripts/tts-all.ts 為配對模式

**Files:**
- 修改: `scripts/tts-all.ts`

- [ ] **Step 1: 以下列完整內容取代 `scripts/tts-all.ts`**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import matter from 'gray-matter';
import {
  synthesizeWithFallback,
  generateTTSScript,
  generateBilingualMap,
  getTTSDir,
  getTTSBasename,
  DEFAULT_TTS_API_URL,
} from '../src/lib/tts';

const POSTS_DIR = path.join(process.cwd(), 'src/content/posts');
const TTS_API_URL = process.env.TTS_API_URL || DEFAULT_TTS_API_URL;
const isProd = process.argv.includes('--prod');
const targetFileArg = process.argv.find(a => a.startsWith('--file='))?.slice(7);

interface PostPair {
  enPath: string;
  zhPath: string;
  category: string;
  slug: string;
}

function getCategory(filePath: string): string {
  const rel = path.relative(POSTS_DIR, filePath);
  return rel.split(path.sep)[0];
}

function getPairs(): PostPair[] {
  const results: PostPair[] = [];
  const entries = fs.readdirSync(POSTS_DIR, { recursive: true }) as string[];
  for (const entry of entries) {
    if (!entry.endsWith('.en.md')) continue;
    const enPath = path.join(POSTS_DIR, entry);
    const zhPath = enPath.replace(/\.en\.md$/, '.md');
    if (!fs.existsSync(zhPath)) {
      console.warn(`  ⚠️  找不到中文配對: ${zhPath}`);
      continue;
    }
    const category = getCategory(enPath);
    const slug = getTTSBasename(path.basename(enPath, '.md'));
    results.push({ enPath, zhPath, category, slug });
  }
  return results;
}

function setAudioUrl(filePath: string, audioUrl: string): void {
  let raw = fs.readFileSync(filePath, 'utf-8');
  const line = `audio_url: "${audioUrl.replace(/"/g, '\\"')}"`;
  if (/^audio_url:/m.test(raw)) {
    raw = raw.replace(/^audio_url:.*$/m, line);
  } else {
    const closingIdx = raw.indexOf('\n---', 4);
    raw = raw.slice(0, closingIdx) + '\n' + line + raw.slice(closingIdx);
  }
  fs.writeFileSync(filePath, raw);
}

async function synthesizeIfNeeded(
  filePath: string,
  data: Record<string, unknown>,
  script: string,
  lang: 'en' | 'zh',
  audioSlug: string,
): Promise<void> {
  if (data.audio_url) {
    console.log(`  ⏭️  跳過音頻（已有 audio_url）: ${path.basename(filePath)}`);
    return;
  }
  const voice = lang === 'en' ? 'en-US-AvaNeural' : 'zh-TW-HsiaoChenNeural';
  console.log(`  🎙️  合成: ${data.title}`);
  try {
    const audioUrl = await synthesizeWithFallback(script, lang, audioSlug, {
      ttsApiUrl: TTS_API_URL,
      voice,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      isProd,
    });
    if (!audioUrl) {
      console.warn(`  ⚠️  跳過（audioUrl 為空）`);
      return;
    }
    setAudioUrl(filePath, audioUrl);
    if (isProd) {
      const escaped = audioUrl.replace(/'/g, "''");
      execSync(
        `wrangler d1 execute engineer-news-db --command "UPDATE posts SET audio_url='${escaped}' WHERE slug='${audioSlug}'" --remote`,
        { stdio: 'inherit' }
      );
    }
    console.log(`  ✅ ${audioUrl}`);
  } catch (e) {
    console.warn(`  ⚠️  失敗: ${e instanceof Error ? e.message : e}`);
  }
}

async function processPair(pair: PostPair): Promise<void> {
  const { enPath, zhPath, category, slug } = pair;

  const enRaw = fs.readFileSync(enPath, 'utf-8');
  const { data: enData } = matter(enRaw);
  if (enData.draft !== false) {
    console.log(`  ⏭️  跳過（草稿）: ${path.basename(enPath)}`);
    return;
  }

  const zhRaw = fs.readFileSync(zhPath, 'utf-8');
  const { data: zhData } = matter(zhRaw);

  const ttsDir = getTTSDir(category);
  fs.mkdirSync(ttsDir, { recursive: true });

  const enScriptPath = path.join(ttsDir, `${slug}.en.tts-script.txt`);
  const zhScriptPath = path.join(ttsDir, `${slug}.tts-script.txt`);
  const mapPath = path.join(ttsDir, `${slug}.bilingual-map.json`);

  const enContent = enRaw.replace(/^---[\s\S]*?---\n*/, '');
  const zhContent = zhRaw.replace(/^---[\s\S]*?---\n*/, '');

  console.log(`\n📄 配對: ${slug}`);
  const enScript = generateTTSScript(
    String(enData.title ?? ''),
    String(enData.tldr ?? ''),
    enContent,
    'en',
    enScriptPath
  );
  const zhScript = generateTTSScript(
    String(zhData.title ?? enData.title ?? ''),
    String(zhData.tldr ?? ''),
    zhContent,
    'zh',
    zhScriptPath
  );

  await generateBilingualMap(enScript, zhScript, mapPath);
  await synthesizeIfNeeded(enPath, enData, enScript, 'en', `${slug}.en`);
  await synthesizeIfNeeded(zhPath, zhData, zhScript, 'zh', slug);
}

async function main() {
  if (targetFileArg) {
    const filePath = path.isAbsolute(targetFileArg)
      ? targetFileArg
      : path.join(process.cwd(), targetFileArg);
    const enPath = filePath.endsWith('.en.md')
      ? filePath
      : filePath.replace(/\.md$/, '.en.md');
    const zhPath = enPath.replace(/\.en\.md$/, '.md');
    if (!fs.existsSync(enPath) || !fs.existsSync(zhPath)) {
      console.error('找不到配對文章（需要 .en.md 和對應的 .md 同時存在）');
      process.exit(1);
    }
    const category = getCategory(enPath);
    const slug = getTTSBasename(path.basename(enPath, '.md'));
    await processPair({ enPath, zhPath, category, slug });
  } else {
    const pairs = getPairs();
    console.log(`🔍 找到 ${pairs.length} 個配對`);
    for (const pair of pairs) {
      await processPair(pair);
    }
  }
  console.log('✅ 完成');
}

main().catch(console.error);
```

- [ ] **Step 2: 確認編譯無誤**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep "tts-all" || echo "tts-all.ts OK"
```

預期輸出：`tts-all.ts OK`

- [ ] **Step 3: 乾跑確認邏輯（不觸發 LLM，只看配對掃描）**

暫時在 `processPair` 開頭加一行 `console.log` 後執行：

```bash
node -e "
const fs = require('fs');
const path = require('path');
const POSTS_DIR = 'src/content/posts';
const entries = fs.readdirSync(POSTS_DIR, { recursive: true });
const pairs = entries.filter(e => e.endsWith('.en.md')).map(e => {
  const enPath = path.join(POSTS_DIR, e);
  const zhPath = enPath.replace(/\\.en\\.md\$/, '.md');
  return { en: e, zhExists: fs.existsSync(zhPath) };
});
console.log('總配對數:', pairs.length);
console.log('缺少中文配對:', pairs.filter(p => !p.zhExists).map(p => p.en));
"
```

預期輸出：配對數應等於英文文章數（64），缺少中文配對應為空陣列。

- [ ] **Step 4: Commit**

```bash
git add scripts/tts-all.ts
git commit -m "feat: tts-all 改為配對模式，輸出至 src/tts/"
```

---

## Task 6: 新增 src/components/BilingualView.tsx

**Files:**
- 新增: `src/components/BilingualView.tsx`

- [ ] **Step 1: 建立 `src/components/BilingualView.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react';
import { glossary } from '../data/glossary';

interface BilingualPair {
  en: number | number[];
  zh: number | number[];
}

interface AlignmentMap {
  pairs: BilingualPair[];
}

interface Props {
  enScript: string;
  zhScript: string;
  alignmentMap: AlignmentMap | null;
}

interface ActiveCard {
  term: string;
  x: number;
  y: number;
}

function applyGlossary(container: HTMLElement): void {
  const keys = Object.keys(glossary).sort((a, b) => b.length - a.length);
  const escapedKeys = keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`\\b(${escapedKeys.join('|')})\\b`, 'gi');
  const markedTerms = new Set<string>();

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('code, pre, a, h1, h2, h3, h4, h5, h6, .gloss')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) nodes.push(node);

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
      const entry = glossary[term];
      if (!entry) continue;

      if (match.index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      if (!markedTerms.has(term)) {
        markedTerms.add(term);
        const span = document.createElement('span');
        span.className = 'gloss';
        span.dataset.def = entry.zh;
        span.dataset.term = term;
        span.textContent = match[0];
        fragment.appendChild(span);
      } else {
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
}

export function BilingualView({ enScript, zhScript, alignmentMap }: Props) {
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null);
  const enColRef = useRef<HTMLDivElement>(null);
  const glossaryApplied = useRef(false);

  const enParas = enScript.split('\n\n').filter(p => p.trim());
  const zhParas = zhScript.split('\n\n').filter(p => p.trim());

  // Build EN → ZH lookup
  const enToZh = new Map<number, number[]>();
  if (alignmentMap) {
    for (const pair of alignmentMap.pairs) {
      const enIndices = Array.isArray(pair.en) ? pair.en : [pair.en];
      const zhIndices = Array.isArray(pair.zh) ? pair.zh : [pair.zh];
      for (const ei of enIndices) {
        enToZh.set(ei, [...(enToZh.get(ei) ?? []), ...zhIndices]);
      }
    }
  }

  useEffect(() => {
    if (!glossaryApplied.current && enColRef.current) {
      applyGlossary(enColRef.current);
      glossaryApplied.current = true;
    }
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const gloss = target.closest('.gloss') as HTMLElement | null;
      if (gloss) {
        const rect = gloss.getBoundingClientRect();
        const term = gloss.dataset.term ?? gloss.textContent?.toLowerCase() ?? '';
        setActiveCard({
          term,
          x: Math.min(rect.left, window.innerWidth - 320),
          y: rect.bottom + 8,
        });
        e.stopPropagation();
        return;
      }
      setActiveCard(null);
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') setActiveCard(null);
    }

    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  function handleEnHover(idx: number) {
    document.querySelectorAll<HTMLElement>('.para-card.zh-highlight').forEach(el =>
      el.classList.remove('zh-highlight')
    );
    for (const zi of enToZh.get(idx) ?? []) {
      document.querySelector(`[data-zh-idx="${zi}"]`)?.classList.add('zh-highlight');
    }
  }

  function handleEnLeave() {
    document.querySelectorAll<HTMLElement>('.para-card.zh-highlight').forEach(el =>
      el.classList.remove('zh-highlight')
    );
  }

  const activeEntry = activeCard ? glossary[activeCard.term] : null;

  return (
    <div className="bilingual-cols">
      <div className="bilingual-en-col">
        <p className="bilingual-col-header">🇺🇸 English</p>
        <div ref={enColRef} className="para-cards">
          {enParas.map((para, i) => (
            <p
              key={i}
              className="para-card"
              data-en-idx={i}
              onMouseEnter={() => handleEnHover(i)}
              onMouseLeave={handleEnLeave}
            >
              {para}
            </p>
          ))}
        </div>
      </div>

      <div className="bilingual-zh-col">
        <p className="bilingual-col-header">🇹🇼 中文</p>
        <div className="para-cards">
          {zhParas.map((para, i) => (
            <p key={i} className="para-card" data-zh-idx={i}>
              {para}
            </p>
          ))}
        </div>
      </div>

      {activeCard && activeEntry && (
        <div
          className="gloss-card"
          style={{ position: 'fixed', top: activeCard.y, left: activeCard.x }}
        >
          <p className="gloss-card-term">{activeCard.term}</p>
          <p className="gloss-card-zh">{activeEntry.zh}</p>
          {activeEntry.context && (
            <p className="gloss-card-context">{activeEntry.context}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 確認型別編譯**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep "BilingualView" || echo "BilingualView.tsx OK"
```

預期輸出：`BilingualView.tsx OK`

- [ ] **Step 3: Commit**

```bash
git add src/components/BilingualView.tsx
git commit -m "feat: 新增 BilingualView 元件（Podcast 卡片 + 跨欄高亮 + 詞彙卡片）"
```

---

## Task 7: 更新 src/pages/en/posts/[...slug].astro

**Files:**
- 修改: `src/pages/en/posts/[...slug].astro`

- [ ] **Step 1: 在 frontmatter import 區加入 BilingualView**

找到：
```ts
import { ReadingModeBar } from '../../../components/ReadingModeBar';
```

在其後加入：
```ts
import { BilingualView } from '../../../components/BilingualView';
```

- [ ] **Step 2: 更新 getStaticPaths 中的腳本路徑**

找到並替換：
```ts
    const scriptBase = join(process.cwd(), 'src/content/posts', baseId);
    const enScriptPath = `${scriptBase}.en.tts-script.txt`;
    const zhScriptPath = `${scriptBase}.tts-script.txt`;
    const enScript = existsSync(enScriptPath) ? readFileSync(enScriptPath, 'utf-8') : null;
    const zhScript = existsSync(zhScriptPath) ? readFileSync(zhScriptPath, 'utf-8') : null;
```

替換為：
```ts
    const [category, slugBase] = baseId.split('/');
    const ttsBase = join(process.cwd(), 'src/tts', category, slugBase);
    const enScriptPath = `${ttsBase}.en.tts-script.txt`;
    const zhScriptPath = `${ttsBase}.tts-script.txt`;
    const mapPath = `${ttsBase}.bilingual-map.json`;
    const enScript = existsSync(enScriptPath) ? readFileSync(enScriptPath, 'utf-8') : null;
    const zhScript = existsSync(zhScriptPath) ? readFileSync(zhScriptPath, 'utf-8') : null;
    const alignmentMap = existsSync(mapPath)
      ? JSON.parse(readFileSync(mapPath, 'utf-8'))
      : null;
```

- [ ] **Step 3: 更新 return 物件，加入 alignmentMap prop**

找到：
```ts
      props: { post, allPosts, enScript, zhScript },
```

替換為：
```ts
      props: { post, allPosts, enScript, zhScript, alignmentMap },
```

- [ ] **Step 4: 在 frontmatter 的 Astro.props 解構中加入 alignmentMap**

找到：
```ts
const { post, allPosts, enScript, zhScript } = Astro.props;
```

替換為：
```ts
const { post, allPosts, enScript, zhScript, alignmentMap } = Astro.props;
```

- [ ] **Step 5: 將 bilingual-wrapper 標記替換為 BilingualView**

找到並移除整個 `<div class="bilingual-wrapper">...</div>` 區塊（約 20 行），以下列標記取代：

```astro
    <div class="prose article-view"><Content /></div>

    {enScript && zhScript && (
      <BilingualView
        client:load
        enScript={enScript}
        zhScript={zhScript}
        alignmentMap={alignmentMap}
      />
    )}
```

（原本的 `.article-view` 已存在於 `bilingual-wrapper` 內的 `.en-col` 中，確認替換後只有一個 `.article-view`。）

- [ ] **Step 6: 更新 `<style>` 區塊中的雙語相關 CSS**

找到並刪除以下舊規則：
```css
  :global(.script-view) { display: none; }
  :global(.zh-col) { display: none; }
  :global(.zh-label) { ... }
  :global(.article-grid.bilingual-on) { grid-template-columns: 1fr; }
  :global(.article-grid.bilingual-on .article-toc-sidebar) { display: none; }
  :global(.article-grid.bilingual-on .bilingual-wrapper) { ... }
  :global(.article-grid.bilingual-on .article-view) { display: none; }
  :global(.article-grid.bilingual-on .script-view) { display: block; }
  :global(.article-grid.bilingual-on .zh-col) { display: block; }
```

替換為：
```css
  /* ── BilingualView ── */
  :global(.bilingual-cols) { display: none; }

  @media (min-width: 1140px) {
    :global(.article-grid.bilingual-on) {
      grid-template-columns: 1fr;
    }
    :global(.article-grid.bilingual-on .article-toc-sidebar) {
      display: none;
    }
    :global(.article-grid.bilingual-on .article-view) {
      display: none;
    }
    :global(.article-grid.bilingual-on .bilingual-cols) {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      align-items: start;
    }
  }

  /* 段落卡片 Podcast 風格 */
  :global(.bilingual-col-header) {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--label-tertiary);
    margin: 0 0 16px;
    padding-bottom: 8px;
    border-bottom: 0.5px solid var(--separator);
  }

  :global(.para-card) {
    font-size: 18px;
    line-height: 1.9;
    padding: 16px 20px;
    border-radius: var(--radius-md);
    margin-bottom: 12px;
    transition: background 0.15s;
    color: var(--label);
  }

  :global(.para-card:hover),
  :global(.para-card.zh-highlight) {
    background: var(--bg-secondary);
  }

  /* 詞彙點擊卡片 */
  :global(.gloss-card) {
    z-index: 200;
    background: var(--bg-secondary);
    border: 0.5px solid var(--separator);
    border-radius: var(--radius-md);
    padding: 14px 18px;
    width: 300px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  :global(.gloss-card-term) {
    font-size: 13px;
    font-weight: 700;
    color: var(--label);
    margin: 0 0 6px;
    text-transform: capitalize;
  }

  :global(.gloss-card-zh) {
    font-size: 16px;
    font-weight: 600;
    color: var(--accent);
    margin: 0 0 8px;
  }

  :global(.gloss-card-context) {
    font-size: 13px;
    line-height: 1.6;
    color: var(--label-secondary);
    margin: 0;
    padding-top: 8px;
    border-top: 0.5px solid var(--separator);
  }
```

- [ ] **Step 7: 確認 build 無誤**

```bash
make build 2>&1 | tail -20
```

預期：無 TypeScript 或 Astro build 錯誤。

- [ ] **Step 8: Commit**

```bash
git add src/pages/en/posts/[...slug].astro
git commit -m "feat: 更新文章頁面，使用 BilingualView 與 src/tts/ 路徑"
```

---

## Task 8: 清理 src/components/ReadingModeBar.tsx

**Files:**
- 修改: `src/components/ReadingModeBar.tsx`

- [ ] **Step 1: 移除 ReadingModeBar.tsx 中的 applyGlossary 相關程式碼**

移除以下內容：
- `import { glossary } from '../data/glossary';` 這一行
- `let glossaryApplied = false;` 這一行
- 整個 `function applyGlossary() { ... }` 函式定義
- `useEffect(() => { applyGlossary(); }, []);` 這一個 useEffect

最終 `ReadingModeBar.tsx` 應如下：

```tsx
import { useState, useEffect } from 'react';

interface Props {
  hasZh: boolean;
}

export function ReadingModeBar({ hasZh }: Props) {
  const [bilingual, setBilingual] = useState(false);
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
    </div>
  );
}
```

- [ ] **Step 2: 確認編譯**

```bash
npx tsc --noEmit --skipLibCheck 2>&1 | grep "ReadingModeBar" || echo "ReadingModeBar.tsx OK"
```

預期輸出：`ReadingModeBar.tsx OK`

- [ ] **Step 3: Commit**

```bash
git add src/components/ReadingModeBar.tsx
git commit -m "refactor: ReadingModeBar 移除 applyGlossary（已移入 BilingualView）"
```

---

## 驗收清單

完成所有 Task 後，手動驗證：

```bash
make dev
```

1. 開啟一篇有 TTS 腳本的英文文章（如 `/en/posts/career/2026-05-19-casual-chats-with-global-chinese-audience`）
2. 點擊 **⇄ Bilingual** 按鈕 → 版面切換為左右兩欄，Podcast 大字體
3. hover 左側英文段落 → 右側對應中文段落出現背景高亮
4. hover 有底線的詞彙（如 latency）→ tooltip 顯示中文翻譯
5. 點擊詞彙 → 浮動卡片出現，顯示中文翻譯 + context 說明
6. 按 Escape 或點擊其他位置 → 卡片消失
7. 再次點擊 **⇄ Bilingual** → 恢復正常文章視圖
8. 開啟無 TTS 腳本的文章 → 按鈕維持灰色停用
