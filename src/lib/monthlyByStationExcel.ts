import ExcelJS from 'exceljs';

export interface MBSRow {
  stationKey: string;
  stationName: string;
  month: string;
  monthNum: string;
  count: number;
  basic: number;
  transport: number;
  incentives: number;
  stationAllowance: number;
  mobileAllowance: number;
  livingAllowance: number;
  overtimePay: number;
  bonuses: number;
  gross: number;
  insurance: number;
  loans: number;
  totalDeductions: number;
  net: number;
  employerInsurance: number;
  healthInsurance: number;
  incomeTax: number;
}

export type MBSKpiColor = 'primary' | 'green' | 'red' | 'blue' | 'amber' | 'purple';

export interface MBSKpi {
  label: string;
  value: string | number;
  color: MBSKpiColor;
}

export interface MBSInput {
  title: string;
  ar: boolean;
  rows: MBSRow[];
  kpis?: MBSKpi[];
  fileName?: string;
}

const C = {
  border: 'FFE5E7EB',
  headerBg: 'FF374151',          // gray-700
  headerText: 'FFFFFFFF',
  titleBg: 'FF1E40AF',           // blue-800
  zebra: 'FFF9FAFB',
  subtotalBg: 'FFF3F4F6',        // gray-100
  grossBg: 'FFF0FDF4',           // green-50
  grossSubBg: 'FFDCFCE7',        // green-100
  netBg: 'FFEFF6FF',             // blue-50
  netSubBg: 'FFDBEAFE',          // blue-100
  destructive: 'FFDC2626',       // red-600
  blueBold: 'FF1E40AF',          // blue-800
  grandBg: 'FFD1FAE5',           // emerald-100
  grandGrossBg: 'FFBBF7D0',      // green-200
  grandNetBg: 'FF93C5FD',        // blue-300
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

const num = (n: number) => Number(n || 0);

export async function exportMonthlyByStationExcel(input: MBSInput): Promise<void> {
  const { title, ar, rows, kpis, fileName } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HR System';
  wb.created = new Date();

  const hasKpis = !!(kpis && kpis.length);
  const ws = wb.addWorksheet(ar ? 'تفصيل شهري بالمحطة' : 'Monthly by Station', {
    views: [{ rightToLeft: ar, state: 'frozen', ySplit: hasKpis ? 7 : 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.15, right: 0.15, top: 0.2, bottom: 0.2, header: 0.1, footer: 0.1 } },
  });

  const headers = ar
    ? ['المحطة','الشهر','العدد','الأساسي','مواصلات','حوافز','بدل محطة','بدل محمول','بدل معيشة','أجر إضافي','مكافآت','الإجمالي','تأمينات','قروض','إجمالي خصومات','الصافي','تأمينات ص.ع','صحي','ضريبة','إجمالي مساهمات ص.ع']
    : ['Station','Month','Count','Basic','Trans.','Incent.','St.All.','Mob.','Living','OT','Bonus','Gross','Ins.','Loans','Tot.Ded','Net','Emp.Ins','Health','Tax','Total Employer'];

  const colCount = headers.length;
  ws.columns = headers.map((_, i) => ({ width: i === 0 ? 22 : i === 1 ? 12 : 13 }));

  // Title row
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: 'Baloo Bhaijaan 2', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  fill(titleCell, C.titleBg);
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 26;

  // Date row
  ws.mergeCells(2, 1, 2, colCount);
  const dateCell = ws.getCell(2, 1);
  dateCell.value = new Date().toLocaleDateString(ar ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  dateCell.font = { name: 'Baloo Bhaijaan 2', size: 10, color: { argb: 'FF6B7280' } };
  dateCell.alignment = { horizontal: 'center' };

  // spacer
  ws.getRow(3).height = 6;

  let headerRowIdx = 4;

  // KPI cards
  if (hasKpis) {
    const kpiPalette: Record<MBSKpiColor, { bg: string; text: string }> = {
      primary: { bg: 'FFDBEAFE', text: 'FF1E40AF' },
      green:   { bg: 'FFDCFCE7', text: 'FF15803D' },
      red:     { bg: 'FFFEE2E2', text: 'FFB91C1C' },
      blue:    { bg: 'FFDBEAFE', text: 'FF1D4ED8' },
      amber:   { bg: 'FFFEF3C7', text: 'FFB45309' },
      purple:  { bg: 'FFEDE9FE', text: 'FF6D28D9' },
    };
    const n = Math.min(kpis!.length, 6);
    const base = Math.floor(colCount / n);
    const extra = colCount - base * n;
    const widths: number[] = Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));

    ws.getRow(4).height = 20;
    ws.getRow(5).height = 28;

    let cur = 1;
    for (let i = 0; i < n; i++) {
      const w = widths[i];
      const start = cur;
      const end = cur + w - 1;
      const k = kpis![i];
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

  // Header row
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

  // Group rows by station
  const groups = new Map<string, MBSRow[]>();
  rows.forEach(r => {
    if (!groups.has(r.stationKey)) groups.set(r.stationKey, []);
    groups.get(r.stationKey)!.push(r);
  });

  const grand = { count: 0, basic: 0, transport: 0, incentives: 0, stationAllowance: 0, mobileAllowance: 0, livingAllowance: 0, overtimePay: 0, bonuses: 0, gross: 0, insurance: 0, loans: 0, totalDeductions: 0, net: 0, employerInsurance: 0, healthInsurance: 0, incomeTax: 0 };

  let rowIdx = headerRowIdx + 1;
  let zebra = false;

  groups.forEach((stRows, stKey) => {
    const st = { count: 0, basic: 0, transport: 0, incentives: 0, stationAllowance: 0, mobileAllowance: 0, livingAllowance: 0, overtimePay: 0, bonuses: 0, gross: 0, insurance: 0, loans: 0, totalDeductions: 0, net: 0, employerInsurance: 0, healthInsurance: 0, incomeTax: 0 };

    stRows.forEach((r, i) => {
      const row = ws.getRow(rowIdx++);
      const vals = [
        i === 0 ? r.stationName : '',
        r.month, num(r.count),
        num(r.basic), num(r.transport), num(r.incentives),
        num(r.stationAllowance), num(r.mobileAllowance), num(r.livingAllowance),
        num(r.overtimePay), num(r.bonuses),
        num(r.gross),
        num(r.insurance), num(r.loans),
        num(r.totalDeductions), num(r.net),
        num(r.employerInsurance), num(r.healthInsurance), num(r.incomeTax),
        num(r.employerInsurance + r.healthInsurance + r.incomeTax),
      ];
      vals.forEach((v, ci) => {
        const cell = row.getCell(ci + 1);
        cell.value = v;
        cell.font = { name: 'Baloo Bhaijaan 2', size: 10 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        setBorder(cell);
        if (typeof v === 'number') cell.numFmt = '#,##0';
        if (zebra) fill(cell, C.zebra);
        // column-specific color
        if (ci === 11) { // Gross
          fill(cell, C.grossBg);
          cell.font = { ...cell.font, bold: true };
        } else if (ci === 14) { // Total Deductions
          cell.font = { ...cell.font, color: { argb: C.destructive } };
        } else if (ci === 15) { // Net
          fill(cell, C.netBg);
          cell.font = { ...cell.font, bold: true };
        } else if (ci === 19) { // Total Employer
          cell.font = { ...cell.font, bold: true, color: { argb: C.blueBold } };
        }
        if (ci === 0) cell.font = { ...cell.font, bold: true };
      });
      zebra = !zebra;

      st.count += r.count; st.basic += r.basic; st.transport += r.transport;
      st.incentives += r.incentives; st.stationAllowance += r.stationAllowance;
      st.mobileAllowance += r.mobileAllowance; st.livingAllowance += r.livingAllowance;
      st.overtimePay += r.overtimePay; st.bonuses += r.bonuses; st.gross += r.gross;
      st.insurance += r.insurance; st.loans += r.loans;
      st.totalDeductions += r.totalDeductions; st.net += r.net;
      st.employerInsurance += r.employerInsurance; st.healthInsurance += r.healthInsurance;
      st.incomeTax += r.incomeTax;
    });

    // Subtotal row
    const subRow = ws.getRow(rowIdx++);
    ws.mergeCells(rowIdx - 1, 1, rowIdx - 1, 2);
    const labelCell = subRow.getCell(1);
    labelCell.value = ar ? `إجمالي ${stRows[0].stationName}` : `${stRows[0].stationName} Total`;
    const subVals = [st.count, st.basic, st.transport, st.incentives, st.stationAllowance, st.mobileAllowance, st.livingAllowance, st.overtimePay, st.bonuses, st.gross, st.insurance, st.loans, st.totalDeductions, st.net, st.employerInsurance, st.healthInsurance, st.incomeTax, st.employerInsurance + st.healthInsurance + st.incomeTax];
    subVals.forEach((v, i) => { subRow.getCell(3 + i).value = v; });
    for (let c = 1; c <= colCount; c++) {
      const cell = subRow.getCell(c);
      cell.font = { name: 'Baloo Bhaijaan 2', size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      setBorder(cell);
      fill(cell, C.subtotalBg);
      if (typeof cell.value === 'number') cell.numFmt = '#,##0';
      if (c === 12) fill(cell, C.grossSubBg);
      else if (c === 15) cell.font = { ...cell.font, color: { argb: C.destructive } };
      else if (c === 16) fill(cell, C.netSubBg);
      else if (c === 20) cell.font = { ...cell.font, color: { argb: C.blueBold } };
    }
    zebra = false;

    Object.keys(grand).forEach(k => { (grand as any)[k] += (st as any)[k]; });
  });

  // Grand total row
  const gRow = ws.getRow(rowIdx++);
  ws.mergeCells(rowIdx - 1, 1, rowIdx - 1, 2);
  gRow.getCell(1).value = ar ? 'الإجمالي العام' : 'Grand Total';
  const gVals = [grand.count, grand.basic, grand.transport, grand.incentives, grand.stationAllowance, grand.mobileAllowance, grand.livingAllowance, grand.overtimePay, grand.bonuses, grand.gross, grand.insurance, grand.loans, grand.totalDeductions, grand.net, grand.employerInsurance, grand.healthInsurance, grand.incomeTax, grand.employerInsurance + grand.healthInsurance + grand.incomeTax];
  gVals.forEach((v, i) => { gRow.getCell(3 + i).value = v; });
  for (let c = 1; c <= colCount; c++) {
    const cell = gRow.getCell(c);
    cell.font = { name: 'Baloo Bhaijaan 2', size: 11, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    setBorder(cell);
    fill(cell, C.grandBg);
    if (typeof cell.value === 'number') cell.numFmt = '#,##0';
    if (c === 12) fill(cell, C.grandGrossBg);
    else if (c === 15) cell.font = { ...cell.font, color: { argb: C.destructive } };
    else if (c === 16) fill(cell, C.grandNetBg);
    else if (c === 20) cell.font = { ...cell.font, color: { argb: C.blueBold } };
  }
  gRow.height = 22;

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName || 'monthly_by_station'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
