## Context

目前 engineer-news 有多條 pipeline（AI search、keyword search、post sync、OG image、YouTube crawl），但沒有任何可視化介面。開發者若要診斷問題，需要分別查看：Cloudflare Dashboard（Vectorize/D1/R2 統計）、GitHub Actions logs（sync/crawl 狀態）、wrangler CLI（D1 查詢）。三個地方分散、摩擦力高。

**現有 bindings（wrangler.jsonc 已設定）：** DB（D1）、OG_IMAGES（R2）、VECTORIZE、AI — 表示 Worker runtime 已有所有必要 access，只需加 API layer。

## Goals / Non-Goals

**Goals:**
- 單一 `/admin` 頁面，顯示所有 pipeline 健康狀態與 infra 統計
- API endpoint `/api/admin/stats` 聚合 D1/R2/Vectorize 數據
- 簡單 token 保護（`ADMIN_TOKEN` env var），避免洩漏 infra 數據
- 純讀取（read-only），不提供寫入操作

**Non-Goals:**
- 不做即時 log streaming（Cloudflare Pages 沒有 persistent log）
- 不做 auth session / JWT，too complex for internal tool
- 不做操作功能（例如觸發 sync、刪除文章）

## Decisions

### 1. 單一 `/api/admin/stats` endpoint vs 多個 endpoints
**選擇：單一 endpoint**
- 理由：Admin 頁面一次 load 即取全部數據，避免多次 round-trip
- 缺點：單一 endpoint 較慢（sequential D1 queries），但 admin 工具可接受 1-2s
- 結構：`{ d1, r2, vectorize, config, posts }` 分區塊返回

### 2. Auth 機制：ADMIN_TOKEN query param vs Authorization header vs Basic Auth
**選擇：`?token=xxx` query param（開發工具優先）**
- 理由：Admin 頁面是靜態 Astro page，client-side fetch 帶 token 最簡單
- 實作：`/api/admin/stats?token=xxx`，server 端比對 `env.ADMIN_TOKEN`
- 取捨：token 會出現在 server logs，但 admin tool 非公開服務可接受
- Astro page 端：用 localStorage 保存 token，避免每次重輸

### 3. Vectorize stats 取得方式
**選擇：via D1 doc_chunks count，不 call Vectorize API**
- 理由：Vectorize binding 沒有直接的 `describe()` / `count()` API（需 REST API）
- 實作：`SELECT COUNT(*) FROM doc_chunks` 作為向量數代理指標，加上 config 從程式碼常數取

### 4. R2 object count 取得方式
**選擇：`OG_IMAGES.list()` 分頁取總數**
- 理由：R2 binding 支援 `list({ limit: 1000 })`，返回 `objects` array
- 注意：若 OG images 超過 1000 需分頁，初期用 truncated count + note

### 5. Post Timeline 資料來源
**選擇：D1 `posts` table，不用 Astro getCollection**
- 理由：Admin API 在 Worker runtime，getCollection 只在 build time 可用
- 欄位：id, title, category, lang, created_at, updated_at，JOIN doc_chunks count 判斷是否已向量化

### 6. Frontend 框架
**選擇：React component（AdminDashboard.tsx）+ client:load**
- 理由：其他 interactive components 也是 React，保持一致
- Astro page 負責 layout，React 負責 fetch + render

## Risks / Trade-offs

- **D1 query latency**：多條 SQL 查詢串行執行可能導致 1-3s 回應時間。緩解：`Promise.all` 並行執行各查詢。
- **ADMIN_TOKEN 未設定**：若 env var 缺失，endpoint 應返回 401 而非 500。緩解：明確檢查 `env.ADMIN_TOKEN` 存在性。
- **R2 list 費用**：R2 list operations 計費，admin 頁面若頻繁重新整理會累積費用。緩解：前端加 cache（60s stale-while-revalidate）。
- **Vectorize 實際 count 無法直接取得**：D1 doc_chunks 是代理指標，若 sync 失敗可能出現 D1/Vectorize 不一致。緩解：UI 標注「D1 chunks（作為向量數代理）」。

## Migration Plan

1. 新增 `ADMIN_TOKEN` 到 Cloudflare Pages environment variables（Settings → Environment Variables）
2. 部署新 code（包含 `/api/admin/stats` 與 `/admin` 頁面）
3. 訪問 `https://engineer-news.pages.dev/admin`，輸入 token 驗證
4. Rollback：直接刪除 `/admin` 與 `/api/admin/stats` 路由即可，無 schema 變更

## Open Questions

- `ADMIN_TOKEN` 是否要加進 wrangler.jsonc 的 vars 區塊？（目前 wrangler.jsonc 沒有 vars，建議走 Cloudflare Pages UI 設定）
- Post timeline 是否需要分頁（目前 ~100 篇可直接全取）？
