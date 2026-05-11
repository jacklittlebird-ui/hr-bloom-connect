import ExcelJS from 'exceljs';

export interface EDRow {
  id: string;
  name: string;
  dept: string;
  station: string;
  basic: number;
  transport: number;
  incentives: number;
  stationAllow: number;
  mobileAllow: number;
  living: number;
  overtime: number;
  bonus: number;
  gross: number;
  insurance: number;
  loans: number;
  advances: number;
  mobileBill: number;
  leaveDed: number;
  penalty: number;
  totalDed: number;
  net: number;
  empIns: number;
  health: number;
  tax: number;
  totalEmployer: number;
  // Marker rows: kind === 'subtotal' | 'grand' | undefined (employee row)
  kind?: 'subtotal' | 'grand';
}

export type EDKpiColor = 'primary' | 'green' | 'red' | 'blue' | 'amber' | 'purple';

export interface EDKpi {
  label: string;
  value: string | number;
  color: EDKpiColor;
}

export interface EDInput {
  title: string;
  ar: boolean;
  rows: EDRow[];
  kpis?: EDKpi[];
  fileName?: string;
}

const C = {
  border: 'FFE5E7EB',
  headerBg: 'FF374151',
  headerText: 'FFFFFFFF',
  titleBg: 'FF1E40AF',
  zebra: 'FFF9FAFB',
  subtotalBg: 'FFF3F4F6',
  grossBg: 'FFF0FDF4',
  grossSubBg: 'FFDCFCE7',
  netBg: 'FFEFF6FF',
  netSubBg: 'FFDBEAFE',
  destructive: 'FFDC2626',
  blueBold: 'FF1E40AF',
  grandBg: 'FFD1FAE5',
  grandGrossBg: 'FFBBF7D0',
  grandNetBg: 'FF93C5FD',
};

const setBorder = (cell: ExcelJS.Cell) => {
  cell.border = {
    top: { style: 'thin', color: { argb: C.border } },
    left: { style: 'thin', color: { argb: C.border } },
    bottom: { style: 'thin', color: { argb: C.border } },
    right: { style: 'thin', color: { argb: C.border } },
  };
};

const fill = (cell: ExcelJS.Cell, argb: string) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
};

export async function exportEmployeeDetailExcel(input: EDInput): Promise<void> {
  const { title, ar, rows, kpis, fileName } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HR System';
  wb.created = new Date();

  const ws = wb.addWorksheet(ar ? 'تفصيل الموظفين' : 'Employee Detail', {
    views: [{ rightToLeft: ar, state: 'frozen', ySplit: kpis && kpis.length ? 7 : 4 }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true, margins: { left: 0.15, right: 0.15, top: 0.2, bottom: 0.2, header: 0.1, footer: 0.1 } },
  });

  const headers = ar
    ? ['الكود','الاسم','القسم','المحطة','الأساسي','مواصلات','حوافز','بدل محطة','بدل محمول','بدل معيشة','أجر إضافي','مكافآت','الإجمالي','تأمينات','قروض','سلف','فاتورة','إجازات','جزاءات','إجمالي خصومات','الصافي','تأمينات ص.ع','صحي','ضريبة','إجمالي مساهمات ص.ع']
    : ['ID','Name','Dept','Station','Basic','Trans.','Incent.','St.All.','Mob.','Living','OT','Bonus','Gross','Ins.','Loans','Adv.','Bill','Leave','Pen.','Tot.Ded','Net','Emp.Ins','Health','Tax','Total Employer'];

  const colCount = headers.length; // 25
  ws.columns = headers.map((_, i) => {
    if (i === 0) return { width: 12 };
    if (i === 1) return { width: 24 };
    if (i === 2 || i === 3) return { width: 18 };
    return { width: 13 };
  });

  // Title
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Baloo Bhaijaan 2', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  fill(titleCell, C.titleBg);
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 26;

  // Date
  ws.mergeCells(2, 1, 2, colCount);
  const dateCell = ws.getCell(2, 1);
  dateCell.value = new Date().toLocaleDateString(ar ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  dateCell.font = { name: 'Baloo Bhaijaan 2', size: 10, color: { argb: 'FF6B7280' } };
  dateCell.alignment = { horizontal: 'center' };

  ws.getRow(3).height = 6;

  let headerRowIdx = 4;

  // KPI cards
  if (kpis && kpis.length) {
    const kpiPalette: Record<EDKpiColor, { bg: string; text: string }> = {
      primary: { bg: 'FFDBEAFE', text: 'FF1E40AF' },
      green:   { bg: 'FFDCFCE7', text: 'FF15803D' },
      red:     { bg: 'FFFEE2E2', text: 'FFB91C1C' },
      blue:    { bg: 'FFDBEAFE', text: 'FF1D4ED8' },
      amber:   { bg: 'FFFEF3C7', text: 'FFB45309' },
      purple:  { bg: 'FFEDE9FE', text: 'FF6D28D9' },
    };
    const n = Math.min(kpis.length, 6);
    // Distribute colCount across n cards
    const base = Math.floor(colCount / n);
    const extra = colCount - base * n;
    const widths: number[] = Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));

    const labelRow = ws.getRow(4);
    const valueRow = ws.getRow(5);
    labelRow.height = 20;
    valueRow.height = 28;

    let cur = 1;
    for (let i = 0; i < n; i++) {
      const w = widths[i];
      const start = cur;
      const end = cur + w - 1;
      const k = kpis[i];
      const pal = kpiPalette[k.color];
      ws.mergeCells(4, start, 4, end);
      ws.mergeCells(5, start, 5, end);
      const lc = ws.getCell(4, start);
      lc.value = k.label;
      lc.font = { name: 'Baloo Bhaijaan 2', size: 10, bold: true, color: { argb: pal.text } };
      lc.alignment = { horizontal: 'center', vertical: 'middle' };
      fill(lc, pal.bg);
      setBorder(lc);
      const vc = ws.getCell(5, start);
      vc.value = k.value;
      vc.font = { name: 'Baloo Bhaijaan 2', size: 14, bold: true, color: { argb: pal.text } };
      vc.alignment = { horizontal: 'center', vertical: 'middle' };
      fill(vc, pal.bg);
      setBorder(vc);
      cur = end + 1;
    }
    ws.getRow(6).height = 6;
    headerRowIdx = 7;
  }

  // Table Header
  const headerRow = ws.getRow(headerRowIdx);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Baloo Bhaijaan 2', size: 10, bold: true, color: { argb: C.headerText } };
    fill(cell, C.headerBg);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    setBorder(cell);
  });
  headerRow.height = 32;

  // Numeric column markers
  const grossCol = 13;
  const totDedCol = 20;
  const netCol = 21;
  const totEmpCol = 25;

  let rowIdx = headerRowIdx + 1;
  let zebra = false;

  rows.forEach(r => {
    const isSub = r.kind === 'subtotal';
    const isGrand = r.kind === 'grand';
    const isTotal = isSub || isGrand;

    if (isTotal) zebra = false;

    const row = ws.getRow(rowIdx++);
    const vals: (string | number)[] = [
      r.id, r.name, r.dept, r.station,
      r.basic, r.transport, r.incentives,
      r.stationAllow, r.mobileAllow, r.living,
      r.overtime, r.bonus, r.gross,
      r.insurance, r.loans, r.advances,
      r.mobileBill, r.leaveDed, r.penalty,
      r.totalDed, r.net,
      r.empIns, r.health, r.tax, r.totalEmployer,
    ];

    vals.forEach((v, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = v;
      cell.font = { name: 'Baloo Bhaijaan 2', size: 10, bold: isTotal };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      setBorder(cell);
      if (typeof v === 'number') cell.numFmt = '#,##0';

      if (isGrand) {
        fill(cell, C.grandBg);
      } else if (isSub) {
        fill(cell, C.subtotalBg);
      } else if (zebra) {
        fill(cell, C.zebra);
      }

      const colNum = ci + 1;
      if (colNum === grossCol) {
        if (isGrand) fill(cell, C.grandGrossBg);
        else if (isSub) fill(cell, C.grossSubBg);
        else fill(cell, C.grossBg);
        cell.font = { ...cell.font, bold: true };
      } else if (colNum === totDedCol) {
        cell.font = { ...cell.font, color: { argb: C.destructive } };
      } else if (colNum === netCol) {
        if (isGrand) fill(cell, C.grandNetBg);
        else if (isSub) fill(cell, C.netSubBg);
        else fill(cell, C.netBg);
        cell.font = { ...cell.font, bold: true };
      } else if (colNum === totEmpCol) {
        cell.font = { ...cell.font, bold: true, color: { argb: C.blueBold } };
      }
      if (ci === 1 && !isTotal) cell.alignment = { horizontal: ar ? 'right' : 'left', vertical: 'middle' };
    });

    if (isTotal) row.height = 22;
    if (!isTotal) zebra = !zebra;
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName || 'employee_detail'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
