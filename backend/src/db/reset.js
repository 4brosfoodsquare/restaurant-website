import fs from 'node:fs';
import config from '../config/env.js';
import { closeDb } from './index.js';

/** Deletes the SQLite database file and its WAL sidecars. Development only. */
if (config.isProduction) {
  console.error('[reset] refusing to drop the database in production.');
  process.exit(1);
}

closeDb();
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const file = `${config.databaseFile}${suffix}`;
  if (fs.existsSync(file)) {
    fs.rmSync(file);
    console.log(`[reset] removed ${file}`);
  }
}
console.log('[reset] done — run `npm run db:migrate && npm run db:seed` to rebuild.');
