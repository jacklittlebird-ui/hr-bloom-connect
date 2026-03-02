import { useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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

interface BilingualExportOptions {
  titleAr: string;
  titleEn: string;
  data: Record<string, unknown>[];
  columns: BilingualExportColumn[];
  fileName?: string;
}

export const useReportExport = () => {
  const { t, isRTL } = useLanguage();
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback((title: string) => {
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

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Baloo Bhaijaan 2', 'Cairo', sans-serif; padding: 30px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
          h1 { text-align: center; margin-bottom: 8px; font-size: 22px; color: #1f2937; }
          .subtitle { text-align: center; color: #6b7280; margin-bottom: 24px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d1d5db; padding: 10px 12px; text-align: ${isRTL ? 'right' : 'left'}; font-size: 12px; }
          th { background-color: #1e40af; color: white; font-weight: 600; }
          tr:nth-child(even) { background-color: #f0f4ff; }
          .footer { text-align: center; margin-top: 30px; color: #9ca3af; font-size: 11px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="subtitle">${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <table>
          <thead><tr>${columns.map(c => `<th>${c.header}</th>`).join('')}</tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
        <p class="footer">${t('reports.generatedBy') || 'Generated by HR System'}</p>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: t('reports.popupBlocked') || 'Please allow popups', variant: 'destructive' });
      return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);

    toast({ title: t('reports.exportSuccess') || 'Export completed successfully' });
  }, [isRTL, t]);

  // Bilingual Excel: styled HTML table matching PDF format
  const exportBilingualCSV = useCallback(({ titleAr, titleEn, data, columns, fileName }: BilingualExportOptions) => {
    if (!data.length) {
      toast({ title: t('reports.noData') || 'No data to export', variant: 'destructive' });
      return;
    }

    const tableRows = data.map((row, i) =>
      `<tr style="background-color:${i % 2 === 0 ? '#ffffff' : '#f0f4ff'};">${columns.map(col => `<td style="border:1px solid #d1d5db;padding:8px 10px;font-size:12px;text-align:center;mso-number-format:'\\@';">${String(row[col.key] ?? '')}</td>`).join('')}</tr>`
    ).join('');

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
          <tr><td colspan="${columns.length}" style="text-align:center;font-size:22px;font-weight:700;color:#1e40af;padding:12px;direction:rtl;">${titleAr}</td></tr>
          <tr><td colspan="${columns.length}" style="text-align:center;font-size:18px;font-weight:600;color:#374151;padding:8px;">${titleEn}</td></tr>
          <tr><td colspan="${columns.length}" style="text-align:center;color:#6b7280;font-size:13px;padding:8px;">${new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })} — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
          <tr><td colspan="${columns.length}"></td></tr>
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
  const exportBilingualPDF = useCallback(({ titleAr, titleEn, data, columns, fileName }: BilingualExportOptions) => {
    if (!data.length) {
      toast({ title: t('reports.noData') || 'No data to export', variant: 'destructive' });
      return;
    }

    const tableRows = data.map(row =>
      `<tr>${columns.map(col => `<td>${String(row[col.key] ?? '')}</td>`).join('')}</tr>`
    ).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${titleEn} - ${titleAr}</title>
        <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Baloo Bhaijaan 2', 'Cairo', sans-serif; padding: 30px; }
          .title-block { text-align: center; margin-bottom: 20px; }
          .title-ar { font-size: 22px; font-weight: 700; color: #1e40af; direction: rtl; }
          .title-en { font-size: 18px; font-weight: 600; color: #374151; }
          .subtitle { text-align: center; color: #6b7280; margin-bottom: 24px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; }
          th { background-color: #1e40af; color: white; font-weight: 600; font-size: 11px; padding: 6px 8px; border: 1px solid #1e3a8a; }
          .th-ar { direction: rtl; text-align: right; }
          .th-en { direction: ltr; text-align: left; font-weight: 400; font-size: 10px; color: #dbeafe; }
          td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 12px; text-align: center; }
          tr:nth-child(even) { background-color: #f0f4ff; }
          .footer { text-align: center; margin-top: 30px; color: #9ca3af; font-size: 11px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="title-block">
          <div class="title-ar">${titleAr}</div>
          <div class="title-en">${titleEn}</div>
        </div>
        <p class="subtitle">${new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })} — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <table>
          <thead>
            <tr>${columns.map(c => `<th><div class="th-ar">${c.headerAr}</div><div class="th-en">${c.headerEn}</div></th>`).join('')}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <p class="footer">تم إنشاء التقرير بواسطة نظام إدارة الموارد البشرية — Generated by HR Management System</p>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: t('reports.popupBlocked') || 'Please allow popups', variant: 'destructive' });
      return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);

    toast({ title: t('reports.exportSuccess') || 'Export completed successfully' });
  }, [t]);

  return { reportRef, handlePrint, exportToCSV, exportToPDF, exportBilingualCSV, exportBilingualPDF };
};
