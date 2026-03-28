import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSalaryData, calcGross } from '@/contexts/SalaryDataContext';
import { usePayrollData, ProcessedPayroll } from '@/contexts/PayrollDataContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Wallet, Gift, TrendingDown, Building2, Save, X, FileText, Users, Clock, Search, PlayCircle, Zap, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { stationLocations } from '@/data/stationLocations';

// Mobile bills now fetched from DB

export const PayrollProcessing = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { getSalaryRecord, salaryRecords } = useSalaryData();
  const { savePayrollEntry, savePayrollEntries, deletePayrollEntry, getPayrollEntry, getMonthlyPayroll } = usePayrollData();
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [searchName, setSearchName] = useState('');
  const [searchStation, setSearchStation] = useState('');

  // Monthly manual entries
  const [livingAllowance, setLivingAllowance] = useState(0);
  const [overtimePay, setOvertimePay] = useState(0);
  const [bonusType, setBonusType] = useState<'amount' | 'percentage'>('amount');
  const [bonusValue, setBonusValue] = useState(0);
  const [leaveDays, setLeaveDays] = useState(0);
  const [penaltyType, setPenaltyType] = useState<'amount' | 'days' | 'percentage'>('amount');
  const [penaltyValue, setPenaltyValue] = useState(0);

  // Bulk processing
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBulk, setSelectedBulk] = useState<string[]>([]);

  // DB-fetched loans & advances
  const [dbLoans, setDbLoans] = useState<{ id: string; employee_id: string; monthly_installment: number; installments_count: number; paid_count: number; remaining: number }[]>([]);
  const [dbInstallments, setDbInstallments] = useState<{ loan_id: string; employee_id: string; amount: number; due_date: string; status: string }[]>([]);
  const [dbAdvances, setDbAdvances] = useState<{ id: string; employee_id: string; amount: number; deduction_month: string; status: string }[]>([]);
  const [dbMobileBills, setDbMobileBills] = useState<{ employee_id: string; amount: number; deduction_month: string }[]>([]);

  const roundToNearestQuarter = (v: number) => Math.round(v * 4) / 4;
  const roundToNearestEighth = (v: number) => Math.round(v * 8) / 8;
  const period = `${selectedYear}-${selectedMonth}`;
  const normalizeQuarterInput = (value: number) => roundToNearestEighth(value || 0);

  // Fetch active loans, approved advances, and mobile bills from DB
  const fetchLoansAndAdvances = useCallback(async () => {
    const [loansRes, installmentsRes, advancesRes, billsRes] = await Promise.all([
      supabase.from('loans').select('id, employee_id, monthly_installment, installments_count, paid_count, remaining').eq('status', 'active'),
      supabase.from('loan_installments').select('loan_id, employee_id, amount, due_date, status').eq('status', 'pending'),
      supabase.from('advances').select('id, employee_id, amount, deduction_month, status').in('status', ['approved', 'deducted']),
      supabase.from('mobile_bills').select('employee_id, amount, deduction_month'),
    ]);
    if (loansRes.data) setDbLoans(loansRes.data);
    if (installmentsRes.data) setDbInstallments(installmentsRes.data);
    if (advancesRes.data) setDbAdvances(advancesRes.data);
    if (billsRes.data) setDbMobileBills(billsRes.data);
  }, []);

  // Sync loan records after payroll: update paid_count, remaining, status, and mark installments
  const syncLoansAfterPayroll = useCallback(async (employeeIds: string[], month: string, year: string) => {
    const period = `${year}-${month}`;
    for (const empId of employeeIds) {
      const empLoans = dbLoans.filter(l => l.employee_id === empId);
      for (const loan of empLoans) {
        if (!loan.monthly_installment || loan.monthly_installment <= 0) continue;
        const newPaid = Math.min((loan.paid_count || 0) + 1, loan.installments_count || 1);
        const newRemaining = Math.max((loan.remaining ?? loan.monthly_installment * ((loan.installments_count || 1) - (loan.paid_count || 0))) - loan.monthly_installment, 0);
        const newStatus = newPaid >= (loan.installments_count || 1) ? 'completed' : 'active';

        await supabase.from('loans').update({
          paid_count: newPaid,
          remaining: newRemaining,
          status: newStatus,
        }).eq('id', loan.id);

        // Mark the next pending installment as paid
        const { data: pendingInst } = await supabase
          .from('loan_installments')
          .select('id')
          .eq('loan_id', loan.id)
          .eq('status', 'pending')
          .order('installment_number', { ascending: true })
          .limit(1);

        if (pendingInst && pendingInst.length > 0) {
          await supabase.from('loan_installments').update({
            status: 'paid',
            paid_at: new Date().toISOString(),
          }).eq('id', pendingInst[0].id);
        }
      }

      // Mark advances for this month as deducted
      const empAdvances = dbAdvances.filter(a => a.employee_id === empId && a.deduction_month === period && a.status === 'approved');
      for (const adv of empAdvances) {
        await supabase.from('advances').update({ status: 'deducted' }).eq('id', adv.id);
      }
    }
    // Refresh data
    await fetchLoansAndAdvances();
  }, [dbLoans, dbAdvances, fetchLoansAndAdvances]);

  useEffect(() => {
    fetchLoansAndAdvances();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') fetchLoansAndAdvances();
    });
    return () => subscription.unsubscribe();
  }, [fetchLoansAndAdvances]);

  // Re-fetch when switching back to payroll tab (month/year change)
  useEffect(() => {
    fetchLoansAndAdvances();
  }, [selectedMonth, selectedYear]);

  const getEmployeeMonthlyLoanPayment = useCallback((empId: string) => {
    // Use actual installment amounts from loan_installments for the selected period
    // Find the next pending installment for each active loan of this employee
    const empLoans = dbLoans.filter(l => l.employee_id === empId);
    let total = 0;
    for (const loan of empLoans) {
      // Find the first pending installment for this loan (next to be paid)
      const pendingInstallment = dbInstallments
        .filter(i => i.loan_id === loan.id)
        .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
      if (pendingInstallment) {
        total += pendingInstallment.amount;
      } else {
        // Fallback to monthly_installment if no pending installments found
        total += loan.monthly_installment || 0;
      }
    }
    return total;
  }, [dbLoans, dbInstallments]);

  const getEmployeeAdvanceForMonth = useCallback((empId: string, month: string) => {
    return dbAdvances.filter(a => a.employee_id === empId && a.deduction_month === month).reduce((s, a) => s + a.amount, 0);
  }, [dbAdvances]);

  const getEmployeeMobileBill = useCallback((empId: string, month: string) => {
    return dbMobileBills.filter(b => b.employee_id === empId && b.deduction_month === month).reduce((s, b) => s + b.amount, 0);
  }, [dbMobileBills]);

  const salaryRecord = useMemo(() => {
    if (!selectedEmployee) return null;
    return getSalaryRecord(selectedEmployee, selectedYear);
  }, [selectedEmployee, selectedYear, getSalaryRecord]);

  const baseGross = useMemo(() => {
    if (!salaryRecord) return 0;
    return calcGross(salaryRecord);
  }, [salaryRecord]);

  // Gross includes base + livingAllowance (manual) + overtimePay
  const gross = baseGross + livingAllowance + overtimePay;

  // baseGross excludes livingAllowance and overtimePay - used for bonus%, leave, penalty calculations
  const bonusAmount = useMemo(() => {
    if (bonusType === 'amount') return bonusValue;
    return Math.round((bonusValue / 100) * baseGross);
  }, [bonusType, bonusValue, baseGross]);

  const existingPayrollEntry = useMemo(
    () => (selectedEmployee ? getPayrollEntry(selectedEmployee, selectedMonth, selectedYear) : undefined),
    [selectedEmployee, selectedMonth, selectedYear, getPayrollEntry],
  );

  const employeeInsurance = salaryRecord?.employeeInsurance || 0;
  const loanPayment = useMemo(
    () => existingPayrollEntry?.loanPayment ?? getEmployeeMonthlyLoanPayment(selectedEmployee),
    [existingPayrollEntry, selectedEmployee, getEmployeeMonthlyLoanPayment],
  );
  const advanceAmount = useMemo(
    () => existingPayrollEntry?.advanceAmount ?? getEmployeeAdvanceForMonth(selectedEmployee, period),
    [existingPayrollEntry, selectedEmployee, period, getEmployeeAdvanceForMonth],
  );
  const mobileBill = useMemo(
    () => existingPayrollEntry?.mobileBill ?? getEmployeeMobileBill(selectedEmployee, period),
    [existingPayrollEntry, selectedEmployee, period, getEmployeeMobileBill],
  );

  // Daily rate based on baseGross (excluding livingAllowance and overtimePay)
  const baseDailyRate = baseGross / 30;
  const leaveDeduction = roundToNearestQuarter(baseDailyRate * leaveDays);
  const basicSalary = salaryRecord?.basicSalary || 0;
  const penaltyAmount = useMemo(() => {
    if (penaltyType === 'amount') return roundToNearestQuarter(penaltyValue);
    if (penaltyType === 'days') return roundToNearestQuarter((basicSalary / 30) * penaltyValue);
    return roundToNearestQuarter((penaltyValue / 100) * basicSalary);
  }, [penaltyType, penaltyValue, basicSalary]);

  const totalDeductions = employeeInsurance + loanPayment + advanceAmount + mobileBill + leaveDeduction + penaltyAmount;
  const grossWithBonus = gross + bonusAmount;
  const netSalary = grossWithBonus - totalDeductions;

  const employerSocialIns = salaryRecord?.employerSocialInsurance || 0;
  const healthIns = salaryRecord?.healthInsurance || 0;
  const incomeTax = salaryRecord?.incomeTax || 0;

  const { employees: allEmployees } = useEmployeeData();
  const activeEmployees = allEmployees.filter(e => e.status === 'active');

  // Filter by station from employee data
  const filteredEmployees = activeEmployees.filter(emp => {
    const nameMatch = emp.nameEn.toLowerCase().includes(searchName.toLowerCase()) || emp.nameAr.includes(searchName);
    if (!searchStation || searchStation === 'all') return nameMatch;
    return nameMatch && emp.stationLocation === searchStation;
  });

  const processedThisMonth = getMonthlyPayroll(selectedMonth, selectedYear);

  const handleReset = () => {
    setLivingAllowance(0);
    setOvertimePay(0);
    setBonusType('amount');
    setBonusValue(0);
    setLeaveDays(0);
    setPenaltyType('amount');
    setPenaltyValue(0);
  };

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployee(empId);
    handleReset();
    const existing = getPayrollEntry(empId, selectedMonth, selectedYear);
    if (existing) {
      setLivingAllowance(existing.livingAllowance);
      setOvertimePay(existing.overtimePay);
      setBonusType(existing.bonusType);
      setBonusValue(existing.bonusValue);
      setLeaveDays(normalizeQuarterInput(existing.leaveDays));
      setPenaltyType(existing.penaltyType);
      setPenaltyValue(existing.penaltyType === 'days' ? normalizeQuarterInput(existing.penaltyValue) : existing.penaltyValue);
    } else {
      const sr = getSalaryRecord(empId, selectedYear);
      if (sr) setLivingAllowance(sr.livingAllowance);
    }
  };

  const buildPayrollEntry = (empId: string): ProcessedPayroll | null => {
    const sr = getSalaryRecord(empId, selectedYear);
    const emp = activeEmployees.find(e => e.id === empId);
    if (!sr || !emp) return null;

    const bg = calcGross(sr);
    const la = empId === selectedEmployee ? livingAllowance : sr.livingAllowance;
    const ot = empId === selectedEmployee ? overtimePay : 0;
    const g = bg + la + ot;
    const bt = empId === selectedEmployee ? bonusType : 'amount';
    const bv = empId === selectedEmployee ? bonusValue : 0;
    const ba = bt === 'amount' ? bv : Math.round((bv / 100) * bg);
    const existing = getPayrollEntry(empId, selectedMonth, selectedYear);
    const lp = existing?.loanPayment ?? getEmployeeMonthlyLoanPayment(empId);
    const aa = existing?.advanceAmount ?? getEmployeeAdvanceForMonth(empId, period);
    const mb = existing?.mobileBill ?? getEmployeeMobileBill(empId, period);
    const ld = empId === selectedEmployee ? normalizeQuarterInput(leaveDays) : 0;
    const leaveDailyRate = bg / 30;
    const lded = roundToNearestQuarter(leaveDailyRate * ld);
    const pt = empId === selectedEmployee ? penaltyType : 'amount';
    const pv = empId === selectedEmployee ? (pt === 'days' ? normalizeQuarterInput(penaltyValue) : penaltyValue) : 0;
    const penaltyDailyRate = sr.basicSalary / 30;
    const pa = pt === 'amount' ? roundToNearestQuarter(pv) : pt === 'days' ? roundToNearestQuarter(penaltyDailyRate * pv) : roundToNearestQuarter((pv / 100) * sr.basicSalary);
    const td = sr.employeeInsurance + lp + aa + mb + lded + pa;

    return {
      employeeId: empId,
      employeeCode: emp.employeeId || '',
      employeeName: emp.nameAr,
      employeeNameEn: emp.nameEn,
      department: emp.department,
      stationLocation: emp.stationLocation || sr.stationLocation,
      month: selectedMonth,
      year: selectedYear,
      basicSalary: sr.basicSalary,
      transportAllowance: sr.transportAllowance,
      incentives: sr.incentives,
      stationAllowance: sr.stationAllowance,
      mobileAllowance: sr.mobileAllowance,
      livingAllowance: la,
      overtimePay: ot,
      bonusType: bt,
      bonusValue: bv,
      bonusAmount: ba,
      gross: g,
      employeeInsurance: sr.employeeInsurance,
      loanPayment: lp,
      advanceAmount: aa,
      mobileBill: mb,
      leaveDays: ld,
      leaveDeduction: lded,
      penaltyType: pt,
      penaltyValue: pv,
      penaltyAmount: pa,
      totalDeductions: td,
      netSalary: g + ba - td,
      employerSocialInsurance: sr.employerSocialInsurance,
      healthInsurance: sr.healthInsurance,
      incomeTax: sr.incomeTax,
      processedAt: new Date().toISOString().split('T')[0],
    };
  };

  const handleSave = async () => {
    const entry = buildPayrollEntry(selectedEmployee);
    if (!entry) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'يرجى اختيار موظف لديه بيانات راتب' : 'Select an employee with salary data', variant: 'destructive' });
      return;
    }
    savePayrollEntry(entry);
    await syncLoansAfterPayroll([selectedEmployee], selectedMonth, selectedYear);
    toast({ title: ar ? 'تم الحفظ' : 'Saved', description: ar ? 'تم حفظ بيانات الراتب الشهري' : 'Monthly payroll saved' });
  };

  const handleBulkProcess = async () => {
    const entries: ProcessedPayroll[] = [];
    const targets = selectedBulk.length > 0 ? selectedBulk : filteredEmployees.map(e => e.id);
    targets.forEach(empId => {
      const entry = buildPayrollEntry(empId);
      if (entry) entries.push(entry);
    });
    if (entries.length === 0) {
      toast({ title: ar ? 'خطأ' : 'Error', description: ar ? 'لا يوجد موظفين لديهم بيانات راتب' : 'No employees with salary data', variant: 'destructive' });
      return;
    }
    savePayrollEntries(entries);
    await syncLoansAfterPayroll(entries.map(e => e.employeeId), selectedMonth, selectedYear);
    toast({ title: ar ? 'تم التشغيل' : 'Processed', description: ar ? `تم معالجة ${entries.length} موظف` : `Processed ${entries.length} employees` });
    setSelectedBulk([]);
  };

  const months = [
    { value: '01', label: ar ? 'يناير' : 'January' }, { value: '02', label: ar ? 'فبراير' : 'February' },
    { value: '03', label: ar ? 'مارس' : 'March' }, { value: '04', label: ar ? 'أبريل' : 'April' },
    { value: '05', label: ar ? 'مايو' : 'May' }, { value: '06', label: ar ? 'يونيو' : 'June' },
    { value: '07', label: ar ? 'يوليو' : 'July' }, { value: '08', label: ar ? 'أغسطس' : 'August' },
    { value: '09', label: ar ? 'سبتمبر' : 'September' }, { value: '10', label: ar ? 'أكتوبر' : 'October' },
    { value: '11', label: ar ? 'نوفمبر' : 'November' }, { value: '12', label: ar ? 'ديسمبر' : 'December' },
  ];

  const totalSaved = processedThisMonth.length;
  const selectedEmpData = activeEmployees.find(e => e.id === selectedEmployee);

  const stats = [
    { label: ar ? 'إجمالي الموظفين' : 'Total Employees', value: String(activeEmployees.length), icon: Users, bg: 'bg-stat-blue', cardBg: 'bg-stat-blue-bg' },
    { label: ar ? 'تم المعالجة' : 'Processed', value: String(totalSaved), icon: FileText, bg: 'bg-stat-green', cardBg: 'bg-stat-green-bg' },
    { label: ar ? 'المتبقي' : 'Remaining', value: String(activeEmployees.length - totalSaved), icon: Clock, bg: 'bg-stat-yellow', cardBg: 'bg-stat-yellow-bg' },
    { label: ar ? 'إجمالي الصافي' : 'Total Net', value: processedThisMonth.reduce((s, e) => s + e.netSalary, 0).toLocaleString(), icon: Wallet, bg: 'bg-stat-purple', cardBg: 'bg-stat-purple-bg' },
  ];

  const readOnlyField = (label: string, value: number | string) => (
    <div className="space-y-1.5">
      <Label className={cn("text-xs", isRTL && "text-right block")}>{label}</Label>
      <Input value={typeof value === 'number' ? value.toLocaleString() : value} readOnly disabled className={cn("h-9 text-sm bg-muted/30", isRTL && "text-right")} />
    </div>
  );

  const toggleBulkSelect = (empId: string) => {
    setSelectedBulk(prev => prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={cn("rounded-xl p-5 flex items-center gap-4 shadow-sm border border-border/30", stat.cardBg, isRTL && "flex-row-reverse")}>
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", stat.bg)}>
              <stat.icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Period + Bulk */}
      <Card>
        <CardContent className="pt-6">
          <div className={cn("flex flex-wrap gap-4 items-end justify-between", isRTL && "flex-row-reverse")}>
            <div className={cn("flex gap-4 items-end", isRTL && "flex-row-reverse")}>
              <div className="space-y-2">
                <Label>{ar ? 'الشهر' : 'Month'}</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{ar ? 'السنة' : 'Year'}</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 11 }, (_, i) => String(2025 + i)).map(y => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
              <Button variant={bulkMode ? "default" : "outline"} onClick={() => { setBulkMode(!bulkMode); setSelectedBulk([]); }} className="gap-2">
                <Users className="h-4 w-4" />
                {ar ? 'تشغيل جماعي' : 'Bulk Process'}
              </Button>
              {bulkMode && (
                <Button onClick={handleBulkProcess} className="gap-2">
                  <PlayCircle className="h-4 w-4" />
                  {ar ? `تشغيل (${selectedBulk.length || filteredEmployees.length})` : `Run (${selectedBulk.length || filteredEmployees.length})`}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Employee Sidebar */}
        <div className={cn("col-span-3 space-y-4", isRTL && "order-first")}>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="relative">
                <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
                <Input placeholder={ar ? 'بحث بالاسم...' : 'Search...'} value={searchName} onChange={(e) => setSearchName(e.target.value)} className={cn(isRTL ? "pr-10" : "pl-10")} />
              </div>
              <Select value={searchStation} onValueChange={setSearchStation}>
                <SelectTrigger><SelectValue placeholder={ar ? 'المحطة/الموقع' : 'Station'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                  {stationLocations.map(s => <SelectItem key={s.value} value={s.value}>{ar ? s.labelAr : s.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {filteredEmployees.map(emp => {
              const isSaved = processedThisMonth.some(e => e.employeeId === emp.id);
              return (
                <div key={emp.id} className="flex items-center gap-1">
                  {bulkMode && (
                    <Checkbox
                      checked={selectedBulk.includes(emp.id)}
                      onCheckedChange={() => toggleBulkSelect(emp.id)}
                      className="shrink-0"
                    />
                  )}
                  <button
                    onClick={() => { if (!bulkMode) handleSelectEmployee(emp.id); }}
                    className={cn(
                      "w-full text-start px-3 py-2 rounded-lg transition-colors text-sm flex items-center justify-between",
                      !bulkMode && selectedEmployee === emp.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                    )}
                  >
                    <span>{ar ? emp.nameAr : emp.nameEn}</span>
                    {isSaved && <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-9 space-y-6">
          {selectedEmployee && !salaryRecord && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4 text-center">
                <p className="text-destructive font-medium">
                  {ar ? `لا توجد بيانات راتب لهذا الموظف في سنة ${selectedYear}` : `No salary data for ${selectedYear}`}
                </p>
              </CardContent>
            </Card>
          )}

          {!selectedEmployee && !bulkMode && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{ar ? 'اختر موظفاً من القائمة لعرض بيانات الراتب' : 'Select an employee'}</p>
              </CardContent>
            </Card>
          )}

          {bulkMode && !selectedEmployee && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <PlayCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{ar ? 'وضع التشغيل الجماعي - اختر موظفين من القائمة أو اضغط تشغيل لمعالجة الكل' : 'Bulk mode - select employees or run all'}</p>
              </CardContent>
            </Card>
          )}

          {salaryRecord && !bulkMode && (
            <>
              {selectedEmpData && (
                <Card>
                  <CardContent className="p-4">
                    <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {(ar ? selectedEmpData.nameAr : selectedEmpData.nameEn).charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{ar ? selectedEmpData.nameAr : selectedEmpData.nameEn}</h3>
                        <p className="text-sm text-muted-foreground">{selectedEmpData.department} - {selectedEmpData.employeeId}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Salary Components (read-only from record) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className={cn("flex items-center gap-2 text-lg", isRTL && "flex-row-reverse")}>
                    <Wallet className="h-5 w-5 text-primary" />
                    {ar ? 'مكونات الراتب' : 'Salary Components'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {readOnlyField(ar ? 'الراتب الأساسي' : 'Basic Salary', salaryRecord.basicSalary)}
                    {readOnlyField(ar ? 'بدل المواصلات' : 'Transport', salaryRecord.transportAllowance)}
                    {readOnlyField(ar ? 'الحوافز' : 'Incentives', salaryRecord.incentives)}
                    {readOnlyField(ar ? 'بدل سكن المحطة' : 'Station', salaryRecord.stationAllowance)}
                    {readOnlyField(ar ? 'بدل الجوال' : 'Mobile', salaryRecord.mobileAllowance)}
                  </div>
                  <Separator className="my-4" />
                  <h4 className={cn("font-semibold text-sm mb-3", isRTL && "text-right")}>{ar ? 'إدخال يدوي شهري' : 'Monthly Manual Entry'}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className={cn("text-xs", isRTL && "text-right block")}>{ar ? 'بدل المعيشة (ج.م)' : 'Living Allowance (EGP)'}</Label>
                      <Input type="number" value={livingAllowance || ''} onChange={e => setLivingAllowance(parseFloat(e.target.value) || 0)} className={cn("h-9 text-sm", isRTL && "text-right")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className={cn("text-xs", isRTL && "text-right block")}>{ar ? 'أجر إضافي (ج.م)' : 'Overtime Pay (EGP)'}</Label>
                      <Input type="number" value={overtimePay || ''} onChange={e => setOvertimePay(parseFloat(e.target.value) || 0)} className={cn("h-9 text-sm", isRTL && "text-right")} />
                    </div>
                    {readOnlyField(ar ? 'إجمالي الراتب' : 'Gross Salary', gross)}
                  </div>
                </CardContent>
              </Card>

              {/* Bonuses */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className={cn("flex items-center gap-2 text-lg", isRTL && "flex-row-reverse")}>
                    <Gift className="h-5 w-5 text-green-600" />
                    {ar ? 'المكافآت' : 'Bonuses'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup value={bonusType} onValueChange={(v) => { setBonusType(v as any); setBonusValue(0); }} className={cn("flex gap-4", isRTL && "flex-row-reverse")}>
                    <div className={cn("flex-1 border rounded-lg p-4 cursor-pointer", bonusType === 'amount' ? 'border-primary bg-primary/5' : 'border-border')}>
                      <div className="flex items-center gap-2"><RadioGroupItem value="amount" id="bonus-amount" /><Label htmlFor="bonus-amount" className="cursor-pointer">{ar ? 'مبلغ يدوي' : 'Manual Amount'}</Label></div>
                    </div>
                    <div className={cn("flex-1 border rounded-lg p-4 cursor-pointer", bonusType === 'percentage' ? 'border-primary bg-primary/5' : 'border-border')}>
                      <div className="flex items-center gap-2"><RadioGroupItem value="percentage" id="bonus-pct" /><Label htmlFor="bonus-pct" className="cursor-pointer">{ar ? 'نسبة من الإجمالي الأساسي' : '% of Base Gross'}</Label></div>
                    </div>
                  </RadioGroup>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className={cn("text-xs", isRTL && "text-right block")}>{bonusType === 'amount' ? (ar ? 'قيمة المكافأة' : 'Amount') : (ar ? 'النسبة %' : 'Percentage %')}</Label>
                      <Input type="number" value={bonusValue || ''} onChange={e => setBonusValue(parseFloat(e.target.value) || 0)} className={cn("h-9 text-sm", isRTL && "text-right")} />
                    </div>
                    {bonusType === 'percentage' && readOnlyField(ar ? 'قيمة المكافأة المحسوبة' : 'Calculated', bonusAmount)}
                  </div>
                </CardContent>
              </Card>

              {/* Employer Contributions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className={cn("flex items-center gap-2 text-lg", isRTL && "flex-row-reverse")}>
                    <Building2 className="h-5 w-5 text-blue-600" />
                    {ar ? 'مساهمات الشركة' : 'Company Contributions'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {readOnlyField(ar ? 'التأمينات - الشركة' : 'Social Ins. - Company', employerSocialIns)}
                    {readOnlyField(ar ? 'التأمين الصحي' : 'Health Insurance', healthIns)}
                    {readOnlyField(ar ? 'ضريبة الدخل' : 'Income Tax', incomeTax)}
                  </div>
                </CardContent>
              </Card>

              {/* Deductions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className={cn("flex items-center gap-2 text-lg", isRTL && "flex-row-reverse")}>
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    {ar ? 'الخصومات' : 'Deductions'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {readOnlyField(ar ? 'التأمينات - الموظف' : 'Social Ins. - Employee', employeeInsurance)}
                    {readOnlyField(ar ? 'القروض (تلقائي)' : 'Loans (Auto)', loanPayment)}
                    {readOnlyField(ar ? 'السلف (تلقائي)' : 'Advances (Auto)', advanceAmount)}
                    {readOnlyField(ar ? 'الجوال الشخصي' : 'Mobile Bill', mobileBill)}
                  </div>
                  <Separator />
                  <div>
                    <h4 className={cn("font-semibold text-sm mb-3", isRTL && "text-right")}>{ar ? 'خصم الإجازة من الراتب' : 'Leave Deduction'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className={cn("text-xs", isRTL && "text-right block")}>{ar ? 'عدد الأيام' : 'Days'}</Label>
                        <Input type="number" step="0.125" value={leaveDays || ''} onChange={e => setLeaveDays(normalizeQuarterInput(parseFloat(e.target.value)))} className={cn("h-9 text-sm", isRTL && "text-right")} min={0} />
                      </div>
                      {readOnlyField(ar ? 'قيمة الخصم (تلقائي)' : 'Deduction (Auto)', leaveDeduction)}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className={cn("font-semibold text-sm mb-3", isRTL && "text-right")}>{ar ? 'الجزاءات' : 'Penalties'}</h4>
                    <RadioGroup value={penaltyType} onValueChange={(v) => { setPenaltyType(v as any); setPenaltyValue(0); }} className={cn("flex gap-3 mb-4", isRTL && "flex-row-reverse")}>
                      {[
                        { v: 'amount', l: ar ? 'مبلغ' : 'Amount' },
                        { v: 'days', l: ar ? 'أيام' : 'Days' },
                        { v: 'percentage', l: ar ? 'نسبة' : '%' },
                      ].map(opt => (
                        <div key={opt.v} className={cn("flex-1 border rounded-lg p-3 cursor-pointer", penaltyType === opt.v ? 'border-primary bg-primary/5' : 'border-border')}>
                          <div className="flex items-center gap-2"><RadioGroupItem value={opt.v} id={`pen-${opt.v}`} /><Label htmlFor={`pen-${opt.v}`} className="cursor-pointer text-sm">{opt.l}</Label></div>
                        </div>
                      ))}
                    </RadioGroup>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className={cn("text-xs", isRTL && "text-right block")}>
                          {penaltyType === 'amount' ? (ar ? 'قيمة الجزاء' : 'Amount') : penaltyType === 'days' ? (ar ? 'عدد الأيام' : 'Days') : (ar ? 'النسبة %' : '%')}
                        </Label>
                        <Input type="number" step={penaltyType === 'days' ? '0.125' : 'any'} value={penaltyValue || ''} onChange={e => { const v = parseFloat(e.target.value) || 0; setPenaltyValue(penaltyType === 'days' ? normalizeQuarterInput(v) : v); }} className={cn("h-9 text-sm", isRTL && "text-right")} min={0} />
                      </div>
                      {penaltyType !== 'amount' && readOnlyField(ar ? 'قيمة الجزاء' : 'Penalty Value', penaltyAmount)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className={cn("flex items-center gap-2 text-lg", isRTL && "flex-row-reverse")}>
                    <FileText className="h-5 w-5 text-primary" />
                    {ar ? 'ملخص الحسابات' : 'Summary'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className={cn("flex justify-between py-2", isRTL && "flex-row-reverse")}>
                      <span className="text-sm text-muted-foreground">{ar ? 'إجمالي الراتب' : 'Gross'}</span>
                      <span className="font-bold text-lg">{gross.toLocaleString()}</span>
                    </div>
                    {bonusAmount > 0 && (
                      <div className={cn("flex justify-between py-2", isRTL && "flex-row-reverse")}>
                        <span className="text-sm text-green-600">{ar ? '+ المكافآت' : '+ Bonus'}</span>
                        <span className="font-bold text-green-600">+{bonusAmount.toLocaleString()}</span>
                      </div>
                    )}
                    {overtimePay > 0 && (
                      <div className={cn("flex justify-between py-2", isRTL && "flex-row-reverse")}>
                        <span className="text-sm text-blue-600">{ar ? '(مضمن) أجر إضافي' : '(Incl.) Overtime'}</span>
                        <span className="font-bold text-blue-600">{overtimePay.toLocaleString()}</span>
                      </div>
                    )}
                    <Separator />
                    <div className={cn("flex justify-between py-2", isRTL && "flex-row-reverse")}>
                      <span className="text-sm text-destructive font-medium">{ar ? 'إجمالي الخصومات' : 'Total Deductions'}</span>
                      <span className="font-bold text-destructive">{totalDeductions.toLocaleString()}</span>
                    </div>
                    <Separator className="border-2" />
                    <div className={cn("flex justify-between py-2", isRTL && "flex-row-reverse")}>
                      <span className="text-base font-bold">{ar ? 'صافي الراتب' : 'Net Salary'}</span>
                      <span className="font-bold text-2xl text-primary">{netSalary.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className={cn("flex gap-3 sticky bottom-0 bg-background py-4 border-t", isRTL ? "flex-row-reverse" : "")}>
                <Button onClick={handleSave} className="gap-2 flex-1 md:flex-none md:min-w-[200px]" size="lg">
                  <Save className="h-5 w-5" />{ar ? 'حفظ الراتب' : 'Save Salary'}
                </Button>
                <Button variant="outline" onClick={handleReset} className="gap-2 flex-1 md:flex-none md:min-w-[150px]" size="lg">
                  <X className="h-5 w-5" />{ar ? 'إلغاء' : 'Cancel'}
                </Button>
                {getPayrollEntry(selectedEmployee, selectedMonth, selectedYear) && (
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      await deletePayrollEntry(selectedEmployee, selectedMonth, selectedYear);
                      handleReset();
                      toast({ title: ar ? 'تم الحذف' : 'Deleted', description: ar ? 'تم حذف كشف الراتب لهذا الشهر' : 'Payroll entry deleted' });
                    }}
                    className="gap-2 flex-1 md:flex-none md:min-w-[150px]"
                    size="lg"
                  >
                    <Trash2 className="h-5 w-5" />{ar ? 'حذف الراتب' : 'Delete Salary'}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
