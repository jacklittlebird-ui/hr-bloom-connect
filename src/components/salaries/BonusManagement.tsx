import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Play, Loader2, Award, Printer, FileText, FileSpreadsheet, Search, X, CalendarIcon, Users, Building2, Wallet, Landmark } from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';


interface BonusRecord {
  id?: string;
  employee_id: string;
  employee_name: string;
  employee_name_en: string;
  employee_code: string;
  station_name: string;
  department_name: string;
  job_title: string;
  hire_date: string;
  bank_account_number: string;
  bank_id_number: string;
  bank_name: string;
  bank_account_type: string;
  job_level: string;
  percentage: number;
  gross_salary: number;
  amount: number;
}

const REPORT_COLUMNS = [
  { headerAr: '#', headerEn: '#', key: '_index' },
  { headerAr: 'الاسم', headerEn: 'Name', key: 'employee_name' },
  { headerAr: 'الرقم الوظيفي', headerEn: 'ID', key: 'employee_code' },
  { headerAr: 'المحطة', headerEn: 'Station', key: 'station_name' },
  { headerAr: 'القسم', headerEn: 'Department', key: 'department_name' },
  { headerAr: 'الوظيفة', headerEn: 'Job Title', key: 'job_title' },
  { headerAr: 'المستوى', headerEn: 'Level', key: 'job_level' },
  { headerAr: 'تاريخ التعيين', headerEn: 'Hire Date', key: 'hire_date' },
  { headerAr: 'رقم الحساب', headerEn: 'Account No.', key: 'bank_account_number' },
  { headerAr: 'ID البنكي', headerEn: 'Bank ID', key: 'bank_id_number' },
  { headerAr: 'اسم البنك', headerEn: 'Bank Name', key: 'bank_name' },
  { headerAr: 'نوع الحساب', headerEn: 'Account Type', key: 'bank_account_type' },
  { headerAr: 'الراتب الإجمالي', headerEn: 'Gross Salary', key: 'gross_salary' },
  { headerAr: 'النسبة %', headerEn: 'Rate %', key: 'percentage' },
  { headerAr: 'المبلغ', headerEn: 'Amount', key: 'amount' },
];

export const BonusManagement = () => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { exportBilingualPDF, exportBilingualCSV, handlePrint, reportRef } = useReportExport();

  const [bonusNumber, setBonusNumber] = useState('1');
  const [minMonths, setMinMonths] = useState('3');
  const [calculationDate, setCalculationDate] = useState<Date>(new Date());
  const [bonusPercentage, setBonusPercentage] = useState('');
  const [records, setRecords] = useState<BonusRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const currentYear = new Date().getFullYear().toString();

  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterStation, setFilterStation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterBank, setFilterBank] = useState('all');

  useEffect(() => {
    loadExistingRecords();
  }, [bonusNumber]);

  const loadExistingRecords = async () => {
    setLoadingRecords(true);
    const { data, error } = await supabase
      .from('bonus_records')
      .select('*, employees:employee_id (name_ar, name_en)')
      .eq('bonus_number', parseInt(bonusNumber))
      .eq('year', currentYear)
      .order('employee_code');

    if (!error && data) {
      setRecords(data.map((r: any) => {
        const emp = r.employees as any;
        return {
          id: r.id,
          employee_id: r.employee_id,
          employee_name: emp?.name_ar || r.employee_name || '',
          employee_name_en: emp?.name_en || '',
          employee_code: r.employee_code || '',
          station_name: r.station_name || '',
          department_name: r.department_name || '',
          job_title: r.job_title || '',
          hire_date: r.hire_date || '',
          bank_account_number: r.bank_account_number || '',
          bank_id_number: r.bank_id_number || '',
          bank_name: r.bank_name || '',
          bank_account_type: r.bank_account_type || '',
          job_level: r.job_level || '',
          percentage: r.percentage,
          gross_salary: r.gross_salary,
          amount: r.amount,
        };
      }));
    }
    setLoadingRecords(false);
  };

  // Unique filter options from records
  const stations = useMemo(() => [...new Set(records.map(r => r.station_name).filter(Boolean))].sort(), [records]);
  const departments = useMemo(() => [...new Set(records.map(r => r.department_name).filter(Boolean))].sort(), [records]);
  const levels = useMemo(() => [...new Set(records.map(r => r.job_level).filter(Boolean))].sort(), [records]);
  const banks = useMemo(() => [...new Set(records.map(r => r.bank_name).filter(Boolean))].sort(), [records]);

  // Filtered and sorted records (station asc, then name asc)
  const filteredRecords = useMemo(() => {
    const filtered = records.filter(r => {
      if (searchText) {
        const s = searchText.toLowerCase();
        if (!r.employee_name.toLowerCase().includes(s) && !r.employee_code.toLowerCase().includes(s)) return false;
      }
      if (filterStation !== 'all' && r.station_name !== filterStation) return false;
      if (filterDepartment !== 'all' && r.department_name !== filterDepartment) return false;
      if (filterLevel !== 'all' && r.job_level !== filterLevel) return false;
      if (filterBank !== 'all' && r.bank_name !== filterBank) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      const stationA = (a.station_name || '').localeCompare(b.station_name || '', 'ar');
      if (stationA !== 0) return stationA;
      return (a.employee_name || '').localeCompare(b.employee_name || '', 'ar');
    });
  }, [records, searchText, filterStation, filterDepartment, filterLevel, filterBank]);

  const hasActiveFilters = searchText || filterStation !== 'all' || filterDepartment !== 'all' || filterLevel !== 'all' || filterBank !== 'all';

  const clearFilters = () => {
    setSearchText('');
    setFilterStation('all');
    setFilterDepartment('all');
    setFilterLevel('all');
    setFilterBank('all');
  };

  const handleRun = async () => {
    const pct = parseFloat(bonusPercentage);
    if (!pct || pct <= 0) {
      toast.error(ar ? 'يرجى إدخال نسبة المكافأة' : 'Please enter the bonus percentage');
      return;
    }

    setLoading(true);
    try {
      const cutoffDate = new Date(calculationDate);
      cutoffDate.setMonth(cutoffDate.getMonth() - parseInt(minMonths));
      cutoffDate.setDate(cutoffDate.getDate() + 10);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      // Get eligible employees
      const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select(`
          id, name_ar, name_en, employee_code, job_level, job_title_ar, job_title_en, basic_salary,
          hire_date, bank_account_number, bank_id_number, bank_name, bank_account_type,
          station_id, department_id,
          stations:station_id (name_ar, name_en),
          departments:department_id (name_ar, name_en)
        `)
        .eq('status', 'active')
        .eq('employment_status', 'active')
        .or('resigned.is.null,resigned.eq.false')
        .lte('hire_date', cutoffStr);

      if (empErr) throw empErr;
      if (!employees || employees.length === 0) {
        toast.info(ar ? 'لا يوجد موظفين مستحقين' : 'No eligible employees found');
        setLoading(false);
        return;
      }

      // Gross salary from Salary & Allowances tab (salary_records) - batch to avoid URL length limits
      const empIds = employees.map(e => e.id);
      const BATCH_SIZE = 100;
      const salaryGrossMap = new Map<string, number>();

      for (let i = 0; i < empIds.length; i += BATCH_SIZE) {
        const batch = empIds.slice(i, i + BATCH_SIZE);
        const { data: salaryData } = await supabase
          .from('salary_records')
          .select('employee_id, basic_salary, transport_allowance, incentives, station_allowance, mobile_allowance, living_allowance, roster_allowance')
          .in('employee_id', batch)
          .order('year', { ascending: false });

        (salaryData || []).forEach(s => {
          if (!salaryGrossMap.has(s.employee_id)) {
            const gross = (s.basic_salary || 0) + (s.transport_allowance || 0) + (s.incentives || 0) +
              (s.station_allowance || 0) + (s.mobile_allowance || 0) + (s.living_allowance || 0) + (s.roster_allowance || 0);
            salaryGrossMap.set(s.employee_id, gross);
          }
        });
      }

      const bonusRecords: any[] = [];
      for (const emp of employees) {
        const level = emp.job_level || '';

        const grossFromSalaryTab = salaryGrossMap.get(emp.id) || 0;
        const grossSalary = grossFromSalaryTab > 0 ? grossFromSalaryTab : (emp.basic_salary || 0);
        if (grossSalary <= 0) continue;

        const amount = Math.round((grossSalary * pct / 100) * 100) / 100;

        const station = emp.stations as any;
        const dept = emp.departments as any;

        bonusRecords.push({
          employee_id: emp.id,
          bonus_number: parseInt(bonusNumber),
          year: currentYear,
          percentage: pct,
          gross_salary: grossSalary,
          amount,
          job_level: level,
          employee_name: emp.name_ar,
          employee_code: emp.employee_code,
          station_name: station ? (ar ? station.name_ar : station.name_en) : '',
          department_name: dept ? (ar ? dept.name_ar : dept.name_en) : '',
          job_title: ar ? (emp.job_title_ar || '') : (emp.job_title_en || ''),
          hire_date: emp.hire_date,
          bank_account_number: emp.bank_account_number || '',
          bank_id_number: emp.bank_id_number || '',
          bank_name: emp.bank_name || '',
          bank_account_type: emp.bank_account_type || '',
        });
      }

      if (bonusRecords.length === 0) {
        toast.info(ar ? 'لا يوجد موظفين برواتب إجمالية صالحة للاحتساب' : 'No employees with valid gross salary for calculation');
        setLoading(false);
        return;
      }

      // Delete old records for this bonus_number and year first
      const { error: deleteErr } = await supabase
        .from('bonus_records')
        .delete()
        .eq('bonus_number', parseInt(bonusNumber))
        .eq('year', currentYear);

      if (deleteErr) throw deleteErr;

      // Insert new records in batches
      for (let i = 0; i < bonusRecords.length; i += BATCH_SIZE) {
        const batch = bonusRecords.slice(i, i + BATCH_SIZE);
        const { error: insertErr } = await supabase
          .from('bonus_records')
          .insert(batch);
        if (insertErr) throw insertErr;
      }

      toast.success(ar ? `تم تشغيل المكافأة ${bonusNumber} بنجاح - ${bonusRecords.length} موظف` : `Bonus ${bonusNumber} processed - ${bonusRecords.length} employees`);
      loadExistingRecords();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = useMemo(() => filteredRecords.reduce((s, r) => s + r.amount, 0), [filteredRecords]);
  const totalGross = useMemo(() => filteredRecords.reduce((s, r) => s + r.gross_salary, 0), [filteredRecords]);

  const uniqueStationsCount = useMemo(() => new Set(filteredRecords.map(r => r.station_name).filter(Boolean)).size, [filteredRecords]);
  const uniqueBanksCount = useMemo(() => new Set(filteredRecords.map(r => r.bank_name).filter(Boolean)).size, [filteredRecords]);

  const statsCards = useMemo(() => [
    { label: ar ? 'عدد الموظفين' : 'Employees', value: String(filteredRecords.length), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: ar ? 'إجمالي المكافآت' : 'Total Bonuses', value: totalAmount.toLocaleString() + (ar ? ' ج.م' : ' EGP'), icon: Wallet, color: 'text-green-600', bg: 'bg-green-100' },
    { label: ar ? 'عدد المحطات' : 'Stations', value: String(uniqueStationsCount), icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: ar ? 'عدد البنوك' : 'Banks', value: String(uniqueBanksCount), icon: Landmark, color: 'text-amber-600', bg: 'bg-amber-100' },
  ], [filteredRecords, totalAmount, uniqueStationsCount, uniqueBanksCount, ar]);

  const getExportData = () => filteredRecords.map((r, i) => ({ ...r, _index: i + 1, employee_name: ar ? r.employee_name : (r.employee_name_en || r.employee_name) }));

  const reportTitle = ar ? `سجل المكافأة ${bonusNumber} - ${currentYear}` : `Bonus ${bonusNumber} - ${currentYear}`;

  const getExportSummaryCards = () => statsCards.map(c => ({ label: c.label, value: c.value }));

  const handleExportPDF = () => {
    exportBilingualPDF({
      titleAr: `سجل المكافأة ${bonusNumber} - ${currentYear}`,
      titleEn: `Bonus ${bonusNumber} Record - ${currentYear}`,
      data: getExportData(),
      columns: REPORT_COLUMNS,
      fileName: `bonus_${bonusNumber}_${currentYear}`,
      summaryCards: getExportSummaryCards(),
    });
  };

  const handleExportExcel = () => {
    exportBilingualCSV({
      titleAr: `سجل المكافأة ${bonusNumber} - ${currentYear}`,
      titleEn: `Bonus ${bonusNumber} Record - ${currentYear}`,
      data: getExportData(),
      columns: REPORT_COLUMNS,
      fileName: `bonus_${bonusNumber}_${currentYear}`,
      summaryCards: getExportSummaryCards(),
    });
  };

  const handlePrintReport = () => {
    handlePrint(reportTitle, getExportSummaryCards());
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Award className="w-5 h-5 text-primary" />
            {ar ? 'إعدادات المكافأة' : 'Bonus Settings'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", isRTL && "direction-rtl")}>
            <div className="space-y-2">
              <Label className={cn(isRTL && "text-right block")}>{ar ? 'اختر المكافأة' : 'Select Bonus'}</Label>
              <Select value={bonusNumber} onValueChange={setBonusNumber}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{ar ? 'مكافأة 1' : 'Bonus 1'}</SelectItem>
                  <SelectItem value="2">{ar ? 'مكافأة 2' : 'Bonus 2'}</SelectItem>
                  <SelectItem value="3">{ar ? 'مكافأة 3' : 'Bonus 3'}</SelectItem>
                  <SelectItem value="4">{ar ? 'مكافأة 4' : 'Bonus 4'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={cn(isRTL && "text-right block")}>{ar ? 'استبعاد من لم يتم' : 'Exclude employees under'}</Label>
              <Select value={minMonths} onValueChange={setMinMonths}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map(m => (
                    <SelectItem key={m} value={String(m)}>
                      {m} {ar ? (m === 1 ? 'شهر' : 'أشهر') : (m === 1 ? 'month' : 'months')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={cn(isRTL && "text-right block")}>{ar ? 'تاريخ الاحتساب' : 'Calculation Date'}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !calculationDate && "text-muted-foreground")}>
                    <CalendarIcon className="w-4 h-4 me-2" />
                    {calculationDate ? format(calculationDate, 'yyyy-MM-dd') : (ar ? 'اختر تاريخ' : 'Pick a date')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={calculationDate}
                    onSelect={(d) => d && setCalculationDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                {ar ? 'يُستبعد من لم يتم المدة المحددة إلا 10 أيام من هذا التاريخ' : 'Excludes employees under the period minus 10 days from this date'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
              <Label className={cn(isRTL && "text-right block")}>{ar ? 'نسبة المكافأة (% من الراتب الإجمالي)' : 'Bonus Rate (% of gross salary)'}</Label>
              <div className="relative w-48">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="25"
                  value={bonusPercentage}
                  onChange={e => setBonusPercentage(e.target.value)}
                  className="h-9 pe-8"
                />
                <span className="absolute top-1/2 -translate-y-1/2 end-2.5 text-xs text-muted-foreground">%</span>
              </div>
            </div>

          <div className={cn("flex", isRTL ? "justify-start" : "justify-end")}>
            <Button onClick={handleRun} disabled={loading} className="gap-2 min-w-[180px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {ar ? 'تشغيل جماعي' : 'Run Bulk Process'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats Cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statsCards.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                  <div className={cn("p-2.5 rounded-lg", stat.bg)}>
                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results Card */}
      <Card>
        <CardHeader>
          <div className={cn("flex flex-col gap-4")}>
            {/* Title row */}
            <div className={cn("flex items-center justify-between flex-wrap gap-2", isRTL && "flex-row-reverse")}>
              <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                {ar ? `سجل المكافأة ${bonusNumber} - ${currentYear}` : `Bonus ${bonusNumber} Record - ${currentYear}`}
                <Badge variant="secondary">{filteredRecords.length}{records.length !== filteredRecords.length ? ` / ${records.length}` : ''}</Badge>
              </CardTitle>
              {/* Export buttons */}
              {records.length > 0 && (
                <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Button variant="outline" size="sm" onClick={handlePrintReport} className="gap-1.5">
                    <Printer className="w-4 h-4" />
                    {ar ? 'طباعة' : 'Print'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
                    <FileText className="w-4 h-4" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel
                  </Button>
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {ar ? 'الإجمالي:' : 'Total:'} {totalAmount.toLocaleString()} {ar ? 'ج.م' : 'EGP'}
                  </Badge>
                </div>
              )}
            </div>

            {/* Filters row */}
            {records.length > 0 && (
              <div className={cn("flex flex-wrap items-end gap-3", isRTL && "flex-row-reverse")}>
                {/* Search */}
                <div className="space-y-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground">{ar ? 'بحث' : 'Search'}</Label>
                  <div className="relative">
                    <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-2.5" : "left-2.5")} />
                    <Input
                      placeholder={ar ? 'اسم أو رقم وظيفي...' : 'Name or ID...'}
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      className={cn("h-9", isRTL ? "pr-8" : "pl-8")}
                    />
                  </div>
                </div>
                {/* Station */}
                <div className="space-y-1 min-w-[150px]">
                  <Label className="text-xs text-muted-foreground">{ar ? 'المحطة' : 'Station'}</Label>
                  <Select value={filterStation} onValueChange={setFilterStation}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
                      {stations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Department */}
                <div className="space-y-1 min-w-[150px]">
                  <Label className="text-xs text-muted-foreground">{ar ? 'القسم' : 'Department'}</Label>
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
                      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Level */}
                <div className="space-y-1 min-w-[130px]">
                  <Label className="text-xs text-muted-foreground">{ar ? 'المستوى' : 'Level'}</Label>
                  <Select value={filterLevel} onValueChange={setFilterLevel}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
                      {levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Bank */}
                <div className="space-y-1 min-w-[150px]">
                  <Label className="text-xs text-muted-foreground">{ar ? 'البنك' : 'Bank'}</Label>
                  <Select value={filterBank} onValueChange={setFilterBank}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
                      {banks.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {/* Clear */}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-destructive">
                    <X className="w-3.5 h-3.5" />
                    {ar ? 'مسح' : 'Clear'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingRecords ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {ar ? 'لا توجد سجلات بعد. قم بتشغيل المكافأة أولاً.' : 'No records yet. Run the bonus process first.'}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {ar ? 'لا توجد نتائج تطابق الفلاتر المحددة' : 'No results match the selected filters'}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded-lg" ref={reportRef}>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>#</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'الاسم' : 'Name'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'الرقم الوظيفي' : 'ID'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'القسم' : 'Department'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'الوظيفة' : 'Job Title'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'المستوى' : 'Level'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'تاريخ التعيين' : 'Hire Date'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'رقم الحساب' : 'Account No.'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'ID البنكي' : 'Bank ID'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'اسم البنك' : 'Bank Name'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'نوع الحساب' : 'Account Type'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'الإجمالي' : 'Gross'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'النسبة' : 'Rate'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'المبلغ' : 'Amount'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const rows: React.ReactNode[] = [];
                    let globalIndex = 0;
                    let currentStation = '';
                    let stationTotal = 0;
                    let stationGross = 0;
                    let stationCount = 0;

                    const flushStation = () => {
                      if (stationCount > 0) {
                        rows.push(
                          <TableRow key={`subtotal-${currentStation}`} className="bg-primary/5 font-semibold border-t-2 border-primary/20">
                            <TableCell colSpan={12} className={cn(isRTL ? "text-right" : "text-left")}>
                              {ar ? `مجموع ${currentStation || 'بدون محطة'}` : `${currentStation || 'No Station'} Subtotal`} ({stationCount})
                            </TableCell>
                            <TableCell>{stationGross.toLocaleString()}</TableCell>
                            <TableCell></TableCell>
                            <TableCell className="font-semibold">{stationTotal.toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      }
                    };

                    filteredRecords.forEach((r, i) => {
                      if (r.station_name !== currentStation && i > 0) {
                        flushStation();
                        stationTotal = 0;
                        stationGross = 0;
                        stationCount = 0;
                      }
                      currentStation = r.station_name;
                      stationTotal += r.amount;
                      stationGross += r.gross_salary;
                      stationCount++;
                      globalIndex++;

                      rows.push(
                        <TableRow key={r.id || r.employee_id}>
                          <TableCell>{globalIndex}</TableCell>
                          <TableCell className="font-medium whitespace-nowrap">{ar ? r.employee_name : (r.employee_name_en || r.employee_name)}</TableCell>
                          <TableCell>{r.employee_code}</TableCell>
                          <TableCell>{r.station_name}</TableCell>
                          <TableCell>{r.department_name}</TableCell>
                          <TableCell>{r.job_title}</TableCell>
                          <TableCell>{r.job_level}</TableCell>
                          <TableCell dir="ltr">{r.hire_date}</TableCell>
                          <TableCell>{r.bank_account_number}</TableCell>
                          <TableCell>{r.bank_id_number}</TableCell>
                          <TableCell>{r.bank_name}</TableCell>
                          <TableCell>{r.bank_account_type}</TableCell>
                          <TableCell>{r.gross_salary.toLocaleString()}</TableCell>
                          <TableCell>{r.percentage}%</TableCell>
                          <TableCell className="font-semibold">{r.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    });
                    flushStation();

                    return rows;
                  })()}
                  {/* Grand Totals row */}
                  <TableRow className="bg-muted/70 font-bold border-t-2">
                    <TableCell colSpan={14} className={cn(isRTL ? "text-right" : "text-left")}>
                      {ar ? 'الإجمالي الكلي' : 'Grand Total'}
                    </TableCell>
                    <TableCell className="font-bold">{totalAmount.toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
