import { useState, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePayrollData } from '@/contexts/PayrollDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Search, Download, Printer, Eye } from 'lucide-react';
import { stationLocations } from '@/data/stationLocations';
import { useReportExport } from '@/hooks/useReportExport';

export const SalarySlips = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { getMonthlyPayroll } = usePayrollData();
  const { reportRef, handlePrint, exportToCSV, exportToPDF } = useReportExport();
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedSlipEmpId, setSelectedSlipEmpId] = useState<string | null>(null);

  const months = [
    { value: '01', label: ar ? 'يناير' : 'January' }, { value: '02', label: ar ? 'فبراير' : 'February' },
    { value: '03', label: ar ? 'مارس' : 'March' }, { value: '04', label: ar ? 'أبريل' : 'April' },
    { value: '05', label: ar ? 'مايو' : 'May' }, { value: '06', label: ar ? 'يونيو' : 'June' },
    { value: '07', label: ar ? 'يوليو' : 'July' }, { value: '08', label: ar ? 'أغسطس' : 'August' },
    { value: '09', label: ar ? 'سبتمبر' : 'September' }, { value: '10', label: ar ? 'أكتوبر' : 'October' },
    { value: '11', label: ar ? 'نوفمبر' : 'November' }, { value: '12', label: ar ? 'ديسمبر' : 'December' },
  ];

  const slips = useMemo(() => {
    return getMonthlyPayroll(selectedMonth, selectedYear).filter(entry => {
      const nameMatch = entry.employeeName.includes(search) || entry.employeeNameEn.toLowerCase().includes(search.toLowerCase()) || entry.employeeId.toLowerCase().includes(search.toLowerCase());
      const stationMatch = selectedStation === 'all' || entry.stationLocation === selectedStation;
      return nameMatch && stationMatch;
    });
  }, [selectedMonth, selectedYear, search, selectedStation, getMonthlyPayroll]);

  const selectedSlip = selectedSlipEmpId ? slips.find(s => s.employeeId === selectedSlipEmpId) : null;
  const monthLabel = months.find(m => m.value === selectedMonth)?.label || '';

  const reportTitle = ar ? 'قسائم الرواتب' : 'Salary Slips';
  const exportColumns = [
    { header: ar ? 'كود الموظف' : 'ID', key: 'employeeId' },
    { header: ar ? 'الموظف' : 'Employee', key: 'employeeName' },
    { header: ar ? 'القسم' : 'Dept', key: 'department' },
    { header: ar ? 'الأساسي' : 'Basic', key: 'basicSalary' },
    { header: ar ? 'الإجمالي' : 'Gross', key: 'gross' },
    { header: ar ? 'المكافآت' : 'Bonus', key: 'bonusAmount' },
    { header: ar ? 'أجر إضافي' : 'Overtime', key: 'overtimePay' },
    { header: ar ? 'الخصومات' : 'Deductions', key: 'totalDeductions' },
    { header: ar ? 'الصافي' : 'Net', key: 'netSalary' },
  ];

  const printSlip = (slip: typeof selectedSlip) => {
    if (!slip) return;
    const stLabel = stationLocations.find(s => s.value === slip.stationLocation);
    const html = `<!DOCTYPE html><html dir="${isRTL ? 'rtl' : 'ltr'}"><head><title>${reportTitle}</title>
    <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;600;700&display=swap" rel="stylesheet">
    <style>body{font-family:'Baloo Bhaijaan 2',sans-serif;padding:30px;direction:${isRTL?'rtl':'ltr'}}h2{text-align:center}table{width:100%;border-collapse:collapse;margin:10px 0}td,th{border:1px solid #ddd;padding:8px;text-align:${isRTL?'right':'left'};font-size:13px}th{background:#f3f4f6}.section{margin:15px 0;font-weight:700;font-size:15px}.total{font-size:18px;font-weight:700;text-align:center;margin:20px 0}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
    <h2>${reportTitle} - ${monthLabel} ${slip.year}</h2>
    <table><tr><td><strong>${ar?'الموظف':'Employee'}</strong>: ${ar?slip.employeeName:slip.employeeNameEn}</td><td><strong>${ar?'الكود':'ID'}</strong>: ${slip.employeeId}</td></tr>
    <tr><td><strong>${ar?'القسم':'Dept'}</strong>: ${slip.department}</td><td><strong>${ar?'المحطة':'Station'}</strong>: ${stLabel?(ar?stLabel.labelAr:stLabel.labelEn):'-'}</td></tr></table>
    <div class="section">${ar?'المستحقات':'Earnings'}</div>
    <table><tr><th>${ar?'البند':'Item'}</th><th>${ar?'المبلغ':'Amount'}</th></tr>
    ${[{l:ar?'الراتب الأساسي':'Basic',v:slip.basicSalary},{l:ar?'بدل المواصلات':'Transport',v:slip.transportAllowance},{l:ar?'الحوافز':'Incentives',v:slip.incentives},{l:ar?'بدل المعيشة':'Living',v:slip.livingAllowance},{l:ar?'بدل المحطة':'Station',v:slip.stationAllowance},{l:ar?'بدل الجوال':'Mobile',v:slip.mobileAllowance},{l:ar?'أجر إضافي':'Overtime',v:slip.overtimePay},{l:ar?'المكافآت':'Bonus',v:slip.bonusAmount}].filter(x=>x.v>0).map(x=>`<tr><td>${x.l}</td><td>${x.v.toLocaleString()}</td></tr>`).join('')}
    <tr style="font-weight:700;background:#e8f5e9"><td>${ar?'إجمالي المستحقات':'Total Earnings'}</td><td>${(slip.gross+slip.bonusAmount).toLocaleString()}</td></tr></table>
    <div class="section">${ar?'الخصومات':'Deductions'}</div>
    <table><tr><th>${ar?'البند':'Item'}</th><th>${ar?'المبلغ':'Amount'}</th></tr>
    ${[{l:ar?'التأمينات الاجتماعية':'Social Insurance',v:slip.employeeInsurance},{l:ar?'القروض':'Loans',v:slip.loanPayment},{l:ar?'السلف':'Advances',v:slip.advanceAmount},{l:ar?'الجوال الشخصي':'Mobile Bill',v:slip.mobileBill},{l:ar?'خصم الإجازة':'Leave Ded.',v:slip.leaveDeduction},{l:ar?'الجزاءات':'Penalties',v:slip.penaltyAmount}].filter(x=>x.v>0).map(x=>`<tr><td>${x.l}</td><td>${x.v.toLocaleString()}</td></tr>`).join('')}
    <tr style="font-weight:700;background:#ffebee"><td>${ar?'إجمالي الخصومات':'Total Deductions'}</td><td>${slip.totalDeductions.toLocaleString()}</td></tr></table>
    <div class="section">${ar?'مساهمات الشركة':'Company Contributions'}</div>
    <table>${[{l:ar?'تأمينات الشركة':'Company Soc. Ins.',v:slip.employerSocialInsurance},{l:ar?'التأمين الصحي':'Health Ins.',v:slip.healthInsurance},{l:ar?'ضريبة الدخل':'Income Tax',v:slip.incomeTax}].map(x=>`<tr><td>${x.l}</td><td>${x.v.toLocaleString()}</td></tr>`).join('')}</table>
    <div class="total">${ar?'صافي الراتب':'Net Salary'}: ${slip.netSalary.toLocaleString()} ${ar?'ج.م':'EGP'}</div>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 500); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-4 items-center", isRTL && "flex-row-reverse")}>
            <div className="relative flex-1 min-w-[200px]">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input placeholder={ar ? 'بحث...' : 'Search...'} value={search} onChange={(e) => setSearch(e.target.value)} className={cn(isRTL ? "pr-10 text-right" : "pl-10")} />
            </div>
            <Select value={selectedStation} onValueChange={setSelectedStation}>
              <SelectTrigger className="w-44"><SelectValue placeholder={ar ? 'المحطة' : 'Station'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'جميع المحطات' : 'All'}</SelectItem>
                {stationLocations.map(s => <SelectItem key={s.value} value={s.value}>{ar ? s.labelAr : s.labelEn}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{Array.from({ length: 11 }, (_, i) => String(2025 + i)).map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handlePrint(reportTitle)}>
              <Printer className="w-4 h-4" />{ar ? 'طباعة' : 'Print'}
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => exportToCSV({ title: reportTitle, data: slips as any, columns: exportColumns })}>
              <Download className="w-4 h-4" />{ar ? 'تصدير' : 'Export'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef}>
        <Card>
          <CardHeader>
            <CardTitle className={cn(isRTL && "text-right")}>{ar ? `قسائم الرواتب - ${monthLabel} ${selectedYear}` : `Salary Slips - ${monthLabel} ${selectedYear}`}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الكود' : 'ID'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الموظف' : 'Employee'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'القسم' : 'Dept'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الشهر' : 'Month'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الإجمالي' : 'Gross'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المكافآت' : 'Bonus'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الخصومات' : 'Ded.'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الصافي' : 'Net'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slips.map(slip => (
                  <TableRow key={slip.employeeId}>
                    <TableCell className={cn(isRTL && "text-right")}>{slip.employeeId}</TableCell>
                    <TableCell className={cn("font-medium", isRTL && "text-right")}>{ar ? slip.employeeName : slip.employeeNameEn}</TableCell>
                    <TableCell className={cn(isRTL && "text-right")}>{slip.department}</TableCell>
                    <TableCell className={cn(isRTL && "text-right")}>{monthLabel} {slip.year}</TableCell>
                    <TableCell className={cn("text-green-600", isRTL && "text-right")}>{slip.gross.toLocaleString()}</TableCell>
                    <TableCell className={cn(isRTL && "text-right")}>{slip.bonusAmount > 0 ? slip.bonusAmount.toLocaleString() : '-'}</TableCell>
                    <TableCell className={cn("text-destructive", isRTL && "text-right")}>{slip.totalDeductions.toLocaleString()}</TableCell>
                    <TableCell className={cn("font-bold", isRTL && "text-right")}>{slip.netSalary.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedSlipEmpId(slip.employeeId)}><Eye className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => printSlip(slip)}><Printer className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => exportToCSV({ title: `${reportTitle} - ${slip.employeeId}`, data: [slip] as any, columns: exportColumns })}><Download className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {slips.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      {ar ? 'لا توجد رواتب معالجة لهذه الفترة' : 'No processed payroll for this period'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSlip} onOpenChange={() => setSelectedSlipEmpId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={cn(isRTL && "text-right")}>{ar ? 'تفاصيل القسيمة' : 'Slip Detail'}</DialogTitle>
          </DialogHeader>
          {selectedSlip && (() => {
            const slip = selectedSlip;
            const stLabel = stationLocations.find(s => s.value === slip.stationLocation);
            return (
              <div className="space-y-4">
                <div className={cn("flex justify-between items-center", isRTL && "flex-row-reverse")}>
                  <div>
                    <p className="font-bold text-lg">{ar ? slip.employeeName : slip.employeeNameEn}</p>
                    <p className="text-sm text-muted-foreground">{slip.department} - {slip.employeeId}</p>
                    <p className="text-sm text-muted-foreground">{stLabel ? (ar ? stLabel.labelAr : stLabel.labelEn) : ''}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{monthLabel} {slip.year}</p>
                </div>
                <Separator />
                <div>
                  <h4 className={cn("font-semibold text-green-600 mb-2", isRTL && "text-right")}>{ar ? 'المستحقات' : 'Earnings'}</h4>
                  <div className="space-y-1 text-sm">
                    {[
                      { label: ar ? 'الراتب الأساسي' : 'Basic', value: slip.basicSalary },
                      { label: ar ? 'بدل المواصلات' : 'Transport', value: slip.transportAllowance },
                      { label: ar ? 'الحوافز' : 'Incentives', value: slip.incentives },
                      { label: ar ? 'بدل المعيشة' : 'Living', value: slip.livingAllowance },
                      { label: ar ? 'بدل المحطة' : 'Station', value: slip.stationAllowance },
                      { label: ar ? 'بدل الجوال' : 'Mobile', value: slip.mobileAllowance },
                      { label: ar ? 'أجر إضافي' : 'Overtime', value: slip.overtimePay },
                      { label: ar ? 'المكافآت' : 'Bonus', value: slip.bonusAmount },
                    ].filter(item => item.value > 0).map((item, i) => (
                      <div key={i} className={cn("flex justify-between", isRTL && "flex-row-reverse")}>
                        <span>{item.label}</span>
                        <span className="text-green-600">{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className={cn("flex justify-between font-bold pt-1 border-t", isRTL && "flex-row-reverse")}>
                      <span>{ar ? 'إجمالي المستحقات' : 'Total Earnings'}</span>
                      <span className="text-green-600">{(slip.gross + slip.bonusAmount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className={cn("font-semibold text-destructive mb-2", isRTL && "text-right")}>{ar ? 'الخصومات' : 'Deductions'}</h4>
                  <div className="space-y-1 text-sm">
                    {[
                      { label: ar ? 'التأمينات الاجتماعية' : 'Social Insurance', value: slip.employeeInsurance },
                      { label: ar ? 'القروض' : 'Loans', value: slip.loanPayment },
                      { label: ar ? 'السلف' : 'Advances', value: slip.advanceAmount },
                      { label: ar ? 'الجوال الشخصي' : 'Mobile Bill', value: slip.mobileBill },
                      { label: ar ? `خصم إجازة (${slip.leaveDays} يوم)` : `Leave (${slip.leaveDays} days)`, value: slip.leaveDeduction },
                      { label: ar ? 'الجزاءات' : 'Penalties', value: slip.penaltyAmount },
                    ].filter(item => item.value > 0).map((item, i) => (
                      <div key={i} className={cn("flex justify-between", isRTL && "flex-row-reverse")}>
                        <span>{item.label}</span>
                        <span className="text-destructive">{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className={cn("flex justify-between font-bold pt-1 border-t", isRTL && "flex-row-reverse")}>
                      <span>{ar ? 'إجمالي الخصومات' : 'Total Deductions'}</span>
                      <span className="text-destructive">{slip.totalDeductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className={cn("font-semibold text-blue-600 mb-2", isRTL && "text-right")}>{ar ? 'مساهمات الشركة' : 'Company Contributions'}</h4>
                  <div className="space-y-1 text-sm">
                    {[
                      { label: ar ? 'التأمينات الاجتماعية' : 'Social Ins.', value: slip.employerSocialInsurance },
                      { label: ar ? 'التأمين الصحي' : 'Health Ins.', value: slip.healthInsurance },
                      { label: ar ? 'ضريبة الدخل' : 'Income Tax', value: slip.incomeTax },
                    ].map((item, i) => (
                      <div key={i} className={cn("flex justify-between", isRTL && "flex-row-reverse")}>
                        <span>{item.label}</span>
                        <span className="text-blue-600">{item.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className={cn("flex justify-between items-center text-lg font-bold", isRTL && "flex-row-reverse")}>
                  <span>{ar ? 'صافي الراتب' : 'Net Salary'}</span>
                  <span className="text-primary">{slip.netSalary.toLocaleString()}</span>
                </div>
                <div className={cn("flex gap-2 pt-2", isRTL && "flex-row-reverse")}>
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => printSlip(slip)}><Printer className="w-4 h-4" />{ar ? 'طباعة' : 'Print'}</Button>
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => exportToCSV({ title: `${reportTitle} - ${slip.employeeId}`, data: [slip] as any, columns: exportColumns })}><Download className="w-4 h-4" />{ar ? 'تحميل' : 'Download'}</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
