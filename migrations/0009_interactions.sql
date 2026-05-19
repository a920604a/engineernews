-- migrations/0009_interactions.sql
CREATE TABLE IF NOT EXISTS post_reactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug   TEXT NOT NULL,
  visitor_id  TEXT NOT NULL,
  emoji       TEXT NOT NULL CHECK(emoji IN ('❤️','👍','💡','🔥')),
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(post_slug, visitor_id)
);
CREATE INDEX IF NOT EXISTS idx_reactions_slug ON post_reactions(post_slug);

CREATE TABLE IF NOT EXISTS comments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_slug   TEXT NOT NULL,
  visitor_id  TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '匿名',
  author_url  TEXT,
  body        TEXT NOT NULL,
  hidden      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(post_slug);

CREATE TABLE IF NOT EXISTS bookmarks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_id  TEXT NOT NULL,
  post_slug   TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(visitor_id, post_slug)
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_visitor ON bookmarks(visitor_id);
