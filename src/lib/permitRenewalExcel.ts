import ExcelJS from 'exceljs';
import { formatDate } from '@/lib/utils';

export interface PermitRenewalRow {
  name: string;
  nationality: string;
  religion: string;
  birthDate: string;
  birthGovernorate: string;
  nationalId: string;
  idIssue: string;
  jobTitle: string;
  address: string;
  visitArea: string;
  permitNo: string;
  phone: string;
}

const FONT = 'Baloo Bhaijaan 2';
const WIDTHS = [7.14, 52.14, 12.14, 16.29, 18.14, 11.43, 10.71, 13.86, 18.86, 62.29, 18.71, 13.14, 12.57];
const HEADERS = ['م', 'بيانات الاسم ', 'الجنسية', 'الديانة', 'تاريخ الميلاد', 'جهة الميلاد', 'الرقم', 'الاصدار', 'الوظيفة', 'عنوان السكن ', 'منطقة الإرتياد ', 'رقم التصريح', 'رقم التليفون'];

const medium = { style: 'medium' as const };
const thin = { style: 'thin' as const };

export const exportPermitRenewalSheet = async (rows: PermitRenewalRow[], year: string, fileName: string) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1', {
    views: [{ rightToLeft: true }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  ws.mergeCells('A1:C1');
  ws.getCell('A1').value = 'اسم الجهة:  لينك أيرو تريدنج أجنسي';
  ws.getCell('A1').font = { name: FONT, size: 15 };
  ws.getCell('A1').alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(1).height = 31.5;

  ws.getCell('A2').value = 'رقم التليفون:  27352025    رقم الفاكس: 27359309        ';
  ws.getCell('A2').font = { name: FONT, size: 15 };
  ws.getCell('A2').alignment = { vertical: 'middle' };
  ws.getRow(2).height = 31.5;

  ws.mergeCells('A3:M3');
  ws.getCell('A3').value = 'كشف';
  ws.getCell('A3').font = { name: FONT, size: 25, bold: true };
  ws.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 41.25;

  ws.mergeCells('A4:M4');
  ws.getCell('A4').value = ` بأسماء وبيانات حاملى التصاريح الجمركية المستديمة المطلوب تجديدها  لعام (${year}) `;
  ws.getCell('A4').font = { name: FONT, size: 25, bold: true };
  ws.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 41.25;

  const headerRow = ws.getRow(5);
  headerRow.height = 28.5;
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: FONT, size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { top: medium, bottom: thin, left: medium, right: medium };
  });

  rows.forEach((r, idx) => {
    const row = ws.getRow(6 + idx);
    row.height = 30;
    const values = [
      idx + 1,
      r.name,
      r.nationality,
      r.religion,
      r.birthDate,
      r.birthGovernorate,
      r.nationalId,
      r.idIssue,
      r.jobTitle,
      r.address,
      r.visitArea,
      r.permitNo,
      r.phone,
    ];
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v as string | number;
      cell.font = { name: FONT, size: i === 10 ? 8 : 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: thin, bottom: thin, left: medium, right: medium };
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

export const fmt = (v?: string | null) => (v ? formatDate(v) : '');
