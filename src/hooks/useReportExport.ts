import { useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import html2pdf from 'html2pdf.js';
import { toast } from '@/hooks/use-toast';

interface ExportColumn {
  header: string;
  key: string;
}

interface BilingualExportColumn {
  headerAr: string;
  headerEn: string;
  key: string;
}

interface ReportExportOptions {
  title: string;
  data: Record<string, unknown>[];
  columns: ExportColumn[];
  fileName?: string;
}

interface SummaryCard {
  label: string;
  value: string;
}

interface BilingualExportOptions {
  titleAr: string;
  titleEn: string;
  data: Record<string, unknown>[];
  columns: BilingualExportColumn[];
  fileName?: string;
  summaryCards?: SummaryCard[];
}

function buildSummaryCardsHtml(cards: SummaryCard[]): string {
  if (!cards || cards.length === 0) return '';
  const items = cards.map(c => `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 12px;text-align:center;background:#f9fafb;">
      <div style="font-size:20px;font-weight:700;color:#1e40af;">${c.value}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;">${c.label}</div>
    </div>
  `).join('');
  return `<div style="display:grid;grid-template-columns:repeat(${cards.length}, 1fr);gap:14px;margin-bottom:20px;">${items}</div>`;
}

export const useReportExport = () => {
  const { t, isRTL } = useLanguage();
  const reportRef = useRef<HTMLDivElement>(null);
  const logoUrl = `${window.location.origin}/images/company-logo.png`;

  const handlePrint = useCallback((title: string, summaryCards?: SummaryCard[]) => {
    const printContent = reportRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    const cardsHtml = buildSummaryCardsHtml(summaryCards || []);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Baloo Bhaijaan 2', 'Cairo', sans-serif; padding: 20px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
          h1 { text-align: center; margin-bottom: 20px; font-size: 24px; }
          .print-date { text-align: center; color: #666; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: ${isRTL ? 'right' : 'left'}; font-size: 13px; }
          th { background-color: #f3f4f6; font-weight: 600; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
          .stat-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: 700; }
          .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="print-date">${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        ${cardsHtml}
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }, [isRTL]);

  const exportToCSV = useCallback(({ title, data, columns, fileName }: ReportExportOptions) => {
    if (!data.length) {
      toast({ title: t('reports.noData') || 'No data to export', variant: 'destructive' });
      return;
    }

    const BOM = '\uFEFF';
    const headers = columns.map(c => c.header).join(',');
    const rows = data.map(row =>
      columns.map(col => {
        const val = row[col.key];
        const strVal = String(val ?? '');
        return `"${strVal.replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csv = BOM + [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadName = `${fileName || title}_${new Date().toISOString().slice(0, 10)}.csv`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    link.target = '_blank';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);

    toast({ title: t('reports.exportSuccess') || 'Export completed successfully' });
  }, [t]);

  const exportToPDF = useCallback(({ title, data, columns, fileName }: ReportExportOptions) => {
    if (!data.length) {
      toast({ title: t('reports.noData') || 'No data to export', variant: 'destructive' });
      return;
    }

    const tableRows = data.map(row =>
      `<tr>${columns.map(col => `<td>${String(row[col.key] ?? '')}</td>`).join('')}</tr>`
    ).join('');

    const container = document.createElement('div');
    container.innerHTML = `
      <div style="font-family: 'Baloo Bhaijaan 2', 'Cairo', sans-serif; padding: 30px; direction: ${isRTL ? 'rtl' : 'ltr'};">
        <h1 style="text-align: center; margin-bottom: 8px; font-size: 22px; color: #1f2937;">${title}</h1>
        <p style="text-align: center; color: #6b7280; margin-bottom: 24px; font-size: 13px;">${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <table style="width: 100%; border-collapse: collapse;">
          <thead><tr>${columns.map(c => `<th style="background-color:#1e40af;color:white;font-weight:600;font-size:12px;padding:10px 12px;border:1px solid #1e3a8a;text-align:${isRTL ? 'right' : 'left'};">${c.header}</th>`).join('')}</tr></thead>
          <tbody>${tableRows.replace(/<td>/g, `<td style="border:1px solid #d1d5db;padding:10px 12px;font-size:12px;text-align:${isRTL ? 'right' : 'left'};">`)}</tbody>
        </table>
        <p style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 11px;">${t('reports.generatedBy') || 'Generated by HR System'}</p>
      </div>
    `;

    const isLandscape = columns.length > 6;
    const downloadName = `${fileName || title}_${new Date().toISOString().slice(0, 10)}.pdf`;

    html2pdf().set({
      margin: 10,
      filename: downloadName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' },
    }).from(container).save();

    toast({ title: t('reports.exportSuccess') || 'Export completed successfully' });
  }, [isRTL, t]);

  // Bilingual Excel: styled HTML table matching PDF format
  const exportBilingualCSV = useCallback(({ titleAr, titleEn, data, columns, fileName, summaryCards }: BilingualExportOptions) => {
    if (!data.length) {
      toast({ title: t('reports.noData') || 'No data to export', variant: 'destructive' });
      return;
    }

    const tableRows = data.map((row, i) =>
      `<tr style="background-color:${i % 2 === 0 ? '#ffffff' : '#f0f4ff'};">${columns.map(col => `<td style="border:1px solid #d1d5db;padding:8px 10px;font-size:12px;text-align:center;mso-number-format:'\\@';">${String(row[col.key] ?? '')}</td>`).join('')}</tr>`
    ).join('');

    // Summary cards row for Excel
    let summaryRow = '';
    if (summaryCards && summaryCards.length > 0) {
      summaryRow = `
        <tr><td colspan="${columns.length}"></td></tr>
        <tr>${summaryCards.map(c => `<td colspan="${Math.max(1, Math.floor(columns.length / summaryCards.length))}" style="border:1px solid #e5e7eb;background:#f0f4ff;text-align:center;padding:10px;font-size:14px;font-weight:700;color:#1e40af;">${c.value}<br/><span style="font-size:10px;font-weight:400;color:#6b7280;">${c.label}</span></td>`).join('')}</tr>
        <tr><td colspan="${columns.length}"></td></tr>
      `;
    }

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name><x:WorksheetOptions><x:DisplayRightToLeft/><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          td, th { font-family: 'Calibri', 'Arial', sans-serif; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td style="text-align:left;padding:8px;vertical-align:middle;" rowspan="3"><img src="${logoUrl}" style="height:60px;width:auto;" /></td>
            <td colspan="${columns.length - 1}" style="text-align:center;font-size:22px;font-weight:700;color:#1e40af;padding:12px;direction:rtl;">${titleAr}</td>
          </tr>
          <tr><td colspan="${columns.length - 1}" style="text-align:center;font-size:18px;font-weight:600;color:#374151;padding:8px;">${titleEn}</td></tr>
          <tr><td colspan="${columns.length - 1}" style="text-align:center;color:#6b7280;font-size:13px;padding:8px;">${new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })} — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
          ${summaryRow}
          <thead>
            <tr>${columns.map(c => `<th style="background-color:#1e40af;color:white;font-weight:600;font-size:11px;padding:6px 8px;border:1px solid #1e3a8a;text-align:center;"><div style="direction:rtl;">${c.headerAr}</div><div style="font-weight:400;font-size:10px;color:#dbeafe;">${c.headerEn}</div></th>`).join('')}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
          <tr><td colspan="${columns.length}"></td></tr>
          <tr><td colspan="${columns.length}" style="text-align:center;color:#9ca3af;font-size:11px;padding:12px;">تم إنشاء التقرير بواسطة نظام إدارة الموارد البشرية — Generated by HR Management System</td></tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadName = `${fileName || `${titleEn}_${titleAr}`}_${new Date().toISOString().slice(0, 10)}.xls`;

    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    link.target = '_blank';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);

    toast({ title: t('reports.exportSuccess') || 'Export completed successfully' });
  }, [t]);

  // Bilingual PDF: dual headers + dual title
  const exportBilingualPDF = useCallback(({ titleAr, titleEn, data, columns, fileName, summaryCards }: BilingualExportOptions) => {
    if (!data.length) {
      toast({ title: t('reports.noData') || 'No data to export', variant: 'destructive' });
      return;
    }

    const dir = isRTL ? 'rtl' : 'ltr';

    const tableRows = data.map(row =>
      `<tr>${columns.map(col => `<td style="border:1px solid #d1d5db;padding:8px 10px;font-size:12px;text-align:center;">${String(row[col.key] ?? '')}</td>`).join('')}</tr>`
    ).join('');

    const cardsHtml = buildSummaryCardsHtml(summaryCards || []);

    const container = document.createElement('div');
    container.innerHTML = `
      <div style="font-family: 'Baloo Bhaijaan 2', 'Cairo', sans-serif; padding: 30px; direction: ${dir};">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
          <img src="${logoUrl}" style="height:60px;width:auto;" crossorigin="anonymous" />
          <div style="flex:1;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#1e40af;direction:rtl;">${titleAr}</div>
            <div style="font-size:18px;font-weight:600;color:#374151;direction:ltr;">${titleEn}</div>
          </div>
        </div>
        <p style="text-align:center;color:#6b7280;margin-bottom:24px;font-size:13px;">${new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })} — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        ${cardsHtml}
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>${columns.map(c => `<th style="background-color:#1e40af;color:white;font-weight:600;font-size:11px;padding:6px 8px;border:1px solid #1e3a8a;text-align:center;"><div style="direction:rtl;">${c.headerAr}</div><div style="font-weight:400;font-size:10px;color:#dbeafe;">${c.headerEn}</div></th>`).join('')}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <p style="text-align:center;margin-top:30px;color:#9ca3af;font-size:11px;">تم إنشاء التقرير بواسطة نظام إدارة الموارد البشرية — Generated by HR Management System</p>
      </div>
    `;

    const isLandscape = columns.length > 6;
    const downloadName = `${fileName || `${titleEn}_${titleAr}`}_${new Date().toISOString().slice(0, 10)}.pdf`;

    html2pdf().set({
      margin: 10,
      filename: downloadName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' },
    }).from(container).save();

    toast({ title: t('reports.exportSuccess') || 'Export completed successfully' });
  }, [isRTL, t]);

  return { reportRef, handlePrint, exportToCSV, exportToPDF, exportBilingualCSV, exportBilingualPDF };
};
