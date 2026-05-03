import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, Printer, FileText, FileSpreadsheet, BarChart3, PieChart, TrendingUp, Calendar, Search, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line } from 'recharts';
import { stationLocations } from '@/data/stationLocations';
import { useReportExport } from '@/hooks/useReportExport';
import { usePersistedState } from '@/hooks/usePersistedState';
import { toast } from '@/hooks/use-toast';

const stationAdvancesData = stationLocations.map((s) => ({
  station: s.value,
  stationAr: s.labelAr,
  stationEn: s.labelEn,
  advances: Math.floor(Math.random() * 15) + 2,
  amount: Math.floor(Math.random() * 50000) + 5000,
  loans: Math.floor(Math.random() * 10) + 1,
  loansAmount: Math.floor(Math.random() * 200000) + 20000,
}));

const months = [
  { value: '1', ar: 'يناير', en: 'Jan' }, { value: '2', ar: 'فبراير', en: 'Feb' },
  { value: '3', ar: 'مارس', en: 'Mar' }, { value: '4', ar: 'أبريل', en: 'Apr' },
  { value: '5', ar: 'مايو', en: 'May' }, { value: '6', ar: 'يونيو', en: 'Jun' },
  { value: '7', ar: 'يوليو', en: 'Jul' }, { value: '8', ar: 'أغسطس', en: 'Aug' },
  { value: '9', ar: 'سبتمبر', en: 'Sep' }, { value: '10', ar: 'أكتوبر', en: 'Oct' },
  { value: '11', ar: 'نوفمبر', en: 'Nov' }, { value: '12', ar: 'ديسمبر', en: 'Dec' },
];

const mockReportData = months.map((m) => ({
  monthValue: m.value,
  month: m.ar,
  monthEn: m.en,
  loansAmount: Math.floor(Math.random() * 200000) + 50000,
  advancesAmount: Math.floor(Math.random() * 40000) + 10000,
  installmentsAmount: Math.floor(Math.random() * 80000) + 60000,
}));

const loanTypes = [
  { id: 'personal', ar: 'قرض شخصي', en: 'Personal', value: 45, color: '#3b82f6' },
  { id: 'housing', ar: 'قرض إسكان', en: 'Housing', value: 25, color: '#10b981' },
  { id: 'emergency', ar: 'قرض طوارئ', en: 'Emergency', value: 20, color: '#f59e0b' },
  { id: 'education', ar: 'قرض تعليم', en: 'Education', value: 10, color: '#8b5cf6' },
];

interface ReportFilters {
  reportType: string;
  yearFilter: string;
  stationFilter: string;
  loanTypeFilter: string;
  monthFilter: string;
  dateFrom: string;
  dateTo: string;
  search: string;
}

const defaultFilters: ReportFilters = {
  reportType: 'monthly',
  yearFilter: '2025',
  stationFilter: 'all',
  loanTypeFilter: 'all',
  monthFilter: 'all',
  dateFrom: '',
  dateTo: '',
  search: '',
};

export const LoanReports = () => {
  const { isRTL } = useLanguage();
  const { handlePrint, exportBilingualPDF, exportBilingualCSV } = useReportExport();
  const [filters, setFilters] = usePersistedState<ReportFilters>('hr_loan_reports_filters_v1', defaultFilters);

  const update = <K extends keyof ReportFilters>(k: K, v: ReportFilters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  const filteredStationData = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    let data = filters.stationFilter === 'all'
      ? [...stationAdvancesData]
      : stationAdvancesData.filter((s) => s.station === filters.stationFilter);
    if (q) {
      data = data.filter((s) =>
        s.stationAr.toLowerCase().includes(q) ||
        s.stationEn.toLowerCase().includes(q) ||
        s.station.toLowerCase().includes(q)
      );
    }
    return data.sort((a, b) => {
      const nameA = isRTL ? a.stationAr : a.stationEn;
      const nameB = isRTL ? b.stationAr : b.stationEn;
      return nameA.localeCompare(nameB, isRTL ? 'ar' : 'en');
    });
  }, [filters.stationFilter, filters.search, isRTL]);

  const filteredMonthlyData = useMemo(() => {
    if (filters.monthFilter === 'all') return mockReportData;
    return mockReportData.filter((d) => d.monthValue === filters.monthFilter);
  }, [filters.monthFilter]);

  const filteredLoanTypes = useMemo(() => {
    if (filters.loanTypeFilter === 'all') return loanTypes;
    return loanTypes.filter((t) => t.id === filters.loanTypeFilter);
  }, [filters.loanTypeFilter]);

  const totalStats = {
    totalLoansAmount: filteredMonthlyData.reduce((s, d) => s + d.loansAmount, 0),
    totalAdvancesAmount: filteredMonthlyData.reduce((s, d) => s + d.advancesAmount, 0),
    totalInstallments: filteredMonthlyData.reduce((s, d) => s + d.installmentsAmount, 0),
    stationAdvancesTotal: filteredStationData.reduce((s, d) => s + d.amount, 0),
  };

  const titleAr = 'تقرير القروض والسلف حسب المحطة';
  const titleEn = 'Loans & Advances by Station Report';
  const bilingualColumns = [
    { headerAr: 'المحطة', headerEn: 'Station', key: 'stationLabel' },
    { headerAr: 'عدد السلف', headerEn: 'Advances', key: 'advances' },
    { headerAr: 'مبلغ السلف', headerEn: 'Advances Amount', key: 'amount' },
    { headerAr: 'عدد القروض', headerEn: 'Loans', key: 'loans' },
    { headerAr: 'مبلغ القروض', headerEn: 'Loans Amount', key: 'loansAmount' },
  ];
  const exportData = filteredStationData.map((d) => ({
    ...d,
    stationLabel: isRTL ? d.stationAr : d.stationEn,
    amount: d.amount.toLocaleString(),
    loansAmount: d.loansAmount.toLocaleString(),
  }));

  const summaryCards = [
    { label: isRTL ? 'إجمالي القروض' : 'Total Loans', value: totalStats.totalLoansAmount.toLocaleString() },
    { label: isRTL ? 'إجمالي السلف' : 'Total Advances', value: totalStats.totalAdvancesAmount.toLocaleString() },
    { label: isRTL ? 'الأقساط المحصلة' : 'Collected', value: totalStats.totalInstallments.toLocaleString() },
    { label: isRTL ? 'سلف المحطات' : 'Station Advances', value: totalStats.stationAdvancesTotal.toLocaleString() },
  ];

  // CSV (mono) keeps localized headers
  const csvColumns = [
    { header: isRTL ? 'المحطة' : 'Station', key: 'stationLabel' },
    { header: isRTL ? 'عدد السلف' : 'Advances', key: 'advances' },
    { header: isRTL ? 'مبلغ السلف' : 'Advances Amount', key: 'amount' },
    { header: isRTL ? 'عدد القروض' : 'Loans', key: 'loans' },
    { header: isRTL ? 'مبلغ القروض' : 'Loans Amount', key: 'loansAmount' },
  ];

  const handleExportPDF = () => {
    if (!exportData.length) {
      toast({ title: isRTL ? 'لا توجد بيانات للتصدير' : 'No data to export', variant: 'destructive' });
      return;
    }
    exportBilingualPDF({
      titleAr,
      titleEn,
      data: exportData,
      columns: bilingualColumns,
      fileName: 'loan-station-report',
      summaryCards,
    });
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    toast({ title: isRTL ? 'تم إعادة تعيين الفلاتر' : 'Filters reset' });
  };

  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><Filter className="h-5 w-5" />{isRTL ? 'فلاتر التقارير' : 'Report Filters'}</span>
            <Button variant="ghost" size="sm" onClick={handleResetFilters} aria-label={isRTL ? 'إعادة تعيين' : 'Reset'}>
              <RotateCcw className="h-4 w-4 mr-1" />{isRTL ? 'إعادة تعيين' : 'Reset'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>{isRTL ? 'بحث' : 'Search'}</Label>
              <div className="relative">
                <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  style={{ [isRTL ? 'right' : 'left']: '0.625rem' } as any} />
                <Input
                  className={isRTL ? 'pr-9' : 'pl-9'}
                  placeholder={isRTL ? 'ابحث عن محطة...' : 'Search station...'}
                  value={filters.search}
                  onChange={(e) => update('search', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'نوع التقرير' : 'Report Type'}</Label>
              <Select value={filters.reportType} onValueChange={(v) => update('reportType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{isRTL ? 'شهري' : 'Monthly'}</SelectItem>
                  <SelectItem value="quarterly">{isRTL ? 'ربع سنوي' : 'Quarterly'}</SelectItem>
                  <SelectItem value="yearly">{isRTL ? 'سنوي' : 'Yearly'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'السنة' : 'Year'}</Label>
              <Select value={filters.yearFilter} onValueChange={(v) => update('yearFilter', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'الشهر' : 'Month'}</Label>
              <Select value={filters.monthFilter} onValueChange={(v) => update('monthFilter', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل الشهور' : 'All Months'}</SelectItem>
                  {months.map(m => <SelectItem key={m.value} value={m.value}>{isRTL ? m.ar : m.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'نوع القرض' : 'Loan Type'}</Label>
              <Select value={filters.loanTypeFilter} onValueChange={(v) => update('loanTypeFilter', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل الأنواع' : 'All Types'}</SelectItem>
                  {loanTypes.map(lt => <SelectItem key={lt.id} value={lt.id}>{isRTL ? lt.ar : lt.en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'المحطة/الموقع' : 'Station'}</Label>
              <Select value={filters.stationFilter} onValueChange={(v) => update('stationFilter', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                  {stationLocations.map(s => <SelectItem key={s.value} value={s.value}>{isRTL ? s.labelAr : s.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'من تاريخ' : 'From'}</Label>
              <Input type="date" value={filters.dateFrom} onChange={(e) => update('dateFrom', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'إلى تاريخ' : 'To'}</Label>
              <Input type="date" value={filters.dateTo} onChange={(e) => update('dateTo', e.target.value)} />
            </div>
            <div className="flex items-end gap-2 md:col-span-4">
              <Button variant="outline" onClick={() => handlePrint(isRTL ? titleAr : titleEn, summaryCards)}>
                <Printer className="h-4 w-4 mr-1" />{isRTL ? 'طباعة' : 'Print'}
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-1" />{isRTL ? 'تصدير PDF' : 'Export PDF'}
              </Button>
              <Button variant="outline" onClick={() => exportToCSV({ title: isRTL ? titleAr : titleEn, data: exportData, columns: csvColumns, fileName: 'loan-station-report' })}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />{isRTL ? 'تصدير CSV' : 'Export CSV'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summaryCards.map((s, i) => (
          <Card key={i}><CardContent className="pt-6 text-center"><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></CardContent></Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{isRTL ? 'القروض والسلف الشهرية' : 'Monthly Loans & Advances'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={isRTL ? 'month' : 'monthEn'} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="loansAmount" fill="hsl(var(--primary))" name={isRTL ? 'القروض' : 'Loans'} />
                <Bar dataKey="advancesAmount" fill="hsl(var(--secondary))" name={isRTL ? 'السلف' : 'Advances'} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" />{isRTL ? 'أنواع القروض' : 'Loan Types'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPie>
                <Pie data={filteredLoanTypes} cx="50%" cy="50%" labelLine={false}
                  label={({ ar, en, percent }: any) => `${isRTL ? ar : en}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100} dataKey="value">
                  {filteredLoanTypes.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />{isRTL ? 'اتجاه التحصيل' : 'Collection Trend'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={isRTL ? 'month' : 'monthEn'} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="installmentsAmount" stroke="hsl(var(--primary))" strokeWidth={2} name={isRTL ? 'الأقساط المحصلة' : 'Collected'} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />{isRTL ? 'السلف والقروض حسب المحطة' : 'Loans & Advances by Station'}</CardTitle></CardHeader>
          <CardContent>
            {filteredStationData.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">{isRTL ? 'لا توجد نتائج تطابق الفلاتر' : 'No results match the filters'}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isRTL ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead>{isRTL ? 'عدد السلف' : 'Advances'}</TableHead>
                    <TableHead>{isRTL ? 'مبلغ السلف' : 'Adv. Amount'}</TableHead>
                    <TableHead>{isRTL ? 'عدد القروض' : 'Loans'}</TableHead>
                    <TableHead>{isRTL ? 'مبلغ القروض' : 'Loans Amount'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStationData.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{isRTL ? d.stationAr : d.stationEn}</TableCell>
                      <TableCell>{d.advances}</TableCell>
                      <TableCell>{d.amount.toLocaleString()}</TableCell>
                      <TableCell>{d.loans}</TableCell>
                      <TableCell>{d.loansAmount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>{isRTL ? 'الإجمالي' : 'Total'}</TableCell>
                    <TableCell>{filteredStationData.reduce((s, d) => s + d.advances, 0)}</TableCell>
                    <TableCell>{filteredStationData.reduce((s, d) => s + d.amount, 0).toLocaleString()}</TableCell>
                    <TableCell>{filteredStationData.reduce((s, d) => s + d.loans, 0)}</TableCell>
                    <TableCell>{filteredStationData.reduce((s, d) => s + d.loansAmount, 0).toLocaleString()}</TableCell>
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
