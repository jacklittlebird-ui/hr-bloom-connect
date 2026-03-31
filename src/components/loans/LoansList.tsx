import { useState, useMemo } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
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
import { Search, Plus, Edit, Trash2, Banknote, Users, Clock, CheckCircle, Printer, FileText, FileSpreadsheet, CreditCard, List, RefreshCw } from 'lucide-react';
import { InstallmentScheduleDialog } from './InstallmentScheduleDialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  const { loans, addLoan, updateLoan, deleteLoan, recordLoanPayment, refreshData } = useLoanData();
  const { employees } = useEmployeeData();
  const activeEmployees = employees.filter(e => e.status === 'active');

  const [searchQuery, setSearchQuery] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [deletingLoanId, setDeletingLoanId] = useState<string | null>(null);
  const [showInstallmentSchedule, setShowInstallmentSchedule] = useState(false);
  const [viewingLoan, setViewingLoan] = useState<Loan | null>(null);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [reschedulingLoan, setReschedulingLoan] = useState<Loan | null>(null);
  const [rescheduleData, setRescheduleData] = useState({
    newInstallments: '',
    calculationMethod: 'auto' as 'auto' | 'manual',
    newMonthlyPayment: '',
    newStartDate: '',
  });
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

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return activeEmployees;
    const q = employeeSearch.toLowerCase();
    return activeEmployees.filter(e =>
      e.employeeId?.toLowerCase().includes(q) ||
      e.nameAr?.includes(employeeSearch) ||
      e.nameEn?.toLowerCase().includes(q)
    );
  }, [employeeSearch, activeEmployees]);

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

  const uniqueStartDates = useMemo(() => {
    const dates = [...new Set(loans.map(l => l.startDate?.slice(0, 7)).filter(Boolean))].sort();
    return dates;
  }, [loans]);

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = loan.employeeName.includes(searchQuery) ||
      loan.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    const empStation = getEmployeeStation(loan.employeeId);
    const matchesStation = stationFilter === 'all' || empStation === stationFilter || loan.station === stationFilter;
    const matchesStartDate = startDateFilter === 'all' || loan.startDate?.startsWith(startDateFilter);
    return matchesSearch && matchesStatus && matchesStation && matchesStartDate;
  });

  const { paginatedItems: paginatedLoans, currentPage: loanPage, totalPages: loanTotalPages, totalItems: loanTotalItems, startIndex: loanStart, endIndex: loanEnd, setCurrentPage: setLoanPage } = usePagination(filteredLoans);

  const stats = {
    totalLoans: loans.length,
    activeLoans: loans.filter(l => l.status === 'active').length,
    pendingLoans: loans.filter(l => l.status === 'pending').length,
    totalAmount: loans.filter(l => l.status === 'active').reduce((sum, l) => sum + l.remainingAmount, 0),
    totalLoanValue: loans.reduce((sum, l) => sum + l.amount, 0),
    totalRemaining: loans.reduce((sum, l) => sum + l.remainingAmount, 0),
  };

  const resetForm = () => {
    setFormData({ employeeId: '', amount: '', installments: '', startDate: '', notes: '', calculationMethod: 'auto', monthlyPayment: '' });
    setEditingLoan(null);
    setEmployeeSearch('');
    setShowEmployeeDropdown(false);
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
    const emp = activeEmployees.find(e => e.id === loan.employeeId);
    setEmployeeSearch(emp ? `${emp.employeeId} - ${isRTL ? emp.nameAr : emp.nameEn}` : loan.employeeName);
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    const amount = parseFloat(formData.amount);
    const isManual = formData.calculationMethod === 'manual';
    const monthlyPayment = isManual ? parseFloat(formData.monthlyPayment || '0') : 0;
    const installments = isManual ? (amount > 0 && monthlyPayment > 0 ? Math.ceil(amount / monthlyPayment) : 0) : parseInt(formData.installments);

    if (!formData.employeeId) {
      toast({ title: isRTL ? 'خطأ' : 'Error', description: isRTL ? 'يرجى اختيار الموظف من القائمة' : 'Please select an employee from the list', variant: 'destructive' });
      return;
    }
    if (!formData.amount || !formData.startDate || installments <= 0) {
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
          monthlyPayment: isManual ? monthlyPayment : undefined,
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
          monthlyPayment: isManual ? monthlyPayment : undefined,
          startDate: formData.startDate,
          status: 'active',
          notes: formData.notes,
          calculationMethod: formData.calculationMethod,
        });
        toast({ title: isRTL ? 'تم الحفظ' : 'Saved', description: isRTL ? 'تم إضافة القرض بنجاح' : 'Loan added successfully' });
      }
      setShowDialog(false);
      resetForm();
    } catch (err: any) {
      console.error('Loan save error:', err);
      toast({ title: isRTL ? 'خطأ' : 'Error', description: err?.message || (isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving'), variant: 'destructive' });
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

  const openRescheduleDialog = (loan: Loan) => {
    setReschedulingLoan(loan);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const defaultStart = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    setRescheduleData({ newInstallments: '', calculationMethod: 'auto', newMonthlyPayment: '', newStartDate: defaultStart });
    setShowRescheduleDialog(true);
  };

  const rescheduleAutoMonthly = useMemo(() => {
    if (!reschedulingLoan || rescheduleData.calculationMethod !== 'auto') return '';
    const remaining = reschedulingLoan.remainingAmount;
    const inst = parseInt(rescheduleData.newInstallments);
    if (remaining > 0 && inst > 0) return (remaining / inst).toFixed(2);
    return '';
  }, [reschedulingLoan, rescheduleData.newInstallments, rescheduleData.calculationMethod]);

  const rescheduleAutoInstallments = useMemo(() => {
    if (!reschedulingLoan || rescheduleData.calculationMethod !== 'manual') return '';
    const remaining = reschedulingLoan.remainingAmount;
    const monthly = parseFloat(rescheduleData.newMonthlyPayment);
    if (remaining > 0 && monthly > 0) return String(Math.ceil(remaining / monthly));
    return '';
  }, [reschedulingLoan, rescheduleData.newMonthlyPayment, rescheduleData.calculationMethod]);

  const handleReschedule = async () => {
    if (!reschedulingLoan) return;
    const remainingAmount = reschedulingLoan.remainingAmount;
    const isManual = rescheduleData.calculationMethod === 'manual';
    const newMonthly = isManual ? parseFloat(rescheduleData.newMonthlyPayment || '0') : 0;
    const newInstallments = isManual
      ? (remainingAmount > 0 && newMonthly > 0 ? Math.ceil(remainingAmount / newMonthly) : 0)
      : parseInt(rescheduleData.newInstallments);

    if (newInstallments <= 0 || !rescheduleData.newStartDate) {
      toast({ title: isRTL ? 'خطأ' : 'Error', description: isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    const calculatedMonthly = isManual ? newMonthly : remainingAmount / newInstallments;
    const paidCount = reschedulingLoan.paidInstallments;
    const totalNewInstallments = paidCount + newInstallments;

    try {
      // Delete only pending installments
      await supabase.from('loan_installments').delete().eq('loan_id', reschedulingLoan.id).eq('status', 'pending');

      // Create new installments for the remaining amount
      const newRows = [];
      for (let i = 0; i < newInstallments; i++) {
        const [year, month] = rescheduleData.newStartDate.split('-').map(Number);
        const dueDate = new Date(year, month - 1 + i, 1);
        const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-01`;
        const isLast = i === newInstallments - 1;
        const amount = isLast
          ? Math.round((remainingAmount - calculatedMonthly * (newInstallments - 1)) * 100) / 100
          : Math.round(calculatedMonthly * 100) / 100;

        newRows.push({
          loan_id: reschedulingLoan.id,
          employee_id: reschedulingLoan.employeeId,
          installment_number: paidCount + i + 1,
          amount: Math.max(amount, 0),
          due_date: dueDateStr,
          status: 'pending',
        });
      }

      if (newRows.length > 0) {
        const { error: insertErr } = await supabase.from('loan_installments').insert(newRows);
        if (insertErr) throw insertErr;
      }

      // Update loan record
      const { error: updateErr } = await supabase.from('loans').update({
        installments_count: totalNewInstallments,
        monthly_installment: Math.round(calculatedMonthly * 100) / 100,
        remaining: remainingAmount,
      }).eq('id', reschedulingLoan.id);
      if (updateErr) throw updateErr;

      toast({ title: isRTL ? 'تمت إعادة الجدولة' : 'Rescheduled', description: isRTL ? 'تمت إعادة جدولة القرض بنجاح' : 'Loan rescheduled successfully' });
      setShowRescheduleDialog(false);
      setReschedulingLoan(null);

      // Refresh loans data
      await refreshData();
    } catch (err: any) {
      console.error('Reschedule error:', err);
      toast({ title: isRTL ? 'خطأ' : 'Error', description: err?.message || (isRTL ? 'حدث خطأ أثناء إعادة الجدولة' : 'Error rescheduling'), variant: 'destructive' });
    }
  };

  const getStationLabel = (empId: string) => {
    const station = getEmployeeStation(empId);
    const s = stationLocations.find(st => st.value === station);
    return s ? (isRTL ? s.labelAr : s.labelEn) : station || '-';
  };

  const exportColumns = [
    { header: isRTL ? 'الموظف' : 'Employee', key: 'employeeName' },
    { header: isRTL ? 'المحطة' : 'Station', key: 'stationLabel' },
    { header: isRTL ? 'إجمالي القرض' : 'Total', key: 'amount' },
    { header: isRTL ? 'القسط الشهري' : 'Monthly', key: 'monthlyPayment' },
    { header: isRTL ? 'عدد الأقساط' : 'Installments', key: 'installments' },
    { header: isRTL ? 'المدفوع' : 'Paid', key: 'paidAmount' },
    { header: isRTL ? 'المتبقي' : 'Remaining', key: 'remainingAmount' },
    { header: isRTL ? 'الحالة' : 'Status', key: 'status' },
  ];
  const exportData = filteredLoans
    .map(l => ({ ...l, stationLabel: getStationLabel(l.employeeId), status: isRTL ? statusLabels[l.status].ar : statusLabels[l.status].en }))
    .sort((a, b) => {
      const stationCompare = a.stationLabel.localeCompare(b.stationLabel, isRTL ? 'ar' : 'en');
      if (stationCompare !== 0) return stationCompare;
      return a.employeeName.localeCompare(b.employeeName, isRTL ? 'ar' : 'en');
    });
  const exportTitle = isRTL ? 'تقرير القروض' : 'Loans Report';

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: isRTL ? 'عدد القروض' : 'Total Loans', value: stats.totalLoans, icon: Banknote, bgClass: 'bg-stat-purple-bg', iconBg: 'bg-stat-purple' },
          { label: isRTL ? 'القروض النشطة' : 'Active Loans', value: stats.activeLoans, icon: CheckCircle, bgClass: 'bg-stat-green-bg', iconBg: 'bg-stat-green' },
          { label: isRTL ? 'قيد الانتظار' : 'Pending', value: stats.pendingLoans, icon: Clock, bgClass: 'bg-stat-yellow-bg', iconBg: 'bg-stat-yellow' },
          { label: isRTL ? 'المتبقي (نشط)' : 'Active Outstanding', value: stats.totalAmount.toLocaleString(), icon: Users, bgClass: 'bg-stat-blue-bg', iconBg: 'bg-stat-blue' },
          { label: isRTL ? 'إجمالي قيمة القروض' : 'Total Loan Value', value: stats.totalLoanValue.toLocaleString(), icon: CreditCard, bgClass: 'bg-stat-coral-bg', iconBg: 'bg-stat-coral' },
          { label: isRTL ? 'إجمالي المبالغ المتبقية' : 'Total Remaining', value: stats.totalRemaining.toLocaleString(), icon: List, bgClass: 'bg-stat-pink-bg', iconBg: 'bg-stat-pink' },
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
              <Select value={startDateFilter} onValueChange={setStartDateFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder={isRTL ? 'تاريخ بدء الخصم' : 'Start Date'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع التواريخ' : 'All Dates'}</SelectItem>
                  {uniqueStartDates.map(d => <SelectItem key={d} value={d}>{getMonthName(d, language)}</SelectItem>)}
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
            {paginatedLoans.map(loan => {
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
                      {loan.status === 'active' && loan.remainingAmount > 0 && (
                        <Button size="sm" variant="outline" className="text-xs gap-1 text-blue-600" onClick={() => openRescheduleDialog(loan)}>
                          <RefreshCw className="h-3 w-3" />{isRTL ? 'إعادة جدولة' : 'Reschedule'}
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
          <PaginationControls currentPage={loanPage} totalPages={loanTotalPages} totalItems={loanTotalItems} startIndex={loanStart} endIndex={loanEnd} onPageChange={setLoanPage} />
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
              <div className="relative">
                <Input
                  placeholder={isRTL ? 'ابحث بكود الموظف أو الاسم...' : 'Search by employee code or name...'}
                  value={employeeSearch}
                  onChange={e => { setEmployeeSearch(e.target.value); setShowEmployeeDropdown(true); if (!e.target.value) setFormData({ ...formData, employeeId: '' }); }}
                  onFocus={() => setShowEmployeeDropdown(true)}
                  className={isRTL ? 'pr-9' : 'pl-9'}
                />
                <Search className={`absolute top-3 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                {showEmployeeDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filteredEmployees.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground text-center">{isRTL ? 'لا توجد نتائج' : 'No results'}</p>
                    ) : (
                      filteredEmployees.map(emp => (
                        <button
                          key={emp.id}
                          type="button"
                          className="w-full text-right px-3 py-2 hover:bg-accent text-sm flex items-center justify-between gap-2"
                          onClick={() => {
                            setFormData({ ...formData, employeeId: emp.id });
                            setEmployeeSearch(`${emp.employeeId} - ${isRTL ? emp.nameAr : emp.nameEn}`);
                            setShowEmployeeDropdown(false);
                          }}
                        >
                          <span className="font-semibold">{isRTL ? emp.nameAr : emp.nameEn}</span>
                          <span className="text-muted-foreground text-xs">{emp.employeeId}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
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

      {/* Reschedule Dialog */}
      <Dialog open={showRescheduleDialog} onOpenChange={o => { if (!o) setReschedulingLoan(null); setShowRescheduleDialog(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 -m-6 mb-4 p-6 rounded-t-lg">
            <DialogTitle className="text-white text-center text-xl">
              {isRTL ? 'إعادة جدولة القرض' : 'Reschedule Loan'}
            </DialogTitle>
          </DialogHeader>
          {reschedulingLoan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">{isRTL ? 'الموظف' : 'Employee'}</p>
                  <p className="font-bold text-sm">{reschedulingLoan.employeeName}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">{isRTL ? 'إجمالي القرض' : 'Total Loan'}</p>
                  <p className="font-bold text-sm">{reschedulingLoan.amount.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                  <p className="text-xs text-muted-foreground">{isRTL ? 'المدفوع' : 'Paid'}</p>
                  <p className="font-bold text-sm text-green-700">{reschedulingLoan.paidAmount.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'} ({reschedulingLoan.paidInstallments} {isRTL ? 'قسط' : 'inst.'})</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
                  <p className="text-xs text-muted-foreground">{isRTL ? 'المتبقي (سيتم إعادة جدولته)' : 'Remaining (to reschedule)'}</p>
                  <p className="font-bold text-sm text-orange-700">{reschedulingLoan.remainingAmount.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{isRTL ? 'طريقة الاحتساب' : 'Calculation Method'}</Label>
                <RadioGroup value={rescheduleData.calculationMethod} onValueChange={(v: 'auto' | 'manual') => setRescheduleData({ ...rescheduleData, calculationMethod: v })} className="flex gap-4">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="auto" id="reschedule-auto" /><Label htmlFor="reschedule-auto">{isRTL ? 'تلقائي (المبلغ ÷ الأقساط)' : 'Auto (Amount ÷ Installments)'}</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="manual" id="reschedule-manual" /><Label htmlFor="reschedule-manual">{isRTL ? 'يدوي (تحديد القسط الشهري)' : 'Manual (Set Monthly Payment)'}</Label></div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {rescheduleData.calculationMethod === 'auto' ? (
                  <div className="space-y-2">
                    <Label>{isRTL ? 'عدد الأقساط الجديدة *' : 'New Installments *'}</Label>
                    <Input type="number" min="1" value={rescheduleData.newInstallments} onChange={e => setRescheduleData({ ...rescheduleData, newInstallments: e.target.value })} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>{isRTL ? 'القسط الشهري الجديد * (ج.م)' : 'New Monthly * (EGP)'}</Label>
                    <Input type="number" min="1" value={rescheduleData.newMonthlyPayment} onChange={e => setRescheduleData({ ...rescheduleData, newMonthlyPayment: e.target.value })} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{isRTL ? 'تاريخ بدء الخصم *' : 'Start Date *'}</Label>
                  <Input type="month" value={rescheduleData.newStartDate} onChange={e => setRescheduleData({ ...rescheduleData, newStartDate: e.target.value })} />
                </div>
              </div>

              {rescheduleData.calculationMethod === 'auto' && rescheduleAutoMonthly && (
                <p className="text-sm text-muted-foreground">{isRTL ? 'القسط الشهري المحسوب: ' : 'Calculated monthly: '}<strong>{parseFloat(rescheduleAutoMonthly).toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</strong></p>
              )}
              {rescheduleData.calculationMethod === 'manual' && rescheduleAutoInstallments && (
                <p className="text-sm text-muted-foreground">{isRTL ? 'عدد الأقساط المحسوب: ' : 'Calculated installments: '}<strong>{rescheduleAutoInstallments}</strong></p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => { setShowRescheduleDialog(false); setReschedulingLoan(null); }}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleReschedule} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="h-4 w-4 mr-1" />{isRTL ? 'إعادة جدولة' : 'Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
