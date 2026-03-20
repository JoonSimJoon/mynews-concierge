import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "mynews.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

export function initDb(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      large_code_id TEXT NOT NULL,
      large_code_nm TEXT NOT NULL,
      middle_code_id TEXT NOT NULL,
      middle_code_nm TEXT,
      small_code_id TEXT NOT NULL UNIQUE,
      small_code_nm TEXT NOT NULL,
      seq INTEGER
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL UNIQUE,
      title TEXT NOT NULL,
      sub_title TEXT,
      body_html TEXT NOT NULL,
      body_text TEXT NOT NULL,
      summary TEXT,
      writers TEXT,
      reg_dt TEXT,
      service_daytime TEXT NOT NULL,
      pub_div TEXT NOT NULL DEFAULT 'W',
      main_category TEXT NOT NULL,
      article_url TEXT,
      image_url TEXT,
      image_caption TEXT,
      like_count INTEGER DEFAULT 0,
      reply_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_articles_service_dt ON articles(service_daytime DESC);
    CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(main_category);

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      political_stance INTEGER NOT NULL CHECK (political_stance BETWEEN 1 AND 10),
      interests TEXT NOT NULL DEFAULT '[]',
      writing_style TEXT NOT NULL DEFAULT 'casual',
      knowledge_level TEXT NOT NULL DEFAULT 'general',
      age_group TEXT,
      occupation TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS personalized_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      profile_id INTEGER NOT NULL REFERENCES profiles(id),
      personalized_title TEXT NOT NULL,
      personalized_body TEXT NOT NULL,
      personalized_summary TEXT NOT NULL,
      tone TEXT,
      perspective TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(article_id, profile_id)
    );

    CREATE TABLE IF NOT EXISTS reading_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      article_id INTEGER NOT NULL,
      read_at TEXT DEFAULT (datetime('now')),
      read_duration_sec INTEGER,
      reaction TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_reading_user ON reading_history(user_id, read_at DESC);

    CREATE TABLE IF NOT EXISTS shorts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      original_title TEXT NOT NULL,
      short_title TEXT NOT NULL,
      short_body TEXT NOT NULL,
      short_summary TEXT NOT NULL,
      tone TEXT,
      perspective TEXT,
      category_name TEXT,
      image_url TEXT,
      tts_audio BLOB,
      tts_voice TEXT DEFAULT 'female_calm',
      profile_hash TEXT,
      service_daytime TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_shorts_created ON shorts(created_at DESC);

    CREATE TABLE IF NOT EXISTS alert_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      keyword TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS concierge_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      article_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      action_type TEXT NOT NULL CHECK (action_type IN ('save', 'remind')),
      note TEXT,
      remind_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_concierge_actions_unique ON concierge_actions(profile_id, article_id, action_type) WHERE status = 'pending';
    CREATE INDEX IF NOT EXISTS idx_concierge_actions_profile ON concierge_actions(profile_id, status, created_at DESC);

    CREATE TABLE IF NOT EXISTS concierge_handoffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      article_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('brief', 'alert', 'ask')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_concierge_handoffs_profile ON concierge_handoffs(profile_id, created_at DESC);
  `);
}

/** HTML 태그 제거 */
export function stripHtml(html: string): string {
  return html
    .replace(/<MKSUBTITLE>[\s\S]*?<\/MKSUBTITLE>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
