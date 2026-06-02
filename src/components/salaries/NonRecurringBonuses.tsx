import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Download, Trash2, Gift } from 'lucide-react';

interface BonusRow {
  employeeCode: string;
  employeeName: string;
  amount: number;
  bankIdNumber: string;
  bankAccountNumber: string;
  found: boolean;
}

export const NonRecurringBonuses = () => {
  const { isRTL } = useLanguage();
  const { employees } = useEmployeeData();
  const [rows, setRows] = useState<BonusRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error(isRTL ? 'يرجى رفع ملف Excel أو CSV' : 'Please upload an Excel or CSV file');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) return;
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const data2d: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (data2d.length < 2) {
          toast.error(isRTL ? 'الملف فارغ' : 'File is empty');
          return;
        }

        const empByCode = new Map(employees.map(e => [String(e.employeeId).trim().toLowerCase(), e]));
        const result: BonusRow[] = [];
        let skipped = 0;

        for (const r of data2d.slice(1)) {
          const code = String(r[0] ?? '').trim();
          const amount = parseFloat(String(r[1] ?? ''));
          if (!code || isNaN(amount) || amount <= 0) { skipped++; continue; }
          const emp = empByCode.get(code.toLowerCase());
          result.push({
            employeeCode: code,
            employeeName: emp?.nameAr || (isRTL ? 'غير موجود' : 'Not found'),
            amount,
            bankIdNumber: emp?.bankIdNumber || '-',
            bankAccountNumber: emp?.bankAccountNumber || '-',
            found: !!emp,
          });
        }

        setRows(result);
        toast.success(
          isRTL
            ? `تم رفع ${result.length} صف${skipped ? ` - تم تجاهل ${skipped}` : ''}`
            : `Loaded ${result.length} rows${skipped ? ` - skipped ${skipped}` : ''}`
        );
      } catch (err) {
        console.error(err);
        toast.error(isRTL ? 'فشل قراءة الملف' : 'Failed to read file');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [isRTL ? 'كود الموظف' : 'Employee ID', isRTL ? 'المبلغ' : 'Amount'],
      ['EMP001', 1000],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'non_recurring_bonuses_template.xlsx');
  };

  const exportResult = () => {
    if (rows.length === 0) return;
    const ws = XLSX.utils.aoa_to_sheet([
      [
        isRTL ? 'كود الموظف' : 'Employee ID',
        isRTL ? 'اسم الموظف' : 'Employee Name',
        isRTL ? 'المبلغ' : 'Amount',
        isRTL ? 'رقم البطاقة البنكية' : 'Bank ID',
        isRTL ? 'رقم الحساب البنكي' : 'Bank Account',
      ],
      ...rows.map(r => [r.employeeCode, r.employeeName, r.amount, r.bankIdNumber, r.bankAccountNumber]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bonuses');
    XLSX.writeFile(wb, `non_recurring_bonuses_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            {isRTL ? 'المكافآت غير الدورية' : 'Non-Recurring Bonuses'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="max-w-xs"
            />
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              {isRTL ? 'تحميل نموذج' : 'Download Template'}
            </Button>
            {rows.length > 0 && (
              <>
                <Button variant="outline" onClick={exportResult}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  {isRTL ? 'تصدير Excel' : 'Export Excel'}
                </Button>
                <Button variant="ghost" onClick={() => setRows([])}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isRTL ? 'مسح' : 'Clear'}
                </Button>
              </>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isRTL
              ? 'الملف يجب أن يحتوي على عمودين: كود الموظف ID والمبلغ'
              : 'File must contain two columns: Employee ID and Amount'}
          </p>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isRTL ? 'النتائج' : 'Results'} ({rows.length})</span>
              <span className="text-primary">
                {isRTL ? 'الإجمالي:' : 'Total:'} {total.toLocaleString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? 'كود الموظف ID' : 'Employee ID'}</TableHead>
                    <TableHead>{isRTL ? 'اسم الموظف' : 'Employee Name'}</TableHead>
                    <TableHead>{isRTL ? 'المبلغ' : 'Amount'}</TableHead>
                    <TableHead>{isRTL ? 'رقم البطاقة البنكية ID' : 'Bank ID'}</TableHead>
                    <TableHead>{isRTL ? 'رقم الحساب البنكي' : 'Bank Account Number'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={!r.found ? 'bg-destructive/10' : ''}>
                      <TableCell className="font-medium">{r.employeeCode}</TableCell>
                      <TableCell>{r.employeeName}</TableCell>
                      <TableCell className="font-semibold text-primary">{r.amount.toLocaleString()}</TableCell>
                      <TableCell>{r.bankIdNumber}</TableCell>
                      <TableCell>{r.bankAccountNumber}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
