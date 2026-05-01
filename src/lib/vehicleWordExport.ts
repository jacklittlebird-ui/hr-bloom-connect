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
  ShadingType,
  PageOrientation,
  Header,
  Footer,
  PageNumber,
  PageBreak,
  HeightRule,
  VerticalAlign,
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
  /** Split body rows into pages of this size, repeating header per page. */
  rowsPerPage?: number;
}

/* ──────────────── Color tokens (mirror PDF) ──────────────── */
const NAVY = '1E3A8A';        // primary navy
const SLATE_900 = '0F172A';
const SLATE_700 = '334155';
const SLATE_600 = '475569';
const SLATE_500 = '64748B';
const SLATE_400 = '94A3B8';
const SLATE_300 = 'CBD5E1';
const SLATE_200 = 'E2E8F0';
const SLATE_100 = 'F1F5F9';
const SLATE_50 = 'F8FAFC';
const WHITE = 'FFFFFF';

const FONT = 'Arial';

/* ──────────────── Run helpers ──────────────── */
function arRun(
  text: string,
  opts: { bold?: boolean; size?: number; color?: string } = {}
) {
  return new TextRun({
    text: String(text ?? ''),
    bold: opts.bold,
    size: opts.size ?? 20,
    color: opts.color ?? SLATE_900,
    font: FONT,
    rightToLeft: true,
  });
}

/* ──────────────── Borders ──────────────── */
const NONE = { style: BorderStyle.NONE, size: 0, color: 'auto' } as const;
const noBorders = { top: NONE, bottom: NONE, left: NONE, right: NONE };

const tableCellBorder = { style: BorderStyle.SINGLE, size: 6, color: SLATE_300 };
const tableCellBorders = {
  top: tableCellBorder,
  bottom: tableCellBorder,
  left: tableCellBorder,
  right: tableCellBorder,
};

const headerCellBorder = { style: BorderStyle.SINGLE, size: 6, color: SLATE_400 };
const headerCellBorders = {
  top: headerCellBorder,
  bottom: headerCellBorder,
  left: headerCellBorder,
  right: headerCellBorder,
};

/* ──────────────── Cell builders ──────────────── */
function tableHeaderCell(text: string, widthDxa: number) {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    borders: headerCellBorders,
    shading: { fill: NAVY, type: ShadingType.CLEAR, color: 'auto' },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        children: [arRun(text, { bold: true, size: 20, color: WHITE })],
      }),
    ],
  });
}

function tableBodyCell(text: string, widthDxa: number, zebra: boolean) {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    borders: tableCellBorders,
    shading: zebra
      ? { fill: SLATE_100, type: ShadingType.CLEAR, color: 'auto' }
      : { fill: WHITE, type: ShadingType.CLEAR, color: 'auto' },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        children: [arRun(text, { size: 19, color: SLATE_900 })],
      }),
    ],
  });
}

/* ──────────────── Header band (logo + dates) — mirrors PDF ──────────────── */
function buildPageHeaderRows(contentWidth: number, dateStr: string, timeStr: string): (Paragraph | Table)[] {
  const logoCol = 1500;
  const titleCol = Math.floor((contentWidth - logoCol) * 0.6);
  const dateCol = contentWidth - logoCol - titleCol;

  const headerTable = new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [logoCol, titleCol, dateCol],
    visuallyRightToLeft: true,
    rows: [
      new TableRow({
        children: [
          // Logo placeholder (navy circle with "HR")
          new TableCell({
            width: { size: logoCol, type: WidthType.DXA },
            borders: noBorders,
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 40, bottom: 40, left: 60, right: 60 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                bidirectional: true,
                shading: { fill: NAVY, type: ShadingType.CLEAR, color: 'auto' },
                spacing: { before: 120, after: 120 },
                children: [
                  new TextRun({
                    text: 'HR',
                    bold: true,
                    size: 32,
                    color: WHITE,
                    font: FONT,
                  }),
                ],
              }),
            ],
          }),
          // Department title (right side)
          new TableCell({
            width: { size: titleCol, type: WidthType.DXA },
            borders: noBorders,
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 40, bottom: 40, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                children: [
                  arRun('إدارة الموارد البشرية - قسم السيارات', {
                    bold: true,
                    size: 22,
                    color: SLATE_600,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                spacing: { before: 40 },
                children: [
                  new TextRun({
                    text: 'Fleet Management Department',
                    size: 16,
                    color: SLATE_400,
                    font: FONT,
                  }),
                ],
              }),
            ],
          }),
          // Date / time (left side)
          new TableCell({
            width: { size: dateCol, type: WidthType.DXA },
            borders: noBorders,
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 40, bottom: 40, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                bidirectional: true,
                children: [
                  arRun('تاريخ الإصدار: ', { size: 16, color: SLATE_500 }),
                  arRun(dateStr, { bold: true, size: 17, color: NAVY }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                bidirectional: true,
                spacing: { before: 40 },
                children: [
                  arRun('الوقت: ', { size: 16, color: SLATE_500 }),
                  arRun(timeStr, { bold: true, size: 17, color: NAVY }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Double-line separator (mirror "border-bottom:3px double #1e3a8a")
  const separator = new Paragraph({
    border: {
      bottom: { style: BorderStyle.DOUBLE, size: 12, color: NAVY, space: 1 },
    },
    spacing: { before: 80, after: 220 },
    children: [],
  });

  return [headerTable, separator];
}

/* ──────────────── Title block ──────────────── */
function buildTitleBlock(title: string, subtitle?: string): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: true,
      spacing: { before: 0, after: subtitle ? 80 : 200 },
      children: [arRun(title, { bold: true, size: 36, color: NAVY })],
    }),
  ];
  if (subtitle) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: true,
        spacing: { after: 240 },
        children: [arRun(subtitle, { size: 22, color: SLATE_500 })],
      })
    );
  }
  return out;
}

/* ──────────────── Meta panel — inline filters + record count ──────────────── */
function buildMetaPanel(
  meta: { label: string; value: string }[] | undefined,
  rowsCount: number,
  contentWidth: number
): Table | null {
  if (!meta || meta.length === 0) {
    // Even with no meta, show record count
    return new Table({
      width: { size: contentWidth, type: WidthType.DXA },
      columnWidths: [contentWidth],
      visuallyRightToLeft: true,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: contentWidth, type: WidthType.DXA },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
                left: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
                right: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
              },
              shading: { fill: SLATE_50, type: ShadingType.CLEAR, color: 'auto' },
              margins: { top: 100, bottom: 100, left: 140, right: 140 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  bidirectional: true,
                  children: [
                    arRun('عدد السجلات: ', { size: 18, color: SLATE_500 }),
                    arRun(String(rowsCount), { bold: true, size: 18, color: NAVY }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  }

  // Build runs: each meta as "label: value" separated by spacing, then count on the left
  const metaRuns: TextRun[] = [];
  meta.forEach((m, i) => {
    if (i > 0) {
      metaRuns.push(
        new TextRun({ text: '   •   ', size: 18, color: SLATE_300, font: FONT })
      );
    }
    metaRuns.push(
      new TextRun({
        text: `${m.label}: `,
        bold: true,
        size: 18,
        color: NAVY,
        font: FONT,
        rightToLeft: true,
      })
    );
    metaRuns.push(
      new TextRun({
        text: m.value,
        size: 18,
        color: SLATE_700,
        font: FONT,
        rightToLeft: true,
      })
    );
  });

  return new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: [Math.floor(contentWidth * 0.7), contentWidth - Math.floor(contentWidth * 0.7)],
    visuallyRightToLeft: true,
    rows: [
      new TableRow({
        children: [
          // Right cell — meta filters
          new TableCell({
            width: { size: Math.floor(contentWidth * 0.7), type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
              left: NONE,
              right: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
            },
            shading: { fill: SLATE_50, type: ShadingType.CLEAR, color: 'auto' },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                bidirectional: true,
                children: metaRuns,
              }),
            ],
          }),
          // Left cell — record count
          new TableCell({
            width: {
              size: contentWidth - Math.floor(contentWidth * 0.7),
              type: WidthType.DXA,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
              left: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200 },
              right: NONE,
            },
            shading: { fill: SLATE_50, type: ShadingType.CLEAR, color: 'auto' },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                bidirectional: true,
                children: [
                  arRun('عدد السجلات: ', { size: 18, color: SLATE_500 }),
                  arRun(String(rowsCount), { bold: true, size: 18, color: NAVY }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

/* ──────────────── Signatures block — mirrors PDF ──────────────── */
function buildSignatures(
  labels: string[] | undefined,
  contentWidth: number
): (Paragraph | Table)[] {
  const signers =
    labels && labels.length > 0
      ? labels
      : ['مدير الأسطول', 'الإدارة المالية', 'المدير العام'];

  const colW = Math.floor(contentWidth / signers.length);
  const widths = signers.map(() => colW);
  widths[widths.length - 1] += contentWidth - colW * signers.length;

  const sigTable = new Table({
    width: { size: contentWidth, type: WidthType.DXA },
    columnWidths: widths,
    visuallyRightToLeft: true,
    rows: [
      new TableRow({
        height: { value: 1200, rule: HeightRule.ATLEAST },
        children: signers.map(
          (label, i) =>
            new TableCell({
              width: { size: widths[i], type: WidthType.DXA },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 12, color: '1F2937' },
                bottom: NONE,
                left: NONE,
                right: NONE,
              },
              verticalAlign: VerticalAlign.TOP,
              margins: { top: 160, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  bidirectional: true,
                  children: [arRun(label, { bold: true, size: 21, color: '1F2937' })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  bidirectional: true,
                  spacing: { before: 40 },
                  children: [arRun('التوقيع والختم', { size: 17, color: SLATE_500 })],
                }),
              ],
            })
        ),
      }),
    ],
  });

  // Top spacer to mirror PDF's 30px margin-top
  const spacer = new Paragraph({ spacing: { before: 480 }, children: [] });

  // Confidential footer (mirror PDF)
  const confidential = new Paragraph({
    alignment: AlignmentType.CENTER,
    bidirectional: true,
    spacing: { before: 240, after: 0 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: SLATE_200, space: 4 },
    },
    children: [
      arRun(
        'مستند سري - للاستخدام الداخلي فقط · تم الإنشاء بواسطة نظام الموارد البشرية',
        { size: 15, color: SLATE_400 }
      ),
    ],
  });

  return [spacer, sigTable, confidential];
}

/* ──────────────── Main export ──────────────── */
export async function exportVehicleWord(opts: WordExportOptions): Promise<void> {
  const orientation = opts.orientation ?? 'landscape';
  const pageWidth = 12240;
  const pageHeight = 15840;
  const margin = 720;
  const contentWidth =
    orientation === 'landscape' ? pageHeight - margin * 2 : pageWidth - margin * 2;

  const cols = opts.columns;
  const idxWidth = 600;
  const remaining = contentWidth - idxWidth;
  const restEach = Math.floor(remaining / Math.max(1, cols.length - 1));
  const columnWidths = cols.map((_, i) => (i === 0 ? idxWidth : restEach));
  const sumW = columnWidths.reduce((a, b) => a + b, 0);
  columnWidths[columnWidths.length - 1] += contentWidth - sumW;

  const buildHeaderRow = () =>
    new TableRow({
      tableHeader: true,
      height: { value: 480, rule: HeightRule.ATLEAST },
      children: cols.map((c, i) => tableHeaderCell(c.header, columnWidths[i])),
    });

  const buildBodyRow = (r: Record<string, string | number>, ri: number) =>
    new TableRow({
      children: cols.map((c, ci) =>
        tableBodyCell(String(r[c.key] ?? '—'), columnWidths[ci], ri % 2 === 1)
      ),
    });

  // Chunk rows if requested
  const rowsPerPage = opts.rowsPerPage && opts.rowsPerPage > 0 ? opts.rowsPerPage : 0;
  const chunks: Record<string, string | number>[][] = [];
  if (opts.rows.length === 0) {
    chunks.push([]);
  } else if (rowsPerPage > 0 && opts.rows.length > rowsPerPage) {
    for (let i = 0; i < opts.rows.length; i += rowsPerPage) {
      chunks.push(opts.rows.slice(i, i + rowsPerPage));
    }
  } else {
    chunks.push(opts.rows);
  }

  const tables: Table[] = chunks.map((chunk) => {
    const rows: TableRow[] = [buildHeaderRow()];
    if (chunk.length === 0) {
      // Empty placeholder row
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              columnSpan: cols.length,
              width: { size: contentWidth, type: WidthType.DXA },
              borders: tableCellBorders,
              margins: { top: 200, bottom: 200, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  bidirectional: true,
                  children: [arRun('لا توجد بيانات للعرض', { size: 20, color: SLATE_500 })],
                }),
              ],
            }),
          ],
        })
      );
    } else {
      chunk.forEach((r, ri) => rows.push(buildBodyRow(r, ri)));
    }
    return new Table({
      width: { size: contentWidth, type: WidthType.DXA },
      columnWidths,
      rows,
      visuallyRightToLeft: true,
    });
  });

  // Date / time
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  const timeStr = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

  // Compose section children
  const sectionChildren: (Paragraph | Table)[] = [
    ...buildPageHeaderRows(contentWidth, dateStr, timeStr),
    ...buildTitleBlock(opts.titleAr, opts.subtitleAr),
  ];

  const metaPanel = buildMetaPanel(opts.meta, opts.rows.length, contentWidth);
  if (metaPanel) {
    sectionChildren.push(metaPanel);
    sectionChildren.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  }

  // Tables (with optional pagination markers)
  tables.forEach((t, idx) => {
    const isLast = idx === tables.length - 1;
    if (tables.length > 1) {
      sectionChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { before: 60, after: 120 },
          children: [
            arRun(`الصفحة ${idx + 1} من ${tables.length}`, {
              bold: true,
              size: 17,
              color: SLATE_500,
            }),
          ],
        })
      );
    }
    sectionChildren.push(t);
    if (!isLast) {
      sectionChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }
  });

  // Signatures on the last page
  sectionChildren.push(...buildSignatures(opts.signatureLabels, contentWidth));

  const doc = new Document({
    creator: 'HR System',
    title: opts.titleAr,
    styles: {
      default: {
        document: { run: { font: FONT, size: 20 } },
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
        // Footer mirrors PDF: page number on the left, date on the right
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: SLATE_300, space: 4 },
                },
                spacing: { before: 80, after: 0 },
                tabStops: [
                  { type: 'left' as any, position: 0 },
                  { type: 'right' as any, position: contentWidth },
                ],
                children: [
                  new TextRun({
                    text: 'Page ',
                    size: 16,
                    color: SLATE_500,
                    font: FONT,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: SLATE_500,
                    font: FONT,
                  }),
                  new TextRun({
                    text: ' / ',
                    size: 16,
                    color: SLATE_500,
                    font: FONT,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: SLATE_500,
                    font: FONT,
                  }),
                  new TextRun({ text: '\t', size: 16, font: FONT }),
                  new TextRun({
                    text: `${dateStr} ${timeStr}`,
                    size: 16,
                    color: SLATE_500,
                    font: FONT,
                  }),
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
