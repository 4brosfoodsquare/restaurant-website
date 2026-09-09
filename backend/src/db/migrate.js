import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getDb } from './index.js';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Applies every not-yet-applied .sql file in migrations/, in filename order.
 * Each file runs inside its own transaction so a failure leaves no partial state.
 */
export function runMigrations({ silent = false } = {}) {
  const db = getDb();
  const log = silent ? () => {} : (...args) => console.log(...args);

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);

  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').all().map((row) => row.name),
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const executed = [];
  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const record = db.prepare('INSERT INTO schema_migrations (name) VALUES (?)');

    db.transaction(() => {
      db.exec(sql);
      record.run(file);
    })();

    executed.push(file);
    log(`[migrate] applied ${file}`);
  }

  if (executed.length === 0) log('[migrate] database already up to date');
  return executed;
}

// pathToFileURL, not a hand-built `file://` string: on Windows a resolved path
// is `C:\dir\file.js` while import.meta.url is `file:///C:/dir/file.js`, so the
// naive comparison never matched and running this script did nothing at all.
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  try {
    runMigrations();
  } catch (error) {
    console.error('[migrate] failed:', error.message);
    process.exitCode = 1;
  }
}
