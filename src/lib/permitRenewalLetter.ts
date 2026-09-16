import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  VerticalAlign,
} from 'docx';

export interface LetterRow {
  name: string;
  jobTitle: string;
}

const FONT = 'Arial';
const PURPOSE = 'إنهاء إجراءات الركاب والطائرات وترانزيت والبضائع';

const border = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };

const p = (
  text: string,
  opts: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number } = {}
) =>
  new Paragraph({
    bidirectional: true,
    alignment: opts.align ?? AlignmentType.RIGHT,
    spacing: { after: opts.after ?? 120, line: 340 },
    children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 26, font: FONT, rightToLeft: true })],
  });

const cell = (text: string, width: number, opts: { bold?: boolean; center?: boolean } = {}) =>
  new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        bidirectional: true,
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.RIGHT,
        spacing: { after: 0, line: 300 },
        children: [new TextRun({ text, bold: opts.bold, size: 24, font: FONT, rightToLeft: true })],
      }),
    ],
  });

const COLS = [900, 3400, 2660, 2400];

export async function exportPortAuthorityRenewalLetter(
  rows: LetterRow[],
  year: string,
  dateText: string,
  fileName = `خطاب_تجديد_${year}.docx`,
) {
  const table = new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: COLS,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          cell('م', COLS[0], { bold: true, center: true }),
          cell('الإسم', COLS[1], { bold: true, center: true }),
          cell('الوظيفة', COLS[2], { bold: true, center: true }),
          cell('الغرض من التصريح', COLS[3], { bold: true, center: true }),
        ],
      }),
      ...rows.map((r, i) =>
        new TableRow({
          children: [
            cell(String(i + 1), COLS[0], { center: true }),
            cell(r.name, COLS[1]),
            cell(r.jobTitle, COLS[2], { center: true }),
            cell(PURPOSE, COLS[3], { center: true }),
          ],
        }),
      ),
    ],
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 26 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1273, bottom: 1440, left: 1273 },
          },
        },
        children: [
          p(`التاريخ: ${dateText}`),
          p('الصادر: ............................', { after: 300 }),
          p('السيد اللواء/ مدير الإدارة العامة لشرطة ميناء القاهرة الجوى', { bold: true, after: 240 }),
          p('تحيــة طيبــة وبعــد،،،', { bold: true, after: 240 }),
          p(
            `رجاء التكرم بالموافقة على تجديد عدد (${rows.length}) تصريح سنوي مستديم لدخول مطار القاهرة الدولي لعام ${year} (صالة – مهبط – ترانزيت - بضائع):`,
            { after: 240 },
          ),
          table,
          p('', { after: 200 }),
          p(
            'حيث أن طبيعة العمل تستلزم التواجد بإستمرار داخل الدائرة الجمركية فى المطارات لمتابعة الخدمات الأرضية لشركات الطيران التى نمثلها فى جمهورية مصر العربية.',
            { after: 300 },
          ),
          p('وتفضــلوا بقبــول فائق الإحتــرام،،،', { after: 500 }),
          p('رئيس الشؤون الإدارية', { bold: true, align: AlignmentType.CENTER, after: 400 }),
          p('چـاك إسحق', { bold: true, align: AlignmentType.CENTER }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
