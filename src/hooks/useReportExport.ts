import { useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 120);
}

function createExportContainer(html: string): HTMLDivElement {
  // Off-screen wrapper so it never visually flashes and isn't affected by app layout
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-export-root', 'true');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '-10000px';
  wrapper.style.width = '1200px';
  wrapper.style.background = '#ffffff';
  wrapper.style.zIndex = '-1';
  wrapper.style.pointerEvents = 'none';
  // Force safe color space so html2canvas (which can't parse oklch/lab) doesn't bail out
  wrapper.style.colorScheme = 'light';
  wrapper.style.color = '#111827';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  return wrapper;
}

function waitForImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) return Promise.resolve();

  return Promise.all(images.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => resolve();
      img.onload = done;
      img.onerror = () => {
        // Hide broken image so html2canvas doesn't choke
        img.style.display = 'none';
        resolve();
      };
      // Safety timeout — never block PDF on a slow logo
      setTimeout(done, 4000);
    });
  })).then(() => undefined);
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function downloadElementAsPDF(container: HTMLElement, downloadName: string, isLandscape: boolean): Promise<void> {
  await waitForImages(container);
  if ('fonts' in document) {
    try { await (document as any).fonts.ready; } catch { /* ignore */ }
  }

  // Give the browser a tick to paint
  await new Promise((r) => setTimeout(r, 50));

  const target = (container.firstElementChild as HTMLElement) || container;
  const width = Math.max(target.scrollWidth, target.offsetWidth, 1200);
  const height = Math.max(target.scrollHeight, target.offsetHeight, 1);

  const canvas = await html2canvas(target, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
    imageTimeout: 5000,
    onclone: (clonedDoc) => {
      // Strip any modern color functions (oklch/lab/color()) that html2canvas can't parse
      const root = clonedDoc.querySelector('[data-export-root]') as HTMLElement | null;
      if (root) {
        root.style.position = 'static';
        root.style.left = '0';
        root.style.top = '0';
      }
    },
  });

  if (!canvas.width || !canvas.height) {
    throw new Error('PDF canvas is empty');
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pageBodyHeight = pageHeight - margin * 2;
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  if (imgHeight <= pageBodyHeight) {
    pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
  } else {
    let pageIndex = 0;
    let heightLeft = imgHeight;
    while (heightLeft > 0) {
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, margin - pageIndex * pageBodyHeight, imgWidth, imgHeight);
      heightLeft -= pageBodyHeight;
      pageIndex += 1;
    }
  }

  pdf.save(downloadName);
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


  const exportToPDF = useCallback(async ({ title, data, columns, fileName }: ReportExportOptions) => {
    if (!data.length) {
      toast({ title: t('reports.noData') || 'No data to export', variant: 'destructive' });
      return;
    }

    const tableRows = data.map(row =>
      `<tr>${columns.map(col => `<td>${escapeHtml(row[col.key])}</td>`).join('')}</tr>`
    ).join('');

    const logoData = await loadImageAsDataUrl(logoUrl);
    const logoTag = logoData
      ? `<img src="${logoData}" style="height:60px;width:auto;" />`
      : '';

    const container = createExportContainer(`
      <div style="font-family: 'Baloo Bhaijaan 2', 'Cairo', Arial, sans-serif; padding: 30px; direction: ${isRTL ? 'rtl' : 'ltr'}; background: #ffffff; color: #111827;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
          ${logoTag}
          <div style="flex:1;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#111827;">${escapeHtml(title)}</div>
            <p style="color:#6b7280;margin:4px 0 0;font-size:13px;">${new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead><tr>${columns.map(c => `<th style="background-color:#1e40af;color:#ffffff;font-weight:600;font-size:12px;padding:10px 12px;border:1px solid #1e3a8a;text-align:${isRTL ? 'right' : 'left'};">${escapeHtml(c.header)}</th>`).join('')}</tr></thead>
          <tbody>${tableRows.replace(/<td>/g, `<td style="border:1px solid #d1d5db;padding:10px 12px;font-size:12px;text-align:${isRTL ? 'right' : 'left'};color:#1f2937;">`)}</tbody>
        </table>
        <p style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 11px;">${t('reports.generatedBy') || 'Generated by HR System'}</p>
      </div>
    `);

    const isLandscape = columns.length > 6;
    const downloadName = `${sanitizeFileName(fileName || title)}_${new Date().toISOString().slice(0, 10)}.pdf`;

    try {
      await downloadElementAsPDF(container, downloadName, isLandscape);
      toast({ title: t('reports.exportSuccess') || 'Export completed successfully' });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({ title: t('reports.exportError') || 'Failed to export PDF', variant: 'destructive' });
    } finally {
      document.body.removeChild(container);
    }
  }, [isRTL, logoUrl, t]);

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
  const exportBilingualPDF = useCallback(async ({ titleAr, titleEn, data, columns, fileName, summaryCards }: BilingualExportOptions) => {
    if (!data.length) {
      toast({ title: t('reports.noData') || 'No data to export', variant: 'destructive' });
      return;
    }

    const dir = isRTL ? 'rtl' : 'ltr';

    const tableRows = data.map(row =>
      `<tr>${columns.map(col => `<td style="border:1px solid #d1d5db;padding:8px 10px;font-size:12px;text-align:center;">${escapeHtml(row[col.key])}</td>`).join('')}</tr>`
    ).join('');

    const cardsHtml = buildSummaryCardsHtml(summaryCards || []);

    const logoData = await loadImageAsDataUrl(logoUrl);
    const logoTag = logoData
      ? `<img src="${logoData}" style="height:60px;width:auto;" />`
      : '';

    const container = createExportContainer(`
      <div style="font-family: 'Baloo Bhaijaan 2', 'Cairo', Arial, sans-serif; padding: 30px; direction: ${dir}; background: #ffffff; color: #111827;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
          ${logoTag}
          <div style="flex:1;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:#1e40af;direction:rtl;">${escapeHtml(titleAr)}</div>
            <div style="font-size:18px;font-weight:600;color:#374151;direction:ltr;">${escapeHtml(titleEn)}</div>
          </div>
        </div>
        <p style="text-align:center;color:#6b7280;margin-bottom:24px;font-size:13px;">${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })} — ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        ${cardsHtml}
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>${columns.map(c => `<th style="background-color:#1e40af;color:#ffffff;font-weight:600;font-size:11px;padding:6px 8px;border:1px solid #1e3a8a;text-align:center;"><div style="direction:rtl;">${escapeHtml(c.headerAr)}</div><div style="font-weight:400;font-size:10px;color:#dbeafe;">${escapeHtml(c.headerEn)}</div></th>`).join('')}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <p style="text-align:center;margin-top:30px;color:#9ca3af;font-size:11px;">تم إنشاء التقرير بواسطة نظام إدارة الموارد البشرية — Generated by HR Management System</p>
      </div>
    `);

    const isLandscape = columns.length > 6;
    const downloadName = `${sanitizeFileName(fileName || `${titleEn}_${titleAr}`)}_${new Date().toISOString().slice(0, 10)}.pdf`;

    try {
      await downloadElementAsPDF(container, downloadName, isLandscape);
      toast({ title: t('reports.exportSuccess') || 'Export completed successfully' });
    } catch (error) {
      console.error('Bilingual PDF export failed:', error);
      toast({ title: t('reports.exportError') || 'Failed to export PDF', variant: 'destructive' });
    } finally {
      document.body.removeChild(container);
    }
  }, [isRTL, logoUrl, t]);

  return { reportRef, handlePrint, exportToCSV, exportToPDF, exportToWord, previewWordExport, downloadWordHtml, exportBilingualCSV, exportBilingualPDF };
};
