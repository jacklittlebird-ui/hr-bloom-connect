import ExcelJS from 'exceljs';

export interface LoanExportColumn {
  header: string;
  key: string;
  /** numeric => right-aligned, formatted with thousands separator in Excel */
  numeric?: boolean;
}

export interface LoanSummaryCard {
  label: string;
  value: string | number;
}

const todayStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

/* ===================== Excel (.xlsx) ===================== */

export async function exportLoansToXLSX(opts: {
  title: string;
  data: Record<string, unknown>[];
  columns: LoanExportColumn[];
  summaryCards?: LoanSummaryCard[];
  isRTL?: boolean;
  fileName?: string;
}) {
  const { title, data, columns, summaryCards = [], isRTL = true, fileName } = opts;
  const colCount = columns.length;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'HR System';
  wb.created = new Date();

  const ws = wb.addWorksheet(isRTL ? 'القروض' : 'Loans', {
    views: [{ rightToLeft: isRTL, state: 'frozen', ySplit: 0 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } },
  });

  // Column widths
  ws.columns = columns.map(c => ({
    width: Math.max(14, Math.min(32, (c.header.length + 6))),
  }));

  const lastColLetter = ws.getColumn(colCount).letter;

  // Row 1: Title
  ws.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  // Row 2: Date
  ws.mergeCells(`A2:${lastColLetter}2`);
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const dateCell = ws.getCell('A2');
  dateCell.value = isRTL ? `تاريخ التقرير: ${dateStr}` : `Report date: ${dateStr}`;
  dateCell.font = { italic: true, size: 11, color: { argb: 'FF475569' } };
  dateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // Blank row
  ws.addRow([]);
  let cursor = 3;

  // Summary cards (one row of labels, one row of values)
  if (summaryCards.length > 0) {
    cursor++;
    const labelRowIdx = cursor;
    const valueRowIdx = cursor + 1;
    const labelRow = ws.getRow(labelRowIdx);
    const valueRow = ws.getRow(valueRowIdx);
    summaryCards.forEach((card, i) => {
      labelRow.getCell(i + 1).value = card.label;
      labelRow.getCell(i + 1).font = { size: 10, color: { argb: 'FF64748B' }, bold: true };
      labelRow.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle' };
      labelRow.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      labelRow.getCell(i + 1).border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };

      valueRow.getCell(i + 1).value = card.value;
      valueRow.getCell(i + 1).font = { size: 14, color: { argb: 'FF1E40AF' }, bold: true };
      valueRow.getCell(i + 1).alignment = { horizontal: 'center', vertical: 'middle' };
      valueRow.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      valueRow.getCell(i + 1).border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    });
    labelRow.height = 18;
    valueRow.height = 22;
    cursor += 2;
    ws.addRow([]);
    cursor++;
  }

  // Header row
  const headerRowIdx = cursor + 1;
  const headerRow = ws.getRow(headerRowIdx);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'thin', color: { argb: 'FF1E3A8A' } },
      left: { style: 'thin', color: { argb: 'FF1E3A8A' } },
      right: { style: 'thin', color: { argb: 'FF1E3A8A' } },
    };
  });
  headerRow.height = 28;

  // Data rows
  data.forEach((row, ri) => {
    const dataRow = ws.getRow(headerRowIdx + 1 + ri);
    columns.forEach((col, ci) => {
      const cell = dataRow.getCell(ci + 1);
      const v = row[col.key];
      if (col.numeric) {
        const n = typeof v === 'number' ? v : (v === '' || v == null || isNaN(Number(v)) ? null : Number(v));
        cell.value = n;
        cell.numFmt = '#,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else {
        cell.value = v == null ? '' : String(v);
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
      cell.font = { size: 10, color: { argb: 'FF1F2937' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ri % 2 === 0 ? 'FFFFFFFF' : 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
    dataRow.height = 22;
  });

  // Totals row for numeric columns
  if (data.length > 0) {
    const totalRowIdx = headerRowIdx + 1 + data.length;
    const totalRow = ws.getRow(totalRowIdx);
    columns.forEach((col, ci) => {
      const cell = totalRow.getCell(ci + 1);
      if (ci === 0) {
        cell.value = isRTL ? 'الإجمالي' : 'Total';
      } else if (col.numeric) {
        const sum = data.reduce((s, r) => {
          const v = r[col.key];
          const n = typeof v === 'number' ? v : Number(v);
          return s + (isNaN(n) ? 0 : n);
        }, 0);
        cell.value = sum;
        cell.numFmt = '#,##0.00';
      } else {
        cell.value = '';
      }
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.alignment = { horizontal: col.numeric ? 'right' : 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1E40AF' } },
        bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
      };
    });
    totalRow.height = 26;
  }

  // Freeze header row
  ws.views = [{ rightToLeft: isRTL, state: 'frozen', xSplit: 0, ySplit: headerRowIdx }];

  // Auto-filter on the data table
  ws.autoFilter = {
    from: { row: headerRowIdx, column: 1 },
    to: { row: headerRowIdx + data.length, column: colCount },
  };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName || 'loans'}_${todayStamp()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
}

/* ===================== Print (new window) ===================== */

export function printLoansReport(opts: {
  title: string;
  data: Record<string, unknown>[];
  columns: LoanExportColumn[];
  summaryCards?: LoanSummaryCard[];
  isRTL?: boolean;
}) {
  const { title, data, columns, summaryCards = [], isRTL = true } = opts;
  const w = window.open('', '_blank', 'width=1200,height=800');
  if (!w) return;

  const dir = isRTL ? 'rtl' : 'ltr';
  const align = isRTL ? 'right' : 'left';
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const escape = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fmt = (v: unknown, numeric?: boolean) => {
    if (numeric && typeof v === 'number') return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return escape(v);
  };

  const cardsHtml = summaryCards.length
    ? `<div class="cards">${summaryCards.map(c => `<div class="card"><div class="cv">${escape(c.value)}</div><div class="cl">${escape(c.label)}</div></div>`).join('')}</div>`
    : '';

  const headHtml = columns.map(c => `<th>${escape(c.header)}</th>`).join('');
  const bodyHtml = data.map((r, i) => `<tr class="${i % 2 ? 'alt' : ''}">${columns.map(c => `<td class="${c.numeric ? 'num' : ''}">${fmt(r[c.key], c.numeric)}</td>`).join('')}</tr>`).join('');

  w.document.write(`<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${escape(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Baloo Bhaijaan 2', 'Cairo', Tahoma, sans-serif; margin: 0; padding: 24px; color: #111827; direction: ${dir}; }
  .header { display:flex; align-items:center; gap:16px; border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 16px; }
  .header img { height: 56px; width: auto; }
  .header .title { flex:1; text-align:center; }
  .header h1 { margin:0; font-size: 22px; color:#1e40af; }
  .header .date { margin-top:4px; font-size:12px; color:#6b7280; }
  .cards { display:grid; grid-template-columns: repeat(${Math.min(summaryCards.length || 1, 6)}, 1fr); gap:10px; margin-bottom:16px; }
  .card { border:1px solid #e5e7eb; border-radius:8px; padding:10px; text-align:center; background:#f9fafb; }
  .cv { font-size:16px; font-weight:700; color:#1e40af; }
  .cl { font-size:11px; color:#6b7280; margin-top:3px; }
  table { width:100%; border-collapse: collapse; font-size: 12px; }
  th { background:#1e40af; color:#fff; padding:8px 10px; border:1px solid #1e3a8a; font-weight:700; text-align:center; }
  td { padding:7px 10px; border:1px solid #cbd5e1; text-align:${align}; vertical-align: middle; }
  td.num { text-align:${isRTL ? 'left' : 'right'}; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr.alt td { background:#f8fafc; }
  tfoot { font-size:11px; color:#6b7280; }
  @media print {
    body { padding: 10mm; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="header">
    <img src="${window.location.origin}/images/company-logo.png" onerror="this.style.display='none'" />
    <div class="title">
      <h1>${escape(title)}</h1>
      <div class="date">${dateStr}</div>
    </div>
  </div>
  ${cardsHtml}
  <table>
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>
  <p style="text-align:center;margin-top:24px;color:#9ca3af;font-size:11px;">${isRTL ? `إجمالي السجلات: ${data.length}` : `Total records: ${data.length}`}</p>
</body>
</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { try { w.print(); } catch { /* ignore */ } }, 500);
}
