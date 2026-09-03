import { createApp } from './app.js';
import config from './config/env.js';
import { runMigrations } from './db/migrate.js';

runMigrations({ silent: true });

const app = createApp();
app.listen(config.port, () => {
  console.log(`[server] listening on http://localhost:${config.port} (${config.env})`);
});
