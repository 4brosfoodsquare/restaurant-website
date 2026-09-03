import Database from 'better-sqlite3';
import config from '../config/env.js';

let db;

/**
 * Opens (once) and returns the shared SQLite connection.
 * WAL keeps reads non-blocking while the kitchen writes order updates.
 */
export function getDb() {
  if (db) return db;

  db = new Database(config.databaseFile);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}

/**
 * Runs `fn` inside a transaction. better-sqlite3 is synchronous, so the
 * callback must be synchronous too — that is what makes order creation atomic.
 */
export function transaction(fn) {
  return getDb().transaction(fn)();
}

export default getDb;
