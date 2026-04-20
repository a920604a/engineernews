-- 文章主表
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'zh-TW',
  description TEXT,
  tldr TEXT,
  content TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_lang ON posts(lang);
CREATE INDEX idx_posts_created ON posts(created_at);

-- 專案主表
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  github TEXT,
  url TEXT,
  tag TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_projects_tag ON projects(tag);
CREATE INDEX idx_projects_pinned ON projects(pinned);

-- 統一 chunk 表（posts + projects，供 RAG / Vectorize 使用）
CREATE TABLE chunks (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('post', 'project')),
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_chunks_source ON chunks(source_id, source_type);

-- 外部文件 chunk 表（爬蟲使用）
CREATE TABLE doc_chunks (
  id TEXT PRIMARY KEY,
  source_url TEXT NOT NULL,
  source_name TEXT,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_doc_source ON doc_chunks(source_url);
