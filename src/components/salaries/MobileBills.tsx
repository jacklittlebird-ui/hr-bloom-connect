import { useState, useRef, useMemo } from 'react';
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
import { Upload, Trash2, Smartphone, Search, Printer, FileText, FileSpreadsheet, Phone, Users, Banknote, Calendar, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { stationLocations } from '@/data/stationLocations';
import { useReportExport } from '@/hooks/useReportExport';

interface MobileBillEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  station: string;
  billAmount: number;
  deductionMonth: string;
  status: 'pending' | 'deducted';
  uploadDate: string;
  batchId: string;
}

const getMonthLabel = (dateStr: string, lang: string) => {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
};

export const MobileBills = () => {
  const { isRTL, language } = useLanguage();
  const { employees } = useEmployeeData();
  const { handlePrint, exportToPDF, exportToCSV } = useReportExport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deductionMonth, setDeductionMonth] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [entries, setEntries] = useState<MobileBillEntry[]>([
    { id: '1', employeeId: 'Emp001', employeeName: 'جلال عبد الرازق عبد العليم', department: 'تقنية المعلومات', station: 'capital', billAmount: 350, deductionMonth: '2026-02', status: 'pending', uploadDate: '2026-02-01', batchId: 'B001' },
    { id: '2', employeeId: 'Emp002', employeeName: 'أحمد محمد علي', department: 'الموارد البشرية', station: 'cairo', billAmount: 280, deductionMonth: '2026-02', status: 'pending', uploadDate: '2026-02-01', batchId: 'B001' },
    { id: '3', employeeId: 'Emp003', employeeName: 'سارة أحمد حسن', department: 'المالية', station: 'cairo', billAmount: 420, deductionMonth: '2026-01', status: 'deducted', uploadDate: '2026-01-05', batchId: 'B000' },
  ]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MobileBillEntry | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!deductionMonth) {
      toast({ title: isRTL ? 'خطأ' : 'Error', description: isRTL ? 'يرجى تحديد شهر الخصم أولاً' : 'Please select deduction month first', variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({ title: isRTL ? 'خطأ' : 'Error', description: isRTL ? 'يرجى رفع ملف Excel أو CSV' : 'Please upload an Excel or CSV file', variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Parse CSV
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').filter(l => l.trim());
      // Skip header row
      const dataLines = lines.slice(1);
      const batchId = `B${String(Date.now()).slice(-4)}`;
      const newEntries: MobileBillEntry[] = [];
      let skippedCount = 0;

      dataLines.forEach((line, idx) => {
        const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
        const empId = parts[0];
        const amount = parseFloat(parts[1]);

        if (!empId || isNaN(amount) || amount <= 0) {
          skippedCount++;
          return;
        }

        const employee = employees.find(emp => emp.employeeId === empId);
        
        newEntries.push({
          id: `${Date.now()}-${idx}`,
          employeeId: empId,
          employeeName: employee?.nameAr || empId,
          department: employee?.department || '-',
          station: employee?.stationLocation || '',
          billAmount: amount,
          deductionMonth,
          status: 'pending',
          uploadDate: new Date().toISOString().split('T')[0],
          batchId,
        });
      });

      if (newEntries.length === 0) {
        toast({
          title: isRTL ? 'خطأ' : 'Error',
          description: isRTL ? 'لم يتم العثور على بيانات صالحة في الملف. تأكد أن الملف يحتوي على عمودين: رقم ID الموظف ومبلغ الفاتورة' : 'No valid data found. Ensure file has two columns: Employee ID and Bill Amount',
          variant: 'destructive',
        });
      } else {
        let updatedCount = 0;
        let addedCount = 0;
        setEntries(prev => {
          const updated = [...prev];
          newEntries.forEach(ne => {
            const existingIdx = updated.findIndex(e => e.employeeId === ne.employeeId && e.deductionMonth === ne.deductionMonth);
            if (existingIdx !== -1) {
              updated[existingIdx] = { ...updated[existingIdx], billAmount: ne.billAmount, uploadDate: ne.uploadDate, batchId: ne.batchId };
              updatedCount++;
            } else {
              updated.push(ne);
              addedCount++;
            }
          });
          return updated;
        });
        toast({
          title: isRTL ? 'تم الرفع بنجاح' : 'Upload Successful',
          description: isRTL
            ? `تم إضافة ${addedCount} فاتورة${updatedCount > 0 ? ` وتحديث ${updatedCount} فاتورة موجودة` : ''}${skippedCount > 0 ? ` (تم تخطي ${skippedCount} سطر غير صالح)` : ''}`
            : `${addedCount} added${updatedCount > 0 ? `, ${updatedCount} updated` : ''}${skippedCount > 0 ? ` (${skippedCount} skipped)` : ''}`,
        });
      }

      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleDelete = () => {
    if (deletingId) setEntries(prev => prev.filter(e => e.id !== deletingId));
    setShowDeleteDialog(false);
    setDeletingId(null);
    toast({ title: isRTL ? 'تم الحذف' : 'Deleted' });
  };

  const handleMarkDeducted = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'deducted' as const } : e));
    toast({ title: isRTL ? 'تم تحديث الحالة' : 'Status Updated' });
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.employeeName.includes(searchQuery) || e.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchesStation = stationFilter === 'all' || e.station === stationFilter;
    const matchesMonth = monthFilter === 'all' || e.deductionMonth === monthFilter;
    return matchesSearch && matchesStatus && matchesStation && matchesMonth;
  });

  const stats = useMemo(() => ({
    total: entries.length,
    pending: entries.filter(e => e.status === 'pending').length,
    totalAmount: entries.reduce((s, e) => s + e.billAmount, 0),
    deductedAmount: entries.filter(e => e.status === 'deducted').reduce((s, e) => s + e.billAmount, 0),
  }), [entries]);

  const exportTitle = isRTL ? 'تقرير فواتير الموبايل' : 'Mobile Bills Report';
  const exportColumns = [
    { header: isRTL ? 'رقم الموظف' : 'Employee ID', key: 'employeeId' },
    { header: isRTL ? 'اسم الموظف' : 'Employee', key: 'employeeName' },
    { header: isRTL ? 'القسم' : 'Department', key: 'department' },
    { header: isRTL ? 'مبلغ الفاتورة' : 'Bill Amount', key: 'billAmount' },
    { header: isRTL ? 'شهر الخصم' : 'Deduction Month', key: 'monthLabel' },
    { header: isRTL ? 'الحالة' : 'Status', key: 'statusLabel' },
  ];
  const exportData = filteredEntries.map(e => ({
    ...e,
    monthLabel: getMonthLabel(e.deductionMonth, language),
    statusLabel: e.status === 'pending' ? (isRTL ? 'قيد الخصم' : 'Pending') : (isRTL ? 'تم الخصم' : 'Deducted'),
  }));

  const generateMonths = () => {
    const months: { value: string; label: string }[] = [];
    for (let year = 2025; year <= 2050; year++) {
      for (let month = 1; month <= 12; month++) {
        const val = `${year}-${String(month).padStart(2, '0')}`;
        months.push({ value: val, label: getMonthLabel(val, language) });
      }
    }
    return months;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: isRTL ? 'إجمالي الفواتير' : 'Total Bills', value: stats.total, icon: Phone, bgClass: 'bg-stat-blue-bg', iconBg: 'bg-stat-blue' },
          { label: isRTL ? 'قيد الخصم' : 'Pending', value: stats.pending, icon: Calendar, bgClass: 'bg-stat-yellow-bg', iconBg: 'bg-stat-yellow' },
          { label: isRTL ? 'إجمالي المبالغ' : 'Total Amount', value: `${stats.totalAmount.toLocaleString()}`, icon: Banknote, bgClass: 'bg-stat-purple-bg', iconBg: 'bg-stat-purple' },
          { label: isRTL ? 'المبالغ المخصومة' : 'Deducted', value: `${stats.deductedAmount.toLocaleString()}`, icon: Users, bgClass: 'bg-stat-green-bg', iconBg: 'bg-stat-green' },
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

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Upload className="h-5 w-5" />
            {isRTL ? 'رفع فواتير الموبايل' : 'Upload Mobile Bills'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("flex flex-col md:flex-row gap-4 items-end", isRTL && "md:flex-row-reverse")}>
            <div className="space-y-2 flex-1">
              <Label>{isRTL ? 'شهر الخصم *' : 'Deduction Month *'}</Label>
              <Select value={deductionMonth} onValueChange={setDeductionMonth}>
                <SelectTrigger className="w-full md:w-60">
                  <SelectValue placeholder={isRTL ? '-- اختر شهر الخصم --' : '-- Select Month --'} />
                </SelectTrigger>
                <SelectContent>
                  {generateMonths().map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>{isRTL ? 'ملف الفواتير (Excel/CSV) *' : 'Bills File (Excel/CSV) *'}</Label>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <div className={cn("mt-4 p-4 rounded-lg bg-muted/50 border border-border/50", isRTL && "text-right")}>
            <p className="text-sm font-medium text-foreground mb-2">
              <Smartphone className="h-4 w-4 inline-block mx-1" />
              {isRTL ? 'تعليمات الملف:' : 'File Instructions:'}
            </p>
            <ul className={cn("text-xs text-muted-foreground space-y-1", isRTL ? "list-disc pr-5" : "list-disc pl-5")}>
              <li>{isRTL ? 'العمود الأول: رقم ID الموظف (مثال: Emp001)' : 'Column 1: Employee ID (e.g., Emp001)'}</li>
              <li>{isRTL ? 'العمود الثاني: مبلغ فاتورة الموبايل' : 'Column 2: Mobile bill amount'}</li>
              <li>{isRTL ? 'السطر الأول يعتبر عنوان الأعمدة ويتم تخطيه' : 'First row is treated as header and skipped'}</li>
              <li>{isRTL ? 'سيتم خصم المبلغ تلقائياً عند معالجة رواتب الشهر المحدد' : 'Amount will be auto-deducted during payroll processing for the selected month'}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between gap-4", isRTL && "md:flex-row-reverse")}>
            <CardTitle>{isRTL ? 'سجل فواتير الموبايل' : 'Mobile Bills Log'}</CardTitle>
            <div className={cn("flex flex-wrap gap-3", isRTL && "flex-row-reverse")}>
              <div className="relative">
                <Search className={cn("absolute top-3 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                <Input placeholder={isRTL ? 'بحث...' : 'Search...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={cn("w-full md:w-48", isRTL ? "pr-9" : "pl-9")} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                  <SelectItem value="pending">{isRTL ? 'قيد الخصم' : 'Pending'}</SelectItem>
                  <SelectItem value="deducted">{isRTL ? 'تم الخصم' : 'Deducted'}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stationFilter} onValueChange={setStationFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder={isRTL ? 'المحطة' : 'Station'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                  {stationLocations.map(s => <SelectItem key={s.value} value={s.value}>{isRTL ? s.labelAr : s.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder={isRTL ? 'شهر الخصم' : 'Month'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع الأشهر' : 'All Months'}</SelectItem>
                  {[...new Set(entries.map(e => e.deductionMonth))].sort().map(m => (
                    <SelectItem key={m} value={m}>{getMonthLabel(m, language)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => handlePrint(exportTitle)}><Printer className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => exportToPDF({ title: exportTitle, data: exportData, columns: exportColumns })}><FileText className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => exportToCSV({ title: exportTitle, data: exportData, columns: exportColumns, fileName: 'mobile-bills' })}><FileSpreadsheet className="h-4 w-4" /></Button>
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
                <TableHead className={cn(isRTL && "text-right")}>{isRTL ? 'مبلغ الفاتورة' : 'Bill Amount'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{isRTL ? 'شهر الخصم' : 'Deduction Month'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{isRTL ? 'تاريخ الرفع' : 'Upload Date'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{isRTL ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{isRTL ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className={cn("font-mono text-xs", isRTL && "text-right")}>{entry.employeeId}</TableCell>
                  <TableCell className={cn("font-medium", isRTL && "text-right")}>{entry.employeeName}</TableCell>
                  <TableCell className={cn(isRTL && "text-right")}>{entry.department}</TableCell>
                  <TableCell className={cn("font-semibold", isRTL && "text-right")}>{entry.billAmount.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</TableCell>
                  <TableCell className={cn(isRTL && "text-right")}>{getMonthLabel(entry.deductionMonth, language)}</TableCell>
                  <TableCell className={cn(isRTL && "text-right")}>{entry.uploadDate}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={entry.status === 'deducted' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-yellow-100 text-yellow-700 border-yellow-300'}>
                      {entry.status === 'deducted' ? (isRTL ? 'تم الخصم' : 'Deducted') : (isRTL ? 'قيد الخصم' : 'Pending')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                       {entry.status === 'pending' && (
                        <Button size="sm" variant="outline" className="text-xs gap-1 text-green-600" onClick={() => handleMarkDeducted(entry.id)}>
                          {isRTL ? 'خصم' : 'Deduct'}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setEditingEntry(entry); setEditAmount(String(entry.billAmount)); setShowEditDialog(true); }}>
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
            <div className="text-center py-12 text-muted-foreground">{isRTL ? 'لا توجد فواتير' : 'No bills found'}</div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>{isRTL ? 'هل أنت متأكد من حذف هذه الفاتورة؟' : 'Delete this bill entry?'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isRTL ? 'حذف' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isRTL ? 'تعديل مبلغ الفاتورة' : 'Edit Bill Amount'}</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-muted-foreground">{isRTL ? 'الموظف' : 'Employee'}</Label>
                <p className="font-medium">{editingEntry.employeeName}</p>
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'مبلغ الفاتورة (ج.م)' : 'Bill Amount (EGP)'}</Label>
                <Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={() => {
              const newAmount = parseFloat(editAmount);
              if (!editingEntry || isNaN(newAmount) || newAmount <= 0) return;
              setEntries(prev => prev.map(e => e.id === editingEntry.id ? { ...e, billAmount: newAmount } : e));
              setShowEditDialog(false);
              toast({ title: isRTL ? 'تم التحديث' : 'Updated' });
            }}>{isRTL ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
