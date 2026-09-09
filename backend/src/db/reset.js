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
  if (!fs.existsSync(file)) continue;
  try {
    fs.rmSync(file);
    console.log(`[reset] removed ${file}`);
  } catch (err) {
    // Windows refuses to unlink a file another process still holds open, so a
    // running dev server turns this into a raw EBUSY stack trace. Worse, the
    // reset silently does nothing and the next seed layers new rows on top of
    // the old ones — say what to do instead of dumping the trace.
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      console.error(`\n[reset] cannot delete ${file} — it is still open.`);
      console.error('[reset] Stop the running backend (Ctrl+C in its terminal), then run this again.');
      console.error('[reset] Nothing was deleted; the database is unchanged.\n');
      process.exit(1);
    }
    throw err;
  }
}
console.log('[reset] done — run `npm run db:migrate && npm run db:seed` to rebuild.');
