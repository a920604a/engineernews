CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL,     -- 'debug' | 'info' | 'warn' | 'error'
  source TEXT NOT NULL,    -- e.g. 'api/search', 'api/og', 'crawl'
  message TEXT NOT NULL,
  data TEXT,               -- JSON stringified extra data
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logs_created ON logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_level   ON logs (level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_source  ON logs (source, created_at DESC);
