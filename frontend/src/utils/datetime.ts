/** Clean date/time for vouchers — no GMT / timezone suffix. */
export function formatVoucherDateTime(value?: string | Date | null): string {
  if (value == null || value === '') return '—';

  if (typeof value === 'string') {
    const stripped = value
      .replace(/\s*GMT[+-]\d{4}.*$/i, '')
      .replace(/\s*\([^)]*Time\)\s*$/i, '')
      .trim();
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return formatLocal(d);
    }
    return stripped || '—';
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatLocal(value);
  }

  return '—';
}

function formatLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Date-only for purchase / ledger rows. */
export function formatVoucherDate(value?: string | Date | null): string {
  if (value == null || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value).slice(0, 10);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
