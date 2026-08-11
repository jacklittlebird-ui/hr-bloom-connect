import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Upload, Trash2, Search, Printer, FileText, FileSpreadsheet, CalendarDays, Users, Calendar, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { supabase } from '@/integrations/supabase/client';
import { useReportExport } from '@/hooks/useReportExport';

interface LivingAllowanceEntry {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  station: string;
  amount: number;
  deductionMonth: string;
  status: 'pending' | 'deducted';
  uploadDate: string;
}

const getMonthLabel = (dateStr: string, lang: string) => {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
};

export const LivingAllowances = () => {
  const { isRTL, language } = useLanguage();
  const { employees } = useEmployeeData();
  const { handlePrint, exportToPDF, exportToCSV } = useReportExport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentMonthValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [deductionMonth, setDeductionMonth] = useState(currentMonthValue);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [entries, setEntries] = useState<LivingAllowanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LivingAllowanceEntry | null>(null);
  const [editDays, setEditDays] = useState('');

  const empById = useMemo(() => {
    const map: Record<string, typeof employees[0]> = {};
    employees.forEach(e => { if (e.id) map[e.id] = e; });
    return map;
  }, [employees]);

  const empByCode = useMemo(() => {
    const map: Record<string, typeof employees[0]> = {};
    employees.forEach(e => { if (e.employeeId) map[e.employeeId.toLowerCase()] = e; });
    return map;
  }, [employees]);

  const enrichEntry = useCallback((row: any): LivingAllowanceEntry => {
    const emp = empById[row.employee_id];
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeCode: emp?.employeeId || '',
      employeeName: emp?.nameAr || row.employee_id,
      department: emp?.department || '-',
      station: emp?.stationLocation || '',
      amount: Number(row.amount) || 0,
      deductionMonth: row.allowance_month,
      status: row.status === 'deducted' ? 'deducted' : 'pending',
      uploadDate: row.created_at ? row.created_at.split('T')[0] : '',
    };
  }, [empById]);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('living_allowances').select('*').order('created_at', { ascending: false });
    if (!error && data) setEntries(data.map(enrichEntry));
    setLoading(false);
  }, [enrichEntry]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useEffect(() => {
    if (employees.length > 0 && entries.length > 0) {
      setEntries(prev => prev.map(e => {
        const emp = empById[e.employeeId];
        return emp
          ? { ...e, employeeCode: emp.employeeId || '', employeeName: emp.nameAr || e.employeeName, department: emp.department || '-', station: emp.stationLocation || '' }
          : e;
      }));
    }
  }, [employees]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!deductionMonth) {
      toast({ title: isRTL ? 'خطأ' : 'Error', description: isRTL ? 'يرجى تحديد شهر الإضافة أولاً' : 'Please select allowance month first', variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast({ title: isRTL ? 'خطأ' : 'Error', description: isRTL ? 'يرجى رفع ملف Excel أو CSV' : 'Please upload an Excel or CSV file', variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const data = event.target?.result;
      if (!data) return;
      try {
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (rows.length < 2) {
          toast({ title: isRTL ? 'خطأ' : 'Error', description: isRTL ? 'الملف فارغ أو لا يحتوي على بيانات' : 'File is empty or has no data', variant: 'destructive' });
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        const payload: any[] = [];
        let skippedCount = 0;

        for (const row of rows.slice(1)) {
          const empCode = String(row[0] || '').trim();
          const amount = parseFloat(String(row[1] || ''));
          if (!empCode || isNaN(amount) || amount <= 0) { skippedCount++; continue; }
          const employee = empByCode[empCode.toLowerCase()];
          if (!employee?.id) { skippedCount++; continue; }
          payload.push({ employee_id: employee.id, amount, allowance_month: deductionMonth, status: 'pending', uploaded_by: user?.id || null });
        }

        if (payload.length === 0) {
          toast({
            title: isRTL ? 'خطأ' : 'Error',
            description: isRTL ? 'لم يتم العثور على بيانات صالحة. تأكد أن الملف يحتوي على عمودين: رقم ID الموظف وبدل المعيشة' : 'No valid data found. Ensure file has two columns: Employee ID and Living Allowance',
            variant: 'destructive',
          });
        } else {
          const { error } = await supabase.from('living_allowances').upsert(payload, { onConflict: 'employee_id,allowance_month' });
          if (error) {
            toast({ title: isRTL ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
          } else {
            toast({
              title: isRTL ? 'تم الرفع بنجاح' : 'Upload Successful',
              description: isRTL
                ? `تم حفظ ${payload.length} سجل${skippedCount > 0 ? ` (تم تخطي ${skippedCount} سطر غير صالح)` : ''}`
                : `${payload.length} records saved${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`,
            });
            await fetchEntries();
          }
        }
      } catch {
        toast({ title: isRTL ? 'خطأ' : 'Error', description: isRTL ? 'فشل في قراءة الملف' : 'Failed to read file', variant: 'destructive' });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from('living_allowances').delete().eq('id', deletingId);
    if (!error) {
      setEntries(prev => prev.filter(e => e.id !== deletingId));
      toast({ title: isRTL ? 'تم الحذف' : 'Deleted' });
    }
    setShowDeleteDialog(false);
    setDeletingId(null);
  };

  const handleMarkDeducted = async (id: string) => {
    const { error } = await supabase.from('living_allowances').update({ status: 'deducted' }).eq('id', id);
    if (!error) {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'deducted' as const } : e));
      toast({ title: isRTL ? 'تم تحديث الحالة' : 'Status Updated' });
    }
  };

  const handleBulkDeduct = async () => {
    if (monthFilter === 'all') {
      toast({ title: isRTL ? 'خطأ' : 'Error', description: isRTL ? 'يرجى اختيار شهر محدد أولاً' : 'Please select a specific month first', variant: 'destructive' });
      return;
    }
    const pendingIds = entries.filter(e => e.deductionMonth === monthFilter && e.status === 'pending').map(e => e.id);
    if (pendingIds.length === 0) {
      toast({ title: isRTL ? 'تنبيه' : 'Notice', description: isRTL ? 'لا توجد سجلات قيد الإضافة لهذا الشهر' : 'No pending records for this month' });
      return;
    }
    const { error } = await supabase.from('living_allowances').update({ status: 'deducted' }).in('id', pendingIds);
    if (!error) {
      setEntries(prev => prev.map(e => pendingIds.includes(e.id) ? { ...e, status: 'deducted' as const } : e));
      toast({ title: isRTL ? 'تمت الإضافة الجماعية' : 'Bulk Add Done' });
    }
  };

  const handleEditSave = async () => {
    const newAmount = parseFloat(editDays);
    if (!editingEntry || isNaN(newAmount) || newAmount <= 0) return;
    const { error } = await supabase.from('living_allowances').update({ amount: newAmount }).eq('id', editingEntry.id);
    if (!error) {
      setEntries(prev => prev.map(e => e.id === editingEntry.id ? { ...e, amount: newAmount } : e));
      setShowEditDialog(false);
      toast({ title: isRTL ? 'تم التحديث' : 'Updated' });
    }
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.employeeName.includes(searchQuery) || e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchesMonth = monthFilter === 'all' || e.deductionMonth === monthFilter;
    return matchesSearch && matchesStatus && matchesMonth;
  });

  const { paginatedItems, currentPage, totalPages, totalItems, startIndex, endIndex, setCurrentPage } = usePagination(filteredEntries);

  const stats = useMemo(() => ({
    total: entries.length,
    pending: entries.filter(e => e.status === 'pending').length,
    totalAmount: entries.reduce((s, e) => s + e.amount, 0),
    addedAmount: entries.filter(e => e.status === 'deducted').reduce((s, e) => s + e.amount, 0),
  }), [entries]);

  const exportTitle = isRTL ? 'تقرير بدلات المعيشة' : 'Living Allowances Report';
  const exportColumns = [
    { header: isRTL ? 'رقم الموظف' : 'Employee ID', key: 'employeeCode' },
    { header: isRTL ? 'اسم الموظف' : 'Employee', key: 'employeeName' },
    { header: isRTL ? 'القسم' : 'Department', key: 'department' },
    { header: isRTL ? 'بدل المعيشة' : 'Living Allowance', key: 'amount' },
    { header: isRTL ? 'شهر الإضافة' : 'Allowance Month', key: 'monthLabel' },
    { header: isRTL ? 'الحالة' : 'Status', key: 'statusLabel' },
  ];
  const exportData = filteredEntries.map(e => ({
    ...e,
    monthLabel: getMonthLabel(e.deductionMonth, language),
    statusLabel: e.status === 'pending' ? (isRTL ? 'قيد الإضافة' : 'Pending') : (isRTL ? 'تمت الإضافة' : 'Added'),
  }));

  const generateMonths = () => {
    const months: { value: string; label: string }[] = [];
    for (let year = 2025; year <= 2030; year++) {
      for (let month = 1; month <= 12; month++) {
        const val = `${year}-${String(month).padStart(2, '0')}`;
        months.push({ value: val, label: getMonthLabel(val, language) });
      }
    }
    return months;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: isRTL ? 'إجمالي السجلات' : 'Total Records', value: stats.total, icon: Users, bgClass: 'bg-stat-blue-bg', iconBg: 'bg-stat-blue' },
          { label: isRTL ? 'قيد الإضافة' : 'Pending', value: stats.pending, icon: Calendar, bgClass: 'bg-stat-yellow-bg', iconBg: 'bg-stat-yellow' },
          { label: isRTL ? 'إجمالي البدلات' : 'Total Amount', value: stats.totalAmount.toLocaleString(), icon: CalendarDays, bgClass: 'bg-stat-purple-bg', iconBg: 'bg-stat-purple' },
          { label: isRTL ? 'البدلات المضافة' : 'Added Amount', value: stats.addedAmount.toLocaleString(), icon: CalendarDays, bgClass: 'bg-stat-green-bg', iconBg: 'bg-stat-green' },
        ].map((s, i) => (
          <div key={i} className={cn("rounded-xl p-5 flex items-center gap-4 shadow-sm border border-border/30", s.bgClass, isRTL && "flex-row-reverse")}>
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", s.iconBg)}>
              <s.icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Upload className="h-5 w-5" />
            {isRTL ? 'رفع بدلات المعيشة' : 'Upload Living Allowances'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("flex flex-col md:flex-row gap-4 items-end", isRTL && "md:flex-row-reverse")}>
            <div className="space-y-2 flex-1">
              <Label>{isRTL ? 'شهر الإضافة *' : 'Allowance Month *'}</Label>
              <Select value={deductionMonth} onValueChange={setDeductionMonth}>
                <SelectTrigger className="w-full md:w-60">
                  <SelectValue placeholder={isRTL ? '-- اختر شهر الإضافة --' : '-- Select Month --'} />
                </SelectTrigger>
                <SelectContent>
                  {generateMonths().map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>{isRTL ? 'ملف بدلات المعيشة (Excel/CSV) *' : 'Allowances File (Excel/CSV) *'}</Label>
              <Input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="flex-1" />
            </div>
          </div>
          <div className={cn("mt-4 p-4 rounded-lg bg-muted/50 border border-border/50", isRTL && "text-right")}>
            <p className="text-sm font-medium text-foreground mb-2">
              <CalendarDays className="h-4 w-4 inline-block mx-1" />
              {isRTL ? 'تعليمات الملف:' : 'File Instructions:'}
            </p>
            <ul className={cn("text-xs text-muted-foreground space-y-1", isRTL ? "list-disc pr-5" : "list-disc pl-5")}>
              <li>{isRTL ? 'العمود الأول: رقم ID الموظف (مثال: Emp001)' : 'Column 1: Employee ID (e.g., Emp001)'}</li>
              <li>{isRTL ? 'العمود الثاني: قيمة بدل المعيشة المضافة للراتب' : 'Column 2: Living allowance amount added to salary'}</li>
              <li>{isRTL ? 'السطر الأول يعتبر عنوان الأعمدة ويتم تخطيه' : 'First row is treated as header and skipped'}</li>
              <li>{isRTL ? 'رفع نفس الموظف لنفس الشهر يقوم بتحديث عدد الأيام' : 'Re-uploading the same employee for the same month updates the days'}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-4", isRTL && "md:flex-row-reverse")}>
            <CardTitle>{isRTL ? 'سجل بدلات المعيشة' : 'Living Allowances Log'}</CardTitle>
            <div className={cn("flex flex-wrap gap-3", isRTL && "flex-row-reverse")}>
              <div className="relative">
                <Search className={cn("absolute top-3 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                <Input placeholder={isRTL ? 'بحث...' : 'Search...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={cn("w-full md:w-48", isRTL ? "pr-9" : "pl-9")} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="pending">{isRTL ? 'قيد الإضافة' : 'Pending'}</SelectItem>
                  <SelectItem value="deducted">{isRTL ? 'تمت الإضافة' : 'Added'}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder={isRTL ? 'شهر الإضافة' : 'Month'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع الأشهر' : 'All Months'}</SelectItem>
                  {[...new Set(entries.map(e => e.deductionMonth))].sort().map(m => (
                    <SelectItem key={m} value={m}>{getMonthLabel(m, language)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {monthFilter !== 'all' && (
                <Badge variant="secondary" className="text-sm px-3 py-1.5">
                  {isRTL
                    ? `${filteredEntries.length} سجل | ${filteredEntries.reduce((s, e) => s + e.amount, 0).toLocaleString()} ج.م`
                    : `${filteredEntries.length} records | ${filteredEntries.reduce((s, e) => s + e.amount, 0).toLocaleString()} EGP`}
                </Badge>
              )}
              {monthFilter !== 'all' && entries.some(e => e.deductionMonth === monthFilter && e.status === 'pending') && (
                <Button variant="default" size="sm" onClick={handleBulkDeduct}>
                  {isRTL ? 'إضافة جماعية' : 'Bulk Add'}
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={() => handlePrint(exportTitle)}><Printer className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => exportToPDF({ title: exportTitle, data: exportData, columns: exportColumns })} className="gap-1.5"><FileText className="h-4 w-4" />{isRTL ? 'معاينة PDF' : 'Preview PDF'}</Button>
              <Button variant="outline" size="icon" onClick={() => exportToCSV({ title: exportTitle, data: exportData, columns: exportColumns, fileName: 'living-allowances' })}><FileSpreadsheet className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(isRTL && "text-right")}>{isRTL ? 'رقم الموظف' : 'Employee ID'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{isRTL ? 'اسم الموظف' : 'Employee'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{isRTL ? 'القسم' : 'Department'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{isRTL ? 'بدل المعيشة' : 'Living Allowance'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{isRTL ? 'شهر الإضافة' : 'Allowance Month'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{isRTL ? 'تاريخ الرفع' : 'Upload Date'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{isRTL ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className={cn("font-mono text-xs", isRTL && "text-right")}>{entry.employeeCode}</TableCell>
                  <TableCell className={cn("font-medium", isRTL && "text-right")}>{entry.employeeName}</TableCell>
                  <TableCell className={cn(isRTL && "text-right")}>{entry.department}</TableCell>
                  <TableCell className={cn("font-semibold", isRTL && "text-right")}>{entry.amount.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</TableCell>
                  <TableCell className={cn(isRTL && "text-right")}>{getMonthLabel(entry.deductionMonth, language)}</TableCell>
                  <TableCell className={cn(isRTL && "text-right")}>{entry.uploadDate}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={entry.status === 'deducted' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-yellow-100 text-yellow-700 border-yellow-300'}>
                      {entry.status === 'deducted' ? (isRTL ? 'تمت الإضافة' : 'Added') : (isRTL ? 'قيد الإضافة' : 'Pending')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                      {entry.status === 'pending' && (
                        <Button size="sm" variant="outline" className="text-xs gap-1 text-green-600" onClick={() => handleMarkDeducted(entry.id)}>
                          {isRTL ? 'إضافة' : 'Add'}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setEditingEntry(entry); setEditDays(String(entry.amount)); setShowEditDialog(true); }}>
                        <Edit className="h-3 w-3" />{isRTL ? 'تعديل' : 'Edit'}
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive hover:text-destructive" onClick={() => { setDeletingId(entry.id); setShowDeleteDialog(true); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredEntries.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">{loading ? (isRTL ? 'جاري التحميل...' : 'Loading...') : (isRTL ? 'لا توجد سجلات' : 'No records found')}</div>
          )}
          <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setCurrentPage} />
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>{isRTL ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Delete this record?'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isRTL ? 'حذف' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'تعديل بدل المعيشة' : 'Edit Living Allowance'}</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-muted-foreground">{isRTL ? 'الموظف' : 'Employee'}</Label>
                <p className="font-medium">{editingEntry.employeeName}</p>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'بدل المعيشة' : 'Living Allowance'}</Label>
                <Input type="number" step="0.5" value={editDays} onChange={e => setEditDays(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleEditSave}>{isRTL ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
