import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Printer, FileSpreadsheet, RotateCcw, Wallet, HandCoins, Sigma } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePayrollData } from '@/contexts/PayrollDataContext';
import { exportLoansToXLSX, printLoansReport } from '@/lib/loansExport';
import { toast } from '@/hooks/use-toast';

interface Row {
  monthKey: string; // YYYY-MM
  monthIdx: number; // 0-11
  monthLabel: string;
  loansAmount: number;
  loansCount: number;
  advancesAmount: number;
  advancesCount: number;
  total: number;
}

interface DetailRow {
  employeeName: string;
  employeeCode: string;
  station: string;
  type: string;
  amount: number;
  notes?: string;
  reference?: string;
}

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => String(currentYear - 2 + i));

// Link Cargo = stations whose Arabic name contains "كارجو"
const isCargoStation = (name_ar?: string) => !!name_ar && name_ar.includes('كارجو');

type EntityFilter = 'all' | 'aero' | 'cargo';

export const LoanDeductionsReport = () => {
  const { isRTL } = useLanguage();
  const { payrollEntries, refreshPayroll } = usePayrollData();
  const [year, setYear] = useState<string>(String(currentYear));
  const [stationId, setStationId] = useState<string>('all');
  const [entity, setEntity] = useState<EntityFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [stations, setStations] = useState<{ id: string; code: string; name_ar: string; name_en: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loanNotesByEmp, setLoanNotesByEmp] = useState<Record<string, string>>({});
  const [advanceNotesByEmpMonth, setAdvanceNotesByEmpMonth] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from('stations').select('id,code,name_ar,name_en').then(({ data }) => {
      if (data) setStations(data as any);
    });
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data: loans }, { data: advances }] = await Promise.all([
        supabase.from('loans').select('employee_id, reason, start_date'),
        supabase.from('advances').select('employee_id, reason, deduction_month'),
      ]);
      const lMap: Record<string, string> = {};
      (loans || []).forEach((l: any) => {
        if (!l.reason) return;
        // Keep latest by start_date
        const existing = lMap[l.employee_id];
        if (!existing) lMap[l.employee_id] = l.reason;
      });
      const aMap: Record<string, string> = {};
      (advances || []).forEach((a: any) => {
        if (!a.reason || !a.deduction_month) return;
        const month = String(a.deduction_month).slice(0, 7); // YYYY-MM
        const key = `${a.employee_id}|${month}`;
        aMap[key] = a.reason;
      });
      setLoanNotesByEmp(lMap);
      setAdvanceNotesByEmpMonth(aMap);
    })();
  }, [year]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await refreshPayroll();
      } catch (e: any) {
        console.error(e);
        toast({ title: isRTL ? 'فشل تحميل البيانات' : 'Failed to load data', description: e?.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year, isRTL, refreshPayroll]);

  const stationsByCode = useMemo(() => {
    const m = new Map<string, { id: string; code: string; name_ar: string; name_en: string }>();
    stations.forEach(s => m.set(s.code, s));
    return m;
  }, [stations]);

  const matchesEntity = (stationCode: string | null | undefined) => {
    if (entity === 'all') return true;
    const s = stationCode ? stationsByCode.get(stationCode) : null;
    const cargo = isCargoStation(s?.name_ar);
    return entity === 'cargo' ? cargo : !cargo;
  };

  const filteredPayrollEntries = useMemo(() => payrollEntries.filter(entry => {
    if (entry.year !== year) return false;
    if (!matchesEntity(entry.stationLocation)) return false;
    if (stationId === 'all') return true;
    return entry.stationLocation === stationId;
  }), [payrollEntries, year, entity, stationId, stationsByCode]);

  const monthlyRows: Row[] = useMemo(() => {
    const rows: Row[] = MONTHS_AR.map((m, i) => ({
      monthKey: `${year}-${String(i + 1).padStart(2, '0')}`,
      monthIdx: i,
      monthLabel: isRTL ? m : MONTHS_EN[i],
      loansAmount: 0,
      loansCount: 0,
      advancesAmount: 0,
      advancesCount: 0,
      total: 0,
    }));

    filteredPayrollEntries.forEach((entry) => {
      const i = Math.max(0, Math.min(11, Number(entry.month) - 1));
      const loanPayment = Number(entry.loanPayment) || 0;
      const advanceAmount = Number(entry.advanceAmount) || 0;
      rows[i].loansAmount += loanPayment;
      rows[i].advancesAmount += advanceAmount;
      if (loanPayment > 0) rows[i].loansCount += 1;
      if (advanceAmount > 0) rows[i].advancesCount += 1;
    });
    rows.forEach(r => { r.total = r.loansAmount + r.advancesAmount; });
    return rows;
  }, [filteredPayrollEntries, year, isRTL]);

  const totals = useMemo(() => {
    const t = monthlyRows.reduce((s, r) => ({
      loansAmount: s.loansAmount + r.loansAmount,
      loansCount: s.loansCount + r.loansCount,
      advancesAmount: s.advancesAmount + r.advancesAmount,
      advancesCount: s.advancesCount + r.advancesCount,
      total: s.total + r.total,
    }), { loansAmount: 0, loansCount: 0, advancesAmount: 0, advancesCount: 0, total: 0 });
    return t;
  }, [monthlyRows]);

  const stationName = (code: string | null) => {
    if (!code) return '-';
    const s = stationsByCode.get(code);
    if (!s) return code;
    return isRTL ? s.name_ar : s.name_en;
  };

  const detailRows: DetailRow[] = useMemo(() => {
    if (selectedMonth === 'all') return [];
    const out: DetailRow[] = [];
    const month = String(Number(selectedMonth) + 1).padStart(2, '0');
    filteredPayrollEntries.filter(entry => entry.month === month).forEach((entry) => {
      if ((Number(entry.loanPayment) || 0) > 0) {
        out.push({
          employeeName: isRTL ? entry.employeeName : entry.employeeNameEn || entry.employeeName,
          employeeCode: entry.employeeCode || '-',
          station: stationName(entry.stationLocation),
          type: isRTL ? 'قسط قرض' : 'Loan Installment',
          amount: Number(entry.loanPayment) || 0,
        });
      }
      if ((Number(entry.advanceAmount) || 0) > 0) {
        out.push({
          employeeName: isRTL ? entry.employeeName : entry.employeeNameEn || entry.employeeName,
          employeeCode: entry.employeeCode || '-',
          station: stationName(entry.stationLocation),
          type: isRTL ? 'سلفة' : 'Advance',
          amount: Number(entry.advanceAmount) || 0,
        });
      }
    });
    const locale = isRTL ? 'ar' : 'en';
    return out.sort((a, b) => {
      const s = a.station.localeCompare(b.station, locale);
      if (s !== 0) return s;
      return a.employeeName.localeCompare(b.employeeName, locale);
    });
  }, [selectedMonth, filteredPayrollEntries, isRTL, stationsByCode]);

  // Per-employee yearly aggregate (used when no specific month is selected)
  const employeeYearlyRows = useMemo(() => {
    type Agg = { employeeCode: string; employeeName: string; station: string; loansAmount: number; advancesAmount: number; total: number };
    const map = new Map<string, Agg>();
    filteredPayrollEntries.forEach((entry) => {
      if (!map.has(entry.employeeId)) {
        map.set(entry.employeeId, {
          employeeCode: entry.employeeCode || '-',
          employeeName: isRTL ? entry.employeeName : entry.employeeNameEn || entry.employeeName,
          station: stationName(entry.stationLocation),
          loansAmount: 0,
          advancesAmount: 0,
          total: 0,
        });
      }
      const agg = map.get(entry.employeeId)!;
      agg.loansAmount += Number(entry.loanPayment) || 0;
      agg.advancesAmount += Number(entry.advanceAmount) || 0;
    });
    const locale = isRTL ? 'ar' : 'en';
    const arr = Array.from(map.values())
      .map(a => ({ ...a, total: a.loansAmount + a.advancesAmount }))
      .filter(a => a.total > 0);
    arr.sort((a, b) => {
      const s = a.station.localeCompare(b.station, locale);
      if (s !== 0) return s;
      return a.employeeName.localeCompare(b.employeeName, locale);
    });
    return arr;
  }, [filteredPayrollEntries, isRTL, stationsByCode]);

  const entityLabel = entity === 'aero'
    ? (isRTL ? ' - لينك إيرو' : ' - Link Aero')
    : entity === 'cargo'
      ? (isRTL ? ' - لينك كارجو' : ' - Link Cargo')
      : '';
  const reportTitle = isRTL
    ? `تقرير خصومات القروض والسلف لعام ${year}${entityLabel}`
    : `Loans & Advances Deductions Report ${year}${entityLabel}`;

  const monthlyColumns = [
    { header: isRTL ? 'الشهر' : 'Month', key: 'monthLabel' },
    { header: isRTL ? 'عدد أقساط القروض' : 'Loan Installments', key: 'loansCount', numeric: true },
    { header: isRTL ? 'إجمالي القروض المخصومة' : 'Loans Deducted', key: 'loansAmount', numeric: true },
    { header: isRTL ? 'عدد السلف' : 'Advances Count', key: 'advancesCount', numeric: true },
    { header: isRTL ? 'إجمالي السلف المخصومة' : 'Advances Deducted', key: 'advancesAmount', numeric: true },
    { header: isRTL ? 'الإجمالي الكلي' : 'Total', key: 'total', numeric: true },
  ];

  const detailColumns = [
    { header: isRTL ? 'كود الموظف' : 'Code', key: 'employeeCode' },
    { header: isRTL ? 'اسم الموظف' : 'Employee', key: 'employeeName' },
    { header: isRTL ? 'المحطة' : 'Station', key: 'station' },
    { header: isRTL ? 'نوع الخصم' : 'Type', key: 'type' },
    { header: isRTL ? 'المبلغ' : 'Amount', key: 'amount', numeric: true },
  ];

  const summaryCards = [
    { label: isRTL ? 'إجمالي خصومات القروض' : 'Total Loans Deducted', value: totals.loansAmount.toLocaleString() },
    { label: isRTL ? 'إجمالي خصومات السلف' : 'Total Advances Deducted', value: totals.advancesAmount.toLocaleString() },
    { label: isRTL ? 'الإجمالي الكلي' : 'Grand Total', value: totals.total.toLocaleString() },
    { label: isRTL ? 'عدد العمليات' : 'Operations', value: (totals.loansCount + totals.advancesCount).toLocaleString() },
  ];

  const employeeYearlyColumns = [
    { header: isRTL ? 'كود الموظف' : 'Code', key: 'employeeCode' },
    { header: isRTL ? 'اسم الموظف' : 'Employee', key: 'employeeName' },
    { header: isRTL ? 'المحطة' : 'Station', key: 'station' },
    { header: isRTL ? 'إجمالي القروض' : 'Loans Total', key: 'loansAmount', numeric: true },
    { header: isRTL ? 'إجمالي السلف' : 'Advances Total', key: 'advancesAmount', numeric: true },
    { header: isRTL ? 'الإجمالي' : 'Total', key: 'total', numeric: true },
  ];

  const isDetail = selectedMonth !== 'all';
  const useEmployeeYearly = !isDetail && (entity !== 'all' || stationId !== 'all');
  const exportData = isDetail ? detailRows : (useEmployeeYearly ? employeeYearlyRows : monthlyRows);
  const exportColumns = isDetail ? detailColumns : (useEmployeeYearly ? employeeYearlyColumns : monthlyColumns);
  const exportTitle = isDetail
    ? `${reportTitle} — ${isRTL ? MONTHS_AR[Number(selectedMonth)] : MONTHS_EN[Number(selectedMonth)]}`
    : reportTitle;

  const handleExportExcel = async () => {
    if (!exportData.length) {
      toast({ title: isRTL ? 'لا توجد بيانات' : 'No data', variant: 'destructive' });
      return;
    }
    await exportLoansToXLSX({
      title: exportTitle,
      data: exportData as any,
      columns: exportColumns,
      summaryCards: [],
      isRTL,
      fileName: 'loan-advance-deductions',
    });
  };

  const handlePrint = () => {
    if (!exportData.length) {
      toast({ title: isRTL ? 'لا توجد بيانات' : 'No data', variant: 'destructive' });
      return;
    }
    printLoansReport({
      title: exportTitle,
      data: exportData as any,
      columns: exportColumns,
      summaryCards: [],
      isRTL,
    });
  };

  const reset = () => {
    setYear(String(currentYear));
    setStationId('all');
    setEntity('all');
    setSelectedMonth('all');
  };

  // When entity changes, reset station if no longer in scope
  useEffect(() => {
    if (stationId === 'all') return;
    const s = stationsByCode.get(stationId);
    const cargo = isCargoStation(s?.name_ar);
    if (entity === 'cargo' && !cargo) setStationId('all');
    if (entity === 'aero' && cargo) setStationId('all');
  }, [entity, stationId, stationsByCode]);

  const visibleStations = useMemo(() => {
    if (entity === 'all') return stations;
    return stations.filter(s => entity === 'cargo' ? isCargoStation(s.name_ar) : !isCargoStation(s.name_ar));
  }, [stations, entity]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{isRTL ? 'فلاتر التقرير' : 'Report Filters'}</span>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-1" />{isRTL ? 'إعادة تعيين' : 'Reset'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'السنة' : 'Year'}</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'الكيان' : 'Entity'}</Label>
              <Select value={entity} onValueChange={(v) => setEntity(v as EntityFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'الكل (إيرو + كارجو)' : 'All (Aero + Cargo)'}</SelectItem>
                  <SelectItem value="aero">{isRTL ? 'لينك إيرو' : 'Link Aero'}</SelectItem>
                  <SelectItem value="cargo">{isRTL ? 'لينك كارجو' : 'Link Cargo'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'المحطة' : 'Station'}</Label>
              <Select value={stationId} onValueChange={setStationId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                  {visibleStations.map(s => (
                    <SelectItem key={s.id} value={s.code}>{isRTL ? s.name_ar : s.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'عرض شهر محدد' : 'Drill into Month'}</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'ملخص سنوي' : 'Yearly Summary'}</SelectItem>
                  {MONTHS_AR.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{isRTL ? m : MONTHS_EN[i]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={handlePrint} className="flex-1">
                <Printer className="h-4 w-4 mr-1" />{isRTL ? 'طباعة' : 'Print'}
              </Button>
              <Button variant="outline" onClick={handleExportExcel} className="flex-1">
                <FileSpreadsheet className="h-4 w-4 mr-1" />Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10"><Wallet className="w-6 h-6 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">{isRTL ? 'خصومات القروض' : 'Loans Deducted'}</p><p className="text-xl font-bold">{totals.loansAmount.toLocaleString()}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-warning/10"><HandCoins className="w-6 h-6 text-warning" /></div>
            <div><p className="text-xs text-muted-foreground">{isRTL ? 'خصومات السلف' : 'Advances Deducted'}</p><p className="text-xl font-bold">{totals.advancesAmount.toLocaleString()}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-success/10"><Sigma className="w-6 h-6 text-success" /></div>
            <div><p className="text-xs text-muted-foreground">{isRTL ? 'الإجمالي الكلي' : 'Grand Total'}</p><p className="text-xl font-bold">{totals.total.toLocaleString()}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-100"><Sigma className="w-6 h-6 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">{isRTL ? 'عدد العمليات' : 'Operations'}</p><p className="text-xl font-bold">{(totals.loansCount + totals.advancesCount).toLocaleString()}</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isDetail
            ? (isRTL ? `تفاصيل خصومات شهر ${MONTHS_AR[Number(selectedMonth)]}` : `${MONTHS_EN[Number(selectedMonth)]} Deduction Details`)
            : (isRTL ? 'الملخص الشهري' : 'Monthly Summary')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : isDetail ? (
            detailRows.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">{isRTL ? 'لا توجد خصومات لهذا الشهر' : 'No deductions for this month'}</div>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  {detailColumns.map(c => <TableHead key={c.key}>{c.header}</TableHead>)}
                </TableRow></TableHeader>
                <TableBody>
                  {detailRows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.employeeCode}</TableCell>
                      <TableCell>{r.employeeName}</TableCell>
                      <TableCell>{r.station}</TableCell>
                      <TableCell>{r.type}</TableCell>
                      <TableCell className="font-mono">{r.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4}>{isRTL ? 'الإجمالي' : 'Total'}</TableCell>
                    <TableCell className="font-mono">{detailRows.reduce((s, r) => s + r.amount, 0).toLocaleString()}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )
          ) : (
            <Table>
              <TableHeader><TableRow>
                {monthlyColumns.map(c => <TableHead key={c.key}>{c.header}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody>
                {monthlyRows.map((r) => (
                  <TableRow key={r.monthKey}>
                    <TableCell className="font-medium">{r.monthLabel}</TableCell>
                    <TableCell>{r.loansCount}</TableCell>
                    <TableCell className="font-mono">{r.loansAmount.toLocaleString()}</TableCell>
                    <TableCell>{r.advancesCount}</TableCell>
                    <TableCell className="font-mono">{r.advancesAmount.toLocaleString()}</TableCell>
                    <TableCell className="font-mono font-semibold">{r.total.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>{isRTL ? 'الإجمالي' : 'Total'}</TableCell>
                  <TableCell>{totals.loansCount}</TableCell>
                  <TableCell className="font-mono">{totals.loansAmount.toLocaleString()}</TableCell>
                  <TableCell>{totals.advancesCount}</TableCell>
                  <TableCell className="font-mono">{totals.advancesAmount.toLocaleString()}</TableCell>
                  <TableCell className="font-mono">{totals.total.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanDeductionsReport;
