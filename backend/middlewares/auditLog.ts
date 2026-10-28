import { Request, Response, NextFunction } from 'express';
import { describeApiAction, writeAuditLog } from '../services/auditService.js';

const SKIP_PREFIXES = ['/health', '/db-status', '/bootstrap', '/audit-logs'];

function shouldSkip(path: string, method: string): boolean {
  if (method === 'GET' || method === 'OPTIONS' || method === 'HEAD') return true;
  const p = path.replace(/^\/api/, '') || path;
  return SKIP_PREFIXES.some((s) => p === s || p.startsWith(`${s}/`) || p.startsWith(s));
}

/**
 * Logs every mutating API call (POST/PUT/PATCH/DELETE) with actor headers + description.
 */
export function auditLogMiddleware(req: Request, res: Response, next: NextFunction) {
  if (shouldSkip(req.path, req.method)) {
    next();
    return;
  }

  res.on('finish', () => {
    if (res.statusCode >= 400) return;

    const actorId = String(req.headers['x-actor-id'] || '') || null;
    const actorName = String(req.headers['x-actor-name'] || '') || 'System';
    const actorUsername = String(req.headers['x-actor-username'] || '') || '';
    const actorBranch =
      String(req.headers['x-actor-branch-id'] || '') ||
      (req.body && typeof req.body === 'object' && (req.body as any).branchId) ||
      null;

    const meta = describeApiAction(
      req.method,
      req.originalUrl || req.path,
      actorName,
      actorUsername,
      req.body
    );

    void writeAuditLog({
      branchId: actorBranch,
      userId: actorId,
      action: meta.action,
      tableName: meta.tableName,
      recordId: meta.recordId,
      description: meta.description,
      details: {
        actorName,
        actorUsername,
        actorRole: String(req.headers['x-actor-role'] || '') || undefined,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: res.statusCode,
      },
    });
  });

  next();
}
