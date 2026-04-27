DB_NAME    = engineer-news-db
VEC_INDEX  = engineer-news-index
VEC_DIMS   = 1024
VEC_METRIC = cosine

-include .env
export CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID

# ── D1 資料庫管理 ──────────────────────────────────────────────────────────────
# 以下目標操作遠端 Cloudflare D1 資料庫（需有效的 CLOUDFLARE_API_TOKEN）

# 清除所有資料列，保留資料表結構（適合重新填充資料時使用）
d1-clear:
	npx wrangler d1 execute $(DB_NAME) --remote --command \
		"DELETE FROM doc_chunks; DELETE FROM posts; DELETE FROM projects;"

# 刪除所有資料表（含遷移紀錄），徹底重建時使用，操作不可逆
d1-drop:
	npx wrangler d1 execute $(DB_NAME) --remote --command \
		"DROP TABLE IF EXISTS doc_chunks; DROP TABLE IF EXISTS projects; DROP TABLE IF EXISTS posts; DROP TABLE IF EXISTS d1_migrations;"

# 套用 migrations/ 目錄下尚未執行的遷移腳本
d1-migrate:
	npx wrangler d1 migrations apply $(DB_NAME) --remote

# 完整重建資料庫：先 drop 再套用所有 migration（等同 d1-drop + d1-migrate）
d1-rebuild: d1-drop d1-migrate

# ── Vectorize 向量索引管理 ────────────────────────────────────────────────────
# 刪除現有索引並重建（變更維度或 metric 時必須執行）
vec-rebuild:
	npx wrangler vectorize delete $(VEC_INDEX) --force || true
	npx wrangler vectorize create $(VEC_INDEX) --dimensions=$(VEC_DIMS) --metric=$(VEC_METRIC)

# ── 本地開發 ──────────────────────────────────────────────────────────────────

# 安裝 Node 依賴套件
install:
	pnpm install

# 啟動本地開發伺服器（Astro dev + wrangler 模擬 D1/KV）
dev:
	pnpm dev

# ── 資料同步 ──────────────────────────────────────────────────────────────────

# 同步至本地端 D1（開發環境，不需 API Token）
sync:
	npx tsx scripts/sync-to-d1.ts

# 同步至遠端 D1（生產環境，需 CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID）
sync-prod:
	npx tsx scripts/sync-to-d1.ts --prod

# ── 完整重建（D1 + Vectorize）────────────────────────────────────────────────
# 刪除並重建 D1 資料庫與向量索引，適合從零初始化環境
rebuild: d1-rebuild vec-rebuild

# ── 內容抓取與攝取 ────────────────────────────────────────────────────────────

# 在本地端執行爬蟲：從 YouTube 等來源抓取新影片並產生 Markdown 檔案
crawl:
	pnpm crawl

# 在本地端執行對話攝取（用法：make ingest FILE=path/to/file.txt）
ingest:
	pnpm ingest $(FILE) --yes

# 掃描所有文章並修復 Mermaid 語法錯誤（需 CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID）
fix-mermaid:
	npx tsx scripts/fix-mermaid.ts

# 針對所有未有 audio_url 的文章合成語音並上傳 R2，回寫 frontmatter（需 TTS_API_URL）
tts-all:
	npx tsx scripts/tts-all.ts

# 同上，上傳至遠端 R2
tts-all-prod:
	npx tsx scripts/tts-all.ts --prod

# ── 遠端 GitHub Actions 觸發 ─────────────────────────────────────────────────

# 透過 GitHub CLI 觸發遠端爬蟲 workflow（需先 gh auth login）
remote-crawl:
	gh workflow run crawl.yml

# 透過 GitHub CLI 觸發遠端部署與 D1 同步 workflow
remote-deploy:
	gh workflow run deploy.yml

.PHONY: install dev \
	d1-clear d1-drop d1-migrate d1-rebuild \
	vec-rebuild \
	sync sync-prod \
	rebuild \
	crawl ingest remote-crawl remote-deploy \
	fix-mermaid tts-all tts-all-prod
