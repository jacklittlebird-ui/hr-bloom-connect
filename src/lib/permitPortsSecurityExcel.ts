import ExcelJS from 'exceljs';
import { formatDate } from '@/lib/utils';

export interface PortsSecurityRow {
  nameAr: string;
  nameEn: string;
  nationality: string;
  nationalId: string;
  jobAr: string;
  jobEn: string;
  birthPlace: string;
  birthDate: string;
  governorate: string;
  city: string;
  address: string;
}

const FONT = 'Baloo Bhaijaan 2';
const WIDTHS = [27.29, 10.29, 9.86, 9.86, 6.86, 14.43, 10.29, 16.57, 6.71, 19.14, 27.71, 4.14];
const HEADERS = ['محل الإقامة', 'قسم/مركز', 'محافظة الأقامة', 'تاريخ الميلاد', 'محل الميلاد', 'المهنة بالإنجليزية', 'المهنة', 'الرقم القومي', 'الجنسية', 'الاسم خماسي بالانجليزية', 'الاسم خماسي', 'م'];

const thin = { style: 'thin' as const };
const medium = { style: 'medium' as const };

const hdrCell = (v: string, size = 12, align: Partial<ExcelJS.Alignment> = {}) => ({
  value: v,
  font: { name: FONT, size, bold: true },
  alignment: { vertical: 'middle' as const, wrapText: true, ...align },
});

export const exportPortsSecuritySheet = async (rows: PortsSecurityRow[], year: string, fileName: string) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`استخراج ${year}`, {
    views: [{ rightToLeft: true, showGridLines: false }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // الرأس العلوي
  Object.assign(ws.getCell('A1'), hdrCell('عموم المطارات'));
  Object.assign(ws.getCell('C1'), hdrCell('المواني المصرح بها:'));
  Object.assign(ws.getCell('A2'), hdrCell('صالة و مهبط'));
  Object.assign(ws.getCell('C2'), hdrCell('القطاعات المصرح بها: '));
  ws.mergeCells('E1:I1');
  Object.assign(ws.getCell('E1'), hdrCell(`نموذج رقم (2) استخراج التصاريح المستديمة لعام ${year}`, 14, { horizontal: 'center' }));
  Object.assign(ws.getCell('K1'), hdrCell('وزارة الداخلية'));
  Object.assign(ws.getCell('K2'), hdrCell('الإدارة العامة لأمن المواني'));
  Object.assign(ws.getCell('K3'), hdrCell('ادارة التصاريح'));
  Object.assign(ws.getCell('K4'), hdrCell('اسم الشركة : لينك ايرو تريدنج اجنسي'));
  Object.assign(ws.getCell('K5'), hdrCell('اسم الشركة  Link Aero Trading Agency'));
  Object.assign(ws.getCell('K6'), hdrCell('رقم الملف:  (48)', 9));
  for (let r = 1; r <= 6; r++) ws.getRow(r).height = 18;
  ws.getRow(7).height = 6;

  // صف العناوين
  const headerRow = ws.getRow(8);
  headerRow.height = 35.25;
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: FONT, size: 9, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: medium, bottom: thin, left: thin, right: thin };
  });

  // صفوف البيانات
  rows.forEach((r, idx) => {
    const row = ws.getRow(9 + idx);
    row.height = 22;
    const values = [
      r.address,
      r.city,
      r.governorate,
      r.birthDate,
      r.birthPlace,
      r.jobEn,
      r.jobAr,
      r.nationalId,
      r.nationality,
      r.nameEn,
      r.nameAr,
      idx + 1,
    ];
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v as string | number;
      cell.font = { name: FONT, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: thin, bottom: thin, left: thin, right: thin };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

// ============ كشف تجديد أمن المواني ============

export interface PortsSecurityRenewalRow extends PortsSecurityRow {
  permitNo: string;
}

const RENEW_WIDTHS = [11.14, 21.43, 10.14, 10, 14, 9.14, 12.43, 14.43, 21.71, 7.71, 28.57, 34, 4.71];
const RENEW_HEADERS = ['رقم التصريح', 'محل الاقامة', 'قسم/مركز', 'محافظة الإقامة', 'تاريخ الميلاد', 'محل الميلاد', 'المهنة بالإنجليزية', 'المهنة', 'الرقم القومي', 'الجنسية', 'الاسم بالانجليزية', 'الاسم خماسي', 'م'];
const RENEW_ROW_HEIGHTS = [30, 30, 30, 21.75, 30, 22.5, 9.75];

const dashed = { style: 'dashed' as const };

export const exportPortsSecurityRenewalSheet = async (rows: PortsSecurityRenewalRow[], year: string, fileName: string) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('تجديد', {
    views: [{ showGridLines: false }],
    pageSetup: { orientation: 'landscape', paperSize: 9 },
  });

  RENEW_WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // الرأس العلوي
  Object.assign(ws.getCell('B1'), hdrCell('عموم المطارات'));
  Object.assign(ws.getCell('B2'), hdrCell('صالة و مهبط'));
  Object.assign(ws.getCell('D1'), hdrCell('المواني المصرح بها:'));
  Object.assign(ws.getCell('D2'), hdrCell('القطاعات المصرح بها: '));
  ws.mergeCells('E1:I1');
  Object.assign(ws.getCell('E1'), hdrCell(`نموذج رقم (1) تجديد التصاريح المستديمة لعام ${year}`, 14, { horizontal: 'center' }));
  Object.assign(ws.getCell('L1'), hdrCell('وزارة الداخلية'));
  Object.assign(ws.getCell('L2'), hdrCell('الإدارة العامة لأمن المواني'));
  Object.assign(ws.getCell('L3'), hdrCell('ادارة التصاريح'));
  Object.assign(ws.getCell('L4'), hdrCell('اسم الشركة : لينك ايرو تريدنج اجنسي'));
  Object.assign(ws.getCell('L5'), hdrCell('اسم الشركة  Link Aero Trading Agency'));
  Object.assign(ws.getCell('L6'), hdrCell('رقم الملف:  (48)', 12));
  RENEW_ROW_HEIGHTS.forEach((h, i) => { ws.getRow(i + 1).height = h; });
  ws.mergeCells('J7:K7');

  // صف العناوين
  const headerRow = ws.getRow(8);
  headerRow.height = 48;
  RENEW_HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: FONT, size: 10, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: medium,
      bottom: medium,
      left: i === 12 ? medium : dashed,
      right: i === 12 ? medium : dashed,
    };
  });

  // صفوف البيانات
  rows.forEach((r, idx) => {
    const row = ws.getRow(9 + idx);
    row.height = 47.25;
    const values = [
      r.permitNo,
      r.address,
      r.city,
      r.governorate,
      r.birthDate,
      r.birthPlace,
      r.jobEn,
      r.jobAr,
      r.nationalId,
      r.nationality,
      r.nameEn,
      r.nameAr,
      idx + 1,
    ];
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v as string | number;
      cell.font = { name: FONT, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: idx === 0 ? medium : thin,
        bottom: thin,
        left: i === 12 ? medium : thin,
        right: i === 12 ? medium : thin,
      };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

export const fmtDate = (v?: string | null) => (v ? formatDate(v) : '');
