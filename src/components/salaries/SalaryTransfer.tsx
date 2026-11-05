import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePayrollData } from '@/contexts/PayrollDataContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { useReportExport } from '@/hooks/useReportExport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Download, FileSpreadsheet, Banknote, Users } from 'lucide-react';
import { stationLocations } from '@/data/stationLocations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as XLSX from 'xlsx';
import { stripEmpPrefix, transferBankOf, type TransferBank } from '@/lib/salaryBank';

export const SalaryTransfer = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { getMonthlyPayroll, refreshPayroll } = usePayrollData();
  const { employees } = useEmployeeData();
  const { exportToCSV } = useReportExport();

  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedStation, setSelectedStation] = useState('all');

  useEffect(() => {
    refreshPayroll();
  }, [refreshPayroll, selectedMonth, selectedYear]);

  const months = [
    { value: '01', label: ar ? 'يناير' : 'January' },
    { value: '02', label: ar ? 'فبراير' : 'February' },
    { value: '03', label: ar ? 'مارس' : 'March' },
    { value: '04', label: ar ? 'أبريل' : 'April' },
    { value: '05', label: ar ? 'مايو' : 'May' },
    { value: '06', label: ar ? 'يونيو' : 'June' },
    { value: '07', label: ar ? 'يوليو' : 'July' },
    { value: '08', label: ar ? 'أغسطس' : 'August' },
    { value: '09', label: ar ? 'سبتمبر' : 'September' },
    { value: '10', label: ar ? 'أكتوبر' : 'October' },
    { value: '11', label: ar ? 'نوفمبر' : 'November' },
    { value: '12', label: ar ? 'ديسمبر' : 'December' },
  ];

  const payrollData = useMemo(() => {
    let data = getMonthlyPayroll(selectedMonth, selectedYear);
    if (selectedStation && selectedStation !== 'all') {
      data = data.filter(e => e.stationLocation === selectedStation);
    }
    return data;
  }, [selectedMonth, selectedYear, selectedStation, getMonthlyPayroll]);

  const transferData = useMemo(() => {
    return payrollData.map(entry => {
      const emp = employees.find(e => e.id === entry.employeeId || e.employeeId === entry.employeeId);
      return {
        employeeId: emp?.employeeId || entry.employeeId,
        employeeName: ar ? entry.employeeName : entry.employeeNameEn,
        employeeNameAr: entry.employeeName,
        employeeNameEn: entry.employeeNameEn,
        department: entry.department,
        station: stationLocations.find(s => s.value === entry.stationLocation)?.[ar ? 'labelAr' : 'labelEn'] || entry.stationLocation,
        accountNumber: emp?.bankAccountNumber || '-',
        bankId: emp?.bankIdNumber || '-',
        bankName: emp?.bankName || '-',
        accountType: emp?.bankAccountType || '-',
        netSalary: entry.netSalary,
        nbeAccount: emp?.nbeAccountNumber || '-',
        transferBank: transferBankOf(emp),
      };
    });
  }, [payrollData, employees, ar]);

  const [bankTab, setBankTab] = useState<TransferBank | 'totals'>('nbe');
  const bankLabels: Record<TransferBank, string> = {
    nbe: ar ? 'البنك الأهلي' : 'NBE',
    credit_agricole: ar ? 'كريدي أجريكول' : 'Crédit Agricole',
    cash: ar ? 'نقدي' : 'Cash',
  };
  const byBank = (b: TransferBank) => transferData.filter(r => r.transferBank === b);
  const currentRows = bankTab === 'totals' ? transferData : byBank(bankTab);
  const totalNet = currentRows.reduce((s, e) => s + e.netSalary, 0);

  const exportNbe = () => {
    const rows = byBank('nbe');
    if (!rows.length) return;
    const aoa: (string | number | null)[][] = [[null, null, null, 'المبلغ', 'رقم الموظف']];
    rows.forEach(r => aoa.push([null, null, null, r.netSalary, stripEmpPrefix(r.employeeId)]));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `تحويل_الأهلي_${selectedYear}_${selectedMonth}.xlsx`);
  };

  const exportTotals = () => {
    const banks: TransferBank[] = ['nbe', 'credit_agricole', 'cash'];
    const aoa: (string | number)[][] = [[ar ? 'البنك' : 'Bank', ar ? 'عدد الموظفين' : 'Employees', ar ? 'الإجمالي' : 'Total']];
    banks.forEach(b => { const r = byBank(b); aoa.push([bankLabels[b], r.length, r.reduce((s, e) => s + e.netSalary, 0)]); });
    aoa.push([ar ? 'الإجمالي' : 'Total', transferData.length, transferData.reduce((s, e) => s + e.netSalary, 0)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Totals');
    XLSX.writeFile(wb, `اجماليات_التحويل_${selectedYear}_${selectedMonth}.xlsx`);
  };

  const handleExportExcel = () => {
    if (bankTab === 'nbe') return exportNbe();
    if (bankTab === 'totals') return exportTotals();
    const rowsToExport = currentRows;
    if (!rowsToExport.length) return;
    const monthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth;

    exportToCSV({
      title: ar ? `تحويل رواتب ${bankLabels[bankTab]} - ${monthLabel} ${selectedYear}` : `Salary Transfer - ${monthLabel} ${selectedYear}`,
      fileName: `salary_transfer_${bankTab}_${selectedYear}_${selectedMonth}`,
      data: rowsToExport.map(d => ({
        ...d,
        netSalary: d.netSalary.toLocaleString(),
      })) as unknown as Record<string, unknown>[],
      columns: [
        { header: ar ? 'كود الموظف' : 'Employee ID', key: 'employeeId' },
        { header: ar ? 'اسم الموظف' : 'Employee Name', key: ar ? 'employeeNameAr' : 'employeeNameEn' },
        { header: ar ? 'القسم' : 'Department', key: 'department' },
        { header: ar ? 'المحطة' : 'Station', key: 'station' },
        { header: ar ? 'رقم الحساب البنكي' : 'Account Number', key: 'accountNumber' },
        { header: ar ? 'رقم الـ ID البنكي' : 'Bank ID', key: 'bankId' },
        { header: ar ? 'اسم البنك' : 'Bank Name', key: 'bankName' },
        { header: ar ? 'نوع الحساب' : 'Account Type', key: 'accountType' },
        { header: ar ? 'صافي الراتب' : 'Net Salary', key: 'netSalary' },
      ],
    });
  };

  const monthLabel = months.find(m => m.value === selectedMonth)?.label || selectedMonth;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className={cn("flex items-center gap-2 text-lg", isRTL && "flex-row-reverse")}>
            <Banknote className="h-5 w-5 text-primary" />
            {ar ? 'تحويل الرواتب' : 'Salary Transfer'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn("flex flex-wrap gap-4 items-end justify-between", isRTL && "flex-row-reverse")}>
            <div className={cn("flex gap-4 items-end flex-wrap", isRTL && "flex-row-reverse")}>
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
              <div className="space-y-2">
                <Label>{ar ? 'المحطة' : 'Station'}</Label>
                <Select value={selectedStation} onValueChange={setSelectedStation}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                    {stationLocations.map(s => <SelectItem key={s.value} value={s.value}>{ar ? s.labelAr : s.labelEn}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleExportExcel} className="gap-2" disabled={!currentRows.length}>
              <FileSpreadsheet className="h-4 w-4" />
              {ar ? `تصدير ${bankTab === 'totals' ? 'الإجماليات' : bankLabels[bankTab]}` : 'Export Excel'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={bankTab} onValueChange={v => setBankTab(v as TransferBank | 'totals')} dir={isRTL ? 'rtl' : 'ltr'}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="nbe">{bankLabels.nbe} ({byBank('nbe').length})</TabsTrigger>
          <TabsTrigger value="credit_agricole">{bankLabels.credit_agricole} ({byBank('credit_agricole').length})</TabsTrigger>
          <TabsTrigger value="cash">{bankLabels.cash} ({byBank('cash').length})</TabsTrigger>
          <TabsTrigger value="totals">{ar ? 'الإجماليات' : 'Totals'}</TabsTrigger>
        </TabsList>
        <TabsContent value="totals">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'البنك' : 'Bank'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'عدد الموظفين' : 'Employees'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الإجمالي' : 'Total'}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(['nbe', 'credit_agricole', 'cash'] as TransferBank[]).map(b => (
                  <TableRow key={b}>
                    <TableCell>{bankLabels[b]}</TableCell>
                    <TableCell>{byBank(b).length}</TableCell>
                    <TableCell className="font-bold">{byBank(b).reduce((s, e) => s + e.netSalary, 0).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell>{ar ? 'الإجمالي' : 'Total'}</TableCell>
                  <TableCell>{transferData.length}</TableCell>
                  <TableCell className="text-primary">{transferData.reduce((s, e) => s + e.netSalary, 0).toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className={cn("rounded-xl p-5 flex items-center gap-4 shadow-sm border border-border/30 bg-stat-blue-bg", isRTL && "flex-row-reverse")}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-stat-blue">
            <Users className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{ar ? 'عدد الموظفين' : 'Employees'}</p>
            <p className="text-2xl font-bold text-foreground">{currentRows.length}</p>
          </div>
        </div>
        <div className={cn("rounded-xl p-5 flex items-center gap-4 shadow-sm border border-border/30 bg-stat-green-bg", isRTL && "flex-row-reverse")}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-stat-green">
            <Banknote className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{ar ? 'إجمالي التحويلات' : 'Total Transfer'}</p>
            <p className="text-2xl font-bold text-foreground">{totalNet.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className={cn("text-base", isRTL && "text-right")}>
            {ar ? `تقرير تحويل الرواتب - ${monthLabel} ${selectedYear}` : `Salary Transfer Report - ${monthLabel} ${selectedYear}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bankTab === 'totals' ? null : currentRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{ar ? 'لا توجد رواتب معالجة لهذا الشهر' : 'No processed payroll for this month'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn(isRTL && "text-right")}>#</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'كود الموظف' : 'ID'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'اسم الموظف' : 'Employee Name'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'القسم' : 'Department'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'رقم الحساب' : 'Account No.'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'ID البنكي' : 'Bank ID'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'اسم البنك' : 'Bank Name'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'نوع الحساب' : 'Account Type'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'صافي الراتب' : 'Net Salary'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRows.map((row, idx) => (
                    <TableRow key={row.employeeId}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{row.employeeId}</TableCell>
                      <TableCell className="font-medium">{row.employeeName}</TableCell>
                      <TableCell>{row.department}</TableCell>
                      <TableCell className="font-mono text-xs">{row.transferBank === 'nbe' ? row.nbeAccount : row.accountNumber}</TableCell>
                      <TableCell className="font-mono text-xs">{row.bankId}</TableCell>
                      <TableCell>{row.bankName}</TableCell>
                      <TableCell>{row.accountType}</TableCell>
                      <TableCell className="font-bold text-primary">{row.netSalary.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {/* Total row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={8} className={cn(isRTL ? "text-left" : "text-right")}>
                      {ar ? 'الإجمالي' : 'Total'}
                    </TableCell>
                    <TableCell className="font-bold text-primary text-lg">{totalNet.toLocaleString()}</TableCell>
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
