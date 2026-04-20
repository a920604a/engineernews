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
