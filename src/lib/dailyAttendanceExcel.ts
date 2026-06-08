import ExcelJS from 'exceljs';
import { format } from 'date-fns';

type Kind = 'present' | 'late' | 'absent' | 'auto-closed' | 'mission-day' | 'none';

export interface DAExcelCell {
  in: string;
  out: string;
  hours: string;
  kind: Kind;
  isOff: boolean;
  leave?: string | null;
  mission?: string | null;
  permission?: string | null;
  overtime?: string | null;
  holiday?: string | null;
}

export interface DAExcelRow {
  idx: number;
  code: string;
  name: string;
  station: string;
  department: string;
  present: number;
  late: number;
  absent: number;
  hours: string;
  cells: DAExcelCell[];
}

export interface DAExcelInput {
  title: string;
  ar: boolean;
  dateRange: string[]; // ISO yyyy-mm-dd
  isHeaderWeekend: (dow: number) => boolean;
  rows: DAExcelRow[];
  totals: {
    stationsCount: number;
    employeesCount: number;
    totalHours: string;
    present: number;
    absent: number;
    late: number;
    leaves: number;
    missions: number;
    permissions: number;
    overtimeHours: string;
  };
  fileName?: string;
}

// Color palette (ARGB) matching the on-screen Tailwind colors
const C = {
  white: 'FFFFFFFF',
  border: 'FFE5E7EB',
  // headers
  headerMuted: 'FFF3F4F6',
  summaryHead: 'FFD1FAE5',     // emerald-100
  dateHead: 'FFDBEAFE',        // blue-100
  offHead: 'FFFDE68A',         // amber-200
  offBar: 'FFF59E0B',          // amber-500
  // status
  present: 'FFD1FAE5',         // emerald-100
  presentText: 'FF065F46',
  late: 'FFFEF3C7',            // amber-100
  lateText: 'FF92400E',
  absent: 'FFFECACA',           // red-200
  absentText: 'FF991B1B',
  // overlays
  leave: 'FFE0F2FE',           // sky-100
  leaveText: 'FF075985',
  mission: 'FFF3E8FF',         // purple-100
  missionText: 'FF6B21A8',
  permission: 'FFCFFAFE',      // cyan-100
  permissionText: 'FF155E75',
  overtime: 'FFFFEDD5',        // orange-100
  overtimeText: 'FF9A3412',
  holiday: 'FFEDE9FE',          // violet-100
  holidayText: 'FF5B21B6',
  // row severity tints
  rowAbs1: 'FFFEE2E2',
  rowAbs3: 'FFFECACA',
  rowAbs5: 'FFFCA5A5',
  rowLate3: 'FFFEF3C7',
  rowLate5: 'FFFDE68A',
  // weekend cell tint
  offCell: 'FFFEF3C7',
  // summary cell
  summaryCell: 'FFECFDF5',
};

const fillSolid = (argb: string): ExcelJS.Fill => ({
  type: 'pattern', pattern: 'solid', fgColor: { argb },
});

const thinAll: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: C.border } },
  left: { style: 'thin', color: { argb: C.border } },
  right: { style: 'thin', color: { argb: C.border } },
  bottom: { style: 'thin', color: { argb: C.border } },
};

const offSideBorders = (base: Partial<ExcelJS.Borders>): Partial<ExcelJS.Borders> => ({
  ...base,
  left: { style: 'medium', color: { argb: C.offBar } },
  right: { style: 'medium', color: { argb: C.offBar } },
});

export async function exportDailyAttendanceExcel(input: DAExcelInput) {
  const { title, ar, dateRange, isHeaderWeekend, rows, totals } = input;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'One HR';
  wb.created = new Date();
  const ws = wb.addWorksheet(ar ? 'الحضور التفصيلي' : 'Daily Attendance', {
    views: [{ state: 'frozen', xSplit: 9, ySplit: 5, rightToLeft: ar }],
  });

  // Static columns: # | Code | Name | Station | Dept | P | L | A | Hrs   (9 cols)
  // Then 3 columns per day (In, Out, Hrs)
  const baseCols = 9;
  const totalCols = baseCols + dateRange.length * 3;

  // ---- Title row ----
  ws.mergeCells(1, 1, 1, totalCols);
  const tCell = ws.getCell(1, 1);
  tCell.value = title;
  tCell.font = { bold: true, size: 14, color: { argb: 'FF111827' } };
  tCell.alignment = { horizontal: 'center', vertical: 'middle' };
  tCell.fill = fillSolid('FFF9FAFB');
  ws.getRow(1).height = 26;

  // ---- Summary row ----
  ws.mergeCells(2, 1, 2, totalCols);
  const sCell = ws.getCell(2, 1);
  const sumLine = ar
    ? `المحطات: ${totals.stationsCount}  •  الموظفون: ${totals.employeesCount}  •  ساعات العمل: ${totals.totalHours}  •  حاضر: ${totals.present}  •  متأخر: ${totals.late}  •  غائب: ${totals.absent}  •  إجازات: ${totals.leaves}  •  مأموريات: ${totals.missions}  •  أذونات: ${totals.permissions}  •  ساعات إضافي: ${totals.overtimeHours}`
    : `Stations: ${totals.stationsCount}  •  Employees: ${totals.employeesCount}  •  Work Hours: ${totals.totalHours}  •  Present: ${totals.present}  •  Late: ${totals.late}  •  Absent: ${totals.absent}  •  Leaves: ${totals.leaves}  •  Missions: ${totals.missions}  •  Permissions: ${totals.permissions}  •  Overtime: ${totals.overtimeHours}`;
  sCell.value = sumLine;
  sCell.font = { size: 10, color: { argb: 'FF374151' } };
  sCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  sCell.fill = fillSolid(C.summaryHead);
  ws.getRow(2).height = 22;

  // ---- Spacer ----
  ws.getRow(3).height = 6;

  // ---- Header row 1 (groups) at row 4 ----
  // Cols 1..5 base, merged across rows 4-5
  const baseHeaders = ar
    ? ['#', 'الكود', 'الاسم', 'المحطة', 'القسم']
    : ['#', 'Code', 'Name', 'Station', 'Department'];
  baseHeaders.forEach((h, i) => {
    ws.mergeCells(4, i + 1, 5, i + 1);
    const c = ws.getCell(4, i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: 'FF111827' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.fill = fillSolid(C.headerMuted);
    c.border = thinAll;
  });

  // Summary group (cols 6-9)
  ws.mergeCells(4, 6, 4, 9);
  const sumHead = ws.getCell(4, 6);
  sumHead.value = ar ? 'الملخص' : 'Summary';
  sumHead.font = { bold: true, color: { argb: 'FF065F46' } };
  sumHead.alignment = { horizontal: 'center', vertical: 'middle' };
  sumHead.fill = fillSolid(C.summaryHead);
  sumHead.border = thinAll;
  const subSum = ar ? ['حاضر', 'متأخر', 'غائب', 'الساعات'] : ['P', 'L', 'A', 'Hrs'];
  subSum.forEach((h, i) => {
    const c = ws.getCell(5, 6 + i);
    c.value = h;
    c.font = { bold: true, size: 10, color: { argb: 'FF065F46' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.fill = fillSolid(C.summaryHead);
    c.border = thinAll;
  });

  // Per-day group headers (3 cols each)
  dateRange.forEach((d, i) => {
    const colStart = baseCols + 1 + i * 3;
    const dObj = new Date(d + 'T00:00:00');
    const dow = dObj.getDay();
    const isOff = isHeaderWeekend(dow);
    const isFri = dow === 5;
    ws.mergeCells(4, colStart, 4, colStart + 2);
    const head = ws.getCell(4, colStart);
    const dayLabel = dObj.toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { weekday: 'short' });
    const dateLabel = format(dObj, 'dd/MM');
    head.value = isOff
      ? `${isFri ? '🕌 ' : ''}${dateLabel}\n${dayLabel} — ${ar ? 'عطلة' : 'Off'}`
      : `${dateLabel}\n${dayLabel}`;
    head.font = { bold: true, color: { argb: isOff ? 'FF92400E' : 'FF1E40AF' }, size: 10 };
    head.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    head.fill = fillSolid(isOff ? C.offHead : C.dateHead);
    head.border = isOff ? offSideBorders(thinAll) : thinAll;

    // Sub-headers
    const sub = ar ? ['حضور', 'انصراف', 'س'] : ['In', 'Out', 'H'];
    sub.forEach((label, j) => {
      const c = ws.getCell(5, colStart + j);
      c.value = label;
      c.font = { size: 9, color: { argb: 'FF6B7280' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.fill = fillSolid(isOff ? C.offHead : C.dateHead);
      const b: Partial<ExcelJS.Borders> = { ...thinAll };
      if (isOff && j === 0) b.left = { style: 'medium', color: { argb: C.offBar } };
      if (isOff && j === 2) b.right = { style: 'medium', color: { argb: C.offBar } };
      c.border = b;
    });
  });

  ws.getRow(4).height = 32;
  ws.getRow(5).height = 18;

  // Column widths
  const widths = [4, 10, 26, 18, 16, 6, 6, 6, 8];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
  for (let i = 0; i < dateRange.length; i++) {
    const colStart = baseCols + 1 + i * 3;
    ws.getColumn(colStart).width = 7;
    ws.getColumn(colStart + 1).width = 7;
    ws.getColumn(colStart + 2).width = 6;
  }

  // ---- Data rows ----
  let rowNum = 6;
  rows.forEach(r => {
    // Row severity tint
    let rowTint: string | null = null;
    if (r.absent >= 5) rowTint = C.rowAbs5;
    else if (r.absent >= 3) rowTint = C.rowAbs3;
    else if (r.absent >= 1) rowTint = C.rowAbs1;
    else if (r.late >= 5) rowTint = C.rowLate5;
    else if (r.late >= 3) rowTint = C.rowLate3;

    const setBase = (col: number, val: string | number, opts: { bold?: boolean; align?: 'left' | 'center'; mono?: boolean; color?: string; bg?: string } = {}) => {
      const c = ws.getCell(rowNum, col);
      c.value = val;
      c.font = { bold: !!opts.bold, color: { argb: opts.color || 'FF111827' }, name: opts.mono ? 'Consolas' : undefined };
      c.alignment = { horizontal: opts.align || 'center', vertical: 'middle', wrapText: true };
      c.fill = fillSolid(opts.bg || rowTint || C.white);
      c.border = thinAll;
    };

    setBase(1, r.idx, { color: 'FF6B7280' });
    setBase(2, r.code, { mono: true });
    setBase(3, r.name, { align: 'left', bold: true });
    setBase(4, r.station);
    setBase(5, r.department, { color: 'FF6B7280' });
    setBase(6, r.present, { bold: true, color: C.presentText, bg: rowTint || C.summaryCell });
    setBase(7, r.late, { color: C.lateText, bg: rowTint || C.summaryCell });
    setBase(8, r.absent, { color: C.absentText, bg: rowTint || C.summaryCell });
    setBase(9, r.hours, { bold: true, bg: rowTint || C.summaryCell });

    // Day cells
    r.cells.forEach((cell, i) => {
      const colStart = baseCols + 1 + i * 3;
      // Determine background by status / leave / off
      // Leave/Mission take precedence over an "absent" attendance row so the
      // approved leave/mission is always visible in Excel (matches on-screen behavior).
      let bg = rowTint || C.white;
      let textColor = 'FF111827';
      let labelOverride: string | null = null;
      const hasAttn = cell.kind === 'present' || cell.kind === 'late' || cell.kind === 'auto-closed' || cell.kind === 'mission-day';

      if (cell.holiday && !hasAttn) {
        bg = C.holiday; textColor = C.holidayText;
        labelOverride = (ar ? 'عطلة رسمية' : 'Holiday') + ` — ${cell.holiday}`;
      } else if (cell.leave && !hasAttn) {
        bg = C.leave; textColor = C.leaveText;
        labelOverride = (ar ? 'إجازة' : 'Leave') + ` — ${cell.leave}`;
      } else if (cell.mission && !hasAttn) {
        bg = C.mission; textColor = C.missionText;
        labelOverride = (ar ? 'مأمورية' : 'Mission') + (cell.mission ? ` — ${cell.mission}` : '');
      } else if (cell.kind === 'present') { bg = C.present; textColor = C.presentText; }
      else if (cell.kind === 'late') { bg = C.late; textColor = C.lateText; }
      else if (cell.kind === 'auto-closed') { bg = C.present; textColor = C.presentText; }
      else if (cell.kind === 'mission-day') { bg = C.mission; textColor = C.missionText; }
      else if (cell.kind === 'absent') { bg = C.absent; textColor = C.absentText; }
      else if (cell.permission) {
        bg = C.permission; textColor = C.permissionText;
        labelOverride = (ar ? 'إذن' : 'Permission') + ` — ${cell.permission}`;
      } else if (cell.overtime) {
        bg = C.overtime; textColor = C.overtimeText;
        labelOverride = (ar ? 'إضافي' : 'Overtime') + ` — ${cell.overtime}`;
      } else if (cell.isOff) { bg = C.offCell; textColor = 'FF92400E'; }

      const cellsTriple: ExcelJS.Cell[] = [
        ws.getCell(rowNum, colStart),
        ws.getCell(rowNum, colStart + 1),
        ws.getCell(rowNum, colStart + 2),
      ];

      if (labelOverride && !hasAttn) {
        // Merge across the 3 sub-cells to show a single status label
        ws.mergeCells(rowNum, colStart, rowNum, colStart + 2);
        const m = cellsTriple[0];
        m.value = labelOverride;
        m.font = { bold: true, color: { argb: textColor }, size: 10 };
        m.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        m.fill = fillSolid(bg);
        const b: Partial<ExcelJS.Borders> = { ...thinAll };
        if (cell.isOff) {
          b.left = { style: 'medium', color: { argb: C.offBar } };
          b.right = { style: 'medium', color: { argb: C.offBar } };
        }
        m.border = b;
      } else {
        // Build small overlay tag (leave/mission/permission/overtime) shown
        // visibly under the times when the day also has an attendance record.
        const tags: string[] = [];
        if (cell.holiday) tags.push((ar ? 'عطلة: ' : 'H: ') + cell.holiday);
        if (cell.leave) tags.push((ar ? 'إجازة: ' : 'L: ') + cell.leave);
        if (cell.mission) tags.push((ar ? 'مأمورية: ' : 'M: ') + cell.mission);
        if (cell.permission) tags.push((ar ? 'إذن: ' : 'P: ') + cell.permission);
        if (cell.overtime) tags.push((ar ? 'إضافي: ' : 'OT: ') + cell.overtime);
        const tagLine = tags.join(' • ');

        const inVal = cell.in || '';
        const outVal = cell.out || '';
        const hrsVal = cell.hours || '';

        cellsTriple[0].value = tagLine && !inVal ? tagLine : inVal;
        cellsTriple[1].value = outVal;
        cellsTriple[2].value = hrsVal;

        cellsTriple.forEach((cc, j) => {
          cc.font = { color: { argb: textColor }, name: 'Consolas', size: 10, bold: cell.kind !== 'none' && j === 2 };
          cc.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          cc.fill = fillSolid(bg);
          const b: Partial<ExcelJS.Borders> = { ...thinAll };
          if (cell.isOff && j === 0) b.left = { style: 'medium', color: { argb: C.offBar } };
          if (cell.isOff && j === 2) b.right = { style: 'medium', color: { argb: C.offBar } };
          cc.border = b;
        });

        // When attendance + overlay coexist, show the tag visibly in the Hrs cell on a 2nd line
        if (tagLine && hasAttn) {
          cellsTriple[2].value = `${hrsVal}\n${tagLine}`;
          cellsTriple[2].font = { color: { argb: textColor }, name: 'Consolas', size: 9, bold: true };
          ws.getRow(rowNum).height = Math.max(ws.getRow(rowNum).height || 22, 30);
        }

        // Always also attach as a comment for full detail
        const extras: string[] = [];
        if (cell.holiday) extras.push((ar ? 'عطلة رسمية: ' : 'Holiday: ') + cell.holiday);
        if (cell.leave) extras.push((ar ? 'إجازة: ' : 'Leave: ') + cell.leave);
        if (cell.mission) extras.push((ar ? 'مأمورية: ' : 'Mission: ') + cell.mission);
        if (cell.permission) extras.push((ar ? 'إذن: ' : 'Permission: ') + cell.permission);
        if (cell.overtime) extras.push((ar ? 'إضافي: ' : 'Overtime: ') + cell.overtime);
        if (extras.length) {
          cellsTriple[2].note = extras.join('\n');
        }
      }
    });

    ws.getRow(rowNum).height = 22;
    rowNum++;
  });

  // Auto filter on header row
  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: baseCols } };

  // Save
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = format(new Date(), 'yyyyMMdd_HHmm');
  a.href = url;
  a.download = (input.fileName || 'daily_attendance') + `_${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
