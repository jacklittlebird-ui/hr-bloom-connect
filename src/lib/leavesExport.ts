import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

/** Excel .xlsx via SheetJS */
export function exportToXLSX<T>(rows: T[], columns: ExportColumn<T>[], filenameBase: string, sheetName = 'Sheet1') {
  const aoa: (string | number)[][] = [
    columns.map(c => c.header),
    ...rows.map(r => columns.map(c => sanitize(c.accessor(r)))),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Right-to-left view for Arabic
  ws['!views'] = [{ RTL: true }];
  // Column widths heuristic
  ws['!cols'] = columns.map(c => ({ wch: Math.max(12, Math.min(40, c.header.length + 4)) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filenameBase}_${todayStamp()}.xlsx`);
}

/** PDF via jsPDF + autoTable, RTL-aware (column order is reversed for Arabic) */
export function exportToPDF<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filenameBase: string,
  opts?: { title?: string; isRTL?: boolean; orientation?: 'p' | 'l'; userName?: string },
) {
  const orientation = opts?.orientation || 'l';
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const isRTL = !!opts?.isRTL;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const generatedAt = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const metaLeft = isRTL ? `تاريخ التوليد: ${generatedAt}` : `Generated: ${generatedAt}`;
  const metaRight = opts?.userName
    ? (isRTL ? `المستخدم: ${opts.userName}` : `User: ${opts.userName}`)
    : '';
  const rowsLabel = isRTL ? `عدد السجلات: ${rows.length}` : `Records: ${rows.length}`;

  if (opts?.title) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(opts.title, isRTL ? pageWidth - 40 : 40, 36, { align: isRTL ? 'right' : 'left' });
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(metaLeft, 40, 54);
  if (metaRight) doc.text(metaRight, pageWidth - 40, 54, { align: 'right' });
  doc.text(rowsLabel, isRTL ? pageWidth - 40 : 40, 68, { align: isRTL ? 'right' : 'left' });
  doc.setDrawColor(200);
  doc.line(40, 76, pageWidth - 40, 76);

  // For RTL render columns reversed so reading direction matches the UI
  const orderedCols = isRTL ? [...columns].reverse() : columns;
  const head = [orderedCols.map(c => c.header)];
  const body = rows.map(r => orderedCols.map(c => sanitize(c.accessor(r))));

  autoTable(doc, {
    head,
    body,
    startY: 86,
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 4, halign: isRTL ? 'right' : 'left' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, halign: isRTL ? 'right' : 'left' },
    alternateRowStyles: { fillColor: [243, 244, 246] },
    margin: { top: 86, left: 30, right: 30, bottom: 40 },
  });

  // Add page numbers after table is rendered (so total count is final)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    const footer = isRTL ? `صفحة ${i} من ${totalPages}` : `Page ${i} of ${totalPages}`;
    doc.text(footer, pageWidth / 2, pageHeight - 20, { align: 'center' });
    doc.setTextColor(0);
  }

  doc.save(`${filenameBase}_${todayStamp()}.pdf`);
}

export { formatDate };
