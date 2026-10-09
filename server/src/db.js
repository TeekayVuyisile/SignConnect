// SQLite via Node's built-in driver: zero native dependencies.
// The schema sticks to portable SQL so it can move to PostgreSQL later.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const file = resolve(process.env.DB_FILE ?? 'data/signconnect.db');
mkdirSync(dirname(file), { recursive: true });

export const db = new DatabaseSync(file);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id             INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    communication_mode  TEXT NOT NULL DEFAULT 'speech',  -- sign | speech | text
    show_captions       INTEGER NOT NULL DEFAULT 1,
    sign_translation    INTEGER NOT NULL DEFAULT 0,
    text_to_speech      INTEGER NOT NULL DEFAULT 0,
    caption_size        TEXT NOT NULL DEFAULT 'large',   -- medium | large | xlarge
    theme               TEXT NOT NULL DEFAULT 'system'   -- system | light | dark
  );

  CREATE TABLE IF NOT EXISTS contacts (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, contact_id)
  );

  CREATE TABLE IF NOT EXISTS calls (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    caller_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    callee_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'ringing',  -- ringing | answered | missed | declined
    started_at   TEXT NOT NULL DEFAULT (datetime('now')),
    answered_at  TEXT,
    ended_at     TEXT
  );
`);

export const PREF_FIELDS = [
  'communication_mode', 'show_captions', 'sign_translation',
  'text_to_speech', 'caption_size', 'theme',
];

export function getPreferences(userId) {
  db.prepare('INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)').run(userId);
  const row = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
  return {
    communication_mode: row.communication_mode,
    show_captions: !!row.show_captions,
    sign_translation: !!row.sign_translation,
    text_to_speech: !!row.text_to_speech,
    caption_size: row.caption_size,
    theme: row.theme,
  };
}
