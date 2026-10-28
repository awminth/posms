import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/** Required: BACKEND_PORT, FRONTEND_PORT, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  backendPort: Number(process.env.BACKEND_PORT || process.env.PORT) || 7031,
  frontendPort: Number(process.env.FRONTEND_PORT) || 7030,
  databaseUrl: process.env.DATABASE_URL || '',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || '',
    ssl: process.env.DB_SSL === 'true' || Boolean(process.env.DB_HOST?.includes('tidbcloud.com')),
  },
};
