import { useState } from 'react';
import ExcelJS from 'exceljs';
import { Employee } from '@/types/employee';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileSpreadsheet } from 'lucide-react';

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const FIELDS = [
  ['nameAr', 'الاسم باللغه العربيه'], ['nameEn', 'الاسم باللغه الانجليزيه'],
  ['nationality', 'الجنسيه'], ['nationality2', 'الجنسيه الثانيه'],
  ['address', 'محل الاقامه تفصيلا'], ['phone', 'رقم الهاتف'], ['nationalId', 'الرقم القومى'],
  ['birthDate', 'تاريخ الميلاد (Day/Month/Year)'], ['job', 'الوظيفه'], ['notes', 'ملاحظات'],
] as const;
type Key = typeof FIELDS[number][0];

export const CandidateDataForm = ({ employee }: { employee: Employee }) => {
  const { isRTL } = useLanguage();
  const e = employee as any;
  const [v, setV] = useState<Record<Key, string>>({
    nameAr: e.nameAr || '', nameEn: e.nameEn || '',
    nationality: e.nationality || 'مصري', nationality2: '',
    address: [e.address, e.city, e.governorate].filter(Boolean).join(' - '),
    phone: e.phone || e.mobile || '', nationalId: e.nationalId || '',
    birthDate: fmtDate(e.birthDate), job: e.jobTitleAr || e.jobTitle || '', notes: '',
  });

  const download = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1', { views: [{ rightToLeft: true }] });
    ws.getColumn(1).width = 60.71; ws.getColumn(2).width = 13;
    const bold = { name: 'Calibri', size: 16, bold: true };
    const norm = { name: 'Calibri', size: 16 };
    const rows: [number, string | null, string | null, boolean][] = [
      [1, 'الاسم باللغه العربيه', 'الاسم باللغه الانجليزيه', true], [2, v.nameAr, v.nameEn, false],
      [3, 'الجنسيه', 'الجنسيه الثانيه', true], [4, v.nationality, v.nationality2, false],
      [5, 'محل الاقامه تفصيلا', null, true], [6, v.address, null, false],
      [7, 'رقم الهاتف', 'الرقم القومى', true], [8, v.phone, v.nationalId, false],
      [9, 'تاريخ الميلاد', null, true], [10, v.birthDate || 'Day/Month/Year', null, true],
      [11, 'الوظيفه', null, true], [12, v.job, null, false],
      [13, 'ملاحظات', v.notes || null, true],
    ];
    for (const [r, a, b, isBold] of rows) {
      const row = ws.getRow(r); row.height = 24;
      const ca = row.getCell(1), cb = row.getCell(2);
      if (a !== null) { ca.value = a; ca.font = isBold ? bold : norm; }
      if (b !== null) { cb.value = b; cb.font = r === 13 ? norm : isBold ? bold : norm; }
      if (r === 10) ca.alignment = { horizontal: 'right' };
      if (r === 8) cb.numFmt = '@';
    }
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `بيانات مرشح - ${v.nameAr || 'موظف'}.xlsx`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FIELDS.map(([k, label]) => (
            <div key={k} className="space-y-1">
              <Label className="font-bold">{label}</Label>
              <Input value={v[k]} onChange={ev => setV(s => ({ ...s, [k]: ev.target.value }))} />
            </div>
          ))}
        </div>
        <Button onClick={download} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" /> تنزيل النموذج (Excel)
        </Button>
      </CardContent>
    </Card>
  );
};
