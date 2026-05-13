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

export function exportLoansToXLSX(opts: {
  title: string;
  data: Record<string, unknown>[];
  columns: LoanExportColumn[];
  summaryCards?: LoanSummaryCard[];
  isRTL?: boolean;
  fileName?: string;
}) {
  const { title, data, columns, summaryCards = [], isRTL = true, fileName } = opts;
  const colCount = columns.length;

  // Build sheet rows: title, date, blank, summary, blank, headers, body
  const rows: any[][] = [];
  rows.push([title, ...Array(colCount - 1).fill('')]);
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  rows.push([dateStr, ...Array(colCount - 1).fill('')]);
  rows.push(Array(colCount).fill(''));

  if (summaryCards.length > 0) {
    rows.push(summaryCards.map(c => c.label).concat(Array(Math.max(0, colCount - summaryCards.length)).fill('')));
    rows.push(summaryCards.map(c => c.value).concat(Array(Math.max(0, colCount - summaryCards.length)).fill('')));
    rows.push(Array(colCount).fill(''));
  }

  const headerRowIndex = rows.length;
  rows.push(columns.map(c => c.header));
  data.forEach(r => {
    rows.push(columns.map(c => {
      const v = r[c.key];
      if (c.numeric && typeof v === 'number') return v;
      if (c.numeric && typeof v === 'string' && v !== '' && !isNaN(Number(v))) return Number(v);
      return v ?? '';
    }));
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!views'] = [{ RTL: isRTL }];

  // Column widths
  ws['!cols'] = columns.map(c => ({ wch: Math.max(14, Math.min(36, c.header.length + 6)) }));

  // Merge title + date across all columns
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
  ];

  // Style title
  const titleAddr = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[titleAddr]) {
    ws[titleAddr].s = {
      font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1E40AF' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }
  const dateAddr = XLSX.utils.encode_cell({ r: 1, c: 0 });
  if (ws[dateAddr]) {
    ws[dateAddr].s = { font: { italic: true, sz: 10, color: { rgb: '6B7280' } }, alignment: { horizontal: 'center' } };
  }

  // Style header row
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: headerRowIndex, c });
    if (ws[addr]) {
      ws[addr].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill: { fgColor: { rgb: '1E40AF' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '1E3A8A' } },
          bottom: { style: 'thin', color: { rgb: '1E3A8A' } },
          left: { style: 'thin', color: { rgb: '1E3A8A' } },
          right: { style: 'thin', color: { rgb: '1E3A8A' } },
        },
      };
    }
  }

  // Numeric format + alternating row backgrounds for body
  const bodyStart = headerRowIndex + 1;
  data.forEach((_, ri) => {
    const rowIdx = bodyStart + ri;
    const bg = ri % 2 === 0 ? 'FFFFFF' : 'F1F5F9';
    columns.forEach((col, ci) => {
      const addr = XLSX.utils.encode_cell({ r: rowIdx, c: ci });
      if (!ws[addr]) return;
      ws[addr].s = {
        alignment: { horizontal: col.numeric ? 'right' : 'center', vertical: 'center' },
        fill: { fgColor: { rgb: bg } },
        border: {
          top: { style: 'thin', color: { rgb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
          left: { style: 'thin', color: { rgb: 'CBD5E1' } },
          right: { style: 'thin', color: { rgb: 'CBD5E1' } },
        },
      };
      if (col.numeric && typeof ws[addr].v === 'number') {
        ws[addr].t = 'n';
        ws[addr].z = '#,##0.00';
      }
    });
  });

  // Summary cards styling
  if (summaryCards.length > 0) {
    const labelRow = 3;
    const valueRow = 4;
    summaryCards.forEach((_, i) => {
      const lAddr = XLSX.utils.encode_cell({ r: labelRow, c: i });
      const vAddr = XLSX.utils.encode_cell({ r: valueRow, c: i });
      if (ws[lAddr]) ws[lAddr].s = { font: { sz: 10, color: { rgb: '6B7280' } }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: 'F8FAFC' } } };
      if (ws[vAddr]) ws[vAddr].s = { font: { bold: true, sz: 13, color: { rgb: '1E40AF' } }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: 'F8FAFC' } } };
    });
  }

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: headerRowIndex + 1 } as any;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (fileName || 'Loans').slice(0, 31));
  XLSX.writeFile(wb, `${fileName || 'loans'}_${todayStamp()}.xlsx`);
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
