import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatDate } from '@/lib/utils';

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

const sanitize = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  return String(v);
};

const todayStamp = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** CSV with UTF-8 BOM for Arabic Excel compatibility */
export function exportToCSV<T>(rows: T[], columns: ExportColumn<T>[], filenameBase: string) {
  const escape = (val: string) => {
    if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
    return val;
  };
  const headerLine = columns.map(c => escape(c.header)).join(',');
  const dataLines = rows.map(r => columns.map(c => escape(sanitize(c.accessor(r)))).join(','));
  const csv = '\ufeff' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filenameBase}_${todayStamp()}.csv`);
}

/** Excel .xlsx via SheetJS with RTL view, frozen header, autofilter, sized columns */
export function exportToXLSX<T>(rows: T[], columns: ExportColumn<T>[], filenameBase: string, sheetName = 'Sheet1') {
  const headerRow = columns.map(c => c.header);
  const dataRows = rows.map(r => columns.map(c => {
    const v = c.accessor(r);
    if (typeof v === 'number') return v;
    const s = sanitize(v);
    // Try to detect numeric strings to keep them as numbers
    if (s !== '' && /^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    return s;
  }));
  const aoa: (string | number)[][] = [headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // RTL view + freeze header row
  ws['!views'] = [{ RTL: true, state: 'frozen', ySplit: 1 }];

  // Column widths based on max content length per column
  ws['!cols'] = columns.map((c, idx) => {
    let maxLen = c.header.length;
    for (const row of dataRows) {
      const val = row[idx];
      const len = String(val ?? '').length;
      if (len > maxLen) maxLen = len;
    }
    return { wch: Math.max(12, Math.min(45, maxLen + 4)) };
  });

  // Autofilter on the whole table
  const lastCol = XLSX.utils.encode_col(columns.length - 1);
  ws['!autofilter'] = { ref: `A1:${lastCol}${dataRows.length + 1}` };

  // Bold header (works in environments that read s.font; ignored by community edition rendering)
  for (let c = 0; c < columns.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[cellRef]) {
      (ws[cellRef] as any).s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filenameBase}_${todayStamp()}.xlsx`);
}

/**
 * PDF via html2canvas — renders Arabic correctly using the browser's loaded fonts
 * (Baloo Bhaijaan 2). Produces a paginated A4 landscape PDF with header & footer.
 */
export async function exportToPDF<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filenameBase: string,
  opts?: { title?: string; isRTL?: boolean; orientation?: 'p' | 'l'; userName?: string },
) {
  const isRTL = !!opts?.isRTL;
  const orientation = opts?.orientation || 'l';

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const generatedAt = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // Build a temporary, off-screen HTML container styled for print rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-10000px';
  container.style.left = '0';
  container.style.width = orientation === 'l' ? '1400px' : '900px';
  container.style.background = '#ffffff';
  container.style.padding = '24px';
  container.style.fontFamily = "'Baloo Bhaijaan 2', system-ui, -apple-system, Arial, sans-serif";
  container.style.color = '#0f172a';
  container.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

  const titleHtml = opts?.title ? `<h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1e3a8a">${escapeHtml(opts.title)}</h1>` : '';
  const userHtml = opts?.userName
    ? `<span>${isRTL ? 'المستخدم' : 'User'}: <strong>${escapeHtml(opts.userName)}</strong></span>`
    : '';
  const recordsHtml = `<span>${isRTL ? 'عدد السجلات' : 'Records'}: <strong>${rows.length}</strong></span>`;
  const dateHtml = `<span>${isRTL ? 'تاريخ التوليد' : 'Generated'}: <strong>${generatedAt}</strong></span>`;

  const headerCells = columns.map(c => `<th style="background:#2563eb;color:#fff;padding:8px 10px;border:1px solid #1d4ed8;font-weight:700;font-size:12px;text-align:${isRTL ? 'right' : 'left'};white-space:nowrap">${escapeHtml(c.header)}</th>`).join('');
  const bodyRows = rows.map((r, i) => {
    const cells = columns.map(c => `<td style="padding:6px 10px;border:1px solid #e2e8f0;font-size:11px;text-align:${isRTL ? 'right' : 'left'};vertical-align:middle">${escapeHtml(sanitize(c.accessor(r)))}</td>`).join('');
    const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    return `<tr style="background:${bg}">${cells}</tr>`;
  }).join('');

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #2563eb;padding-bottom:10px;margin-bottom:14px">
      <div>${titleHtml}<div style="font-size:11px;color:#475569;display:flex;gap:14px;flex-wrap:wrap">${dateHtml}${recordsHtml}${userHtml}</div></div>
    </div>
    <table style="width:100%;border-collapse:collapse;table-layout:auto">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows || `<tr><td colspan="${columns.length}" style="padding:20px;text-align:center;color:#64748b;border:1px solid #e2e8f0">${isRTL ? 'لا توجد بيانات' : 'No data'}</td></tr>`}</tbody>
    </table>
  `;

  document.body.appendChild(container);

  try {
    // Wait one frame for fonts to apply
    await new Promise(r => requestAnimationFrame(() => r(null)));
    if ((document as any).fonts?.ready) {
      try { await (document as any).fonts.ready; } catch { /* noop */ }
    }

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2 - 18; // leave room for footer

    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Paginate by slicing the rendered canvas
    const pageCanvasHeightPx = Math.floor((usableHeight / imgHeight) * canvas.height);
    let renderedPx = 0;
    let pageNum = 0;
    const totalPages = Math.max(1, Math.ceil(canvas.height / pageCanvasHeightPx));

    while (renderedPx < canvas.height) {
      pageNum++;
      const sliceHeight = Math.min(pageCanvasHeightPx, canvas.height - renderedPx);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext('2d');
      if (!ctx) break;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);

      if (pageNum > 1) pdf.addPage();
      const sliceDisplayHeight = (sliceHeight * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, sliceDisplayHeight, undefined, 'FAST');

      // Footer: page numbers (Latin digits — supported by helvetica everywhere)
      pdf.setFontSize(8);
      pdf.setTextColor(120);
      const footer = `${pageNum} / ${totalPages}`;
      pdf.text(footer, pageWidth / 2, pageHeight - 12, { align: 'center' });
      pdf.setTextColor(0);

      renderedPx += sliceHeight;
    }

    pdf.save(`${filenameBase}_${todayStamp()}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { formatDate };
