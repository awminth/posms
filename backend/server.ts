import { createApp } from './app.js';
import { env } from './config/env.js';
import { testConnection } from './config/db.js';

async function start() {
  const ok = await testConnection();
  if (!ok) {
    console.error('[Boot] MySQL connection failed — check backend/.env DB_* values');
  }

  const app = await createApp();
  app.listen(env.backendPort, '0.0.0.0', () => {
    console.log('----------------------------------------------------------------');
    console.log(` OmniPOS App   http://localhost:${env.backendPort}`);
    console.log(` API Endpoint  http://localhost:${env.backendPort}/api`);
    console.log(` Database      ${env.db.name}@${env.db.host}:${env.db.port}`);
    console.log('----------------------------------------------------------------');
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
