import { useState, useMemo } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLoanData, Advance } from '@/contexts/LoanDataContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit, Trash2, Eye, Banknote, Clock, CheckCircle, TrendingUp, Printer, FileText, FileSpreadsheet, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { stationLocations } from '@/data/stationLocations';
import { useReportExport } from '@/hooks/useReportExport';

const getMonthName = (dateStr: string, lang: string) => {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
};

export const AdvancesList = () => {
  const { isRTL, language } = useLanguage();
  const { handlePrint, exportToPDF, exportToCSV } = useReportExport();
  const { advances, addAdvance, updateAdvance, deleteAdvance } = useLoanData();
  const { employees } = useEmployeeData();
  const activeEmployees = employees.filter(e => e.status === 'active');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<Advance | null>(null);
  const [viewingAdvance, setViewingAdvance] = useState<Advance | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ employeeId: '', amount: '', deductionMonth: '', reason: '' });
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);

  const selectedEmployee = useMemo(() => activeEmployees.find(e => e.id === formData.employeeId), [formData.employeeId, activeEmployees]);

  const getEmployeeStation = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.stationLocation || '';
  };

  const statusLabels: Record<string, { ar: string; en: string; color: string }> = {
    pending: { ar: 'قيد الانتظار', en: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    approved: { ar: 'موافق عليه', en: 'Approved', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    rejected: { ar: 'مرفوض', en: 'Rejected', color: 'bg-red-100 text-red-700 border-red-300' },
    deducted: { ar: 'تم الخصم', en: 'Deducted', color: 'bg-green-100 text-green-700 border-green-300' },
  };

  const uniqueDeductionMonths = useMemo(() => {
    const months = [...new Set(advances.map(a => a.deductionMonth).filter(Boolean))].sort();
    return months;
  }, [advances]);

  const filteredAdvances = advances.filter(a => {
    const matchesSearch = a.employeeName.includes(searchQuery) || a.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const empStation = getEmployeeStation(a.employeeId);
    const matchesStation = stationFilter === 'all' || empStation === stationFilter || a.station === stationFilter;
    const matchesMonth = monthFilter === 'all' || a.deductionMonth === monthFilter;
    return matchesSearch && matchesStatus && matchesStation && matchesMonth;
  });

  const { paginatedItems: paginatedAdvances, currentPage: advPage, totalPages: advTotalPages, totalItems: advTotalItems, startIndex: advStart, endIndex: advEnd, setCurrentPage: setAdvPage } = usePagination(filteredAdvances);

  const stats = {
    total: advances.length,
    pending: advances.filter(a => a.status === 'pending').length,
    approved: advances.filter(a => a.status === 'approved').reduce((s, a) => s + a.amount, 0),
    deducted: advances.filter(a => a.status === 'deducted').reduce((s, a) => s + a.amount, 0),
  };

  const resetForm = () => { setFormData({ employeeId: '', amount: '', deductionMonth: '', reason: '' }); setEditingAdvance(null); };

  const handleSubmit = async () => {
    if (!formData.employeeId || !formData.amount || !formData.deductionMonth) {
      toast({ title: isRTL ? 'خطأ' : 'Error', description: isRTL ? 'يرجى ملء جميع الحقول' : 'Please fill all fields', variant: 'destructive' });
      return;
    }
    const emp = activeEmployees.find(e => e.id === formData.employeeId);
    const amount = parseFloat(formData.amount);

    try {
      if (editingAdvance) {
        await updateAdvance(editingAdvance.id, {
          employeeId: formData.employeeId,
          amount,
          deductionMonth: formData.deductionMonth,
          reason: formData.reason,
        });
        toast({ title: isRTL ? 'تم التحديث' : 'Updated' });
      } else {
        await addAdvance({
          employeeId: formData.employeeId,
          employeeName: emp?.nameAr || '',
          station: emp?.stationLocation || '',
          amount,
          requestDate: new Date().toISOString().split('T')[0],
          deductionMonth: formData.deductionMonth,
          status: 'pending',
          reason: formData.reason,
        });
        toast({ title: isRTL ? 'تم الإضافة' : 'Added' });
      }
      setShowDialog(false);
      resetForm();
    } catch {
      toast({ title: isRTL ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  };

  const handleApprove = async (id: string) => {
    await updateAdvance(id, { status: 'approved' });
    toast({ title: isRTL ? 'تمت الموافقة' : 'Approved' });
  };

  const handleDeduct = async (id: string) => {
    await updateAdvance(id, { status: 'deducted' });
    toast({ title: isRTL ? 'تم الخصم' : 'Deducted' });
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteAdvance(deletingId);
      toast({ title: isRTL ? 'تم الحذف' : 'Deleted' });
    }
    setShowDeleteDialog(false);
    setDeletingId(null);
  };

  const getStationLabel = (empId: string) => {
    const station = getEmployeeStation(empId);
    const s = stationLocations.find(st => st.value === station);
    return s ? (isRTL ? s.labelAr : s.labelEn) : station || '-';
  };

  const exportTitle = isRTL ? 'تقرير السلف' : 'Advances Report';
  const exportColumns = [
    { header: isRTL ? 'الموظف' : 'Employee', key: 'employeeName' },
    { header: isRTL ? 'المحطة' : 'Station', key: 'stationLabel' },
    { header: isRTL ? 'المبلغ' : 'Amount', key: 'amount' },
    { header: isRTL ? 'شهر الخصم' : 'Deduction Month', key: 'deductionMonth' },
    { header: isRTL ? 'الحالة' : 'Status', key: 'statusLabel' },
  ];
  const exportData = filteredAdvances.map(a => ({ ...a, stationLabel: getStationLabel(a.employeeId), statusLabel: isRTL ? statusLabels[a.status].ar : statusLabels[a.status].en }));

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: isRTL ? 'إجمالي السلف' : 'Total Advances', value: stats.total, icon: Banknote, bgClass: 'bg-stat-purple-bg', iconBg: 'bg-stat-purple' },
          { label: isRTL ? 'قيد الانتظار' : 'Pending', value: stats.pending, icon: Clock, bgClass: 'bg-stat-yellow-bg', iconBg: 'bg-stat-yellow' },
          { label: isRTL ? 'مبلغ الموافق عليه' : 'Approved Amount', value: stats.approved.toLocaleString(), icon: CheckCircle, bgClass: 'bg-stat-green-bg', iconBg: 'bg-stat-green' },
          { label: isRTL ? 'مبلغ المخصوم' : 'Deducted Amount', value: stats.deducted.toLocaleString(), icon: TrendingUp, bgClass: 'bg-stat-blue-bg', iconBg: 'bg-stat-blue' },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl p-5 ${s.bgClass} flex items-center gap-4 shadow-sm border border-border/30`}>
            <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
              <s.icon className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>{isRTL ? 'قائمة السلف' : 'Advances List'}</CardTitle>
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search className={`absolute top-3 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input placeholder={isRTL ? 'بحث...' : 'Search...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={`w-full md:w-48 ${isRTL ? 'pr-9' : 'pl-9'}`} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder={isRTL ? 'الحالة' : 'Status'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'الكل' : 'All'}</SelectItem>
                  {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{isRTL ? v.ar : v.en}</SelectItem>)}
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
                <SelectTrigger className="w-44"><SelectValue placeholder={isRTL ? 'شهر الخصم' : 'Deduction Month'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع الأشهر' : 'All Months'}</SelectItem>
                  {uniqueDeductionMonths.map(m => <SelectItem key={m} value={m}>{getMonthName(m, language)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => handlePrint(exportTitle)}><Printer className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => exportToPDF({ title: exportTitle, data: exportData, columns: exportColumns })}><FileText className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => exportToCSV({ title: exportTitle, data: exportData, columns: exportColumns, fileName: 'advances' })}><FileSpreadsheet className="h-4 w-4" /></Button>
              <Button onClick={() => { resetForm(); setShowDialog(true); }}><Plus className="h-4 w-4 mr-1" />{isRTL ? 'إضافة سلفة' : 'Add Advance'}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedAdvances.map(adv => (
              <Card key={adv.id} className="relative overflow-hidden border">
                <CardContent className="p-5 space-y-3">
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Badge variant="outline" className={statusLabels[adv.status]?.color}>
                      {isRTL ? statusLabels[adv.status]?.ar : statusLabels[adv.status]?.en}
                    </Badge>
                    <h3 className="font-bold text-lg">{adv.employeeName}</h3>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-muted-foreground">{isRTL ? 'المحطة' : 'Station'}</span>
                      <span className="font-semibold">{getStationLabel(adv.employeeId)}</span>
                    </div>
                    <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-muted-foreground">{isRTL ? 'مبلغ السلفة' : 'Amount'}</span>
                      <span className="font-semibold">{adv.amount.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</span>
                    </div>
                    <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-muted-foreground">{isRTL ? 'شهر الخصم' : 'Deduction Month'}</span>
                      <span className="font-semibold">{getMonthName(adv.deductionMonth, language)}</span>
                    </div>
                    <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-muted-foreground">{isRTL ? 'تاريخ الطلب' : 'Request Date'}</span>
                      <span className="font-semibold">{adv.requestDate}</span>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-xs">
                      <span className="text-muted-foreground">{isRTL ? 'ملاحظة: ' : 'Note: '}</span>
                      <span className="text-destructive font-medium">{isRTL ? 'يتم خصم السلفة بالكامل في شهر الخصم المحدد' : 'Full deduction in the specified month'}</span>
                    </div>
                  </div>

                  <div className={`flex gap-2 pt-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setViewingAdvance(adv); setShowViewDialog(true); }}>
                      <Eye className="h-3 w-3" />{isRTL ? 'عرض' : 'View'}
                    </Button>
                    {adv.status === 'pending' && (
                      <Button size="sm" variant="outline" className="text-xs gap-1 text-green-600" onClick={() => handleApprove(adv.id)}>
                        <CheckCircle className="h-3 w-3" />{isRTL ? 'موافقة' : 'Approve'}
                      </Button>
                    )}
                    {adv.status === 'approved' && (
                      <Button size="sm" variant="outline" className="text-xs gap-1 text-blue-600" onClick={() => handleDeduct(adv.id)}>
                        <TrendingUp className="h-3 w-3" />{isRTL ? 'خصم' : 'Deduct'}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setEditingAdvance(adv); setFormData({ employeeId: adv.employeeId, amount: String(adv.amount), deductionMonth: adv.deductionMonth, reason: adv.reason }); setShowDialog(true); }}>
                      <Edit className="h-3 w-3" />{isRTL ? 'تعديل' : 'Edit'}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive hover:text-destructive" onClick={() => { setDeletingId(adv.id); setShowDeleteDialog(true); }}>
                      <Trash2 className="h-3 w-3" />{isRTL ? 'حذف' : 'Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredAdvances.length === 0 && <div className="text-center py-12 text-muted-foreground">{isRTL ? 'لا توجد سلف' : 'No advances found'}</div>}
          <PaginationControls currentPage={advPage} totalPages={advTotalPages} totalItems={advTotalItems} startIndex={advStart} endIndex={advEnd} onPageChange={setAdvPage} />
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={o => { if (!o) resetForm(); setShowDialog(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="bg-gradient-to-r from-red-500 to-blue-500 -m-6 mb-4 p-6 rounded-t-lg">
            <DialogTitle className="text-white text-center text-xl">
              {editingAdvance ? (isRTL ? 'تعديل السلفة' : 'Edit Advance') : (isRTL ? 'إضافة سلفة جديدة' : 'Add New Advance')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'اختر الموظف *' : 'Select Employee *'}</Label>
              <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className={cn("w-full justify-between", isRTL && "flex-row-reverse")}>
                    {selectedEmployee
                      ? (isRTL ? selectedEmployee.nameAr : selectedEmployee.nameEn)
                      : (isRTL ? '-- اختر الموظف --' : '-- Select --')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-popover z-50" align="start">
                  <Command>
                    <CommandInput placeholder={isRTL ? 'ابحث بالاسم أو الكود...' : 'Search by name or code...'} />
                    <CommandList>
                      <CommandEmpty>{isRTL ? 'لا يوجد موظف' : 'No employee found'}</CommandEmpty>
                      <CommandGroup>
                        {activeEmployees.map(emp => (
                          <CommandItem
                            key={emp.id}
                            value={`${emp.nameAr} ${emp.nameEn} ${emp.employeeId}`}
                            onSelect={() => {
                              setFormData({ ...formData, employeeId: emp.id });
                              setEmployeePopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", formData.employeeId === emp.id ? "opacity-100" : "opacity-0")} />
                            <div className={cn("flex flex-col", isRTL && "items-end")}>
                              <span className="font-medium">{isRTL ? emp.nameAr : emp.nameEn}</span>
                              <span className="text-xs text-muted-foreground">{emp.employeeId} - {emp.department}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedEmployee && <p className="text-sm text-muted-foreground">{isRTL ? 'المحطة/الموقع: ' : 'Station: '}{getStationLabel(selectedEmployee.id)}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? 'مبلغ السلفة * (ج.م)' : 'Advance Amount * (EGP)'}</Label>
                <Input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'شهر الخصم *' : 'Deduction Month *'}</Label>
                <Input type="month" value={formData.deductionMonth} onChange={e => setFormData({ ...formData, deductionMonth: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'السبب' : 'Reason'}</Label>
              <Textarea value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSubmit}>{editingAdvance ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'حفظ' : 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'تفاصيل السلفة' : 'Advance Details'}</DialogTitle>
          </DialogHeader>
          {viewingAdvance && (
            <div className="space-y-3 text-sm">
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-muted-foreground">{isRTL ? 'الموظف' : 'Employee'}</span>
                <span className="font-semibold">{viewingAdvance.employeeName}</span>
              </div>
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-muted-foreground">{isRTL ? 'المبلغ' : 'Amount'}</span>
                <span className="font-semibold">{viewingAdvance.amount.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</span>
              </div>
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-muted-foreground">{isRTL ? 'شهر الخصم' : 'Deduction Month'}</span>
                <span className="font-semibold">{getMonthName(viewingAdvance.deductionMonth, language)}</span>
              </div>
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-muted-foreground">{isRTL ? 'السبب' : 'Reason'}</span>
                <span className="font-semibold">{viewingAdvance.reason || '-'}</span>
              </div>
              <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-muted-foreground">{isRTL ? 'الحالة' : 'Status'}</span>
                <Badge variant="outline" className={statusLabels[viewingAdvance.status]?.color}>
                  {isRTL ? statusLabels[viewingAdvance.status]?.ar : statusLabels[viewingAdvance.status]?.en}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>{isRTL ? 'هل أنت متأكد من حذف هذه السلفة؟' : 'Delete this advance?'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{isRTL ? 'حذف' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
