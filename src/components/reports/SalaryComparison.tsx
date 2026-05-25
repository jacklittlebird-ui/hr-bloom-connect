import React, { useEffect, useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePayrollData } from '@/contexts/PayrollDataContext';
import { useSalaryData } from '@/contexts/SalaryDataContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Download, FileText, Printer, TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp, Users, Wallet } from 'lucide-react';
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

interface EmployeeRow {
  employeeId: string;
  code: string;
  name: string;
  department: string;
  jobTitle: string;
  a: Totals;
  b: Totals;
}

const emptyTotals = (): Totals => ({ basic: 0, incentives: 0, transport: 0, living: 0, mobile: 0, roster: 0, net: 0, count: 0 });

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const SalaryComparison: React.FC = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { payrollEntries, refreshPayroll } = usePayrollData();
  const { salaryRecords, ensureLoaded } = useSalaryData();
  const { employees } = useEmployeeData();
  const { reportRef, handlePrint, exportToPDF } = useReportExport();

  const now = new Date();
  const curMonth = String(now.getMonth() + 1).padStart(2, '0');
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');

  const [aMonth, setAMonth] = useState(prevMonth);
  const [aYear, setAYear] = useState(String(prevMonthDate.getFullYear()));
  const [bMonth, setBMonth] = useState(curMonth);
  const [bYear, setBYear] = useState(String(now.getFullYear()));
  const [station, setStation] = useState('all');
  const [department, setDepartment] = useState('all');
  const [jobTitle, setJobTitle] = useState('all');
  const [search, setSearch] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => { refreshPayroll(); ensureLoaded(); }, [refreshPayroll, ensureLoaded]);

  const monthNames = ar
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const getStationName = (v: string) => {
    const m = stationLocations.find((s) => s.value === v);
    return m ? (ar ? m.labelAr : m.labelEn) : (v || (ar ? 'بدون محطة' : 'No Station'));
  };

  const empMap = useMemo(() => {
    const m = new Map<string, { dept: string; job: string; name: string; code: string }>();
    employees.forEach((e) => m.set(e.id, {
      dept: e.department || '',
      job: ar ? (e.jobTitleAr || e.jobTitle || '') : (e.jobTitleEn || e.jobTitle || ''),
      name: ar ? e.nameAr : (e.nameEn || e.nameAr),
      code: e.employeeId || '',
    }));
    return m;
  }, [employees, ar]);

  const departmentOptions = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => { if (e.department) s.add(e.department); });
    return Array.from(s).sort();
  }, [employees]);

  const jobTitleOptions = useMemo(() => {
    const s = new Set<string>();
    employees.forEach((e) => {
      const j = ar ? (e.jobTitleAr || e.jobTitle) : (e.jobTitleEn || e.jobTitle);
      if (j) s.add(j);
    });
    return Array.from(s).sort();
  }, [employees, ar]);

  const rosterFor = (employeeId: string, year: string): number => {
    const rec = salaryRecords.find((r) => r.employeeId === employeeId && r.year === year)
      || salaryRecords.filter((r) => r.employeeId === employeeId).sort((a, b) => b.year.localeCompare(a.year))[0];
    return rec?.rosterAllowance ?? 0;
  };

  const matchesFilters = (employeeId: string, stationLocation: string): boolean => {
    if (station !== 'all' && stationLocation !== station) return false;
    const emp = empMap.get(employeeId);
    if (department !== 'all' && (emp?.dept || '') !== department) return false;
    if (jobTitle !== 'all' && (emp?.job || '') !== jobTitle) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const hay = `${emp?.name || ''} ${emp?.code || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const addToTotals = (t: Totals, e: any, year: string) => {
    t.basic += e.basicSalary;
    t.incentives += e.incentives;
    t.transport += e.transportAllowance;
    t.living += e.livingAllowance;
    t.mobile += e.mobileAllowance;
    t.roster += rosterFor(e.employeeId, year);
    t.net += e.netSalary;
    t.count += 1;
  };

  const { periodA, periodB, employeeRows } = useMemo(() => {
    const pa = emptyTotals();
    const pb = emptyTotals();
    const rowMap = new Map<string, EmployeeRow>();

    const ensureRow = (employeeId: string): EmployeeRow => {
      let r = rowMap.get(employeeId);
      if (!r) {
        const emp = empMap.get(employeeId);
        r = {
          employeeId,
          code: emp?.code || '',
          name: emp?.name || (ar ? 'موظف' : 'Employee'),
          department: emp?.dept || '',
          jobTitle: emp?.job || '',
          a: emptyTotals(),
          b: emptyTotals(),
        };
        rowMap.set(employeeId, r);
      }
      return r;
    };

    payrollEntries.forEach((e) => {
      if (!matchesFilters(e.employeeId, e.stationLocation)) return;
      if (e.month === aMonth && e.year === aYear) {
        addToTotals(pa, e, aYear);
        addToTotals(ensureRow(e.employeeId).a, e, aYear);
      } else if (e.month === bMonth && e.year === bYear) {
        addToTotals(pb, e, bYear);
        addToTotals(ensureRow(e.employeeId).b, e, bYear);
      }
    });

    const rows = Array.from(rowMap.values()).sort((x, y) => (y.b.net - y.a.net) - (x.b.net - x.a.net));
    return { periodA: pa, periodB: pb, employeeRows: rows };
  }, [payrollEntries, salaryRecords, aMonth, aYear, bMonth, bYear, station, department, jobTitle, search, empMap, ar]);

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

  const totalDiffNet = diff(periodA.net, periodB.net);
  const totalPctNet = pct(periodA.net, periodB.net);

  const exportData = rows.map((r) => {
    const a = periodA[r.key];
    const b = periodB[r.key];
    return { item: r.label, a, b, diff: diff(a, b), pct: `${pct(a, b).toFixed(1)}%` };
  });
  const exportColumns = [
    { header: ar ? 'البند' : 'Item', key: 'item' },
    { header: labelA, key: 'a' },
    { header: labelB, key: 'b' },
    { header: ar ? 'الفرق' : 'Difference', key: 'diff' },
    { header: ar ? 'النسبة' : 'Change %', key: 'pct' },
  ];

  const exportXlsx = async () => {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'HR System';
    wb.created = new Date();

    // ---- Summary sheet ----
    const sum = wb.addWorksheet(ar ? 'الملخص' : 'Summary', { views: [{ rightToLeft: isRTL }] });
    sum.mergeCells('A1:E1');
    sum.getCell('A1').value = `${title} — ${labelA} vs ${labelB}`;
    sum.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    sum.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    sum.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    sum.getRow(1).height = 28;

    const headers = [ar ? 'البند' : 'Item', labelA, labelB, ar ? 'الفرق' : 'Difference', ar ? 'النسبة' : 'Change %'];
    sum.addRow([]);
    const headerRow = sum.addRow(headers);
    headerRow.eachCell((c) => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    exportData.forEach((r, idx) => {
      const row = sum.addRow([r.item, r.a, r.b, r.diff, r.pct]);
      const isNet = rows[idx].key === 'net';
      const dColor = r.diff > 0 ? 'FF16A34A' : r.diff < 0 ? 'FFDC2626' : 'FF64748B';
      row.eachCell((c, col) => {
        c.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
        if (col === 1) c.font = { bold: isNet };
        if (col === 2 || col === 3) c.numFmt = '#,##0.00';
        if (col === 4) { c.numFmt = '#,##0.00'; c.font = { color: { argb: dColor }, bold: true }; }
        if (col === 5) c.font = { color: { argb: dColor }, bold: true };
        if (isNet) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      });
    });
    sum.columns.forEach((c) => { c.width = 22; });

    // ---- Employees sheet ----
    const det = wb.addWorksheet(ar ? 'تفاصيل الموظفين' : 'Employees', { views: [{ rightToLeft: isRTL }] });
    const detHeaders: string[] = [
      ar ? 'الكود' : 'Code',
      ar ? 'الاسم' : 'Name',
      ar ? 'القسم' : 'Department',
      ar ? 'الوظيفة' : 'Job Title',
    ];
    rows.forEach((r) => {
      detHeaders.push(`${r.label} — ${labelA}`, `${r.label} — ${labelB}`, `${r.label} — ${ar ? 'الفرق' : 'Δ'}`);
    });
    const dh = det.addRow(detHeaders);
    dh.eachCell((c) => {
      c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      c.alignment = { horizontal: 'center' };
      c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    employeeRows.forEach((er) => {
      const values: (string | number)[] = [er.code, er.name, er.department, er.jobTitle];
      rows.forEach((r) => {
        const a = er.a[r.key]; const b = er.b[r.key];
        values.push(a, b, b - a);
      });
      const row = det.addRow(values);
      row.eachCell((c, col) => {
        c.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
        if (col >= 5) c.numFmt = '#,##0.00';
        // every 3rd column starting at 7 (col 7,10,13...) is the diff column
        if (col >= 7 && (col - 4) % 3 === 0) {
          const v = Number(c.value) || 0;
          const dColor = v > 0 ? 'FF16A34A' : v < 0 ? 'FFDC2626' : 'FF64748B';
          c.font = { color: { argb: dColor }, bold: true };
        }
      });
    });
    const colWidths = [14, 30, 22, 24];
    rows.forEach(() => colWidths.push(16, 16, 14));
    det.columns = colWidths.map((w) => ({ width: w }));
    det.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: detHeaders.length } };
    det.views = [{ rightToLeft: isRTL, state: 'frozen', ySplit: 1 }];

    const buf = await wb.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);
    triggerDownload(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${ar ? 'مقارنة_المرتبات' : 'salary_comparison'}_${stamp}.xlsx`);
  };

  const summaryCards = [
    { label: ar ? `إجمالي ${labelA}` : `Total ${labelA}`, value: fmt(periodA.basic + periodA.incentives + periodA.transport + periodA.living + periodA.mobile + periodA.roster), sub: `${periodA.count} ${ar ? 'موظف' : 'employees'}`, icon: Wallet, tone: 'a' as const },
    { label: ar ? `إجمالي ${labelB}` : `Total ${labelB}`, value: fmt(periodB.basic + periodB.incentives + periodB.transport + periodB.living + periodB.mobile + periodB.roster), sub: `${periodB.count} ${ar ? 'موظف' : 'employees'}`, icon: Wallet, tone: 'b' as const },
    { label: ar ? `صافي ${labelA}` : `Net ${labelA}`, value: fmt(periodA.net), sub: ar ? 'صافي الراتب' : 'Net Salary', icon: Users, tone: 'neutral' as const },
    { label: ar ? `صافي ${labelB}` : `Net ${labelB}`, value: fmt(periodB.net), sub: `${totalDiffNet >= 0 ? '+' : ''}${fmt(totalDiffNet)} (${totalPctNet.toFixed(1)}%)`, icon: Users, tone: totalDiffNet > 0 ? 'up' as const : totalDiffNet < 0 ? 'down' as const : 'neutral' as const },
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
              <div>
                <p className="text-xs text-muted-foreground mb-1">{ar ? 'القسم' : 'Department'}</p>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ar ? 'كل الأقسام' : 'All'}</SelectItem>
                    {departmentOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{ar ? 'الوظيفة' : 'Job Title'}</p>
                <Select value={jobTitle} onValueChange={setJobTitle}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ar ? 'كل الوظائف' : 'All'}</SelectItem>
                    {jobTitleOptions.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className={cn('flex gap-2', isRTL && 'flex-row-reverse')}>
              <Button variant="outline" size="sm" onClick={() => handlePrint(title)}><Printer className="w-4 h-4 mr-2" />{ar ? 'طباعة' : 'Print'}</Button>
              <Button variant="outline" size="sm" onClick={() => exportToPDF({ title, data: exportData, columns: exportColumns })}><Download className="w-4 h-4 mr-2" />{ar ? 'معاينة PDF' : 'PDF'}</Button>
              <Button variant="outline" size="sm" onClick={exportXlsx}><FileText className="w-4 h-4 mr-2" />Excel</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef} className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((c, i) => {
            const Icon = c.icon;
            const tone =
              c.tone === 'a' ? 'border-primary/30 bg-primary/5'
              : c.tone === 'b' ? 'border-accent/30 bg-accent/5'
              : c.tone === 'up' ? 'border-success/30 bg-success/5'
              : c.tone === 'down' ? 'border-destructive/30 bg-destructive/5'
              : 'border-muted bg-muted/30';
            const valueTone =
              c.tone === 'up' ? 'text-success'
              : c.tone === 'down' ? 'text-destructive'
              : 'text-foreground';
            return (
              <Card key={i} className={cn('border-2', tone)}>
                <CardContent className="p-4">
                  <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
                    <div className={cn(isRTL && 'text-right')}>
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                      <p className={cn('text-2xl font-bold mt-1', valueTone)}>{c.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
                    </div>
                    <Icon className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

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

        {/* Expandable per-employee details */}
        <Card>
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CardHeader>
              <div className={cn('flex items-center justify-between gap-3 flex-wrap', isRTL && 'flex-row-reverse')}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className={cn('gap-2 p-0 h-auto hover:bg-transparent', isRTL && 'flex-row-reverse')}>
                    {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    <CardTitle className="text-lg">
                      {ar ? `تفاصيل الموظفين (${employeeRows.length})` : `Employee Details (${employeeRows.length})`}
                    </CardTitle>
                  </Button>
                </CollapsibleTrigger>
                {showDetails && (
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
                    className="w-64"
                  />
                )}
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                {employeeRows.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">{ar ? 'لا توجد بيانات موظفين' : 'No employee data'}</div>
                ) : (
                  <div className="max-h-[600px] overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className={cn(isRTL && 'text-right')}>{ar ? 'الكود' : 'Code'}</TableHead>
                          <TableHead className={cn('whitespace-nowrap', isRTL && 'text-right')}>{ar ? 'الاسم' : 'Name'}</TableHead>
                          <TableHead className={cn('whitespace-nowrap', isRTL && 'text-right')}>{ar ? 'القسم' : 'Department'}</TableHead>
                          {rows.map((r) => (
                            <React.Fragment key={r.key}>
                              <TableHead className={cn('text-center whitespace-nowrap border-l border-border/50', isRTL && 'text-right')}>{r.label} — {labelA}</TableHead>
                              <TableHead className={cn('text-center whitespace-nowrap', isRTL && 'text-right')}>{r.label} — {labelB}</TableHead>
                              <TableHead className={cn('text-center whitespace-nowrap', isRTL && 'text-right')}>{ar ? 'الفرق' : 'Δ'}</TableHead>
                            </React.Fragment>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeeRows.map((er) => (
                          <TableRow key={er.employeeId}>
                            <TableCell className={cn('font-mono text-xs', isRTL && 'text-right')}>{er.code}</TableCell>
                            <TableCell className={cn('font-medium whitespace-nowrap', isRTL && 'text-right')}>{er.name}</TableCell>
                            <TableCell className={cn('text-xs whitespace-nowrap', isRTL && 'text-right')}>{er.department}</TableCell>
                            {rows.map((r) => {
                              const a = er.a[r.key];
                              const b = er.b[r.key];
                              const d = b - a;
                              const color = d > 0 ? 'text-success' : d < 0 ? 'text-destructive' : 'text-muted-foreground';
                              const isNet = r.key === 'net';
                              return (
                                <React.Fragment key={r.key}>
                                  <TableCell className={cn('text-center whitespace-nowrap border-l border-border/50', isNet && 'font-semibold', isRTL && 'text-right')}>{fmt(a)}</TableCell>
                                  <TableCell className={cn('text-center whitespace-nowrap', isNet && 'font-semibold', isRTL && 'text-right')}>{fmt(b)}</TableCell>
                                  <TableCell className={cn('text-center whitespace-nowrap font-medium', color, isRTL && 'text-right')}>
                                    {d > 0 ? '+' : ''}{fmt(d)}
                                  </TableCell>
                                </React.Fragment>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </div>
  );
};
