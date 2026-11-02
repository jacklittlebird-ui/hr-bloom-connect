import { useRef, useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSalaryData, calcNet } from '@/contexts/SalaryDataContext';
import { supabase } from '@/integrations/supabase/client';
import { extraDaysAllowance } from '@/lib/extraDays';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Download, Trash2, CalendarPlus, Save, History, Loader2 } from 'lucide-react';

interface Row {
  employeeCode: string;
  employeeName: string;
  days: number;
  netSalary: number;
  dailyRate: number;
  amount: number;
  bankIdNumber: string;
  bankAccountNumber: string;
  ok: boolean;
  note?: string;
  employeeId?: string | null;
}

interface Saved {
  id: string; batch_id: string; employee_code: string; employee_name: string | null;
  days: number; net_salary: number; daily_rate: number; amount: number;
  bank_id_number: string | null; bank_account_number: string | null;
  allowance_month: string | null; created_at: string;
}

const monthNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const ExtraDaysAllowance = () => {
  const { isRTL } = useLanguage();
  const { employees } = useEmployeeData();
  const { user } = useAuth();
  const { salaryRecords, ensureLoaded } = useSalaryData();
  const [rows, setRows] = useState<Row[]>([]);
  const [month, setMonth] = useState(monthNow());
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<Saved[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { ensureLoaded(); }, [ensureLoaded]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase.from('extra_days_allowances').select('*')
      .order('created_at', { ascending: false }).limit(2000);
    if (error) toast.error(isRTL ? 'فشل تحميل السجلات' : 'Failed to load records');
    else setHistory((data || []) as Saved[]);
    setLoadingHistory(false);
  }, [isRTL]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const netFor = (empId: string) => {
    const year = month.slice(0, 4);
    const recs = salaryRecords.filter(r => r.employeeId === empId);
    const rec = recs.find(r => r.year === year) || recs.sort((a, b) => b.year.localeCompare(a.year))[0];
    return rec ? calcNet(rec) : null;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        const data2d: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        const byCode = new Map(employees.map(e => [String(e.employeeId).trim().toLowerCase(), e]));
        const result: Row[] = [];
        let skipped = 0;
        for (const r of data2d.slice(1)) {
          const code = String(r[0] ?? '').trim();
          const days = parseFloat(String(r[1] ?? ''));
          if (!code || isNaN(days) || days <= 0) { skipped++; continue; }
          const emp: any = byCode.get(code.toLowerCase());
          const net = emp ? netFor(emp.id) : null;
          const calc = net != null ? extraDaysAllowance(net, days) : { dailyRate: 0, amount: 0 };
          result.push({
            employeeCode: code,
            employeeName: emp?.nameAr || (isRTL ? 'غير موجود' : 'Not found'),
            days, netSalary: net ?? 0, ...calc,
            bankIdNumber: emp?.bankIdNumber || '-',
            bankAccountNumber: emp?.bankAccountNumber || '-',
            ok: !!emp && net != null && net > 0,
            note: !emp ? (isRTL ? 'كود غير موجود' : 'Unknown code') : (net == null || net <= 0) ? (isRTL ? 'لا يوجد راتب مسجل' : 'No salary') : undefined,
            employeeId: emp?.id || null,
          });
        }
        setRows(result);
        toast.success(isRTL ? `تم رفع ${result.length} صف${skipped ? ` - تم تجاهل ${skipped}` : ''}` : `Loaded ${result.length} rows`);
      } catch {
        toast.error(isRTL ? 'فشل قراءة الملف' : 'Failed to read file');
      } finally {
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const saveBatch = async () => {
    const valid = rows.filter(r => r.ok);
    if (!valid.length) { toast.error(isRTL ? 'لا توجد صفوف صالحة للحفظ' : 'No valid rows'); return; }
    setSaving(true);
    const batchId = crypto.randomUUID();
    const { error } = await supabase.from('extra_days_allowances').insert(valid.map(r => ({
      batch_id: batchId, employee_id: r.employeeId!, employee_code: r.employeeCode, employee_name: r.employeeName,
      days: r.days, net_salary: r.netSalary, daily_rate: r.dailyRate, amount: r.amount,
      bank_id_number: r.bankIdNumber, bank_account_number: r.bankAccountNumber,
      allowance_month: month, uploaded_by: user?.id || null,
    })));
    setSaving(false);
    if (error) { toast.error(isRTL ? 'فشل حفظ السجلات' : 'Save failed'); return; }
    toast.success(isRTL ? `تم حفظ ${valid.length} سجل` : `Saved ${valid.length}`);
    setRows([]);
    loadHistory();
  };

  const deleteBatch = async (id: string) => {
    if (!confirm(isRTL ? 'حذف هذه الدفعة بالكامل؟' : 'Delete this batch?')) return;
    const { error } = await supabase.from('extra_days_allowances').delete().eq('batch_id', id);
    if (error) { toast.error(isRTL ? 'فشل الحذف' : 'Delete failed'); return; }
    toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    loadHistory();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([[isRTL ? 'كود الموظف' : 'Employee ID', isRTL ? 'عدد الأيام الإضافية' : 'Extra Days'], ['EMP001', 2]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'extra_days_template.xlsx');
  };

  // Same layout as the non-recurring bonuses export
  const exportResult = (data: { employeeCode: string; employeeName: string; amount: number; bankIdNumber: string; bankAccountNumber: string }[], filename: string) => {
    if (!data.length) return;
    const ws = XLSX.utils.aoa_to_sheet([
      [isRTL ? 'كود الموظف' : 'Employee ID', isRTL ? 'اسم الموظف' : 'Employee Name', isRTL ? 'المبلغ' : 'Amount',
        isRTL ? 'رقم البطاقة البنكية' : 'Bank ID', isRTL ? 'رقم الحساب البنكي' : 'Bank Account'],
      ...data.map(r => [r.employeeCode, r.employeeName, r.amount, r.bankIdNumber, r.bankAccountNumber]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bonuses');
    XLSX.writeFile(wb, filename);
  };

  const total = rows.filter(r => r.ok).reduce((s, r) => s + r.amount, 0);
  const batches = history.reduce<Record<string, Saved[]>>((a, r) => { (a[r.batch_id] = a[r.batch_id] || []).push(r); return a; }, {});
  const batchList = Object.entries(batches).sort((a, b) => b[1][0].created_at.localeCompare(a[1][0].created_at));

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload"><Upload className="w-4 h-4 mr-2" />{isRTL ? 'رفع جديد' : 'New Upload'}</TabsTrigger>
          <TabsTrigger value="history"><History className="w-4 h-4 mr-2" />{isRTL ? 'السجلات المحفوظة' : 'Saved Records'} ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarPlus className="w-5 h-5 text-primary" />{isRTL ? 'بدل عمل أيام إضافية' : 'Extra Working Days Allowance'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="max-w-xs" />
                <Input type="month" value={month} onChange={e => setMonth(e.target.value)} className="max-w-[180px]" />
                <Button variant="outline" onClick={downloadTemplate}><Download className="w-4 h-4 mr-2" />{isRTL ? 'تحميل نموذج' : 'Download Template'}</Button>
                {rows.length > 0 && (<>
                  <Button onClick={saveBatch} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}{isRTL ? 'حفظ السجلات' : 'Save Records'}</Button>
                  <Button variant="outline" onClick={() => exportResult(rows.filter(r => r.ok), `extra_days_${new Date().toISOString().slice(0, 10)}.xlsx`)}><FileSpreadsheet className="w-4 h-4 mr-2" />{isRTL ? 'تصدير Excel' : 'Export Excel'}</Button>
                  <Button variant="ghost" onClick={() => setRows([])}><Trash2 className="w-4 h-4 mr-2" />{isRTL ? 'مسح' : 'Clear'}</Button>
                </>)}
              </div>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'الملف يحتوي على عمودين: كود الموظف وعدد الأيام الإضافية. أجر اليوم = صافي الراتب الشهري ÷ 30، والمبلغ = أجر اليوم × عدد الأيام.'
                  : 'Two columns: Employee ID and extra days. Day rate = monthly net / 30; amount = day rate x days.'}
              </p>
            </CardContent>
          </Card>

          {rows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{isRTL ? 'المعاينة' : 'Preview'} ({rows.length})</span>
                  <span className="text-primary">{isRTL ? 'الإجمالي:' : 'Total:'} {total.toLocaleString()}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{isRTL ? 'كود الموظف' : 'Employee ID'}</TableHead>
                      <TableHead>{isRTL ? 'اسم الموظف' : 'Name'}</TableHead>
                      <TableHead>{isRTL ? 'صافي الراتب' : 'Net Salary'}</TableHead>
                      <TableHead>{isRTL ? 'أجر اليوم' : 'Day Rate'}</TableHead>
                      <TableHead>{isRTL ? 'عدد الأيام' : 'Days'}</TableHead>
                      <TableHead>{isRTL ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{isRTL ? 'رقم البطاقة البنكية' : 'Bank ID'}</TableHead>
                      <TableHead>{isRTL ? 'رقم الحساب البنكي' : 'Bank Account'}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i} className={!r.ok ? 'bg-destructive/10' : ''}>
                          <TableCell className="font-medium">{r.employeeCode}</TableCell>
                          <TableCell>{r.employeeName}{r.note && <span className="block text-xs text-destructive">{r.note}</span>}</TableCell>
                          <TableCell>{r.netSalary.toLocaleString()}</TableCell>
                          <TableCell>{r.dailyRate.toLocaleString()}</TableCell>
                          <TableCell>{r.days}</TableCell>
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
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loadingHistory ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : batchList.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">{isRTL ? 'لا توجد سجلات محفوظة' : 'No saved records'}</CardContent></Card>
          ) : batchList.map(([batchId, items]) => {
            const batchTotal = items.reduce((s, r) => s + Number(r.amount), 0);
            const c = new Date(items[0].created_at);
            const dateStr = `${String(c.getDate()).padStart(2, '0')}/${String(c.getMonth() + 1).padStart(2, '0')}/${c.getFullYear()} ${String(c.getHours()).padStart(2, '0')}:${String(c.getMinutes()).padStart(2, '0')}`;
            return (
              <Card key={batchId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base flex-wrap gap-2">
                    <span className="flex items-center gap-2"><CalendarPlus className="w-4 h-4 text-primary" />{isRTL ? 'دفعة' : 'Batch'} • {dateStr}
                      {items[0].allowance_month && <span className="text-sm text-muted-foreground">({items[0].allowance_month})</span>}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-primary font-semibold">{items.length} {isRTL ? 'سجل' : 'records'} • {batchTotal.toLocaleString()}</span>
                      <Button size="sm" variant="outline" onClick={() => exportResult(items.map(i => ({
                        employeeCode: i.employee_code, employeeName: i.employee_name || '', amount: Number(i.amount),
                        bankIdNumber: i.bank_id_number || '-', bankAccountNumber: i.bank_account_number || '-',
                      })), `extra_days_batch_${dateStr.replace(/[/: ]/g, '_')}.xlsx`)}><FileSpreadsheet className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteBatch(batchId)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>{isRTL ? 'كود الموظف' : 'Employee ID'}</TableHead>
                        <TableHead>{isRTL ? 'اسم الموظف' : 'Name'}</TableHead>
                        <TableHead>{isRTL ? 'صافي الراتب' : 'Net'}</TableHead>
                        <TableHead>{isRTL ? 'أجر اليوم' : 'Day Rate'}</TableHead>
                        <TableHead>{isRTL ? 'عدد الأيام' : 'Days'}</TableHead>
                        <TableHead>{isRTL ? 'المبلغ' : 'Amount'}</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {items.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.employee_code}</TableCell>
                            <TableCell>{r.employee_name}</TableCell>
                            <TableCell>{Number(r.net_salary).toLocaleString()}</TableCell>
                            <TableCell>{Number(r.daily_rate).toLocaleString()}</TableCell>
                            <TableCell>{Number(r.days)}</TableCell>
                            <TableCell className="font-semibold text-primary">{Number(r.amount).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};
