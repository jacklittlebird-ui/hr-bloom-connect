import JSZip from 'jszip';

export interface LetterRow {
  name: string;
  jobTitle: string;
}

const TEMPLATE_URL = '/templates/port-authority-renewal.docx';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const runXml = (text: string) =>
  `<w:r><w:rPr><w:rFonts w:ascii="Baloo Bhaijaan 2" w:hAnsi="Baloo Bhaijaan 2" w:cs="Baloo Bhaijaan 2" w:hint="cs"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="18"/><w:szCs w:val="18"/><w:rtl/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;

/** Inserts a run into the paragraph of the nth table cell (0-based) of a row. */
function fillCell(rowXml: string, cellIndex: number, text: string): string {
  const parts = rowXml.split('</w:tc>');
  if (cellIndex >= parts.length - 1 || !text) return rowXml;
  const idx = parts[cellIndex].lastIndexOf('</w:p>');
  if (idx === -1) return rowXml;
  parts[cellIndex] = parts[cellIndex].slice(0, idx) + runXml(text) + parts[cellIndex].slice(idx);
  return parts.join('</w:tc>');
}

export async function exportPortAuthorityRenewalLetter(
  rows: LetterRow[],
  year: string,
  dateText: string,
  fileName = `خطاب_تجديد_${year}.docx`,
) {
  const res = await fetch(TEMPLATE_URL);
  if (!res.ok) throw new Error('template not found');
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  let xml = await zip.file('word/document.xml')!.async('string');

  // Placeholders in the header text
  xml = xml
    .replace('(يتم كتابة التاريخ)', esc(dateText))
    .replace('(يتم كتابة الرقم)', '')
    .replace('إجمالي العدد', String(rows.length))
    .replace('(يتم اختيار السنة)', esc(year));

  // Rebuild table body rows from the template rows
  const tblStart = xml.indexOf('<w:tbl>');
  const tblEnd = xml.indexOf('</w:tbl>') + '</w:tbl>'.length;
  const tbl = xml.slice(tblStart, tblEnd);
  const trMatches = tbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
  if (trMatches.length >= 3) {
    const firstTemplate = trMatches[1];
    const restTemplate = trMatches[2];
    const built = rows
      .map((r, i) => {
        let row = i === 0 ? firstTemplate : restTemplate;
        row = fillCell(row, 1, r.name);
        row = fillCell(row, 2, r.jobTitle);
        return row;
      })
      .join('');
    const bodyStart = tbl.indexOf(trMatches[1]);
    const bodyEnd = tbl.lastIndexOf(restTemplate) + restTemplate.length;
    const newTbl = tbl.slice(0, bodyStart) + built + tbl.slice(bodyEnd);
    xml = xml.slice(0, tblStart) + newTbl + xml.slice(tblEnd);
  }

  zip.file('word/document.xml', xml);
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const CAIRO_TEMPLATE_URL = '/templates/security-cairo-renewal.docx';

/** خطاب تجديد تصاريح مطار القاهرة (قطاع الأمن) */
export async function exportSecurityCairoRenewalLetter(
  rows: LetterRow[],
  year: string,
  dateText: string,
  fileName = `خطاب_تجديد_تصاريح_القاهرة_${year}.docx`,
) {
  const res = await fetch(CAIRO_TEMPLATE_URL);
  if (!res.ok) throw new Error('template not found');
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  let xml = await zip.file('word/document.xml')!.async('string');

  xml = xml
    .replace('(يتم كتابة التاريخ)', esc(dateText))
    .replace('(يتم كتابة الرقم)', '')
    .replace('إجمالي العدد', String(rows.length))
    .replace('(يتم اختيار سنة لاحقة للسنة الحالية)', 'يتم اختيار سنة لاحقة للسنة الحالية)');

  const tblStart = xml.indexOf('<w:tbl>');
  const tblEnd = xml.indexOf('</w:tbl>') + '</w:tbl>'.length;
  const tbl = xml.slice(tblStart, tblEnd);
  const trMatches = tbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
  if (trMatches.length >= 3) {
    const firstTemplate = trMatches[1];
    const restTemplate = trMatches[2];
    const built = rows
      .map((r, i) => {
        let row = i === 0 ? firstTemplate : restTemplate;
        // عمود «م» مرقّم تلقائيًا في القالب (قائمة Word) — لا ندرج الرقم يدويًا
        row = fillCell(row, 1, r.name);
        row = fillCell(row, 2, r.jobTitle);
        return row;
      })
      .join('');
    const bodyStart = tbl.indexOf(trMatches[1]);
    const bodyEnd = tbl.lastIndexOf(restTemplate) + restTemplate.length;
    const newTbl = tbl.slice(0, bodyStart) + built + tbl.slice(bodyEnd);
    xml = xml.slice(0, tblStart) + newTbl + xml.slice(tblEnd);
  }

  zip.file('word/document.xml', xml);
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const PORT_ISSUE_TEMPLATE_URL = '/templates/port-authority-issue.docx';

/** خطاب استخراج تصاريح هيئة ميناء القاهرة */
export async function exportPortAuthorityIssueLetter(
  rows: LetterRow[],
  year: string,
  dateText: string,
  fileName = `خطاب_استخراج_ميناء_القاهرة_${year}.docx`,
) {
  const res = await fetch(PORT_ISSUE_TEMPLATE_URL);
  if (!res.ok) throw new Error('template not found');
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  let xml = await zip.file('word/document.xml')!.async('string');

  xml = xml
    .replace('(يتم كتابة التاريخ)', esc(dateText))
    .replace('(يتم كتابة الرقم)', '')
    .replace('إجمالي العدد', String(rows.length))
    .replace('(يتم اختيار سنة', `(${esc(year)}`)
    .replace(' لاحقة للسنة الحالية', '');

  const tblStart = xml.indexOf('<w:tbl>');
  const tblEnd = xml.indexOf('</w:tbl>') + '</w:tbl>'.length;
  const tbl = xml.slice(tblStart, tblEnd);
  const trMatches = tbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
  if (trMatches.length >= 3) {
    const firstTemplate = trMatches[1];
    const restTemplate = trMatches[2];
    const built = rows
      .map((r, i) => {
        let row = i === 0 ? firstTemplate : restTemplate;
        // عمود «م» غير مرقّم تلقائيًا في هذا القالب — ندرج الرقم يدويًا
        row = fillCell(row, 0, String(i + 1));
        row = fillCell(row, 1, r.name);
        row = fillCell(row, 2, r.jobTitle);
        return row;
      })
      .join('');
    const bodyStart = tbl.indexOf(trMatches[1]);
    const bodyEnd = tbl.lastIndexOf(restTemplate) + restTemplate.length;
    const newTbl = tbl.slice(0, bodyStart) + built + tbl.slice(bodyEnd);
    xml = xml.slice(0, tblStart) + newTbl + xml.slice(tblEnd);
  }

  zip.file('word/document.xml', xml);
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const CAIRO_ISSUE_TEMPLATE_URL = '/templates/security-cairo-issue.docx';

/** خطاب استخراج تصاريح مطار القاهرة (قطاع الأمن) */
export async function exportSecurityCairoIssueLetter(
  rows: LetterRow[],
  year: string,
  dateText: string,
  fileName = `خطاب_استخراج_تصاريح_القاهرة_${year}.docx`,
) {
  const res = await fetch(CAIRO_ISSUE_TEMPLATE_URL);
  if (!res.ok) throw new Error('template not found');
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  let xml = await zip.file('word/document.xml')!.async('string');

  xml = xml
    .replace('(يتم كتابة التاريخ)', esc(dateText))
    .replace('(يتم كتابة الرقم)', '')
    .replace('إجمالي العدد', String(rows.length))
    .replace('(يتم اختيار سنة', `(${esc(year)}`)
    .replace(' لاحقة للسنة الحالية', '');

  const tblStart = xml.indexOf('<w:tbl>');
  const tblEnd = xml.indexOf('</w:tbl>') + '</w:tbl>'.length;
  const tbl = xml.slice(tblStart, tblEnd);
  const trMatches = tbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
  if (trMatches.length >= 3) {
    const firstTemplate = trMatches[1];
    const restTemplate = trMatches[2];
    const built = rows
      .map((r, i) => {
        let row = i === 0 ? firstTemplate : restTemplate;
        // عمود «م» مرقّم تلقائيًا في القالب (قائمة Word) — لا ندرج الرقم يدويًا
        row = fillCell(row, 1, r.name);
        row = fillCell(row, 2, r.jobTitle);
        return row;
      })
      .join('');
    const bodyStart = tbl.indexOf(trMatches[1]);
    const bodyEnd = tbl.lastIndexOf(restTemplate) + restTemplate.length;
    const newTbl = tbl.slice(0, bodyStart) + built + tbl.slice(bodyEnd);
    xml = xml.slice(0, tblStart) + newTbl + xml.slice(tblEnd);
  }

  zip.file('word/document.xml', xml);
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const PORTS_SECURITY_ISSUE_TEMPLATE_URL = '/templates/ports-security-issue.docx';

/** خطاب استخراج تصاريح أمن المواني */
export async function exportPortsSecurityIssueLetter(
  rows: LetterRow[],
  year: string,
  dateText: string,
  purpose = 'إنهاء إجراءات الركاب',
  airports = 'عموم المطارات',
  fileName = `خطاب_استخراج_أمن_المواني_${year}.docx`,
) {
  const res = await fetch(PORTS_SECURITY_ISSUE_TEMPLATE_URL);
  if (!res.ok) throw new Error('template not found');
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  let xml = await zip.file('word/document.xml')!.async('string');

  xml = xml
    .replace('(يتم كتابة التاريخ)', esc(dateText))
    .replace('(يتم كتابة الرقم)', '')
    .replace('إجمالي العدد', String(rows.length))
    .replace('(يتم اختيار سنة', `(${esc(year)}`)
    .replace(' لاحقة للسنة الحالية', '');

  const tblStart = xml.indexOf('<w:tbl>');
  const tblEnd = xml.indexOf('</w:tbl>') + '</w:tbl>'.length;
  const tbl = xml.slice(tblStart, tblEnd);
  const trMatches = tbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
  if (trMatches.length >= 3) {
    const firstTemplate = trMatches[1];
    const restTemplate = trMatches[2];
    const built = rows
      .map((r, i) => {
        let row = i === 0 ? firstTemplate : restTemplate;
        // عمود «م» غير مرقّم تلقائيًا في هذا القالب — ندرج الرقم يدويًا
        row = fillCell(row, 0, String(i + 1));
        row = fillCell(row, 1, r.name);
        row = fillCell(row, 2, r.jobTitle);
        row = fillCell(row, 3, purpose);
        row = fillCell(row, 4, airports);
        return row;
      })
      .join('');
    const bodyStart = tbl.indexOf(trMatches[1]);
    const bodyEnd = tbl.lastIndexOf(restTemplate) + restTemplate.length;
    const newTbl = tbl.slice(0, bodyStart) + built + tbl.slice(bodyEnd);
    xml = xml.slice(0, tblStart) + newTbl + xml.slice(tblEnd);
  }

  zip.file('word/document.xml', xml);
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const AIRPORTS_ISSUE_TEMPLATE_URL = '/templates/security-airports-issue.docx';

/** خطاب استخراج تصاريح المطارات (قطاع الأمن) */
export async function exportSecurityAirportsIssueLetter(
  rows: LetterRow[],
  year: string,
  dateText: string,
  purpose = 'إنهاء إجراءات الركاب',
  airports = 'عموم المطارات',
  fileName = `خطاب_استخراج_تصاريح_المطارات_${year}.docx`,
) {
  const res = await fetch(AIRPORTS_ISSUE_TEMPLATE_URL);
  if (!res.ok) throw new Error('template not found');
  const zip = await JSZip.loadAsync(await res.arrayBuffer());
  let xml = await zip.file('word/document.xml')!.async('string');

  xml = xml
    .replace('(يتم كتابة التاريخ)', esc(dateText))
    .replace('(يتم كتابة الرقم)', '')
    .replace('إجمالي العدد', String(rows.length))
    .replace('(يتم اختيار سنة', `(${esc(year)}`)
    .replace(' لاحقة للسنة الحالية', '');

  const tblStart = xml.indexOf('<w:tbl>');
  const tblEnd = xml.indexOf('</w:tbl>') + '</w:tbl>'.length;
  const tbl = xml.slice(tblStart, tblEnd);
  const trMatches = tbl.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) || [];
  if (trMatches.length >= 3) {
    const firstTemplate = trMatches[1];
    const restTemplate = trMatches[2];
    const built = rows
      .map((r, i) => {
        let row = i === 0 ? firstTemplate : restTemplate;
        row = fillCell(row, 0, String(i + 1));
        row = fillCell(row, 1, r.name);
        row = fillCell(row, 2, r.jobTitle);
        row = fillCell(row, 3, purpose);
        row = fillCell(row, 4, airports);
        return row;
      })
      .join('');
    const bodyStart = tbl.indexOf(trMatches[1]);
    const bodyEnd = tbl.lastIndexOf(restTemplate) + restTemplate.length;
    const newTbl = tbl.slice(0, bodyStart) + built + tbl.slice(bodyEnd);
    xml = xml.slice(0, tblStart) + newTbl + xml.slice(tblEnd);
  }

  zip.file('word/document.xml', xml);
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
