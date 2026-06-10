import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Play, Loader2, Award, Printer, FileText, FileSpreadsheet, Search, X, Users, Building2, Wallet, Star, ExternalLink, Calculator } from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';
import { buildStationGroupRows, buildStationSubtotalExportRows } from '@/lib/stationReportGrouping';

interface Row {
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
  score: number;
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
  { headerAr: 'التقييم', headerEn: 'Score', key: 'score' },
  { headerAr: 'النسبة %', headerEn: 'Rate %', key: 'percentage' },
  { headerAr: 'تفاصيل الحساب', headerEn: 'Calculation', key: 'calc_details' },
  { headerAr: 'المبلغ', headerEn: 'Amount', key: 'amount' },
];

export const PerformanceBonuses = () => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { exportBilingualPDF, exportBilingualCSV, handlePrint, reportRef } = useReportExport();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [quarter, setQuarter] = useState('Q1');
  const [minMonths, setMinMonths] = useState('6');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterStation, setFilterStation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterBank, setFilterBank] = useState('all');

  const years = useMemo(() => {
    const arr: string[] = [];
    for (let y = currentYear + 1; y >= currentYear - 5; y--) arr.push(String(y));
    return arr;
  }, [currentYear]);

  const handleRun = async () => {
    setLoading(true);
    try {
      // 1) Get reviews for selected quarter/year
      const { data: reviews, error: revErr } = await supabase
        .from('performance_reviews')
        .select('employee_id, score, bonus_percentage')
        .eq('year', year)
        .eq('quarter', quarter);
      if (revErr) throw revErr;
      if (!reviews || reviews.length === 0) {
        setRows([]);
        toast.info(ar ? 'لا توجد تقييمات لهذه الفترة' : 'No reviews found for this period');
        return;
      }

      // Pick latest review per employee with a valid bonus_percentage
      const reviewMap = new Map<string, { percentage: number; score: number }>();
      reviews.forEach((r: any) => {
        const pct = r.bonus_percentage != null ? Number(r.bonus_percentage) : 0;
        if (!reviewMap.has(r.employee_id) || pct > (reviewMap.get(r.employee_id)?.percentage || 0)) {
          reviewMap.set(r.employee_id, { percentage: pct, score: Number(r.score || 0) });
        }
      });
      const empIds = Array.from(reviewMap.keys());

      // 2) Fetch employees in batches
      const BATCH = 100;
      const employees: any[] = [];
      for (let i = 0; i < empIds.length; i += BATCH) {
        const batch = empIds.slice(i, i + BATCH);
        const { data } = await supabase
          .from('employees')
          .select(`
            id, name_ar, name_en, employee_code, job_level, job_title_ar, job_title_en, basic_salary,
            hire_date, bank_account_number, bank_id_number, bank_name, bank_account_type,
            station_id, department_id,
            stations:station_id (name_ar, name_en),
            departments:department_id (name_ar, name_en)
          `)
          .in('id', batch);
        if (data) employees.push(...data);
      }

      // 3) Fetch gross from salary_records
      const salaryGrossMap = new Map<string, number>();
      for (let i = 0; i < empIds.length; i += BATCH) {
        const batch = empIds.slice(i, i + BATCH);
        const { data: salaryData } = await supabase
          .from('salary_records')
          .select('employee_id, basic_salary, transport_allowance, incentives, station_allowance, mobile_allowance, living_allowance, roster_allowance')
          .in('employee_id', batch)
          .order('year', { ascending: false });
        (salaryData || []).forEach((s: any) => {
          if (!salaryGrossMap.has(s.employee_id)) {
            const gross = (s.basic_salary || 0) + (s.transport_allowance || 0) + (s.incentives || 0) +
              (s.station_allowance || 0) + (s.mobile_allowance || 0) + (s.living_allowance || 0) + (s.roster_allowance || 0);
            salaryGrossMap.set(s.employee_id, gross);
          }
        });
      }

      // Min-months cutoff (same approach as BonusManagement: minus 10 days grace)
      const monthsInt = parseInt(minMonths) || 0;
      let cutoffStr: string | null = null;
      if (monthsInt > 0) {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - monthsInt);
        cutoff.setDate(cutoff.getDate() + 10);
        cutoffStr = cutoff.toISOString().split('T')[0];
      }

      const out: Row[] = [];
      for (const emp of employees) {
        const review = reviewMap.get(emp.id);
        if (!review) continue;
        if (cutoffStr && emp.hire_date && emp.hire_date > cutoffStr) continue;
        const pct = review.percentage;
        if (!pct || pct <= 0) continue;

        const grossFromSalaryTab = salaryGrossMap.get(emp.id) || 0;
        const grossSalary = grossFromSalaryTab > 0 ? grossFromSalaryTab : (emp.basic_salary || 0);
        if (grossSalary <= 0) continue;

        const amount = Math.round((grossSalary * pct / 100) * 100) / 100;
        const station = emp.stations as any;
        const dept = emp.departments as any;

        out.push({
          employee_id: emp.id,
          employee_name: emp.name_ar || '',
          employee_name_en: emp.name_en || '',
          employee_code: emp.employee_code || '',
          station_name: station ? (ar ? station.name_ar : station.name_en) : '',
          department_name: dept ? (ar ? dept.name_ar : dept.name_en) : '',
          job_title: ar ? (emp.job_title_ar || '') : (emp.job_title_en || ''),
          job_level: emp.job_level || '',
          hire_date: emp.hire_date || '',
          bank_account_number: emp.bank_account_number || '',
          bank_id_number: emp.bank_id_number || '',
          bank_name: emp.bank_name || '',
          bank_account_type: emp.bank_account_type || '',
          percentage: pct,
          score: review.score,
          gross_salary: grossSalary,
          amount,
        });
      }

      setRows(out);
      toast.success(ar ? `تم احتساب ${out.length} مكافأة` : `Calculated ${out.length} bonuses`);
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { handleRun(); /* eslint-disable-next-line */ }, []);

  // Inline edit: update a single employee's percentage and recompute amount
  const updateRowPercentage = (employeeId: string, newPct: number) => {
    setRows(prev => prev.map(r => {
      if (r.employee_id !== employeeId) return r;
      const pct = Math.max(0, Math.min(100, isNaN(newPct) ? 0 : newPct));
      const amount = Math.round((r.gross_salary * pct / 100) * 100) / 100;
      return { ...r, percentage: pct, amount };
    }));
  };

  // Unique filter options
  const stations = useMemo(() => [...new Set(rows.map(r => r.station_name).filter(Boolean))].sort(), [rows]);
  const departments = useMemo(() => [...new Set(rows.map(r => r.department_name).filter(Boolean))].sort(), [rows]);
  const levels = useMemo(() => [...new Set(rows.map(r => r.job_level).filter(Boolean))].sort(), [rows]);
  const banks = useMemo(() => [...new Set(rows.map(r => r.bank_name).filter(Boolean))].sort(), [rows]);

  const filteredRecords = useMemo(() => {
    const filtered = rows.filter(r => {
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
  }, [rows, searchText, filterStation, filterDepartment, filterLevel, filterBank]);

  const hasActiveFilters = searchText || filterStation !== 'all' || filterDepartment !== 'all' || filterLevel !== 'all' || filterBank !== 'all';
  const clearFilters = () => { setSearchText(''); setFilterStation('all'); setFilterDepartment('all'); setFilterLevel('all'); setFilterBank('all'); };

  const totalAmount = useMemo(() => filteredRecords.reduce((s, r) => s + r.amount, 0), [filteredRecords]);
  const avgScore = useMemo(() => filteredRecords.length ? (filteredRecords.reduce((s, r) => s + r.score, 0) / filteredRecords.length) : 0, [filteredRecords]);
  const uniqueStationsCount = useMemo(() => new Set(filteredRecords.map(r => r.station_name).filter(Boolean)).size, [filteredRecords]);
  const uniqueBanksCount = useMemo(() => new Set(filteredRecords.map(r => r.bank_name).filter(Boolean)).size, [filteredRecords]);

  const stationBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredRecords.forEach(r => {
      const key = r.station_name || (ar ? 'بدون محطة' : 'No Station');
      const prev = map.get(key) || { count: 0, total: 0 };
      map.set(key, { count: prev.count + 1, total: prev.total + r.amount });
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ar'));
  }, [filteredRecords, ar]);

  const statsCards = useMemo(() => [
    { label: ar ? 'عدد الموظفين' : 'Employees', value: String(filteredRecords.length), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: ar ? 'إجمالي المكافآت' : 'Total Bonuses', value: totalAmount.toLocaleString() + (ar ? ' ج.م' : ' EGP'), icon: Wallet, color: 'text-green-600', bg: 'bg-green-100' },
    { label: ar ? 'متوسط التقييم' : 'Avg Score', value: avgScore.toFixed(2) + ' / 5', icon: Star, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: ar ? 'عدد المحطات' : 'Stations', value: String(uniqueStationsCount), icon: Building2, color: 'text-blue-600', bg: 'bg-blue-100' },
  ], [filteredRecords, totalAmount, avgScore, uniqueStationsCount, ar]);

  const stationGroupedRows = useMemo(() => buildStationGroupRows(filteredRecords as any), [filteredRecords]);

  const getExportData = () => buildStationSubtotalExportRows(
    filteredRecords.map((r) => ({
      ...r,
      employee_name: ar ? r.employee_name : (r.employee_name_en || r.employee_name),
      calc_details: `${r.gross_salary.toLocaleString()} × ${r.percentage}% = ${r.amount.toLocaleString()}`,
    })) as any,
    { isArabic: ar, includeGrossSalary: true },
  );

  const reportTitle = ar ? `مكافأة التقييم - ${quarter} ${year}` : `Performance Bonus - ${quarter} ${year}`;
  const getExportSummaryCards = () => [
    ...statsCards.map(c => ({ label: c.label, value: c.value })),
    ...stationBreakdown.map(([name, data]) => ({ label: `${name} (${data.count})`, value: data.total.toLocaleString() })),
  ];

  const handleExportPDF = () => exportBilingualPDF({
    titleAr: `مكافأة التقييم - ${quarter} ${year}`,
    titleEn: `Performance Bonus - ${quarter} ${year}`,
    data: getExportData(), columns: REPORT_COLUMNS,
    fileName: `perf_bonus_${quarter}_${year}`, summaryCards: getExportSummaryCards(),
  });
  const handleExportExcel = () => exportBilingualCSV({
    titleAr: `مكافأة التقييم - ${quarter} ${year}`,
    titleEn: `Performance Bonus - ${quarter} ${year}`,
    data: getExportData(), columns: REPORT_COLUMNS,
    fileName: `perf_bonus_${quarter}_${year}`, summaryCards: getExportSummaryCards(),
  });
  const handlePrintReport = () => handlePrint(reportTitle, getExportSummaryCards());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Award className="w-5 h-5 text-primary" />
            {ar ? 'مكافأة التقييم الدورية' : 'Periodic Performance Bonus'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4")}>
            <div className="space-y-2">
              <Label className={cn(isRTL && "text-right block")}>{ar ? 'السنة' : 'Year'}</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={cn(isRTL && "text-right block")}>{ar ? 'الربع' : 'Quarter'}</Label>
              <Select value={quarter} onValueChange={setQuarter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">{ar ? 'الربع الأول' : 'Q1'}</SelectItem>
                  <SelectItem value="Q2">{ar ? 'الربع الثاني' : 'Q2'}</SelectItem>
                  <SelectItem value="Q3">{ar ? 'الربع الثالث' : 'Q3'}</SelectItem>
                  <SelectItem value="Q4">{ar ? 'الربع الرابع' : 'Q4'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleRun} disabled={loading} className="gap-2 w-full md:w-auto min-w-[180px]">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {ar ? 'احتساب المكافآت' : 'Calculate Bonuses'}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {ar ? 'يتم سحب نسبة المكافأة من كل تقييم معتمد للفترة المختارة، واحتساب المبلغ = الراتب الإجمالي × النسبة.' : 'Bonus percentage is taken from each review for the selected period; amount = gross salary × percentage.'}
          </p>
        </CardContent>
      </Card>

      {rows.length > 0 && (
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

      {rows.length > 0 && stationBreakdown.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={cn("text-sm flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Building2 className="w-4 h-4 text-primary" />
              {ar ? 'إجمالي كل محطة' : 'Station Totals'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {stationBreakdown.map(([name, data]) => (
                <div key={name} className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground truncate">{name}</p>
                  <p className="text-base font-bold text-primary mt-1">{data.total.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">{data.count} {ar ? 'موظف' : 'employees'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className={cn("flex flex-col gap-4")}>
            <div className={cn("flex items-center justify-between flex-wrap gap-2", isRTL && "flex-row-reverse")}>
              <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                {reportTitle}
                <Badge variant="secondary">{filteredRecords.length}{rows.length !== filteredRecords.length ? ` / ${rows.length}` : ''}</Badge>
              </CardTitle>
              {rows.length > 0 && (
                <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Button variant="outline" size="sm" onClick={handlePrintReport} className="gap-1.5">
                    <Printer className="w-4 h-4" />{ar ? 'طباعة' : 'Print'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
                    <FileText className="w-4 h-4" />{ar ? 'معاينة PDF' : 'Preview PDF'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
                    <FileSpreadsheet className="w-4 h-4" />Excel
                  </Button>
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {ar ? 'الإجمالي:' : 'Total:'} {totalAmount.toLocaleString()} {ar ? 'ج.م' : 'EGP'}
                  </Badge>
                </div>
              )}
            </div>

            {rows.length > 0 && (
              <div className={cn("flex flex-wrap items-end gap-3", isRTL && "flex-row-reverse")}>
                <div className="space-y-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground">{ar ? 'بحث' : 'Search'}</Label>
                  <div className="relative">
                    <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-2.5" : "left-2.5")} />
                    <Input placeholder={ar ? 'اسم أو رقم وظيفي...' : 'Name or ID...'} value={searchText} onChange={e => setSearchText(e.target.value)} className={cn("h-9", isRTL ? "pr-8" : "pl-8")} />
                  </div>
                </div>
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
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-destructive">
                    <X className="w-3.5 h-3.5" />{ar ? 'مسح' : 'Clear'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">{ar ? 'لا توجد تقييمات مع نسبة مكافأة لهذه الفترة' : 'No reviews with bonus percentage for this period'}</div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">{ar ? 'لا توجد نتائج تطابق الفلاتر' : 'No results match the filters'}</div>
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
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'التقييم' : 'Score'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'النسبة' : 'Rate'}</TableHead>
                    <TableHead className={cn("whitespace-nowrap", isRTL && "text-right")}>{ar ? 'المبلغ' : 'Amount'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    let detailIndex = 0;
                    return stationGroupedRows.map((row: any) => {
                      if (row.type === 'subtotal') {
                        return (
                          <TableRow key={row.key} className="bg-primary/5 font-semibold border-t-2 border-primary/20">
                            <TableCell colSpan={12} className={cn(isRTL ? 'text-right' : 'text-left')}>
                              {ar ? `مجموع ${row.stationName || 'بدون محطة'}` : `${row.stationName || 'No Station'} Subtotal`} ({row.count})
                            </TableCell>
                            <TableCell>{row.grossSalary.toLocaleString()}</TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell className="font-semibold">{row.amount.toLocaleString()}</TableCell>
                          </TableRow>
                        );
                      }
                      detailIndex += 1;
                      const r = row.record as Row;
                      return (
                        <TableRow key={row.key}>
                          <TableCell>{detailIndex}</TableCell>
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
                          <TableCell>
                            <span className="inline-flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              {r.score.toFixed(2)}/5
                            </span>
                          </TableCell>
                          <TableCell>{r.percentage}%</TableCell>
                          <TableCell className="font-semibold">{r.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    });
                  })()}
                  <TableRow className="bg-muted/70 font-bold border-t-2">
                    <TableCell colSpan={15} className={cn(isRTL ? "text-right" : "text-left")}>
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
