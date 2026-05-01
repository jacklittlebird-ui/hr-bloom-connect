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
  const cols = Math.min(cards.length, 5);
  const items = cards.map(c => `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 8px;text-align:center;background:#f9fafb;">
      <div style="font-size:16px;font-weight:700;color:#1e40af;">${c.value}</div>
      <div style="font-size:10px;color:#6b7280;margin-top:3px;">${c.label}</div>
    </div>
  `).join('');
  return `<div style="display:grid;grid-template-columns:repeat(${cols}, 1fr);gap:10px;margin-bottom:20px;">${items}</div>`;
}

function createExportContainer(html: string): HTMLDivElement {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '-10000px';
  container.style.overflow = 'hidden';
  container.style.width = '1200px';
  container.style.background = '#ffffff';
  container.style.zIndex = '-9999';
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

function waitForImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) return Promise.resolve();

  return Promise.all(images.map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  })).then(() => undefined);
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
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
          <img src="${logoUrl}" style="height:60px;width:auto;" />
          <div style="flex:1;text-align:center;">
            <h1 style="margin:0;font-size:24px;">${title}</h1>
            <p class="print-date" style="margin:4px 0 0;">${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
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

  const buildWordHtml = useCallback(async ({ title, data, columns }: ReportExportOptions): Promise<string> => {
    // Fetch logo as base64 so it embeds inside the .doc file (no broken image when emailed)
    let logoDataUrl = '';
    try {
      const res = await fetch(logoUrl);
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      logoDataUrl = `data:image/png;base64,${btoa(bin)}`;
    } catch {
      logoDataUrl = '';
    }

    const dir = isRTL ? 'rtl' : 'ltr';
    const align = isRTL ? 'right' : 'left';
    const colCount = columns.length;
    const autoBodyFont = colCount > 14 ? 8 : colCount > 10 ? 9 : colCount > 7 ? 10 : 11;
    const autoHeaderFont = autoBodyFont + 1;
    const autoCellPad = colCount > 12 ? '3px 4px' : '5px 7px';
    const pageMargin = colCount > 12 ? '1.6cm 0.7cm 1.4cm 0.7cm' : '2.2cm 1.2cm 2cm 1.2cm';

    const headerHtml = columns.map(c => `<th style="background:#1e40af;color:#fff;padding:${autoCellPad};border:1px solid #94a3b8;font-size:${autoHeaderFont}px;text-align:center;font-weight:700;">${c.header}</th>`).join('');
    const bodyHtml = data.map((row, i) => {
      const cells = columns.map(col => {
        const val = row[col.key];
        const strVal = String(val ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<td style="padding:${autoCellPad};border:1px solid #cbd5e1;font-size:${autoBodyFont}px;text-align:${align};">${strVal}</td>`;
      }).join('');
      const bg = i % 2 === 0 ? '#ffffff' : '#f1f5f9';
      return `<tr style="background:${bg};">${cells}</tr>`;
    }).join('');

    const dateStr = new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB');
    const timeStr = new Date().toLocaleTimeString(isRTL ? 'ar-EG' : 'en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const orgName = isRTL ? 'نظام إدارة الموارد البشرية' : 'HR Management System';
    const reportLabel = isRTL ? 'تقرير' : 'Report';
    const dateLabel = isRTL ? 'تاريخ الإصدار' : 'Generated';
    const recordsLabel = isRTL ? 'عدد السجلات' : 'Records';
    const pageLabel = isRTL ? 'صفحة' : 'Page';
    const ofLabel = isRTL ? 'من' : 'of';
    const confidentialLabel = isRTL ? 'مستند سري - للاستخدام الداخلي فقط' : 'Confidential — Internal Use Only';

    const logoImg = logoDataUrl
      ? `<img src="${logoDataUrl}" alt="logo" style="height:42px;width:auto;vertical-align:middle;" />`
      : '';
    const logoHeaderImg = logoDataUrl
      ? `<img src="${logoDataUrl}" alt="logo" style="height:22px;width:auto;vertical-align:middle;margin-${isRTL ? 'left' : 'right'}:6px;" />`
      : '';

    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" dir="${dir}">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>110</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
    <w:DisplayHorizontalDrawingGridEvery>0</w:DisplayHorizontalDrawingGridEvery>
    <w:DisplayVerticalDrawingGridEvery>2</w:DisplayVerticalDrawingGridEvery>
    <w:UseMarginsForDrawingGridOrigin/>
    <w:Compatibility>
      <w:DoNotExpandShiftReturn/>
      <w:BreakWrappedTables/>
      <w:SnapToGridInCell/>
    </w:Compatibility>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page WordSection1 {
    size: 297mm 210mm;
    mso-page-orientation: landscape;
    margin: ${pageMargin};
    mso-header-margin: 0.5cm;
    mso-footer-margin: 0.5cm;
    mso-paper-source: 0;
    mso-header: url("#h1") h1;
    mso-footer: url("#f1") f1;
    mso-fit-text-to-page: yes;
  }
  div.WordSection1 { page: WordSection1; }
  body { font-family: 'Arial', 'Tahoma', sans-serif; direction: ${dir}; color:#1f2937; mso-fareast-font-family:'Arial'; }
  table { border-collapse: collapse; width: 100%; mso-table-layout-alt: fixed; mso-table-overlap: never; }
  thead { display: table-header-group; mso-row-heading: yes; }
  thead tr { mso-yfti-header: yes; }
  tr { page-break-inside: avoid; }
  h1.doc-title { color: #1e40af; font-size: 22px; margin: 0 0 4px 0; text-align:center; }
  .doc-subtitle { font-size: 12px; color:#475569; text-align:center; margin-bottom:14px; }
  .meta-bar { border:1px solid #e2e8f0; background:#f8fafc; padding:8px 12px; margin-bottom:12px; font-size:11px; color:#334155; }
  .meta-bar span { margin-${isRTL ? 'left' : 'right'}: 18px; }
  .meta-bar b { color:#1e40af; }
  .header-bar { border-bottom: 2px solid #1e40af; padding: 4px 0; font-size:11px; color:#1e40af; font-weight:700; }
  .header-bar .right { float: ${isRTL ? 'left' : 'right'}; color:#64748b; font-weight:400; }
  .footer-bar { border-top: 1px solid #cbd5e1; padding-top: 4px; font-size:10px; color:#64748b; }
  .footer-bar .pages { float: ${isRTL ? 'left' : 'right'}; }
  .title-row { display:table; width:100%; margin-bottom:6px; }
  .title-row .logo-cell { display:table-cell; width:80px; vertical-align:middle; text-align:${isRTL ? 'right' : 'left'}; }
  .title-row .text-cell { display:table-cell; vertical-align:middle; text-align:center; }
</style>
</head>
<body>
<div class="WordSection1">

  <div style="mso-element:header" id="h1">
    <div class="header-bar">
      ${logoHeaderImg}${orgName}
      <span class="right">${title}</span>
      <div style="clear:both;"></div>
    </div>
  </div>

  <div style="mso-element:footer" id="f1">
    <div class="footer-bar">
      ${confidentialLabel}
      <span class="pages">${pageLabel} <span style="mso-field-code:PAGE"></span> ${ofLabel} <span style="mso-field-code:NUMPAGES"></span></span>
      <div style="clear:both;"></div>
    </div>
  </div>

  <div class="title-row">
    <div class="logo-cell">${logoImg}</div>
    <div class="text-cell">
      <h1 class="doc-title">${title}</h1>
      <div class="doc-subtitle">${reportLabel} • ${orgName}</div>
    </div>
    <div class="logo-cell"></div>
  </div>

  <div class="meta-bar">
    <span><b>${dateLabel}:</b> ${dateStr} ${timeStr}</span>
    <span><b>${recordsLabel}:</b> ${data.length}</span>
  </div>

  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>
</div>
</body>
</html>`;
  }, [isRTL, logoUrl]);

  const downloadWordHtml = useCallback((html: string, title: string, fileName?: string) => {
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const downloadName = `${fileName || title}_${new Date().toISOString().slice(0, 10)}.doc`;
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  }, []);

  const exportToWord = useCallback(async (opts: ReportExportOptions) => {
    if (!opts.data.length) {
      toast({ title: t('reports.noData') || 'No data to export', variant: 'destructive' });
      return;
    }
    const html = await buildWordHtml(opts);
    downloadWordHtml(html, opts.title, opts.fileName);
    toast({ title: t('reports.exportSuccess') || 'Export completed successfully' });
  }, [buildWordHtml, downloadWordHtml, t]);

  const previewWordExport = useCallback(async (opts: ReportExportOptions): Promise<string | null> => {
    if (!opts.data.length) {
      toast({ title: t('reports.noData') || 'No data to export', variant: 'destructive' });
      return null;
    }
    return await buildWordHtml(opts);
  }, [buildWordHtml, t]);


  const exportToPDF = useCallback(({ title, data, columns, fileName }: ReportExportOptions) => {
    if (!data.length) {
      toast({ title: t('reports.noData') || 'No data to export', variant: 'destructive' });
      return;
    }

    const tableRows = data.map(row =>
      `<tr>${columns.map(col => `<td>${String(row[col.key] ?? '')}</td>`).join('')}</tr>`
    ).join('');

    const container = createExportContainer(`
      <div style="font-family: 'Baloo Bhaijaan 2', 'Cairo', sans-serif; padding: 30px; direction: ${isRTL ? 'rtl' : 'ltr'}; background: white;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
          <img src="${logoUrl}" style="height:60px;width:auto;" crossorigin="anonymous" />
          <div style="flex:1;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#1f2937;">${title}</div>
            <p style="color:#6b7280;margin:4px 0 0;font-size:13px;">${new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead><tr>${columns.map(c => `<th style="background-color:#1e40af;color:white;font-weight:600;font-size:12px;padding:10px 12px;border:1px solid #1e3a8a;text-align:${isRTL ? 'right' : 'left'};">${c.header}</th>`).join('')}</tr></thead>
          <tbody>${tableRows.replace(/<td>/g, `<td style="border:1px solid #d1d5db;padding:10px 12px;font-size:12px;text-align:${isRTL ? 'right' : 'left'};">`)}</tbody>
        </table>
        <p style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 11px;">${t('reports.generatedBy') || 'Generated by HR System'}</p>
      </div>
    `);

    const isLandscape = columns.length > 6;
    const downloadName = `${fileName || title}_${new Date().toISOString().slice(0, 10)}.pdf`;

    waitForImages(container).then(() => {
      html2pdf().set({
        margin: 10,
        filename: downloadName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' },
      }).from(container).save().then(() => {
        document.body.removeChild(container);
      }).catch(() => {
        document.body.removeChild(container);
      });
    });

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

    const container = createExportContainer(`
      <div style="font-family: 'Baloo Bhaijaan 2', 'Cairo', sans-serif; padding: 30px; direction: ${dir}; background: white;">
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
    `);

    const isLandscape = columns.length > 6;
    const downloadName = `${fileName || `${titleEn}_${titleAr}`}_${new Date().toISOString().slice(0, 10)}.pdf`;

    waitForImages(container).then(() => {
      html2pdf().set({
        margin: 10,
        filename: downloadName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' },
      }).from(container).save().then(() => {
        document.body.removeChild(container);
      }).catch(() => {
        document.body.removeChild(container);
      });
    });

    toast({ title: t('reports.exportSuccess') || 'Export completed successfully' });
  }, [isRTL, t]);

  return { reportRef, handlePrint, exportToCSV, exportToPDF, exportToWord, previewWordExport, downloadWordHtml, exportBilingualCSV, exportBilingualPDF };
};
