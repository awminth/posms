import mysql from 'mysql2/promise';
import { env } from './env.js';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    if (env.databaseUrl) {
      pool = mysql.createPool({
        uri: env.databaseUrl,
        ssl: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: false,
        },
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
      });
    } else {
      const isTiDB = env.db.ssl || env.db.host.includes('tidbcloud.com') || env.db.port === 4000;
      pool = mysql.createPool({
        host: env.db.host,
        port: env.db.port,
        user: env.db.user,
        password: env.db.password,
        database: env.db.name,
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
        ssl: isTiDB
          ? {
              minVersion: 'TLSv1.2',
              rejectUnauthorized: false,
            }
          : undefined,
      });
    }
  }
  return pool;
}

export async function testConnection(): Promise<boolean> {
  const { host, user, name, port } = env.db;
  if (!host || !user || !name) {
    console.warn('[DB] Missing DB_* env vars');
    return false;
  }
  try {
    const conn = await getPool().getConnection();
    await conn.ping();
    conn.release();
    console.log(`[DB] Connected to ${name}@${host}:${port}`);
    return true;
  } catch (err) {
    console.error('[DB] Connection failed:', (err as Error).message);
    return false;
  }
}

export type { PoolConnection } from 'mysql2/promise';
