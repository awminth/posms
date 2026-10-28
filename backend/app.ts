import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { auditLogMiddleware } from './middlewares/auditLog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '8mb' }));

  app.use((req, _res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  app.use('/api', auditLogMiddleware);
  app.use('/api', apiRouter);

  const distPath = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production';

  if (fs.existsSync(distPath) && (isProd || !process.env.FRONTEND_PORT)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // In development mode, Vite dev server runs on FRONTEND_PORT (7030) with live HMR
    // Redirect root browser visits to the active Vite dev server
    const frontendPort = process.env.FRONTEND_PORT || 7030;
    app.get('/', (_req, res) => {
      res.redirect(`http://localhost:${frontendPort}`);
    });
  }

  app.use(errorHandler);
  return app;
}
