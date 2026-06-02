import { useRef, useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Download, Trash2, Gift, Save, History, Loader2 } from 'lucide-react';

interface BonusRow {
  employeeCode: string;
  employeeName: string;
  amount: number;
  bankIdNumber: string;
  bankAccountNumber: string;
  found: boolean;
  employeeId?: string | null;
}

interface SavedRecord {
  id: string;
  batch_id: string;
  employee_id: string | null;
  employee_code: string;
  employee_name: string | null;
  amount: number;
  bank_id_number: string | null;
  bank_account_number: string | null;
  bonus_month: string | null;
  created_at: string;
}

const monthNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const NonRecurringBonuses = () => {
  const { isRTL } = useLanguage();
  const { employees } = useEmployeeData();
  const { user } = useAuth();
  const [rows, setRows] = useState<BonusRow[]>([]);
  const [bonusMonth, setBonusMonth] = useState(monthNow());
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<SavedRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('non_recurring_bonuses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000);
    if (error) {
      console.error(error);
      toast.error(isRTL ? 'فشل تحميل السجلات' : 'Failed to load records');
    } else {
      setHistory((data || []) as SavedRecord[]);
    }
    setLoadingHistory(false);
  }, [isRTL]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

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
            employeeId: (emp as any)?.id || null,
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

  const saveBatch = async () => {
    const valid = rows.filter(r => r.found && r.employeeId);
    if (valid.length === 0) {
      toast.error(isRTL ? 'لا توجد صفوف صالحة للحفظ' : 'No valid rows to save');
      return;
    }
    setSaving(true);
    const batchId = crypto.randomUUID();
    const payload = valid.map(r => ({
      batch_id: batchId,
      employee_id: r.employeeId!,
      employee_code: r.employeeCode,
      employee_name: r.employeeName,
      amount: r.amount,
      bank_id_number: r.bankIdNumber,
      bank_account_number: r.bankAccountNumber,
      bonus_month: bonusMonth,
      uploaded_by: user?.id || null,
    }));
    const { error } = await supabase.from('non_recurring_bonuses').insert(payload);
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error(isRTL ? 'فشل حفظ السجلات' : 'Failed to save records');
      return;
    }
    toast.success(isRTL ? `تم حفظ ${valid.length} سجل` : `Saved ${valid.length} records`);
    setRows([]);
    loadHistory();
  };

  const deleteBatch = async (batchId: string) => {
    if (!confirm(isRTL ? 'حذف هذه الدفعة بالكامل؟' : 'Delete this entire batch?')) return;
    const { error } = await supabase.from('non_recurring_bonuses').delete().eq('batch_id', batchId);
    if (error) { toast.error(isRTL ? 'فشل الحذف' : 'Delete failed'); return; }
    toast.success(isRTL ? 'تم الحذف' : 'Deleted');
    loadHistory();
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

  const exportResult = (data: { employeeCode: string; employeeName: string; amount: number; bankIdNumber: string; bankAccountNumber: string }[], filename: string) => {
    if (data.length === 0) return;
    const ws = XLSX.utils.aoa_to_sheet([
      [
        isRTL ? 'كود الموظف' : 'Employee ID',
        isRTL ? 'اسم الموظف' : 'Employee Name',
        isRTL ? 'المبلغ' : 'Amount',
        isRTL ? 'رقم البطاقة البنكية' : 'Bank ID',
        isRTL ? 'رقم الحساب البنكي' : 'Bank Account',
      ],
      ...data.map(r => [r.employeeCode, r.employeeName, r.amount, r.bankIdNumber, r.bankAccountNumber]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bonuses');
    XLSX.writeFile(wb, filename);
  };

  const total = rows.reduce((s, r) => s + r.amount, 0);

  // Group history by batch
  const batches = history.reduce<Record<string, SavedRecord[]>>((acc, r) => {
    (acc[r.batch_id] = acc[r.batch_id] || []).push(r);
    return acc;
  }, {});
  const batchList = Object.entries(batches).sort((a, b) =>
    b[1][0].created_at.localeCompare(a[1][0].created_at)
  );

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            {isRTL ? 'رفع جديد' : 'New Upload'}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            {isRTL ? 'السجلات المحفوظة' : 'Saved Records'} ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
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
                <Input
                  type="month"
                  value={bonusMonth}
                  onChange={(e) => setBonusMonth(e.target.value)}
                  className="max-w-[180px]"
                />
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-2" />
                  {isRTL ? 'تحميل نموذج' : 'Download Template'}
                </Button>
                {rows.length > 0 && (
                  <>
                    <Button onClick={saveBatch} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      {isRTL ? 'حفظ السجلات' : 'Save Records'}
                    </Button>
                    <Button variant="outline" onClick={() => exportResult(rows, `non_recurring_bonuses_${new Date().toISOString().slice(0, 10)}.xlsx`)}>
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
                  ? 'الملف يجب أن يحتوي على عمودين: كود الموظف ID والمبلغ. اضغط "حفظ السجلات" للاحتفاظ بها للرجوع لاحقاً.'
                  : 'File must contain two columns: Employee ID and Amount. Click "Save Records" to persist them.'}
              </p>
            </CardContent>
          </Card>

          {rows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{isRTL ? 'المعاينة' : 'Preview'} ({rows.length})</span>
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
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {loadingHistory ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : batchList.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              {isRTL ? 'لا توجد سجلات محفوظة' : 'No saved records'}
            </CardContent></Card>
          ) : (
            batchList.map(([batchId, items]) => {
              const batchTotal = items.reduce((s, r) => s + Number(r.amount), 0);
              const created = new Date(items[0].created_at);
              const dateStr = `${String(created.getDate()).padStart(2, '0')}/${String(created.getMonth() + 1).padStart(2, '0')}/${created.getFullYear()} ${String(created.getHours()).padStart(2, '0')}:${String(created.getMinutes()).padStart(2, '0')}`;
              return (
                <Card key={batchId}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base flex-wrap gap-2">
                      <span className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-primary" />
                        {isRTL ? 'دفعة' : 'Batch'} • {dateStr}
                        {items[0].bonus_month && <span className="text-sm text-muted-foreground">({items[0].bonus_month})</span>}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-primary font-semibold">
                          {items.length} {isRTL ? 'سجل' : 'records'} • {batchTotal.toLocaleString()}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => exportResult(items.map(i => ({
                          employeeCode: i.employee_code,
                          employeeName: i.employee_name || '',
                          amount: Number(i.amount),
                          bankIdNumber: i.bank_id_number || '-',
                          bankAccountNumber: i.bank_account_number || '-',
                        })), `bonuses_batch_${dateStr.replace(/[/: ]/g, '_')}.xlsx`)}>
                          <FileSpreadsheet className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteBatch(batchId)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{isRTL ? 'كود الموظف' : 'Employee ID'}</TableHead>
                            <TableHead>{isRTL ? 'اسم الموظف' : 'Employee Name'}</TableHead>
                            <TableHead>{isRTL ? 'المبلغ' : 'Amount'}</TableHead>
                            <TableHead>{isRTL ? 'رقم البطاقة البنكية' : 'Bank ID'}</TableHead>
                            <TableHead>{isRTL ? 'رقم الحساب البنكي' : 'Bank Account'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map(r => (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{r.employee_code}</TableCell>
                              <TableCell>{r.employee_name}</TableCell>
                              <TableCell className="font-semibold text-primary">{Number(r.amount).toLocaleString()}</TableCell>
                              <TableCell>{r.bank_id_number || '-'}</TableCell>
                              <TableCell>{r.bank_account_number || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
