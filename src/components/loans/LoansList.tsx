import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLoanData, Loan } from '@/contexts/LoanDataContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, Plus, Edit, Trash2, Banknote, Users, Clock, CheckCircle, Printer, FileText, FileSpreadsheet, CreditCard, List } from 'lucide-react';
import { InstallmentScheduleDialog } from './InstallmentScheduleDialog';
import { toast } from '@/hooks/use-toast';
import { stationLocations } from '@/data/stationLocations';
import { useReportExport } from '@/hooks/useReportExport';

const getMonthName = (dateStr: string, lang: string) => {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const monthName = date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long' });
  return `${monthName} ${year}`;
};

export const LoansList = () => {
  const { t, isRTL, language } = useLanguage();
  const { handlePrint, exportToPDF, exportToCSV } = useReportExport();
  const { loans, addLoan, updateLoan, deleteLoan, recordLoanPayment } = useLoanData();
  const { employees } = useEmployeeData();
  const activeEmployees = employees.filter(e => e.status === 'active');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [deletingLoanId, setDeletingLoanId] = useState<string | null>(null);
  const [showInstallmentSchedule, setShowInstallmentSchedule] = useState(false);
  const [viewingLoan, setViewingLoan] = useState<Loan | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '', // UUID
    amount: '',
    installments: '',
    startDate: '',
    notes: '',
    calculationMethod: 'auto' as 'auto' | 'manual',
    monthlyPayment: '',
  });

  const selectedEmployee = useMemo(() =>
    activeEmployees.find(e => e.id === formData.employeeId),
    [formData.employeeId, activeEmployees]
  );

  const autoMonthlyPayment = useMemo(() => {
    const amount = parseFloat(formData.amount);
    const installments = parseInt(formData.installments);
    if (amount > 0 && installments > 0) return (amount / installments).toFixed(2);
    return '';
  }, [formData.amount, formData.installments]);

  const autoInstallmentsCount = useMemo(() => {
    if (formData.calculationMethod !== 'manual') return '';
    const amount = parseFloat(formData.amount);
    const monthly = parseFloat(formData.monthlyPayment);
    if (amount > 0 && monthly > 0) return String(Math.ceil(amount / monthly));
    return '';
  }, [formData.amount, formData.monthlyPayment, formData.calculationMethod]);

  const statusLabels: Record<string, { en: string; ar: string; color: string }> = {
    active: { en: 'Active', ar: 'نشط', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    completed: { en: 'Completed', ar: 'مكتمل', color: 'bg-green-100 text-green-700 border-green-300' },
    pending: { en: 'Pending', ar: 'قيد الانتظار', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  };

  const getEmployeeStation = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.stationLocation || '';
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.employeeName.includes(searchQuery) ||
      loan.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    const empStation = getEmployeeStation(loan.employeeId);
    const matchesStation = stationFilter === 'all' || empStation === stationFilter || loan.station === stationFilter;
    return matchesSearch && matchesStatus && matchesStation;
  });

  const stats = {
    totalLoans: loans.length,
    activeLoans: loans.filter(l => l.status === 'active').length,
    pendingLoans: loans.filter(l => l.status === 'pending').length,
    totalAmount: loans.filter(l => l.status === 'active').reduce((sum, l) => sum + l.remainingAmount, 0),
  };

  const resetForm = () => {
    setFormData({ employeeId: '', amount: '', installments: '', startDate: '', notes: '', calculationMethod: 'auto', monthlyPayment: '' });
    setEditingLoan(null);
  };

  const openAddDialog = () => { resetForm(); setShowDialog(true); };

  const openEditDialog = (loan: Loan) => {
    setEditingLoan(loan);
    setFormData({
      employeeId: loan.employeeId,
      amount: String(loan.amount),
      installments: String(loan.installments),
      startDate: loan.startDate,
      notes: loan.notes,
      calculationMethod: loan.calculationMethod,
      monthlyPayment: loan.calculationMethod === 'manual' ? String(loan.monthlyPayment) : '',
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    const amount = parseFloat(formData.amount);
    const isManual = formData.calculationMethod === 'manual';
    const monthlyPayment = isManual ? parseFloat(formData.monthlyPayment || '0') : 0;
    const installments = isManual ? (amount > 0 && monthlyPayment > 0 ? Math.ceil(amount / monthlyPayment) : 0) : parseInt(formData.installments);

    if (!formData.employeeId || !formData.amount || !formData.startDate || installments <= 0) {
      toast({ title: isRTL ? 'خطأ' : 'Error', description: isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    const employee = activeEmployees.find(e => e.id === formData.employeeId);

    try {
      if (editingLoan) {
        await updateLoan(editingLoan.id, {
          employeeId: formData.employeeId,
          amount,
          installments,
          startDate: formData.startDate,
          notes: formData.notes,
        });
        toast({ title: isRTL ? 'تم التحديث' : 'Updated', description: isRTL ? 'تم تعديل القرض بنجاح' : 'Loan updated successfully' });
      } else {
        await addLoan({
          employeeId: formData.employeeId,
          employeeName: employee?.nameAr || '',
          station: employee?.stationLocation || '',
          amount,
          installments,
          startDate: formData.startDate,
          status: 'active',
          notes: formData.notes,
          calculationMethod: formData.calculationMethod,
        });
        toast({ title: isRTL ? 'تم الحفظ' : 'Saved', description: isRTL ? 'تم إضافة القرض بنجاح' : 'Loan added successfully' });
      }
      setShowDialog(false);
      resetForm();
    } catch (err) {
      toast({ title: isRTL ? 'خطأ' : 'Error', description: isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving', variant: 'destructive' });
    }
  };

  const handleRecordPayment = async (loanId: string) => {
    try {
      await recordLoanPayment(loanId);
      toast({ title: isRTL ? 'تم' : 'Done', description: isRTL ? 'تم تسجيل الدفعة' : 'Payment recorded' });
    } catch {
      toast({ title: isRTL ? 'خطأ' : 'Error', variant: 'destructive' });
    }
  };

  const confirmDelete = async () => {
    if (deletingLoanId) {
      try {
        await deleteLoan(deletingLoanId);
        toast({ title: isRTL ? 'تم الحذف' : 'Deleted', description: isRTL ? 'تم حذف القرض' : 'Loan deleted' });
      } catch {
        toast({ title: isRTL ? 'خطأ' : 'Error', variant: 'destructive' });
      }
    }
    setShowDeleteDialog(false);
    setDeletingLoanId(null);
  };

  const exportColumns = [
    { header: isRTL ? 'الموظف' : 'Employee', key: 'employeeName' },
    { header: isRTL ? 'إجمالي القرض' : 'Total', key: 'amount' },
    { header: isRTL ? 'القسط الشهري' : 'Monthly', key: 'monthlyPayment' },
    { header: isRTL ? 'عدد الأقساط' : 'Installments', key: 'installments' },
    { header: isRTL ? 'المدفوع' : 'Paid', key: 'paidAmount' },
    { header: isRTL ? 'المتبقي' : 'Remaining', key: 'remainingAmount' },
    { header: isRTL ? 'الحالة' : 'Status', key: 'status' },
  ];
  const exportData = filteredLoans.map(l => ({ ...l, status: isRTL ? statusLabels[l.status].ar : statusLabels[l.status].en }));
  const exportTitle = isRTL ? 'تقرير القروض' : 'Loans Report';

  const getStationLabel = (empId: string) => {
    const station = getEmployeeStation(empId);
    const s = stationLocations.find(st => st.value === station);
    return s ? (isRTL ? s.labelAr : s.labelEn) : station || '-';
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: isRTL ? 'إجمالي القروض' : 'Total Loans', value: stats.totalLoans, icon: Banknote, bgClass: 'bg-stat-purple-bg', iconBg: 'bg-stat-purple' },
          { label: isRTL ? 'القروض النشطة' : 'Active Loans', value: stats.activeLoans, icon: CheckCircle, bgClass: 'bg-stat-green-bg', iconBg: 'bg-stat-green' },
          { label: isRTL ? 'قيد الانتظار' : 'Pending', value: stats.pendingLoans, icon: Clock, bgClass: 'bg-stat-yellow-bg', iconBg: 'bg-stat-yellow' },
          { label: isRTL ? 'إجمالي المتبقي' : 'Outstanding', value: stats.totalAmount.toLocaleString(), icon: Users, bgClass: 'bg-stat-blue-bg', iconBg: 'bg-stat-blue' },
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

      {/* Filters & Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>{isRTL ? 'قائمة القروض' : 'Loans List'}</CardTitle>
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
              <Button variant="outline" size="icon" onClick={() => handlePrint(exportTitle)}><Printer className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => exportToPDF({ title: exportTitle, data: exportData, columns: exportColumns })}><FileText className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => exportToCSV({ title: exportTitle, data: exportData, columns: exportColumns, fileName: 'loans' })}><FileSpreadsheet className="h-4 w-4" /></Button>
              <Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-1" />{isRTL ? 'إضافة قرض' : 'Add Loan'}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLoans.map(loan => {
              const progressPercent = loan.installments > 0 ? (loan.paidInstallments / loan.installments) * 100 : 0;
              return (
                <Card key={loan.id} className="relative overflow-hidden border">
                  <CardContent className="p-5 space-y-3">
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Badge variant="outline" className={statusLabels[loan.status]?.color}>
                        {isRTL ? statusLabels[loan.status]?.ar : statusLabels[loan.status]?.en}
                      </Badge>
                      <h3 className="font-bold text-lg">{loan.employeeName}</h3>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-muted-foreground">{isRTL ? 'المحطة' : 'Station'}</span>
                        <span className="font-semibold">{getStationLabel(loan.employeeId)}</span>
                      </div>
                      <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-muted-foreground">{isRTL ? 'إجمالي القرض' : 'Total Loan'}</span>
                        <span className="font-semibold">{loan.amount.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</span>
                      </div>
                      <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-muted-foreground">{isRTL ? 'قيمة القسط الشهري' : 'Monthly Installment'}</span>
                        <span className="font-semibold">{loan.monthlyPayment.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</span>
                      </div>
                      <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-muted-foreground">{isRTL ? 'عدد الأقساط' : 'Installments'}</span>
                        <span className="font-semibold">{loan.installments}</span>
                      </div>
                      <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-muted-foreground">{isRTL ? 'تاريخ البدء' : 'Start Date'}</span>
                        <span className="font-semibold">{getMonthName(loan.startDate, language)}</span>
                      </div>
                    </div>

                    <div>
                      <div className={`flex justify-between text-xs mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span>{isRTL ? 'التقدم' : 'Progress'}</span>
                        <span>{loan.paidInstallments}/{loan.installments}</span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>

                    <div className={`flex gap-2 pt-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => { setViewingLoan(loan); setShowInstallmentSchedule(true); }}>
                        <List className="h-3 w-3" />{isRTL ? 'الأقساط' : 'Schedule'}
                      </Button>
                      {loan.status === 'active' && (
                        <Button size="sm" variant="outline" className="text-xs gap-1 text-green-600" onClick={() => handleRecordPayment(loan.id)}>
                          <CreditCard className="h-3 w-3" />{isRTL ? 'تسجيل دفعة' : 'Pay'}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => openEditDialog(loan)}>
                        <Edit className="h-3 w-3" />{isRTL ? 'تعديل' : 'Edit'}
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive hover:text-destructive" onClick={() => { setDeletingLoanId(loan.id); setShowDeleteDialog(true); }}>
                        <Trash2 className="h-3 w-3" />{isRTL ? 'حذف' : 'Delete'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filteredLoans.length === 0 && <div className="text-center py-12 text-muted-foreground">{isRTL ? 'لا توجد قروض' : 'No loans found'}</div>}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={o => { if (!o) resetForm(); setShowDialog(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="bg-gradient-to-r from-red-500 to-blue-500 -m-6 mb-4 p-6 rounded-t-lg">
            <DialogTitle className="text-white text-center text-xl">
              {editingLoan ? (isRTL ? 'تعديل القرض' : 'Edit Loan') : (isRTL ? 'إضافة قرض جديد' : 'Add New Loan')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'اختر الموظف *' : 'Select Employee *'}</Label>
              <Select value={formData.employeeId} onValueChange={v => setFormData({ ...formData, employeeId: v })}>
                <SelectTrigger><SelectValue placeholder={isRTL ? '-- اختر الموظف --' : '-- Select --'} /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{isRTL ? emp.nameAr : emp.nameEn}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedEmployee && <p className="text-sm text-muted-foreground">{isRTL ? 'المحطة/الموقع: ' : 'Station: '}{getStationLabel(selectedEmployee.id)}</p>}
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'طريقة الاحتساب' : 'Calculation Method'}</Label>
              <RadioGroup value={formData.calculationMethod} onValueChange={(v: 'auto' | 'manual') => setFormData({ ...formData, calculationMethod: v })} className="flex gap-4">
                <div className="flex items-center space-x-2"><RadioGroupItem value="auto" id="calc-auto" /><Label htmlFor="calc-auto">{isRTL ? 'تلقائي (المبلغ ÷ الأقساط)' : 'Auto (Amount ÷ Installments)'}</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="manual" id="calc-manual" /><Label htmlFor="calc-manual">{isRTL ? 'يدوي (تحديد القسط الشهري)' : 'Manual (Set Monthly Payment)'}</Label></div>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? 'مبلغ القرض * (ج.م)' : 'Loan Amount * (EGP)'}</Label>
                <Input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
              </div>
              {formData.calculationMethod === 'auto' ? (
                <div className="space-y-2">
                  <Label>{isRTL ? 'عدد الأقساط *' : 'Installments *'}</Label>
                  <Input type="number" value={formData.installments} onChange={e => setFormData({ ...formData, installments: e.target.value })} />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>{isRTL ? 'القسط الشهري * (ج.م)' : 'Monthly * (EGP)'}</Label>
                  <Input type="number" value={formData.monthlyPayment} onChange={e => setFormData({ ...formData, monthlyPayment: e.target.value })} />
                </div>
              )}
            </div>
            {formData.calculationMethod === 'auto' && autoMonthlyPayment && (
              <p className="text-sm text-muted-foreground">{isRTL ? 'القسط الشهري المحسوب: ' : 'Calculated monthly: '}<strong>{parseFloat(autoMonthlyPayment).toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</strong></p>
            )}
            {formData.calculationMethod === 'manual' && autoInstallmentsCount && (
              <p className="text-sm text-muted-foreground">{isRTL ? 'عدد الأقساط المحسوب: ' : 'Calculated installments: '}<strong>{autoInstallmentsCount}</strong></p>
            )}
            <div className="space-y-2">
              <Label>{isRTL ? 'تاريخ البدء *' : 'Start Date *'}</Label>
              <Input type="month" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSubmit}>{editingLoan ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'حفظ' : 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>{isRTL ? 'هل أنت متأكد من حذف هذا القرض؟' : 'Are you sure you want to delete this loan?'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{isRTL ? 'حذف' : 'Delete'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Installment Schedule */}
      {viewingLoan && (
        <InstallmentScheduleDialog
          open={showInstallmentSchedule}
          onOpenChange={setShowInstallmentSchedule}
          loan={{
            id: viewingLoan.id,
            employeeName: viewingLoan.employeeName,
            amount: viewingLoan.amount,
            installments: viewingLoan.installments,
            monthlyPayment: viewingLoan.monthlyPayment,
            paidInstallments: viewingLoan.paidInstallments,
            startDate: viewingLoan.startDate,
            status: viewingLoan.status,
          }}
        />
      )}
    </div>
  );
};
