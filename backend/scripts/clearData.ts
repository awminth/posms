import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(__dirname, '../database/clear_data.sql');

async function main() {
  console.log('[clearData] Connecting to database...');
  const pool = getPool();
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('[clearData] Executing database cleanup (Preserving Super Admin)...');
  await pool.query(sql);

  console.log('[clearData] Cleanup completed successfully!');
  const [users]: any = await pool.query('SELECT id, username, role, is_active FROM users');
  console.log('[clearData] Remaining users:', users);
  const [branches]: any = await pool.query('SELECT id, code, name FROM branches');
  console.log('[clearData] Remaining branches:', branches);
  process.exit(0);
}

main().catch((err) => {
  console.error('[clearData] Failed:', err);
  process.exit(1);
});
