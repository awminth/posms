import { getPool } from '../config/db.js';
import { randomUUID } from 'crypto';

export type AuditEntry = {
  branchId?: string | null;
  userId?: string | null;
  action: string;
  tableName?: string | null;
  recordId?: string | null;
  description: string;
  details?: Record<string, unknown>;
};

export type AuditLogRow = {
  id: string;
  branchId: string | null;
  userId: string | null;
  userName: string | null;
  userUsername: string | null;
  action: string;
  tableName: string | null;
  recordId: string | null;
  description: string;
  details: Record<string, unknown> | null;
  createdAt: string;
};

function newId() {
  return `al-${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const details = {
      description: entry.description,
      ...(entry.details || {}),
    };
    await getPool().query(
      `INSERT INTO audit_logs (id, branch_id, user_id, action, table_name, record_id, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        entry.branchId || null,
        entry.userId || null,
        entry.action.slice(0, 50),
        entry.tableName || null,
        entry.recordId || null,
        JSON.stringify(details),
      ]
    );
  } catch (err) {
    console.error('[audit] failed to write log', err);
  }
}

export async function listAuditLogs(opts: {
  branchId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: AuditLogRow[]; total: number }> {
  const page = Math.max(1, opts.page || 1);
  const pageSize = Math.min(100, Math.max(5, opts.pageSize || 10));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.branchId && opts.branchId !== 'ALL') {
    where.push('(a.branch_id = ? OR a.branch_id IS NULL)');
    params.push(opts.branchId);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [countRows]: any = await getPool().query(
    `SELECT COUNT(*) AS cnt FROM audit_logs a ${whereSql}`,
    params
  );
  const total = Number(countRows?.[0]?.cnt || 0);

  const [rows]: any = await getPool().query(
    `SELECT a.id, a.branch_id, a.user_id, a.action, a.table_name, a.record_id, a.details, a.created_at,
            u.full_name AS user_full_name, u.username AS user_username
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     ${whereSql}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const mapped: AuditLogRow[] = (rows || []).map((r: any) => {
    let details: Record<string, unknown> | null = null;
    let description = '';
    try {
      details =
        typeof r.details === 'string' ? JSON.parse(r.details) : r.details || null;
      description =
        (details && typeof details.description === 'string' && details.description) ||
        `${r.action}${r.table_name ? ` on ${r.table_name}` : ''}`;
    } catch {
      description = String(r.action || '');
    }
    return {
      id: r.id,
      branchId: r.branch_id ?? null,
      userId: r.user_id ?? null,
      userName: r.user_full_name || (details?.actorName as string) || null,
      userUsername: r.user_username || (details?.actorUsername as string) || null,
      action: r.action,
      tableName: r.table_name ?? null,
      recordId: r.record_id ?? null,
      description,
      details,
      createdAt: r.created_at
        ? new Date(r.created_at).toISOString()
        : new Date().toISOString(),
    };
  });

  return { rows: mapped, total };
}

/** Human-readable action label from HTTP method + path */
export function describeApiAction(
  method: string,
  path: string,
  actorName: string,
  actorUsername: string,
  body?: unknown
): { action: string; tableName: string | null; recordId: string | null; description: string } {
  const cleanPath = (path || '').replace(/^\/api/, '') || '/';
  const parts = cleanPath.split('/').filter(Boolean);
  const resource = parts[0] || 'system';
  const idPart = parts.find((p, i) => i > 0 && !['receive', 'close', 'cash-movement', 'settle-credit', 'payments', 'adjust', 'distribute', 'grn', 'opening-balances', 'summary'].includes(p) && !p.includes('?'));
  const who = actorUsername
    ? `${actorName || actorUsername} (@${actorUsername})`
    : actorName || 'Unknown user';

  const bodyObj = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  const titleHint =
    (bodyObj?.title as string) ||
    (bodyObj?.fullName as string) ||
    (bodyObj?.name as string) ||
    (bodyObj?.orderNumber as string) ||
    (bodyObj?.purchaseNumber as string) ||
    '';

  let verb = 'updated';
  if (method === 'POST') verb = 'created';
  if (method === 'DELETE') verb = 'deleted';
  if (method === 'PUT') verb = 'adjusted';
  if (method === 'PATCH') verb = 'updated';

  if (cleanPath.includes('/auth/login')) {
    return {
      action: 'LOGIN',
      tableName: 'users',
      recordId: null,
      description: `${who} logged into the system`,
    };
  }

  const action = `${method}_${resource}`.toUpperCase().slice(0, 50);
  const descParts = [
    `${who} ${verb} ${resource.replace(/-/g, ' ')}`,
    titleHint ? `"${titleHint}"` : '',
    idPart ? `(id: ${idPart})` : '',
    `via ${method} ${cleanPath}`,
  ].filter(Boolean);

  return {
    action,
    tableName: resource.slice(0, 50),
    recordId: idPart?.slice(0, 36) || null,
    description: descParts.join(' '),
  };
}
