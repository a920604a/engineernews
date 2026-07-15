-- 每篇文章 F&Q：讀者用 [💬 問這篇文章] 提問時記下 query + AI 回答，
-- 由 admin 手動核定 quality_score=1 才會在文章頁 F&Q 區 / /faq 頁公開。
CREATE TABLE IF NOT EXISTS post_qa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  query TEXT NOT NULL,
  answer TEXT,
  sources_json TEXT,
  llm_ok INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  duration_ms INTEGER,
  -- -1 未評 / 0 不採用 / 1 公開
  quality_score INTEGER NOT NULL DEFAULT -1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_post_qa_post ON post_qa (post_id, quality_score, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_qa_created ON post_qa (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_qa_score ON post_qa (quality_score, created_at DESC);
