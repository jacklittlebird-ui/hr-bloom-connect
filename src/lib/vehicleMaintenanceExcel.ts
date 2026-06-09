import ExcelJS from 'exceljs';

export interface VMExcelRow {
  idx: number;
  code: string;
  vehicle: string;
  plate: string;
  station: string;
  type: string;
  date: string;
  odo: number | null;
  nextOdo: number | null;
  provider: string;
  cost: number;
  description: string;
}

export interface VMExcelOptions {
  isAr?: boolean;
  rows: VMExcelRow[];
  filters: {
    station: string;
    type: string;
    from: string;
    to: string;
  };
  summary: {
    totalRecords: number;
    totalCost: number;
    vehiclesInScope: number;
    upcomingCount: number;
  };
  topStations?: { name: string; count: number; cost: number }[];
  fileName?: string;
}

const fmtDate = (s: string) => {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return d && m && y ? `${d}/${m}/${y}` : s;
};

export async function exportVehicleMaintenanceXLSX(opts: VMExcelOptions) {
  const ar = opts.isAr !== false;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'HR System';
  wb.created = new Date();

  const ws = wb.addWorksheet(ar ? 'سجلات الصيانة' : 'Maintenance', {
    views: [{ rightToLeft: ar, state: 'frozen', ySplit: 8 }],
    pageSetup: {
      paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
  });

  const headers = ar
    ? ['م', 'الكود', 'السيارة', 'اللوحة', 'المحطة', 'نوع الصيانة', 'التاريخ', 'العداد (كم)', 'العداد القادم (كم)', 'مقدم الخدمة', 'التكلفة (ج.م)', 'الوصف']
    : ['#', 'Code', 'Vehicle', 'Plate', 'Station', 'Type', 'Date', 'Odometer (km)', 'Next Odo (km)', 'Provider', 'Cost (EGP)', 'Description'];

  const widths = [6, 14, 26, 16, 22, 18, 14, 16, 18, 22, 16, 40];
  ws.columns = widths.map(w => ({ width: w }));
  const lastCol = ws.getColumn(headers.length).letter;

  // Title
  ws.mergeCells(`A1:${lastCol}1`);
  const t = ws.getCell('A1');
  t.value = ar ? 'تقرير صيانة السيارات' : 'Vehicle Maintenance Report';
  t.font = { name: 'Calibri', bold: true, size: 20, color: { argb: 'FFFFFFFF' } };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 34;

  // Subtitle / generated at
  ws.mergeCells(`A2:${lastCol}2`);
  const now = new Date();
  const stamp = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  const sub = ws.getCell('A2');
  sub.value = ar ? `تاريخ التقرير: ${stamp}` : `Report date: ${stamp}`;
  sub.font = { italic: true, size: 11, color: { argb: 'FF475569' } };
  sub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  sub.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;

  // Filters row (3-4)
  const filterPairs: [string, string][] = ar
    ? [
        ['المحطة', opts.filters.station || '—'],
        ['نوع الصيانة', opts.filters.type || '—'],
        ['من تاريخ', opts.filters.from ? fmtDate(opts.filters.from) : '—'],
        ['إلى تاريخ', opts.filters.to ? fmtDate(opts.filters.to) : '—'],
      ]
    : [
        ['Station', opts.filters.station || '—'],
        ['Type', opts.filters.type || '—'],
        ['From', opts.filters.from ? fmtDate(opts.filters.from) : '—'],
        ['To', opts.filters.to ? fmtDate(opts.filters.to) : '—'],
      ];

  const fRow = ws.getRow(3);
  filterPairs.forEach((p, i) => {
    const base = i * 3 + 1;
    const labelCell = fRow.getCell(base);
    labelCell.value = p[0];
    labelCell.font = { bold: true, size: 11, color: { argb: 'FF334155' } };
    labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    labelCell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    ws.mergeCells(3, base + 1, 3, base + 2);
    const vc = fRow.getCell(base + 1);
    vc.value = p[1];
    vc.font = { size: 11, color: { argb: 'FF0F172A' } };
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    vc.border = labelCell.border;
    fRow.getCell(base + 2).border = labelCell.border;
  });
  fRow.height = 22;

  // Summary cards row (5-6 label/value)
  const cards = ar
    ? [
        ['إجمالي السجلات', String(opts.summary.totalRecords)],
        ['إجمالي التكاليف (ج.م)', opts.summary.totalCost.toLocaleString()],
        ['سيارات في النطاق', String(opts.summary.vehiclesInScope)],
        ['صيانة قادمة', String(opts.summary.upcomingCount)],
      ]
    : [
        ['Total Records', String(opts.summary.totalRecords)],
        ['Total Cost (EGP)', opts.summary.totalCost.toLocaleString()],
        ['Vehicles in scope', String(opts.summary.vehiclesInScope)],
        ['Upcoming maintenance', String(opts.summary.upcomingCount)],
      ];
  const colors = ['FF1E40AF', 'FF059669', 'FF7C3AED', 'FFEA580C'];
  const labelRow = ws.getRow(5);
  const valueRow = ws.getRow(6);
  cards.forEach((c, i) => {
    const base = i * 3 + 1;
    ws.mergeCells(5, base, 5, base + 2);
    ws.mergeCells(6, base, 6, base + 2);
    const lc = labelRow.getCell(base);
    lc.value = c[0];
    lc.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors[i] } };
    lc.alignment = { horizontal: 'center', vertical: 'middle' };
    const vc = valueRow.getCell(base);
    vc.value = c[1];
    vc.font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    vc.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
  });
  labelRow.height = 22;
  valueRow.height = 26;

  ws.getRow(7).height = 8;

  // Header row at row 8
  const headerRow = ws.getRow(8);
  headers.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = {
      top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      left: { style: 'thin', color: { argb: 'FF1E40AF' } },
      right: { style: 'thin', color: { argb: 'FF1E40AF' } },
    };
  });
  headerRow.height = 28;

  // Data rows
  const startData = 9;
  opts.rows.forEach((r, i) => {
    const rowIdx = startData + i;
    const row = ws.getRow(rowIdx);
    const values = [
      r.idx,
      r.code,
      r.vehicle,
      r.plate,
      r.station,
      r.type,
      fmtDate(r.date),
      r.odo ?? '',
      r.nextOdo ?? '',
      r.provider,
      r.cost,
      r.description,
    ];
    values.forEach((v, ci) => {
      const c = row.getCell(ci + 1);
      c.value = v as any;
      c.alignment = { vertical: 'middle', horizontal: ci === 11 ? (ar ? 'right' : 'left') : 'center', wrapText: ci === 11 };
      c.font = { size: 11, color: { argb: 'FF0F172A' } };
      c.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (rowIdx % 2 === 0) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    });
    // numeric formatting
    row.getCell(8).numFmt = '#,##0';
    row.getCell(9).numFmt = '#,##0';
    row.getCell(11).numFmt = '#,##0.00';
    row.getCell(11).font = { size: 11, bold: true, color: { argb: 'FF065F46' } };
    row.height = 22;
  });

  // Totals row
  const totalsIdx = startData + opts.rows.length;
  if (opts.rows.length > 0) {
    const tr = ws.getRow(totalsIdx);
    ws.mergeCells(totalsIdx, 1, totalsIdx, 10);
    const lbl = tr.getCell(1);
    lbl.value = ar ? 'الإجمالي' : 'Total';
    lbl.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    lbl.alignment = { horizontal: 'center', vertical: 'middle' };
    lbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    const totCell = tr.getCell(11);
    totCell.value = opts.summary.totalCost;
    totCell.numFmt = '#,##0.00';
    totCell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    totCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    totCell.alignment = { horizontal: 'center', vertical: 'middle' };
    const blank = tr.getCell(12);
    blank.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    tr.height = 26;
  }

  // AutoFilter on header
  ws.autoFilter = { from: { row: 8, column: 1 }, to: { row: 8, column: headers.length } };

  // Top stations on a second sheet
  if (opts.topStations && opts.topStations.length > 0) {
    const ws2 = wb.addWorksheet(ar ? 'أعلى المحطات' : 'Top Stations', {
      views: [{ rightToLeft: ar }],
    });
    ws2.columns = [{ width: 36 }, { width: 18 }, { width: 22 }];
    const h2 = ws2.getRow(1);
    [ar ? 'المحطة' : 'Station', ar ? 'عدد السجلات' : 'Records', ar ? 'إجمالي التكلفة' : 'Total Cost'].forEach((h, i) => {
      const c = h2.getCell(i + 1);
      c.value = h;
      c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    h2.height = 26;
    opts.topStations.forEach((s, i) => {
      const r = ws2.getRow(2 + i);
      r.getCell(1).value = s.name;
      r.getCell(2).value = s.count;
      r.getCell(3).value = s.cost;
      r.getCell(3).numFmt = '#,##0.00';
      [1, 2, 3].forEach(ci => {
        r.getCell(ci).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(ci).border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = opts.fileName || `vehicle_maintenance_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
