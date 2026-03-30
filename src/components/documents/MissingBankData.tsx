import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Search, Edit, Landmark, AlertTriangle, Printer, Download, Building2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { usePagination } from '@/hooks/usePagination';
import { useReportExport } from '@/hooks/useReportExport';

const defaultBanks = [
  { value: 'credit_agricole', labelAr: 'كريدي أجريكول', labelEn: 'Crédit Agricole' },
  { value: 'nbe', labelAr: 'البنك الأهلي المصري', labelEn: 'National Bank of Egypt' },
  { value: 'cash', labelAr: 'نقدي', labelEn: 'Cash' },
  { value: 'other', labelAr: 'أخرى', labelEn: 'Other' },
];

export const MissingBankData = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { employees, refreshEmployees } = useEmployeeData();
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [editEmployee, setEditEmployee] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ bankName: '', bankAccountNumber: '', bankIdNumber: '', bankAccountType: '' });
  const { reportRef, handlePrint, exportBilingualCSV } = useReportExport();

  const stations = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    employees.filter(e => e.status === 'active' && e.stationName).forEach(e => {
      if (!map.has(e.stationName!)) map.set(e.stationName!, { id: e.stationName!, name: e.stationName! });
    });
    return Array.from(map.values());
  }, [employees]);

  const depts = useMemo(() => {
    const map = new Map<string, string>();
    employees.filter(e => e.status === 'active' && e.department).forEach(e => { if (!map.has(e.department!)) map.set(e.department!, e.department!); });
    return Array.from(map.keys());
  }, [employees]);

  const missingBankEmployees = useMemo(() => {
    return employees
      .filter(e => e.status === 'active')
      .filter(e => !e.bankAccountNumber || !e.bankIdNumber)
      .filter(e => {
        if (search) {
          if (!e.nameAr.includes(search) && !e.nameEn.toLowerCase().includes(search.toLowerCase()) && !e.employeeId.includes(search)) return false;
        }
        if (selectedStation !== 'all' && e.stationName !== selectedStation) return false;
        if (selectedDept !== 'all' && e.department !== selectedDept) return false;
        return true;
      });
  }, [employees, search, selectedStation, selectedDept]);

  const { paginatedItems, currentPage, totalPages, totalItems, setCurrentPage, startIndex, endIndex } = usePagination(missingBankEmployees, 20);

  const openEdit = (emp: any) => {
    setEditEmployee(emp);
    setForm({ bankName: emp.bankName || '', bankAccountNumber: emp.bankAccountNumber || '', bankIdNumber: emp.bankIdNumber || '', bankAccountType: emp.bankAccountType || '' });
  };

  const handleSave = async () => {
    if (!editEmployee) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('employees').update({ bank_name: form.bankName || null, bank_account_number: form.bankAccountNumber || null, bank_id_number: form.bankIdNumber || null, bank_account_type: form.bankAccountType || null }).eq('id', editEmployee.id);
      if (error) throw error;
      toast({ title: ar ? 'تم حفظ البيانات البنكية بنجاح' : 'Bank data saved successfully' });
      setEditEmployee(null);
      refreshEmployees();
    } catch (err: any) {
      toast({ title: ar ? 'خطأ في الحفظ' : 'Save error', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleExportExcel = () => {
    const columns = [
      { headerAr: 'كود الموظف', headerEn: 'Code', key: 'code' },
      { headerAr: 'الاسم', headerEn: 'Name', key: 'nameAr' },
      { headerAr: 'الاسم بالإنجليزية', headerEn: 'Name (EN)', key: 'nameEn' },
      { headerAr: 'المحطة', headerEn: 'Station', key: 'station' },
      { headerAr: 'القسم', headerEn: 'Department', key: 'dept' },
      { headerAr: 'المسمى الوظيفي', headerEn: 'Job Title', key: 'jobTitle' },
      { headerAr: 'الحالة', headerEn: 'Status', key: 'status' },
    ];
    const data = missingBankEmployees.map(e => ({
      code: e.employeeId, nameAr: e.nameAr, nameEn: e.nameEn,
      station: e.stationName || '-', dept: e.department || '-',
      jobTitle: e.jobTitle || '-', status: ar ? 'غير مسجل' : 'Missing',
    }));
    exportBilingualCSV({ titleAr: 'الموظفين بدون بيانات بنكية', titleEn: 'Employees Missing Bank Data', data, columns, fileName: 'Missing_Bank_Data',
      summaryCards: [{ label: ar ? 'بدون بيانات بنكية' : 'Missing Bank Data', value: String(missingBankEmployees.length) }],
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-5 h-5 text-destructive" /></div><div><p className="text-2xl font-bold">{missingBankEmployees.length}</p><p className="text-xs text-muted-foreground">{ar ? 'موظف بدون بيانات بنكية' : 'Employees without bank data'}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Landmark className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{employees.filter(e => e.status === 'active' && (e.bankName || e.bankAccountNumber)).length}</p><p className="text-xs text-muted-foreground">{ar ? 'موظف لديه بيانات بنكية' : 'Employees with bank data'}</p></div></CardContent></Card>
      </div>

      <div className={cn("flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3", isRTL && "sm:flex-row-reverse")}>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <Input placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'} value={search} onChange={e => setSearch(e.target.value)} className={cn("h-10", isRTL ? "pr-10" : "pl-10")} />
        </div>
        <Select value={selectedStation} onValueChange={setSelectedStation}>
          <SelectTrigger className="w-full sm:w-[200px] h-10"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><SelectValue placeholder={ar ? 'كل المحطات' : 'All Stations'} /></SelectTrigger>
          <SelectContent className="w-80 max-h-[300px] overflow-y-auto">
            <SelectItem value="all">{ar ? 'كل المحطات' : 'All Stations'}</SelectItem>
            {stations.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="w-full sm:w-[200px] h-10"><Building2 className="h-4 w-4 text-muted-foreground shrink-0" /><SelectValue placeholder={ar ? 'كل الأقسام' : 'All Departments'} /></SelectTrigger>
          <SelectContent className="w-80 max-h-[300px] overflow-y-auto">
            <SelectItem value="all">{ar ? 'كل الأقسام' : 'All Departments'}</SelectItem>
            {depts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-10" onClick={() => handlePrint(ar ? 'الموظفين بدون بيانات بنكية' : 'Missing Bank Data', [{ label: ar ? 'إجمالي' : 'Total', value: String(missingBankEmployees.length) }])}>
            <Printer className="w-4 h-4" /> {ar ? 'طباعة' : 'Print'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-10" onClick={handleExportExcel}>
            <Download className="w-4 h-4" /> {ar ? 'تصدير Excel' : 'Export Excel'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div ref={reportRef}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ar ? 'كود الموظف' : 'Code'}</TableHead>
                  <TableHead>{ar ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                  <TableHead>{ar ? 'القسم' : 'Department'}</TableHead>
                  <TableHead>{ar ? 'المسمى الوظيفي' : 'Job Title'}</TableHead>
                  <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="print:hidden">{ar ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-sm">{emp.employeeId}</TableCell>
                    <TableCell className="font-medium">{ar ? emp.nameAr : emp.nameEn}</TableCell>
                    <TableCell>{emp.stationName || '—'}</TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.jobTitle}</TableCell>
                    <TableCell><Badge variant="destructive" className="text-xs">{ar ? 'غير مسجل' : 'Missing'}</Badge></TableCell>
                    <TableCell className="print:hidden">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEdit(emp)}><Edit className="w-3.5 h-3.5" />{ar ? 'تعديل' : 'Edit'}</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedItems.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{ar ? 'جميع الموظفين لديهم بيانات بنكية' : 'All employees have bank data'}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} startIndex={startIndex} endIndex={endIndex} totalItems={totalItems} />}

      <Dialog open={!!editEmployee} onOpenChange={open => !open && setEditEmployee(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}><Landmark className="w-5 h-5 text-primary" />{ar ? 'إضافة بيانات بنكية' : 'Add Bank Data'}</DialogTitle>
            {editEmployee && <p className="text-sm text-muted-foreground">{ar ? editEmployee.nameAr : editEmployee.nameEn} ({editEmployee.employeeId})</p>}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>{ar ? 'اسم البنك' : 'Bank Name'}</Label>
              <Select value={form.bankName} onValueChange={v => setForm(f => ({ ...f, bankName: v }))}><SelectTrigger><SelectValue placeholder={ar ? '-- اختر البنك --' : '-- Select Bank --'} /></SelectTrigger>
                <SelectContent>{defaultBanks.map(b => <SelectItem key={b.value} value={b.value}>{ar ? b.labelAr : b.labelEn}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{ar ? 'رقم الحساب البنكي' : 'Bank Account Number'}</Label><Input value={form.bankAccountNumber} onChange={e => setForm(f => ({ ...f, bankAccountNumber: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{ar ? 'رقم الـ ID البنكي' : 'Bank ID Number'}</Label><Input value={form.bankIdNumber} onChange={e => setForm(f => ({ ...f, bankIdNumber: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>{ar ? 'نوع الحساب البنكي' : 'Account Type'}</Label><Input value={form.bankAccountType} onChange={e => setForm(f => ({ ...f, bankAccountType: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEmployee(null)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ' : 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
