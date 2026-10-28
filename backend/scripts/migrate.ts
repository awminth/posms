import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(__dirname, '../database');

function getConnectionConfig(includeDatabase = true): mysql.ConnectionOptions {
  const isTiDB = env.db.ssl || env.db.host.includes('tidbcloud.com') || env.db.port === 4000;
  const ssl = isTiDB ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : undefined;

  if (env.databaseUrl) {
    return {
      uri: env.databaseUrl,
      multipleStatements: true,
      ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false },
    };
  }

  return {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: includeDatabase ? env.db.name : undefined,
    multipleStatements: true,
    ssl,
  };
}

async function ensureDatabase() {
  if (env.databaseUrl || !env.db.name) return;
  try {
    const conn = await mysql.createConnection(getConnectionConfig(false));
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.end();
    console.log(`[migrate] Database ${env.db.name} ready`);
  } catch (err: any) {
    console.warn(`[migrate] ensureDatabase notice: ${err.message}`);
  }
}

async function runSqlFile(conn: mysql.Connection, filePath: string) {
  console.log(`[migrate] Running ${path.basename(filePath)}...`);
  let content = fs.readFileSync(filePath, 'utf8');

  // If connected to a specific database (e.g. on TiDB), replace or strip hardcoded "USE mt_posms;"
  if (env.db.name && env.db.name !== 'mt_posms') {
    content = content.replace(/USE\s+mt_posms\s*;/gi, `USE \`${env.db.name}\`;`);
    content = content.replace(/CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+mt_posms[^;]*;/gi, '');
  }

  // Execute using multiple statements
  await conn.query(content);
}

async function main() {
  await ensureDatabase();

  const conn = await mysql.createConnection(getConnectionConfig(true));
  console.log(`[migrate] Connected to database: ${env.db.name || 'default'}`);

  const [tables]: any = await conn.query(`SHOW TABLES LIKE 'branches'`);

  if (!tables.length) {
    await runSqlFile(conn, path.join(dbDir, 'schema.sql'));
    await runSqlFile(conn, path.join(dbDir, 'seeds.sql'));
  } else {
    console.log('[migrate] Core schema already present — skipping schema.sql/seeds.sql');
  }

  await runSqlFile(conn, path.join(dbDir, 'schema_extensions.sql'));
  await runSqlFile(conn, path.join(dbDir, 'seeds_extensions.sql'));
  await conn.end();
  console.log('[migrate] Migration completed successfully');
}

main().catch((err) => {
  console.error('[migrate] Failed:', err.message || err);
  process.exit(1);
});
