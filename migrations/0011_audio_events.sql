-- 音頻播放埋點：量「播放率 / 完播率」，驗證語音導讀到底有沒有人用
CREATE TABLE IF NOT EXISTS audio_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  lang TEXT,                         -- 'zh-TW' | 'en'
  event TEXT NOT NULL,               -- 'play' | 'progress' | 'complete'
  milestone INTEGER,                 -- progress 事件的里程碑：25 | 50 | 75
  session_id TEXT,                   -- 同一次頁面載入的隨機 id，用來去重/算完播
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audio_events_slug    ON audio_events (slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_events_event   ON audio_events (event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_events_session ON audio_events (session_id);
