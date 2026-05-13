ALTER TABLE search_logs ADD COLUMN llm_answer TEXT;
ALTER TABLE search_logs ADD COLUMN sources_json TEXT;
ALTER TABLE search_logs ADD COLUMN quality_score INTEGER NOT NULL DEFAULT -1;
