-- 系統設定表
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 預設語音設定
INSERT OR IGNORE INTO settings (key, value) VALUES ('tts_voice_zh', 'zh-TW-HsiaoChenNeural');
INSERT OR IGNORE INTO settings (key, value) VALUES ('tts_voice_en', 'en-US-AvaNeural');
