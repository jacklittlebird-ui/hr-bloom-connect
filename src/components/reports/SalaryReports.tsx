import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePayrollData } from '@/contexts/PayrollDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Wallet, TrendingUp, TrendingDown, Banknote, Download, Printer, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useReportExport } from '@/hooks/useReportExport';
import { stationLocations } from '@/data/stationLocations';

export const SalaryReports = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { payrollEntries } = usePayrollData();
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [station, setStation] = useState('all');
  const { reportRef, handlePrint, exportToCSV, exportToPDF } = useReportExport();

  const filtered = useMemo(() =>
    payrollEntries.filter(e => e.year === selectedYear && (station === 'all' || e.stationLocation === station)),
    [payrollEntries, selectedYear, station]
  );

  const monthNames = ar
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const monthlySalaries = useMemo(() =>
    monthNames.map((name, i) => {
      const m = String(i + 1).padStart(2, '0');
      const me = filtered.filter(e => e.month === m);
      return {
        month: name,
        basic: me.reduce((s, e) => s + e.basicSalary, 0),
        allowances: me.reduce((s, e) => s + e.transportAllowance + e.incentives + e.livingAllowance + e.stationAllowance + e.mobileAllowance + e.overtimePay, 0),
        deductions: me.reduce((s, e) => s + e.totalDeductions, 0),
        net: me.reduce((s, e) => s + e.netSalary, 0),
        bonuses: me.reduce((s, e) => s + e.bonusAmount, 0),
        count: me.length,
      };
    }), [filtered, monthNames]
  );

  const activeMonths = monthlySalaries.filter(m => m.count > 0);

  // By station
  const stationSalaries = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach(e => {
      map.set(e.stationLocation, (map.get(e.stationLocation) || 0) + e.netSalary);
    });
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
    return Array.from(map.entries()).map(([key, value], i) => {
      const st = stationLocations.find(s => s.value === key);
      return { name: st ? (ar ? st.labelAr : st.labelEn) : key, value, color: colors[i % colors.length] };
    });
  }, [filtered, ar]);

  const totalPayroll = filtered.reduce((s, e) => s + e.netSalary, 0);
  const totalAllowances = filtered.reduce((s, e) => s + e.transportAllowance + e.incentives + e.livingAllowance + e.stationAllowance + e.mobileAllowance + e.overtimePay, 0);
  const totalDeductions = filtered.reduce((s, e) => s + e.totalDeductions, 0);
  const uniqueEmps = new Set(filtered.map(e => e.employeeId)).size;
  const avgSalary = uniqueEmps > 0 ? Math.round(totalPayroll / uniqueEmps) : 0;

  const stats = [
    { label: ar ? 'إجمالي الصافي' : 'Total Net', value: totalPayroll.toLocaleString(), icon: Wallet, color: 'text-primary', bg: 'bg-primary/10' },
    { label: ar ? 'متوسط الراتب' : 'Avg Salary', value: avgSalary.toLocaleString(), icon: Banknote, color: 'text-success', bg: 'bg-success/10' },
    { label: ar ? 'إجمالي البدلات' : 'Total Allowances', value: totalAllowances.toLocaleString(), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: ar ? 'إجمالي الخصومات' : 'Total Deductions', value: totalDeductions.toLocaleString(), icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  const reportTitle = ar ? 'تقارير الرواتب' : 'Salary Reports';
  const getExportData = () => activeMonths.map(d => ({ month: d.month, basic: d.basic, allowances: d.allowances, deductions: d.deductions, net: d.net, bonuses: d.bonuses }));
  const getExportColumns = () => [
    { header: ar ? 'الشهر' : 'Month', key: 'month' },
    { header: ar ? 'الأساسي' : 'Basic', key: 'basic' },
    { header: ar ? 'البدلات' : 'Allowances', key: 'allowances' },
    { header: ar ? 'المكافآت' : 'Bonuses', key: 'bonuses' },
    { header: ar ? 'الخصومات' : 'Deductions', key: 'deductions' },
    { header: ar ? 'الصافي' : 'Net', key: 'net' },
  ];

  // Detail by station table
  const stationDetail = useMemo(() => {
    const map = new Map<string, { employees: number; basic: number; allowances: number; bonuses: number; overtime: number; deductions: number; net: number; employer: number }>();
    filtered.forEach(e => {
      if (!map.has(e.stationLocation)) map.set(e.stationLocation, { employees: 0, basic: 0, allowances: 0, bonuses: 0, overtime: 0, deductions: 0, net: 0, employer: 0 });
      const s = map.get(e.stationLocation)!;
      s.basic += e.basicSalary;
      s.allowances += e.transportAllowance + e.incentives + e.livingAllowance + e.stationAllowance + e.mobileAllowance;
      s.bonuses += e.bonusAmount;
      s.overtime += e.overtimePay;
      s.deductions += e.totalDeductions;
      s.net += e.netSalary;
      s.employer += e.employerSocialInsurance + e.healthInsurance + e.incomeTax;
    });
    // Count unique employees per station
    const empMap = new Map<string, Set<string>>();
    filtered.forEach(e => {
      if (!empMap.has(e.stationLocation)) empMap.set(e.stationLocation, new Set());
      empMap.get(e.stationLocation)!.add(e.employeeId);
    });
    empMap.forEach((v, k) => { if (map.has(k)) map.get(k)!.employees = v.size; });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-4 items-center justify-between", isRTL && "flex-row-reverse")}>
            <div className={cn("flex gap-4", isRTL && "flex-row-reverse")}>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: 11 }, (_, i) => String(2025 + i)).map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={station} onValueChange={setStation}>
                <SelectTrigger className="w-44"><SelectValue placeholder={ar ? 'المحطة' : 'Station'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع المحطات' : 'All'}</SelectItem>
                  {stationLocations.map(s => <SelectItem key={s.value} value={s.value}>{ar ? s.labelAr : s.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
              <Button variant="outline" size="sm" onClick={() => handlePrint(reportTitle)}><Printer className="w-4 h-4 mr-2" />{ar ? 'طباعة' : 'Print'}</Button>
              <Button variant="outline" size="sm" onClick={() => exportToPDF({ title: reportTitle, data: getExportData(), columns: getExportColumns() })}><Download className="w-4 h-4 mr-2" />{ar ? 'PDF' : 'PDF'}</Button>
              <Button variant="outline" size="sm" onClick={() => exportToCSV({ title: reportTitle, data: getExportData(), columns: getExportColumns() })}><FileText className="w-4 h-4 mr-2" />{ar ? 'Excel' : 'Excel'}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i}><CardContent className="p-6">
              <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                <div className={cn("p-3 rounded-lg", stat.bg)}><stat.icon className={cn("w-6 h-6", stat.color)} /></div>
                <div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="text-2xl font-bold">{stat.value}</p></div>
              </div>
            </CardContent></Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>{ar ? 'اتجاه الرواتب الشهري' : 'Monthly Payroll Trend'}</CardTitle></CardHeader>
            <CardContent><div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeMonths}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} /><Legend />
                  <Area type="monotone" dataKey="net" name={ar ? 'الصافي' : 'Net'} stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="basic" name={ar ? 'الأساسي' : 'Basic'} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{ar ? 'الرواتب بالمحطة' : 'Salary by Station'}</CardTitle></CardHeader>
            <CardContent><div className="h-[300px]">
              {stationSalaries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stationSalaries} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {stationSalaries.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">{ar ? 'لا توجد بيانات' : 'No data'}</div>
              )}
            </div></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{ar ? 'تفصيل المكافآت والأجر الإضافي' : 'Bonuses & Overtime'}</CardTitle></CardHeader>
            <CardContent><div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeMonths}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => v.toLocaleString()} />
                  <Bar dataKey="bonuses" name={ar ? 'المكافآت' : 'Bonuses'} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div></CardContent>
          </Card>
        </div>

        {/* Station Detail Table */}
        {stationDetail.length > 0 && (
          <Card className="mt-6">
            <CardHeader><CardTitle>{ar ? 'تفصيل الرواتب بالمحطة/الموقع' : 'Salary Detail by Station'}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الموظفين' : 'Employees'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الأساسي' : 'Basic'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'البدلات' : 'Allowances'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المكافآت' : 'Bonuses'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'أجر إضافي' : 'Overtime'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الخصومات' : 'Deductions'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الصافي' : 'Net'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'مساهمات الشركة' : 'Company'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stationDetail.map(([key, v]) => {
                    const st = stationLocations.find(s => s.value === key);
                    return (
                      <TableRow key={key}>
                        <TableCell className={cn("font-medium", isRTL && "text-right")}>{st ? (ar ? st.labelAr : st.labelEn) : key}</TableCell>
                        <TableCell className={cn(isRTL && "text-right")}>{v.employees}</TableCell>
                        <TableCell className={cn(isRTL && "text-right")}>{v.basic.toLocaleString()}</TableCell>
                        <TableCell className={cn(isRTL && "text-right")}>{v.allowances.toLocaleString()}</TableCell>
                        <TableCell className={cn(isRTL && "text-right")}>{v.bonuses.toLocaleString()}</TableCell>
                        <TableCell className={cn(isRTL && "text-right")}>{v.overtime.toLocaleString()}</TableCell>
                        <TableCell className={cn("text-destructive", isRTL && "text-right")}>{v.deductions.toLocaleString()}</TableCell>
                        <TableCell className={cn("font-bold", isRTL && "text-right")}>{v.net.toLocaleString()}</TableCell>
                        <TableCell className={cn("text-blue-600", isRTL && "text-right")}>{v.employer.toLocaleString()}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
