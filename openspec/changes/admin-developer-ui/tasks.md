## 1. 環境設定

- [ ] 1.1 在 Cloudflare Pages dashboard → Settings → Environment Variables 新增 `ADMIN_TOKEN`（production + preview）
- [ ] 1.2 在本地 `.env` 加入 `ADMIN_TOKEN=dev-secret` 供開發測試用

## 2. API：/api/admin/stats

- [ ] 2.1 建立 `src/pages/api/admin/stats.ts`，驗證 `?token` query param 與 `env.ADMIN_TOKEN`，缺少或不符回 401
- [ ] 2.2 實作 D1 overview：`Promise.all` 並行查 posts count、doc_chunks count、projects count、page_views count、posts lang distribution
- [ ] 2.3 實作 R2 overview：`OG_IMAGES.list({ limit: 1000 })` 取物件數，超過 1000 標記 truncated
- [ ] 2.4 實作 Vectorize 代理指標：從 doc_chunks count 回傳，附上 embedding model 名稱與維度常數
- [ ] 2.5 實作 Post timeline：`SELECT id, title, category, lang, created_at, updated_at FROM posts ORDER BY created_at DESC`，JOIN `COUNT(doc_chunks)` 判斷是否已向量化
- [ ] 2.6 實作 config 區塊：回傳 embedding model、chat model、topK、compatibility date、D1/R2/Vectorize 名稱等靜態常數
- [ ] 2.7 所有子查詢用 `Promise.allSettled` 包裹，單一失敗不影響其他區塊，失敗時該區塊回傳 `{ error: string }`

## 3. 前端頁面：/admin

- [ ] 3.1 建立 `src/pages/admin/index.astro`，套用 `BaseLayout`，引入 `AdminDashboard` React component（`client:load`）
- [ ] 3.2 建立 `src/components/AdminDashboard.tsx`，實作 localStorage token 讀取與 auth 表單（未登入時顯示 token input）
- [ ] 3.3 實作 fetch `/api/admin/stats?token=xxx`，401 時清除 localStorage token 並顯示 auth 表單
- [ ] 3.4 實作 D1 Overview 面板：table row counts + lang 分布（zh-TW vs en）
- [ ] 3.5 實作 Vectorize 面板：向量數（D1 代理）、embedding model、dimension
- [ ] 3.6 實作 R2 面板：OG images 物件數，超過 1000 顯示「1000+」
- [ ] 3.7 實作 Post Timeline 面板：列表顯示 title、category badge、lang badge、date、向量狀態（未向量化標橘色警示）
- [ ] 3.8 實作 AI Search Config 面板：embedding model、chat model、topK、max sources、lang filter
- [ ] 3.9 實作 Infra Config 面板：compatibility date、D1 名稱、R2 bucket、Vectorize index、Astro output mode
- [ ] 3.10 loading state：fetch 進行中顯示 skeleton/spinner；error state：顯示錯誤訊息與 retry 按鈕

## 4. 安全性與邊界

- [ ] 4.1 確認 `/api/admin/stats` 在 `ADMIN_TOKEN` 未設定時回傳 401 with `{ error: "Admin not configured" }`
- [ ] 4.2 確認 token 錯誤時回傳 401，前端清除 localStorage 並重新顯示 auth prompt
- [ ] 4.3 確認 `/admin` page 本身不在 server 端做 redirect（auth 邏輯全在 client-side React，避免 SSR 複雜度）

## 5. 驗證

- [ ] 5.1 本地 `pnpm dev`：訪問 `/admin`，輸入錯誤 token 確認 401 行為
- [ ] 5.2 本地：輸入正確 token，確認 D1/R2/Vectorize 各面板正確顯示數據
- [ ] 5.3 本地：重新整理頁面，確認 token 從 localStorage 自動帶入不需重新輸入
- [ ] 5.4 本地：確認 Post Timeline 中未向量化的文章有警示標示
- [ ] 5.5 deploy 到 production，確認 Cloudflare Pages env var `ADMIN_TOKEN` 正確讀取
