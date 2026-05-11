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
  const { title, ar, rows, fileName } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HR System';
  wb.created = new Date();

  const ws = wb.addWorksheet(ar ? 'تفصيل الموظفين' : 'Employee Detail', {
    views: [{ rightToLeft: ar, state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } },
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
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  fill(titleCell, C.titleBg);
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 26;

  // Date
  ws.mergeCells(2, 1, 2, colCount);
  const dateCell = ws.getCell(2, 1);
  dateCell.value = new Date().toLocaleDateString(ar ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  dateCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF6B7280' } };
  dateCell.alignment = { horizontal: 'center' };

  ws.getRow(3).height = 6;

  // Header
  const headerRow = ws.getRow(4);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.headerText } };
    fill(cell, C.headerBg);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    setBorder(cell);
  });
  headerRow.height = 32;

  // Numeric column indices (1-based in this list, but applied as ci+1)
  // Order: id,name,dept,station, [basic..totalEmployer]
  // Columns 5..25 are numeric
  const grossCol = 13;        // Gross
  const totDedCol = 20;       // Tot.Ded
  const netCol = 21;          // Net
  const totEmpCol = 25;       // Total Employer

  let rowIdx = 5;
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
      cell.font = { name: 'Calibri', size: 10, bold: isTotal };
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
