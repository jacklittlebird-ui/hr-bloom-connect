import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PdfColumn {
  header: string;
  key: string;
  width?: string;
}

interface MetaItem {
  label: string;
  value: string;
}

interface ExportOptions {
  titleAr: string;
  subtitleAr?: string;
  meta?: MetaItem[];
  columns: PdfColumn[];
  rows: Record<string, unknown>[];
  fileName: string;
  signatureLabels?: string[]; // names under signature lines
  orientation?: 'portrait' | 'landscape';
}

const escapeHtml = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

async function loadLogo(): Promise<string> {
  const url = `${window.location.origin}/images/company-logo.png`;
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return '';
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

function buildHtml(opts: ExportOptions, logoDataUrl: string): string {
  const dateStr = new Date().toLocaleDateString('ar-EG');
  const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false });

  const headerCells = opts.columns
    .map(
      (c) =>
        `<th style="background:#1e3a8a;color:#fff;padding:6px 8px;border:1px solid #94a3b8;font-size:11px;text-align:center;font-weight:700;${c.width ? `width:${c.width};` : ''}">${escapeHtml(c.header)}</th>`,
    )
    .join('');

  const bodyRows =
    opts.rows.length === 0
      ? `<tr><td colspan="${opts.columns.length}" style="padding:24px;text-align:center;color:#64748b;font-size:12px;border:1px solid #cbd5e1;">لا توجد بيانات للعرض</td></tr>`
      : opts.rows
          .map((row, i) => {
            const bg = i % 2 === 0 ? '#ffffff' : '#f1f5f9';
            const cells = opts.columns
              .map(
                (c) =>
                  `<td style="padding:5px 7px;border:1px solid #cbd5e1;font-size:10.5px;text-align:right;vertical-align:middle;">${escapeHtml(row[c.key])}</td>`,
              )
              .join('');
            return `<tr style="background:${bg};">${cells}</tr>`;
          })
          .join('');

  const metaHtml = (opts.meta || [])
    .map(
      (m) =>
        `<div style="display:inline-block;margin-left:18px;font-size:11px;color:#334155;"><b style="color:#1e3a8a;">${escapeHtml(m.label)}:</b> ${escapeHtml(m.value)}</div>`,
    )
    .join('');

  const signers = opts.signatureLabels && opts.signatureLabels.length > 0 ? opts.signatureLabels : ['مدير الأسطول', 'الإدارة المالية', 'المدير العام'];
  const signatureHtml = signers
    .map(
      (label) => `
      <div style="flex:1;text-align:center;padding:0 10px;">
        <div style="border-top:1.5px solid #1f2937;margin-top:48px;padding-top:6px;font-size:11px;color:#1f2937;font-weight:600;">${escapeHtml(label)}</div>
        <div style="font-size:9px;color:#64748b;margin-top:2px;">التوقيع والختم</div>
      </div>`,
    )
    .join('');

  const logoImg = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="logo" style="height:60px;width:auto;" />`
    : `<div style="height:60px;width:60px;border-radius:50%;background:#1e3a8a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">HR</div>`;

  return `
  <div dir="rtl" style="font-family:'Baloo Bhaijaan 2','Cairo','Tahoma',sans-serif;background:#fff;color:#0f172a;padding:18px 22px;width:1100px;box-sizing:border-box;">
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px double #1e3a8a;padding-bottom:10px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:14px;">
        ${logoImg}
        <div>
          <div style="font-size:13px;color:#475569;font-weight:600;">إدارة الموارد البشرية - قسم السيارات</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Fleet Management Department</div>
        </div>
      </div>
      <div style="text-align:left;font-size:10px;color:#64748b;">
        <div>تاريخ الإصدار: <b style="color:#1e3a8a;">${dateStr}</b></div>
        <div>الوقت: <b style="color:#1e3a8a;">${timeStr}</b></div>
      </div>
    </div>

    <!-- Title -->
    <div style="text-align:center;margin-bottom:12px;">
      <h1 style="font-size:20px;color:#1e3a8a;margin:0;font-weight:700;">${escapeHtml(opts.titleAr)}</h1>
      ${opts.subtitleAr ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">${escapeHtml(opts.subtitleAr)}</div>` : ''}
    </div>

    <!-- Meta bar -->
    ${metaHtml ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;margin-bottom:12px;">${metaHtml}<span style="float:left;font-size:11px;color:#64748b;">عدد السجلات: <b style="color:#1e3a8a;">${opts.rows.length}</b></span></div>` : ''}

    <!-- Table -->
    <table style="width:100%;border-collapse:collapse;table-layout:auto;">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>

    <!-- Signatures -->
    <div style="display:flex;justify-content:space-between;margin-top:60px;page-break-inside:avoid;">
      ${signatureHtml}
    </div>

    <!-- Footer -->
    <div style="margin-top:30px;border-top:1px solid #e2e8f0;padding-top:6px;font-size:9px;color:#94a3b8;text-align:center;">
      مستند سري - للاستخدام الداخلي فقط · تم الإنشاء بواسطة نظام الموارد البشرية
    </div>
  </div>`;
}

export async function exportVehiclePdf(opts: ExportOptions): Promise<void> {
  const logoDataUrl = await loadLogo();
  const html = buildHtml(opts, logoDataUrl);

  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-vehicle-pdf', 'true');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '-10000px';
  wrapper.style.background = '#ffffff';
  wrapper.style.zIndex = '-1';
  wrapper.style.colorScheme = 'light';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  try {
    if ('fonts' in document) {
      try { await (document as any).fonts.ready; } catch { /* ignore */ }
    }
    await new Promise((r) => setTimeout(r, 60));

    const target = wrapper.firstElementChild as HTMLElement;
    const width = Math.max(target.scrollWidth, 1100);
    const height = Math.max(target.scrollHeight, 1);

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
    });

    const orientation = opts.orientation || 'landscape';
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation, compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const footerH = 8;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageBodyH = pageHeight - margin * 2 - footerH;
    const imgData = canvas.toDataURL('image/jpeg', 0.94);

    if (imgHeight <= pageBodyH) {
      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
    } else {
      let pageIndex = 0;
      let heightLeft = imgHeight;
      while (heightLeft > 0) {
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, margin - pageIndex * pageBodyH, imgWidth, imgHeight);
        heightLeft -= pageBodyH;
        pageIndex += 1;
      }
    }

    // Footer page numbers
    const total = pdf.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      pdf.setPage(p);
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.2);
      pdf.line(margin, pageHeight - footerH + 1, pageWidth - margin, pageHeight - footerH + 1);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`${p} / ${total}`, pageWidth / 2, pageHeight - 3, { align: 'center' });
    }

    pdf.save(opts.fileName);
  } finally {
    document.body.removeChild(wrapper);
  }
}
