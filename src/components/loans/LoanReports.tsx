import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, Printer, FileText, FileSpreadsheet, BarChart3, PieChart, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line } from 'recharts';
import { stationLocations } from '@/data/stationLocations';
import { useReportExport } from '@/hooks/useReportExport';

const stationAdvancesData = stationLocations.map((s, i) => ({
  station: s.value,
  stationAr: s.labelAr,
  stationEn: s.labelEn,
  advances: Math.floor(Math.random() * 15) + 2,
  amount: Math.floor(Math.random() * 50000) + 5000,
  loans: Math.floor(Math.random() * 10) + 1,
  loansAmount: Math.floor(Math.random() * 200000) + 20000,
}));

const mockReportData = [
  { month: 'يناير', monthEn: 'Jan', loansAmount: 150000, advancesAmount: 25000, installmentsAmount: 85000 },
  { month: 'فبراير', monthEn: 'Feb', loansAmount: 80000, advancesAmount: 18000, installmentsAmount: 90000 },
  { month: 'مارس', monthEn: 'Mar', loansAmount: 200000, advancesAmount: 35000, installmentsAmount: 95000 },
  { month: 'أبريل', monthEn: 'Apr', loansAmount: 120000, advancesAmount: 22000, installmentsAmount: 100000 },
  { month: 'مايو', monthEn: 'May', loansAmount: 180000, advancesAmount: 30000, installmentsAmount: 105000 },
  { month: 'يونيو', monthEn: 'Jun', loansAmount: 250000, advancesAmount: 40000, installmentsAmount: 115000 },
];

const loanTypeData = [
  { name: 'قرض شخصي', nameEn: 'Personal', value: 45, color: '#3b82f6' },
  { name: 'قرض إسكان', nameEn: 'Housing', value: 25, color: '#10b981' },
  { name: 'قرض طوارئ', nameEn: 'Emergency', value: 20, color: '#f59e0b' },
  { name: 'قرض تعليم', nameEn: 'Education', value: 10, color: '#8b5cf6' },
];

export const LoanReports = () => {
  const { isRTL } = useLanguage();
  const { handlePrint, exportToPDF, exportToCSV } = useReportExport();
  const [reportType, setReportType] = useState('monthly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stationFilter, setStationFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('2025');

  const filteredStationData = useMemo(() => {
    const data = stationFilter === 'all' ? [...stationAdvancesData] : stationAdvancesData.filter(s => s.station === stationFilter);
    return data.sort((a, b) => {
      const nameA = isRTL ? a.stationAr : a.stationEn;
      const nameB = isRTL ? b.stationAr : b.stationEn;
      return nameA.localeCompare(nameB, isRTL ? 'ar' : 'en');
    });
  }, [stationFilter, isRTL]);

  const totalStats = {
    totalLoansAmount: mockReportData.reduce((s, d) => s + d.loansAmount, 0),
    totalAdvancesAmount: mockReportData.reduce((s, d) => s + d.advancesAmount, 0),
    totalInstallments: mockReportData.reduce((s, d) => s + d.installmentsAmount, 0),
    stationAdvancesTotal: filteredStationData.reduce((s, d) => s + d.amount, 0),
  };

  const stationExportTitle = isRTL ? 'تقرير السلف حسب المحطة' : 'Advances by Station Report';
  const stationExportColumns = [
    { header: isRTL ? 'المحطة' : 'Station', key: 'stationLabel' },
    { header: isRTL ? 'عدد السلف' : 'Advances', key: 'advances' },
    { header: isRTL ? 'مبلغ السلف' : 'Advances Amount', key: 'amount' },
    { header: isRTL ? 'عدد القروض' : 'Loans', key: 'loans' },
    { header: isRTL ? 'مبلغ القروض' : 'Loans Amount', key: 'loansAmount' },
  ];
  const stationExportData = filteredStationData.map(d => ({ ...d, stationLabel: isRTL ? d.stationAr : d.stationEn }));

  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />{isRTL ? 'فلاتر التقارير' : 'Report Filters'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>{isRTL ? 'نوع التقرير' : 'Report Type'}</Label>
              <Select value={reportType} onValueChange={setReportType}>
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
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'المحطة/الموقع' : 'Station'}</Label>
              <Select value={stationFilter} onValueChange={setStationFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                  {stationLocations.map(s => <SelectItem key={s.value} value={s.value}>{isRTL ? s.labelAr : s.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'من تاريخ' : 'From'}</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{isRTL ? 'إلى تاريخ' : 'To'}</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="icon" onClick={() => handlePrint(stationExportTitle)}><Printer className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => exportToPDF({ title: stationExportTitle, data: stationExportData, columns: stationExportColumns })}><FileText className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" onClick={() => exportToCSV({ title: stationExportTitle, data: stationExportData, columns: stationExportColumns, fileName: 'station-advances' })}><FileSpreadsheet className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: isRTL ? 'إجمالي القروض' : 'Total Loans', value: totalStats.totalLoansAmount.toLocaleString() },
          { label: isRTL ? 'إجمالي السلف' : 'Total Advances', value: totalStats.totalAdvancesAmount.toLocaleString() },
          { label: isRTL ? 'الأقساط المحصلة' : 'Collected', value: totalStats.totalInstallments.toLocaleString() },
          { label: isRTL ? 'سلف المحطات (مفلتر)' : 'Station Advances', value: totalStats.stationAdvancesTotal.toLocaleString() },
        ].map((s, i) => (
          <Card key={i}><CardContent className="pt-6 text-center"><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></CardContent></Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />{isRTL ? 'القروض والسلف الشهرية' : 'Monthly Loans & Advances'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockReportData}>
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
                <Pie data={loanTypeData} cx="50%" cy="50%" labelLine={false}
                  label={({ name, nameEn, percent }) => `${isRTL ? name : nameEn}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100} dataKey="value">
                  {loanTypeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
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
              <LineChart data={mockReportData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={isRTL ? 'month' : 'monthEn'} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="installmentsAmount" stroke="hsl(var(--primary))" strokeWidth={2} name={isRTL ? 'الأقساط المحصلة' : 'Collected'} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Station Advances Report */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />{isRTL ? 'السلف والقروض حسب المحطة' : 'Loans & Advances by Station'}</CardTitle></CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
