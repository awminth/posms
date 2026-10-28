import { randomUUID } from 'crypto';

/** Generate compact IDs that fit VARCHAR(36) columns. */
export function newId(prefix?: string): string {
  const hex = randomUUID().replace(/-/g, '');
  if (!prefix) return hex.slice(0, 32);
  const maxHex = Math.max(8, 36 - prefix.length - 1);
  return `${prefix}-${hex.slice(0, maxHex)}`;
}

export function num(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function bool(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

/** Local datetime without GMT suffix — YYYY-MM-DD HH:mm */
export function formatDateTime(value: unknown): string {
  if (value == null || value === '') return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    return String(value)
      .replace(/\s*GMT[+-]\d{4}.*$/i, '')
      .replace(/\s*\([^)]*Time\)\s*$/i, '')
      .trim();
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
