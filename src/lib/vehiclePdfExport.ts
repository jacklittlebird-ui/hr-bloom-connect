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
  signatureLabels?: string[];
  orientation?: 'portrait' | 'landscape';
}

const PAGE_BG_WIDTH_PX = 1100; // off-screen render width

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

/* ──────────────────────────── HTML builders ──────────────────────────── */

function buildHeaderHtml(opts: ExportOptions, logoDataUrl: string): string {
  const dateStr = new Date().toLocaleDateString('ar-EG');
  const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: false });

  const metaHtml = (opts.meta || [])
    .map(
      (m) =>
        `<div style="display:inline-block;margin-left:18px;font-size:11px;color:#334155;"><b style="color:#1e3a8a;">${escapeHtml(m.label)}:</b> ${escapeHtml(m.value)}</div>`,
    )
    .join('');

  const logoImg = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="logo" style="height:60px;width:auto;" />`
    : `<div style="height:60px;width:60px;border-radius:50%;background:#1e3a8a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">HR</div>`;

  return `
  <div dir="rtl" style="font-family:'Baloo Bhaijaan 2','Cairo','Tahoma',sans-serif;background:#fff;color:#0f172a;padding:18px 22px 0;width:${PAGE_BG_WIDTH_PX}px;box-sizing:border-box;">
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
    <div style="text-align:center;margin-bottom:12px;">
      <h1 style="font-size:20px;color:#1e3a8a;margin:0;font-weight:700;">${escapeHtml(opts.titleAr)}</h1>
      ${opts.subtitleAr ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">${escapeHtml(opts.subtitleAr)}</div>` : ''}
    </div>
    ${metaHtml ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px;margin-bottom:12px;">${metaHtml}<span style="float:left;font-size:11px;color:#64748b;">عدد السجلات: <b style="color:#1e3a8a;">${opts.rows.length}</b></span></div>` : ''}
  </div>`;
}

function buildTableHtml(columns: PdfColumn[], rowsHtml: string, withRoundedTop: boolean): string {
  const headerCells = columns
    .map(
      (c) =>
        `<th style="background:#1e3a8a;color:#fff;padding:6px 8px;border:1px solid #94a3b8;font-size:11px;text-align:center;font-weight:700;${c.width ? `width:${c.width};` : ''}">${escapeHtml(c.header)}</th>`,
    )
    .join('');

  return `
  <div dir="rtl" style="font-family:'Baloo Bhaijaan 2','Cairo','Tahoma',sans-serif;background:#fff;color:#0f172a;padding:0 22px;width:${PAGE_BG_WIDTH_PX}px;box-sizing:border-box;">
    <table style="width:100%;border-collapse:collapse;table-layout:auto;${withRoundedTop ? '' : ''}">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>`;
}

function buildRowHtml(row: Record<string, unknown>, columns: PdfColumn[], i: number): string {
  const bg = i % 2 === 0 ? '#ffffff' : '#f1f5f9';
  const cells = columns
    .map(
      (c) =>
        `<td style="padding:5px 7px;border:1px solid #cbd5e1;font-size:10.5px;text-align:right;vertical-align:middle;">${escapeHtml(row[c.key])}</td>`,
    )
    .join('');
  return `<tr style="background:${bg};">${cells}</tr>`;
}

function buildSignatureHtml(opts: ExportOptions): string {
  const signers =
    opts.signatureLabels && opts.signatureLabels.length > 0
      ? opts.signatureLabels
      : ['مدير الأسطول', 'الإدارة المالية', 'المدير العام'];
  const signatureHtml = signers
    .map(
      (label) => `
      <div style="flex:1;text-align:center;padding:0 10px;">
        <div style="border-top:1.5px solid #1f2937;margin-top:48px;padding-top:6px;font-size:11px;color:#1f2937;font-weight:600;">${escapeHtml(label)}</div>
        <div style="font-size:9px;color:#64748b;margin-top:2px;">التوقيع والختم</div>
      </div>`,
    )
    .join('');

  return `
  <div dir="rtl" style="font-family:'Baloo Bhaijaan 2','Cairo','Tahoma',sans-serif;background:#fff;color:#0f172a;padding:0 22px 18px;width:${PAGE_BG_WIDTH_PX}px;box-sizing:border-box;">
    <div style="display:flex;justify-content:space-between;margin-top:30px;">
      ${signatureHtml}
    </div>
    <div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:6px;font-size:9px;color:#94a3b8;text-align:center;">
      مستند سري - للاستخدام الداخلي فقط · تم الإنشاء بواسطة نظام الموارد البشرية
    </div>
  </div>`;
}

/* ──────────────────────────── Render helpers ──────────────────────────── */

/**
 * Shared off-screen staging element. We create ONE wrapper for the whole
 * export operation and reuse it for every measurement and canvas render.
 * This eliminates the cost of repeated DOM attach/detach + style recompute.
 */
function createStage(): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '-10000px';
  wrapper.style.background = '#ffffff';
  wrapper.style.zIndex = '-1';
  wrapper.style.colorScheme = 'light';
  wrapper.style.contain = 'layout style';
  document.body.appendChild(wrapper);
  return wrapper;
}

let fontsReadyPromise: Promise<void> | null = null;
function ensureFontsReady(): Promise<void> {
  if (fontsReadyPromise) return fontsReadyPromise;
  fontsReadyPromise = (async () => {
    if ('fonts' in document) {
      try { await (document as any).fonts.ready; } catch { /* ignore */ }
    }
  })();
  return fontsReadyPromise;
}

/** Wait for one paint frame — cheaper and more deterministic than setTimeout. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/**
 * Render arbitrary HTML into a canvas using the SHARED stage.
 * Caller owns the stage's lifecycle.
 */
async function htmlToCanvasOnStage(stage: HTMLDivElement, html: string): Promise<HTMLCanvasElement> {
  stage.innerHTML = html;
  await nextFrame();
  const target = stage.firstElementChild as HTMLElement;
  const width = Math.max(target.scrollWidth, PAGE_BG_WIDTH_PX);
  const height = Math.max(target.scrollHeight, 1);
  return html2canvas(target, {
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
}

/**
 * Measure header + each row height (in PDF mm) in a SINGLE render pass.
 * Uses offsetHeight (cheap, batched) instead of getBoundingClientRect per row,
 * and reads all measurements within one rAF to avoid layout thrashing.
 */
async function measureRowHeightsOnStage(
  stage: HTMLDivElement,
  columns: PdfColumn[],
  rows: Record<string, unknown>[],
  pdfWidthMm: number,
): Promise<{ headerMm: number; rowsMm: number[] }> {
  // Build rows HTML in chunks to avoid a huge single concat for very large datasets
  const parts: string[] = new Array(rows.length);
  for (let i = 0; i < rows.length; i++) parts[i] = buildRowHtml(rows[i], columns, i);
  const html = buildTableHtml(columns, parts.join(''), true);

  stage.innerHTML = html;
  await nextFrame();

  const table = stage.querySelector('table') as HTMLTableElement;
  // Force layout once, then read every height without intermediate writes
  const containerWidthPx = table.offsetWidth || PAGE_BG_WIDTH_PX;
  const pxToMm = pdfWidthMm / containerWidthPx;

  const headerEl = table.tHead?.rows[0] as HTMLElement;
  const headerMm = headerEl.offsetHeight * pxToMm;

  const tbodyRows = table.tBodies[0]?.rows;
  const rowsMm: number[] = new Array(tbodyRows?.length || 0);
  if (tbodyRows) {
    for (let i = 0; i < tbodyRows.length; i++) {
      rowsMm[i] = (tbodyRows[i] as HTMLElement).offsetHeight * pxToMm;
    }
  }

  return { headerMm, rowsMm };
}

/**
 * Add a canvas image onto the current PDF page at (x, y) using table-aware width.
 */
function placeCanvas(pdf: jsPDF, canvas: HTMLCanvasElement, x: number, y: number, widthMm: number): number {
  const heightMm = (canvas.height * widthMm) / canvas.width;
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', x, y, widthMm, heightMm);
  return heightMm;
}

/* ──────────────────────────── Main export ──────────────────────────── */

export async function exportVehiclePdf(opts: ExportOptions): Promise<void> {
  const logoDataUrl = await loadLogo();
  const orientation = opts.orientation || 'landscape';
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation, compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const footerH = 8;
  const contentW = pageW - margin * 2;
  const usableH = pageH - margin * 2 - footerH;

  // 1) Render header (top of first page)
  const headerCanvas = await htmlToCanvas(buildHeaderHtml(opts, logoDataUrl));
  const headerHmm = (headerCanvas.height * contentW) / headerCanvas.width;

  // 2) Render signatures (bottom of last page)
  const signatureCanvas = await htmlToCanvas(buildSignatureHtml(opts));
  const signatureHmm = (signatureCanvas.height * contentW) / signatureCanvas.width;

  // 3) Edge-case: empty table — single page with header + "no data" + signatures
  if (opts.rows.length === 0) {
    let y = margin;
    y += placeCanvas(pdf, headerCanvas, margin, y, contentW);
    const emptyCanvas = await htmlToCanvas(
      buildTableHtml(opts.columns, `<tr><td colspan="${opts.columns.length}" style="padding:24px;text-align:center;color:#64748b;font-size:12px;border:1px solid #cbd5e1;">لا توجد بيانات للعرض</td></tr>`, true),
    );
    y += placeCanvas(pdf, emptyCanvas, margin, y, contentW);
    placeCanvas(pdf, signatureCanvas, margin, y + 2, contentW);
    drawFooter(pdf, pageW, pageH, footerH, margin);
    pdf.save(opts.fileName);
    return;
  }

  // 4) Measure row heights
  const { headerMm: tableHeaderMm, rowsMm } = await measureRowHeights(opts.columns, opts.rows, contentW);

  // 5) Pack rows into pages
  // Page 1 reserves: header banner. Last page reserves: signatures.
  // Each page reserves: table header (repeated).
  const pages: number[][] = []; // array of row indices per page
  let current: number[] = [];
  let used = 0;
  const SAFETY = 1.5; // mm safety per row to compensate measurement rounding

  const reserveTop = (pageIndex: number) => (pageIndex === 0 ? headerHmm + 2 : 0) + tableHeaderMm;

  for (let i = 0; i < rowsMm.length; i++) {
    const isLastRow = i === rowsMm.length - 1;
    const pageIndex = pages.length; // index of the page we're filling
    const top = reserveTop(pageIndex);
    const remaining = usableH - top - used;
    const rowH = rowsMm[i] + SAFETY;
    // If this row is the last one in the dataset, it must also fit the signatures
    const needed = rowH + (isLastRow ? signatureHmm + 4 : 0);

    if (rowH > usableH - top) {
      // Pathological tall row — place it alone on its own page
      if (current.length > 0) { pages.push(current); current = []; used = 0; }
      pages.push([i]);
      continue;
    }

    if (needed <= remaining) {
      current.push(i);
      used += rowH;
    } else {
      // Push current page and try this row on a fresh page
      if (current.length > 0) { pages.push(current); current = []; used = 0; }
      const freshTop = reserveTop(pages.length);
      const freshRemaining = usableH - freshTop;
      if (needed <= freshRemaining) {
        current.push(i);
        used = rowH;
      } else {
        // Even alone the row + signature don't fit → put row alone, signature spills
        current.push(i);
        used = rowH;
      }
    }
  }
  if (current.length > 0) pages.push(current);

  // Determine if signature fits on last page; else add an extra page
  const lastPageIdx = pages.length - 1;
  const lastPageRowsHeight = pages[lastPageIdx].reduce((s, idx) => s + rowsMm[idx] + SAFETY, 0);
  const lastPageTop = reserveTop(lastPageIdx);
  const lastPageRemaining = usableH - lastPageTop - lastPageRowsHeight;
  const signatureOnSeparatePage = signatureHmm + 4 > lastPageRemaining;

  // 6) Render each page: header (page 1), table (header + chunk rows), signatures (last page)
  for (let p = 0; p < pages.length; p++) {
    if (p > 0) pdf.addPage();
    let y = margin;

    if (p === 0) {
      y += placeCanvas(pdf, headerCanvas, margin, y, contentW);
      y += 2;
    }

    // Render this page's table chunk (header + its rows)
    const chunkRowsHtml = pages[p].map((idx) => buildRowHtml(opts.rows[idx], opts.columns, idx)).join('');
    const tableCanvas = await htmlToCanvas(buildTableHtml(opts.columns, chunkRowsHtml, true));
    const tableHmm = placeCanvas(pdf, tableCanvas, margin, y, contentW);
    y += tableHmm;

    if (p === lastPageIdx && !signatureOnSeparatePage) {
      placeCanvas(pdf, signatureCanvas, margin, y + 2, contentW);
    }
  }

  if (signatureOnSeparatePage) {
    pdf.addPage();
    placeCanvas(pdf, signatureCanvas, margin, margin, contentW);
  }

  drawFooter(pdf, pageW, pageH, footerH, margin);
  pdf.save(opts.fileName);
}

function drawFooter(pdf: jsPDF, pageW: number, pageH: number, footerH: number, margin: number) {
  const total = pdf.getNumberOfPages();
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const dateStr = `${dd}/${mm}/${yyyy} ${hh}:${mi}`;

  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(0.2);
    pdf.line(margin, pageH - footerH + 1, pageW - margin, pageH - footerH + 1);
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    // RTL footer: page on the left, date on the right
    pdf.text(`Page ${p} / ${total}`, margin, pageH - 3);
    pdf.text(dateStr, pageW - margin, pageH - 3, { align: 'right' });
  }
}
