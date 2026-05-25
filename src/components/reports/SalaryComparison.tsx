import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePayrollData } from '@/contexts/PayrollDataContext';
import { useSalaryData } from '@/contexts/SalaryDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Download, FileText, Printer, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';
import { stationLocations } from '@/data/stationLocations';

const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
const YEARS = Array.from({ length: 11 }, (_, i) => String(2025 + i));

interface Totals {
  basic: number;
  incentives: number;
  transport: number;
  living: number;
  mobile: number;
  roster: number;
  net: number;
  count: number;
}

const emptyTotals = (): Totals => ({ basic: 0, incentives: 0, transport: 0, living: 0, mobile: 0, roster: 0, net: 0, count: 0 });

export const SalaryComparison: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { payrollEntries, refreshPayroll } = usePayrollData();
  const { salaryRecords, ensureLoaded } = useSalaryData();
  const { reportRef, handlePrint, exportToCSV, exportToPDF } = useReportExport();

  const now = new Date();
  const curMonth = String(now.getMonth() + 1).padStart(2, '0');
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');

  const [aMonth, setAMonth] = useState(prevMonth);
  const [aYear, setAYear] = useState(String(prevMonthDate.getFullYear()));
  const [bMonth, setBMonth] = useState(curMonth);
  const [bYear, setBYear] = useState(String(now.getFullYear()));
  const [station, setStation] = useState('all');

  useEffect(() => { refreshPayroll(); ensureLoaded(); }, [refreshPayroll, ensureLoaded]);

  const monthNames = ar
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const getStationName = (v: string) => {
    const m = stationLocations.find((s) => s.value === v);
    return m ? (ar ? m.labelAr : m.labelEn) : (v || (ar ? 'بدون محطة' : 'No Station'));
  };

  const rosterFor = (employeeId: string, year: string): number => {
    const rec = salaryRecords.find((r) => r.employeeId === employeeId && r.year === year)
      || salaryRecords.filter((r) => r.employeeId === employeeId).sort((a, b) => b.year.localeCompare(a.year))[0];
    return rec?.rosterAllowance ?? 0;
  };

  const buildPeriod = (month: string, year: string): Totals => {
    const t = emptyTotals();
    payrollEntries
      .filter((e) => e.month === month && e.year === year && (station === 'all' || e.stationLocation === station))
      .forEach((e) => {
        t.basic += e.basicSalary;
        t.incentives += e.incentives;
        t.transport += e.transportAllowance;
        t.living += e.livingAllowance;
        t.mobile += e.mobileAllowance;
        t.roster += rosterFor(e.employeeId, year);
        t.net += e.netSalary;
        t.count += 1;
      });
    return t;
  };

  const periodA = useMemo(() => buildPeriod(aMonth, aYear), [payrollEntries, salaryRecords, aMonth, aYear, station]);
  const periodB = useMemo(() => buildPeriod(bMonth, bYear), [payrollEntries, salaryRecords, bMonth, bYear, station]);

  const labelA = `${monthNames[parseInt(aMonth, 10) - 1]} ${aYear}`;
  const labelB = `${monthNames[parseInt(bMonth, 10) - 1]} ${bYear}`;

  const rows = [
    { key: 'basic', label: ar ? 'الراتب الأساسي' : 'Basic Salary' },
    { key: 'incentives', label: ar ? 'الحوافز' : 'Incentives' },
    { key: 'transport', label: ar ? 'بدل المواصلات' : 'Transport Allowance' },
    { key: 'living', label: ar ? 'بدل السكن' : 'Housing Allowance' },
    { key: 'mobile', label: ar ? 'بدل الجوال' : 'Mobile Allowance' },
    { key: 'roster', label: ar ? 'بدل الروستر' : 'Roster Allowance' },
    { key: 'net', label: ar ? 'صافي الراتب' : 'Net Salary' },
  ] as const;

  const diff = (a: number, b: number) => b - a;
  const pct = (a: number, b: number) => (a === 0 ? (b === 0 ? 0 : 100) : ((b - a) / a) * 100);

  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const title = ar ? 'مقارنة المرتبات' : 'Salary Comparison';

  const exportData = rows.map((r) => {
    const a = periodA[r.key];
    const b = periodB[r.key];
    return {
      item: r.label,
      a,
      b,
      diff: diff(a, b),
      pct: `${pct(a, b).toFixed(1)}%`,
    };
  });

  const exportColumns = [
    { header: ar ? 'البند' : 'Item', key: 'item' },
    { header: labelA, key: 'a' },
    { header: labelB, key: 'b' },
    { header: ar ? 'الفرق' : 'Difference', key: 'diff' },
    { header: ar ? 'النسبة' : 'Change %', key: 'pct' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className={cn('flex flex-wrap gap-4 items-end justify-between', isRTL && 'flex-row-reverse')}>
            <div className={cn('flex flex-wrap gap-4', isRTL && 'flex-row-reverse')}>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{ar ? 'الفترة الأولى' : 'Period A'}</p>
                <div className={cn('flex gap-2', isRTL && 'flex-row-reverse')}>
                  <Select value={aMonth} onValueChange={setAMonth}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={m}>{monthNames[i]}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={aYear} onValueChange={setAYear}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{ar ? 'الفترة الثانية' : 'Period B'}</p>
                <div className={cn('flex gap-2', isRTL && 'flex-row-reverse')}>
                  <Select value={bMonth} onValueChange={setBMonth}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={m}>{monthNames[i]}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={bYear} onValueChange={setBYear}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>{YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{ar ? 'المحطة' : 'Station'}</p>
                <Select value={station} onValueChange={setStation}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ar ? 'جميع المحطات' : 'All'}</SelectItem>
                    {stationLocations.map((s) => <SelectItem key={s.value} value={s.value}>{ar ? s.labelAr : s.labelEn}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className={cn('flex gap-2', isRTL && 'flex-row-reverse')}>
              <Button variant="outline" size="sm" onClick={() => handlePrint(title)}><Printer className="w-4 h-4 mr-2" />{ar ? 'طباعة' : 'Print'}</Button>
              <Button variant="outline" size="sm" onClick={() => exportToPDF({ title, data: exportData, columns: exportColumns })}><Download className="w-4 h-4 mr-2" />{ar ? 'معاينة PDF' : 'PDF'}</Button>
              <Button variant="outline" size="sm" onClick={() => exportToCSV({ title, data: exportData, columns: exportColumns })}><FileText className="w-4 h-4 mr-2" />Excel</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef}>
        <Card>
          <CardHeader>
            <CardTitle>
              {ar ? `مقارنة بين ${labelA} و ${labelB}` : `Comparison: ${labelA} vs ${labelB}`}
              {station !== 'all' && <span className="text-sm text-muted-foreground ms-2">({getStationName(station)})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {periodA.count === 0 && periodB.count === 0 ? (
              <div className="text-center text-muted-foreground py-8">{ar ? 'لا توجد بيانات للفترتين المختارتين' : 'No data for selected periods'}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn(isRTL && 'text-right')}>{ar ? 'البند' : 'Item'}</TableHead>
                    <TableHead className={cn(isRTL && 'text-right')}>{labelA}</TableHead>
                    <TableHead className={cn(isRTL && 'text-right')}>{labelB}</TableHead>
                    <TableHead className={cn(isRTL && 'text-right')}>{ar ? 'الفرق' : 'Difference'}</TableHead>
                    <TableHead className={cn(isRTL && 'text-right')}>{ar ? 'نسبة التغير' : 'Change %'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const a = periodA[r.key];
                    const b = periodB[r.key];
                    const d = diff(a, b);
                    const p = pct(a, b);
                    const Icon = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
                    const color = d > 0 ? 'text-success' : d < 0 ? 'text-destructive' : 'text-muted-foreground';
                    return (
                      <TableRow key={r.key} className={r.key === 'net' ? 'bg-primary/5 font-bold' : ''}>
                        <TableCell className={cn('font-medium', isRTL && 'text-right')}>{r.label}</TableCell>
                        <TableCell className={cn(isRTL && 'text-right')}>{fmt(a)}</TableCell>
                        <TableCell className={cn(isRTL && 'text-right')}>{fmt(b)}</TableCell>
                        <TableCell className={cn(color, isRTL && 'text-right')}>
                          <span className={cn('inline-flex items-center gap-1', isRTL && 'flex-row-reverse')}>
                            <Icon className="w-4 h-4" />
                            {fmt(Math.abs(d))}
                          </span>
                        </TableCell>
                        <TableCell className={cn(color, isRTL && 'text-right')}>{p.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="border-t-2">
                    <TableCell className={cn('text-muted-foreground', isRTL && 'text-right')}>{ar ? 'عدد الموظفين' : 'Employees'}</TableCell>
                    <TableCell className={cn(isRTL && 'text-right')}>{periodA.count}</TableCell>
                    <TableCell className={cn(isRTL && 'text-right')}>{periodB.count}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
