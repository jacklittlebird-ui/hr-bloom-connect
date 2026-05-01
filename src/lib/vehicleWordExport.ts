import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  PageOrientation,
  Header,
  Footer,
  PageNumber,
} from 'docx';

export interface WordColumn {
  header: string;
  key: string;
}

export interface WordExportOptions {
  titleAr: string;
  subtitleAr?: string;
  meta?: { label: string; value: string }[];
  columns: WordColumn[];
  rows: Record<string, string | number>[];
  fileName?: string;
  signatureLabels?: string[];
  orientation?: 'portrait' | 'landscape';
}

const BRAND_BLUE = '1E40AF';
const SOFT_GREY = 'F3F4F6';
const BORDER_GREY = 'D1D5DB';

const cellBorder = { style: BorderStyle.SINGLE, size: 6, color: BORDER_GREY };
const cellBorders = {
  top: cellBorder,
  bottom: cellBorder,
  left: cellBorder,
  right: cellBorder,
};

function arRun(text: string, opts: { bold?: boolean; size?: number; color?: string } = {}) {
  return new TextRun({
    text: String(text ?? ''),
    bold: opts.bold,
    size: opts.size ?? 20, // half-points (20 = 10pt)
    color: opts.color,
    font: 'Arial',
    rightToLeft: true,
  });
}

function headerCell(text: string, widthDxa: number) {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    borders: cellBorders,
    shading: { fill: BRAND_BLUE, type: ShadingType.CLEAR, color: 'auto' },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        children: [arRun(text, { bold: true, size: 20, color: 'FFFFFF' })],
      }),
    ],
  });
}

function bodyCell(text: string, widthDxa: number, zebra: boolean) {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    borders: cellBorders,
    shading: zebra
      ? { fill: SOFT_GREY, type: ShadingType.CLEAR, color: 'auto' }
      : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        children: [arRun(text, { size: 18 })],
      }),
    ],
  });
}

export async function exportVehicleWord(opts: WordExportOptions): Promise<void> {
  const orientation = opts.orientation ?? 'landscape';
  // Page size — pass portrait dimensions; docx-js swaps for landscape
  const pageWidth = 12240; // 8.5"
  const pageHeight = 15840; // 11"
  const margin = 720; // 0.5"
  const contentWidth =
    orientation === 'landscape'
      ? pageHeight - margin * 2 // 14400
      : pageWidth - margin * 2; // 10800

  // Distribute width: give first col (idx) less, rest equal
  const cols = opts.columns;
  const idxWidth = 600;
  const remaining = contentWidth - idxWidth;
  const restEach = Math.floor(remaining / Math.max(1, cols.length - 1));
  const columnWidths = cols.map((_, i) => (i === 0 ? idxWidth : restEach));
  // adjust last col for rounding
  const sum = columnWidths.reduce((a, b) => a + b, 0);
  columnWidths[columnWidths.length - 1] += contentWidth - sum;

  const headerRow = new TableRow({
    tableHeader: true,
    children: cols.map((c, i) => headerCell(c.header, columnWidths[i])),
  });

  const bodyRows = opts.rows.map(
    (r, ri) =>
      new TableRow({
        children: cols.map((c, ci) =>
          bodyCell(String(r[c.key] ?? '—'), columnWidths[ci], ri % 2 === 1)
        ),
      })
  );

  const table = new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths,
    rows: [headerRow, ...bodyRows],
    visuallyRightToLeft: true,
  });

  // Meta paragraphs
  const metaParagraphs: Paragraph[] = [];
  if (opts.meta && opts.meta.length > 0) {
    metaParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { before: 120, after: 60 },
        children: [arRun('فلاتر التقرير', { bold: true, size: 22, color: BRAND_BLUE })],
      })
    );
    const metaTable = new Table({
      width: { size: contentWidth, type: WidthType.DXA },
      columnWidths: [Math.floor(contentWidth * 0.25), Math.floor(contentWidth * 0.75)],
      visuallyRightToLeft: true,
      rows: opts.meta.map(
        (m) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: Math.floor(contentWidth * 0.25), type: WidthType.DXA },
                borders: cellBorders,
                shading: { fill: SOFT_GREY, type: ShadingType.CLEAR, color: 'auto' },
                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    bidirectional: true,
                    children: [arRun(m.label, { bold: true, size: 18 })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: Math.floor(contentWidth * 0.75), type: WidthType.DXA },
                borders: cellBorders,
                margins: { top: 60, bottom: 60, left: 100, right: 100 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    bidirectional: true,
                    children: [arRun(m.value, { size: 18 })],
                  }),
                ],
              }),
            ],
          })
      ),
    });
    // We need to push the table separately — but docx Document.children mixes
    // paragraphs and tables. We'll wrap by returning multiple via section children.
    (metaParagraphs as any).push(metaTable);
  }

  // Signatures block
  const signatureLabels = opts.signatureLabels ?? [];
  const signatureBlock: (Paragraph | Table)[] = [];
  if (signatureLabels.length > 0) {
    signatureBlock.push(
      new Paragraph({
        spacing: { before: 600, after: 120 },
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        children: [arRun('التوقيعات', { bold: true, size: 22, color: BRAND_BLUE })],
      })
    );
    const sigCol = Math.floor(contentWidth / signatureLabels.length);
    const sigWidths = signatureLabels.map(() => sigCol);
    sigWidths[sigWidths.length - 1] += contentWidth - sigCol * signatureLabels.length;
    signatureBlock.push(
      new Table({
        width: { size: contentWidth, type: WidthType.DXA },
        columnWidths: sigWidths,
        visuallyRightToLeft: true,
        rows: [
          new TableRow({
            children: signatureLabels.map(
              (label, i) =>
                new TableCell({
                  width: { size: sigWidths[i], type: WidthType.DXA },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 8, color: BRAND_BLUE },
                    bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                    left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                    right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
                  },
                  margins: { top: 200, bottom: 60, left: 100, right: 100 },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      bidirectional: true,
                      children: [arRun(label, { bold: true, size: 20 })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.CENTER,
                      bidirectional: true,
                      children: [arRun('التوقيع: ____________________', { size: 16, color: '6B7280' })],
                    }),
                  ],
                })
            ),
          }),
        ],
      })
    );
  }

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

  const sectionChildren: (Paragraph | Table)[] = [
    // Title
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { after: 120 },
      children: [arRun(opts.titleAr, { bold: true, size: 32, color: BRAND_BLUE })],
    }),
    ...(opts.subtitleAr
      ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            bidirectional: true,
            spacing: { after: 200 },
            children: [arRun(opts.subtitleAr, { size: 22, color: '4B5563' })],
          }),
        ]
      : []),
    // Decorative line via empty paragraph with bottom border
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: BRAND_BLUE, space: 1 },
      },
      spacing: { after: 240 },
      children: [],
    }),
    ...(metaParagraphs as (Paragraph | Table)[]),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
    table,
    ...signatureBlock,
  ];

  const doc = new Document({
    creator: 'HR System',
    title: opts.titleAr,
    styles: {
      default: {
        document: { run: { font: 'Arial', size: 20 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: pageWidth,
              height: pageHeight,
              orientation:
                orientation === 'landscape'
                  ? PageOrientation.LANDSCAPE
                  : PageOrientation.PORTRAIT,
            },
            margin: { top: margin, right: margin, bottom: margin, left: margin },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                children: [
                  arRun(`نظام إدارة الموارد البشرية`, { bold: true, size: 18, color: BRAND_BLUE }),
                  new TextRun({ text: '   |   ', size: 18, color: BORDER_GREY }),
                  arRun(`${dateStr}  •  ${timeStr}`, { size: 16, color: '6B7280' }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                children: [
                  arRun('صفحة ', { size: 16, color: '6B7280' }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '6B7280' }),
                  arRun(' من ', { size: 16, color: '6B7280' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '6B7280' }),
                ],
              }),
            ],
          }),
        },
        children: sectionChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    opts.fileName ?? `report_${new Date().toISOString().slice(0, 10)}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
