DB_NAME    = engineer-news-db
VEC_INDEX  = engineer-news-index
VEC_DIMS   = 384
VEC_METRIC = cosine

-include .env
export CLOUDFLARE_API_TOKEN
export CLOUDFLARE_ACCOUNT_ID

# ── D1 ────────────────────────────────────────────────────────────────────────

d1-clear:
	npx wrangler d1 execute $(DB_NAME) --remote --command \
		"DELETE FROM doc_chunks; DELETE FROM posts; DELETE FROM projects;"

d1-drop:
	npx wrangler d1 execute $(DB_NAME) --remote --command \
		"DROP TABLE IF EXISTS doc_chunks; DROP TABLE IF EXISTS projects; DROP TABLE IF EXISTS posts; DROP TABLE IF EXISTS d1_migrations;"

d1-migrate:
	npx wrangler d1 migrations apply $(DB_NAME) --remote

d1-rebuild: d1-drop d1-migrate

# ── Vectorize ─────────────────────────────────────────────────────────────────

vec-rebuild:
	npx wrangler vectorize delete $(VEC_INDEX) --force || true
	npx wrangler vectorize create $(VEC_INDEX) --dimensions=$(VEC_DIMS) --metric=$(VEC_METRIC)

# ── Dev ───────────────────────────────────────────────────────────────────────

install:
	pnpm install

dev:
	pnpm dev

# ── Sync ──────────────────────────────────────────────────────────────────────

sync:
	npx tsx scripts/sync-to-d1.ts

sync-prod:
	npx tsx scripts/sync-to-d1.ts --prod

# ── Combined ──────────────────────────────────────────────────────────────────

rebuild: d1-rebuild vec-rebuild

.PHONY: install dev \
        d1-clear d1-drop d1-migrate d1-rebuild \
        vec-rebuild \
        sync sync-prod \
        rebuild
