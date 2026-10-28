import * as XLSX from 'xlsx-js-style';

/** Teal brand — matches OmniPOS login / system theme */
const BRAND = '0F766E';
const BRAND_DARK = '115E59';
const SECTION = 'CCFBF1';
const BORDER = 'CBD5E1';
const TEXT = '0F172A';

type CellValue = string | number | boolean | null | undefined;

const HEADER_LABELS = new Set([
  'Metric',
  'Expense Category',
  'Category',
  'Item',
  'Description',
  'Amount (MMK)',
]);

const thinBorder = {
  top: { style: 'thin', color: { rgb: BORDER } },
  bottom: { style: 'thin', color: { rgb: BORDER } },
  left: { style: 'thin', color: { rgb: BORDER } },
  right: { style: 'thin', color: { rgb: BORDER } },
};

function ensureXlsxName(fileName: string): string {
  return fileName.toLowerCase().endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
}

function applyCellStyles(ws: any, opts?: { sectionPrefix?: string }) {
  const sectionPrefix = opts?.sectionPrefix ?? '===';
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const colCount = range.e.c - range.s.c + 1;

  for (let r = range.s.r; r <= range.e.r; r++) {
    const firstRef = XLSX.utils.encode_cell({ r, c: 0 });
    const firstVal = ws[firstRef]?.v;
    const firstText = firstVal == null ? '' : String(firstVal);
    const isTitle = r === 0;
    const isSection = typeof firstVal === 'string' && firstVal.startsWith(sectionPrefix);
    const isHeaderRow = HEADER_LABELS.has(firstText);

    for (let c = range.s.c; c <= range.e.c; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (!ws[ref]) continue;

      const val = ws[ref].v;
      let style: Record<string, unknown> = {
        font: { name: 'Arial', sz: 10, color: { rgb: TEXT } },
        alignment: {
          vertical: 'center',
          horizontal: typeof val === 'number' ? 'right' : 'left',
        },
        border: thinBorder,
      };

      if (isTitle) {
        style = {
          font: { name: 'Arial', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: BRAND } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: thinBorder,
        };
      } else if (isSection) {
        style = {
          font: { name: 'Arial', sz: 11, bold: true, color: { rgb: BRAND_DARK } },
          fill: { fgColor: { rgb: SECTION } },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: thinBorder,
        };
      } else if (isHeaderRow) {
        style = {
          font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: BRAND_DARK } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder,
        };
      }

      ws[ref].s = style;
    }
  }

  if (colCount > 1) {
    ws['!merges'] = [...(ws['!merges'] || []), { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];
  }

  const widths: number[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    let max = 12;
    for (let r = range.s.r; r <= range.e.r; r++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const v = ws[ref]?.v;
      if (v != null) max = Math.max(max, String(v).length + 2);
    }
    widths.push(Math.min(max, 48));
  }
  ws['!cols'] = widths.map((wch) => ({ wch }));
  ws['!rows'] = [{ hpt: 28 }];
}

/**
 * Export an array-of-arrays sheet (reports, ledgers) as styled .xlsx
 */
export function exportAoaToExcel(
  rows: CellValue[][],
  fileName: string,
  sheetName = 'Report'
): void {
  if (!rows?.length) return;

  const maxCols = Math.max(...rows.map((r) => r.length), 2);
  const normalized = rows.map((row) => {
    const next = [...row];
    while (next.length < maxCols) next.push('');
    return next;
  });

  const ws = XLSX.utils.aoa_to_sheet(normalized);
  applyCellStyles(ws);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, ensureXlsxName(fileName));
}

/**
 * Export object rows as a styled table .xlsx (title + header + data)
 */
export function exportObjectsToExcel(
  data: Record<string, CellValue>[],
  fileName: string,
  sheetName = 'Sheet1',
  title?: string
): void {
  if (!data?.length) return;
  const keys = Object.keys(data[0]);
  const aoa: CellValue[][] = [];
  if (title) {
    aoa.push([title, ...Array(Math.max(keys.length - 1, 0)).fill('')]);
    aoa.push([]);
  }
  aoa.push(keys);
  data.forEach((item) => aoa.push(keys.map((k) => item[k] ?? '')));
  exportAoaToExcel(aoa, fileName, sheetName);
}
