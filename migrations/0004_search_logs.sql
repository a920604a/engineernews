CREATE TABLE IF NOT EXISTS search_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  lang TEXT NOT NULL,
  vector_hits INTEGER NOT NULL DEFAULT 0,
  keyword_hits INTEGER NOT NULL DEFAULT 0,
  llm_ok INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_search_logs_created ON search_logs (created_at DESC);
