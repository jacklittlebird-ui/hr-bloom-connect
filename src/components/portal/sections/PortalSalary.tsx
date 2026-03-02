import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePayrollData } from '@/contexts/PayrollDataContext';
import { useSalaryData } from '@/contexts/SalaryDataContext';
import { useLoanData } from '@/contexts/LoanDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Wallet, TrendingUp, TrendingDown, Building2, Printer, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { stationLocations } from '@/data/stationLocations';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

export const PortalSalary = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { getEmployeePayroll } = usePayrollData();
  const { getLatestSalaryRecord } = useSalaryData();
  const { getEmployeeActiveLoans, getEmployeeMonthlyLoanPayment } = useLoanData();

  const payroll = useMemo(() => getEmployeePayroll(PORTAL_EMPLOYEE_ID), [getEmployeePayroll]);
  const salaryRecord = useMemo(() => getLatestSalaryRecord(PORTAL_EMPLOYEE_ID), [getLatestSalaryRecord]);
  const activeLoans = useMemo(() => getEmployeeActiveLoans(PORTAL_EMPLOYEE_ID), [getEmployeeActiveLoans]);
  const monthlyLoanPayment = useMemo(() => getEmployeeMonthlyLoanPayment(PORTAL_EMPLOYEE_ID), [getEmployeeMonthlyLoanPayment]);
  const latest = payroll[0];
  const [selectedSlip, setSelectedSlip] = useState<typeof latest | null>(null);

  const months = ar
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Build earnings from latest payroll or salary record
  const getEarnings = (slip: typeof latest) => {
    if (!slip) return [];
    return [
      { l: ar ? 'الراتب الأساسي' : 'Basic Salary', v: slip.basicSalary },
      { l: ar ? 'بدل المواصلات' : 'Transport Allowance', v: slip.transportAllowance },
      { l: ar ? 'الحوافز' : 'Incentives', v: slip.incentives },
      { l: ar ? 'بدل المحطة' : 'Station Allowance', v: slip.stationAllowance },
      { l: ar ? 'بدل الجوال' : 'Mobile Allowance', v: slip.mobileAllowance },
      { l: ar ? 'بدل المعيشة' : 'Living Allowance', v: slip.livingAllowance },
      { l: ar ? 'أجر إضافي' : 'Overtime Pay', v: slip.overtimePay },
      { l: ar ? 'المكافآت' : 'Bonus', v: slip.bonusAmount },
    ];
  };

  const getDeductions = (slip: typeof latest) => {
    if (!slip) return [];
    return [
      { l: ar ? 'تأمينات الموظف' : 'Employee Insurance', v: slip.employeeInsurance },
      { l: ar ? 'أقساط القروض' : 'Loan Installments', v: slip.loanPayment },
      { l: ar ? 'السلف' : 'Advances', v: slip.advanceAmount },
      { l: ar ? 'فاتورة الجوال' : 'Mobile Bill', v: slip.mobileBill },
      { l: ar ? `خصم إجازة (${slip.leaveDays} يوم)` : `Leave Deduction (${slip.leaveDays} days)`, v: slip.leaveDeduction },
      { l: ar ? 'جزاءات' : 'Penalties', v: slip.penaltyAmount },
    ];
  };

  const getEmployerContributions = (slip: typeof latest) => {
    if (!slip) return [];
    return [
      { l: ar ? 'حصة صاحب العمل في التأمينات' : 'Employer Social Insurance', v: slip.employerSocialInsurance },
      { l: ar ? 'التأمين الصحي' : 'Health Insurance', v: slip.healthInsurance },
      { l: ar ? 'ضريبة الدخل' : 'Income Tax', v: slip.incomeTax },
    ];
  };

  const earnings = latest ? getEarnings(latest) : salaryRecord ? [
    { l: ar ? 'الراتب الأساسي' : 'Basic Salary', v: salaryRecord.basicSalary },
    { l: ar ? 'بدل المواصلات' : 'Transport Allowance', v: salaryRecord.transportAllowance },
    { l: ar ? 'الحوافز' : 'Incentives', v: salaryRecord.incentives },
    { l: ar ? 'بدل المحطة' : 'Station Allowance', v: salaryRecord.stationAllowance },
    { l: ar ? 'بدل الجوال' : 'Mobile Allowance', v: salaryRecord.mobileAllowance },
    { l: ar ? 'بدل المعيشة' : 'Living Allowance', v: salaryRecord.livingAllowance },
  ] : [];

  const deductions = latest ? getDeductions(latest) : salaryRecord ? [
    { l: ar ? 'تأمينات الموظف' : 'Employee Insurance', v: salaryRecord.employeeInsurance },
    { l: ar ? 'أقساط القروض' : 'Loan Installments', v: monthlyLoanPayment },
  ] : [];

  const employerContributions = latest ? getEmployerContributions(latest) : salaryRecord ? [
    { l: ar ? 'حصة صاحب العمل في التأمينات' : 'Employer Social Insurance', v: salaryRecord.employerSocialInsurance },
    { l: ar ? 'التأمين الصحي' : 'Health Insurance', v: salaryRecord.healthInsurance },
    { l: ar ? 'ضريبة الدخل' : 'Income Tax', v: salaryRecord.incomeTax },
  ] : [];

  const totalEarnings = earnings.reduce((s, e) => s + e.v, 0);
  const totalDeductions = latest ? latest.totalDeductions : deductions.reduce((s, d) => s + d.v, 0);
  const netSalary = latest ? latest.netSalary : totalEarnings - totalDeductions;
  const totalEmployerContributions = employerContributions.reduce((s, c) => s + c.v, 0);
  const hasData = latest || salaryRecord;

  const stLabel = latest ? stationLocations.find(s => s.value === latest.stationLocation) : null;

  const printSlip = (slip: NonNullable<typeof latest>) => {
    const st = stationLocations.find(s => s.value === slip.stationLocation);
    const monthLabel = months[parseInt(slip.month) - 1];
    const html = `<!DOCTYPE html><html dir="${isRTL ? 'rtl' : 'ltr'}"><head><title>${ar ? 'قسيمة الراتب' : 'Salary Slip'}</title>
    <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;600;700&display=swap" rel="stylesheet">
    <style>body{font-family:'Baloo Bhaijaan 2',sans-serif;padding:30px;direction:${isRTL?'rtl':'ltr'}}h2{text-align:center}table{width:100%;border-collapse:collapse;margin:10px 0}td,th{border:1px solid #ddd;padding:8px;text-align:${isRTL?'right':'left'};font-size:13px}th{background:#f3f4f6}.section{margin:15px 0;font-weight:700;font-size:15px}.total{font-size:18px;font-weight:700;text-align:center;margin:20px 0;padding:12px;background:#f0f9ff;border-radius:8px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>
    <h2>${ar ? 'قسيمة الراتب' : 'Salary Slip'} - ${monthLabel} ${slip.year}</h2>
    <table><tr><td><strong>${ar?'الموظف':'Employee'}</strong>: ${ar?slip.employeeName:slip.employeeNameEn}</td><td><strong>${ar?'الكود':'ID'}</strong>: ${slip.employeeId}</td></tr>
    <tr><td><strong>${ar?'القسم':'Dept'}</strong>: ${slip.department}</td><td><strong>${ar?'المحطة':'Station'}</strong>: ${st?(ar?st.labelAr:st.labelEn):'-'}</td></tr></table>
    <div class="section">${ar?'المستحقات':'Earnings'}</div>
    <table>${getEarnings(slip).filter(x=>x.v>0).map(x=>`<tr><td>${x.l}</td><td>${x.v.toLocaleString()}</td></tr>`).join('')}
    <tr style="font-weight:700;background:#e8f5e9"><td>${ar?'إجمالي المستحقات':'Total Earnings'}</td><td>${(slip.gross+slip.bonusAmount).toLocaleString()}</td></tr></table>
    <div class="section">${ar?'الخصومات':'Deductions'}</div>
    <table>${getDeductions(slip).filter(x=>x.v>0).map(x=>`<tr><td>${x.l}</td><td>${x.v.toLocaleString()}</td></tr>`).join('')}
    <tr style="font-weight:700;background:#ffebee"><td>${ar?'إجمالي الخصومات':'Total Deductions'}</td><td>${slip.totalDeductions.toLocaleString()}</td></tr></table>
    <div class="section">${ar?'مساهمات صاحب العمل':'Employer Contributions'}</div>
    <table>${getEmployerContributions(slip).map(x=>`<tr><td>${x.l}</td><td>${x.v.toLocaleString()}</td></tr>`).join('')}</table>
    <div class="total">${ar?'صافي الراتب':'Net Salary'}: ${slip.netSalary.toLocaleString()} ${ar?'ج.م':'EGP'}</div>
    </body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 500); }
  };

  return (
    <div className="space-y-6">
      <h1 className={cn("text-xl md:text-2xl font-bold", isRTL && "text-right")}>{ar ? 'الراتب' : 'Salary'}</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <Card><CardContent className="p-3 md:p-5 text-center">
          <TrendingUp className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 text-success" />
          <p className="text-xs md:text-sm text-muted-foreground">{ar ? 'إجمالي الراتب' : 'Gross'}</p>
          <p className="text-lg md:text-2xl font-bold text-success">{hasData ? totalEarnings.toLocaleString() : '—'}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 md:p-5 text-center">
          <TrendingDown className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 text-destructive" />
          <p className="text-xs md:text-sm text-muted-foreground">{ar ? 'الخصومات' : 'Deductions'}</p>
          <p className="text-lg md:text-2xl font-bold text-destructive">{hasData ? totalDeductions.toLocaleString() : '—'}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 md:p-5 text-center">
          <Wallet className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 text-primary" />
          <p className="text-xs md:text-sm text-muted-foreground">{ar ? 'صافي الراتب' : 'Net'}</p>
          <p className="text-lg md:text-2xl font-bold text-primary">{hasData ? netSalary.toLocaleString() : '—'}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 md:p-5 text-center">
          <Building2 className="w-5 h-5 md:w-6 md:h-6 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs md:text-sm text-muted-foreground">{ar ? 'مساهمات صاحب العمل' : 'Employer'}</p>
          <p className="text-lg md:text-2xl font-bold">{hasData ? totalEmployerContributions.toLocaleString() : '—'}</p>
        </CardContent></Card>
      </div>

      {hasData && (
        <Tabs defaultValue="breakdown" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="breakdown" className="text-xs sm:text-sm">{ar ? 'تفاصيل الراتب' : 'Breakdown'}</TabsTrigger>
            <TabsTrigger value="payslips" className="text-xs sm:text-sm">{ar ? 'كشوف الرواتب' : 'Payslips'}</TabsTrigger>
          </TabsList>

          {/* Tab 1: Detailed Breakdown */}
          <TabsContent value="breakdown" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Earnings */}
              <Card>
                <CardHeader>
                  <CardTitle className={cn("flex items-center gap-2 text-success", isRTL && "flex-row-reverse")}>
                    <TrendingUp className="w-5 h-5" />{ar ? 'المستحقات' : 'Earnings'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {earnings.filter(x => x.v > 0).map((item, i) => (
                    <div key={i} className={cn("flex justify-between py-2.5 border-b last:border-0", isRTL && "flex-row-reverse")}>
                      <span className="text-sm">{item.l}</span>
                      <span className="font-mono font-medium text-success">{item.v.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className={cn("flex justify-between py-3 font-bold bg-success/10 px-3 rounded mt-2", isRTL && "flex-row-reverse")}>
                    <span>{ar ? 'إجمالي المستحقات' : 'Total Earnings'}</span>
                    <span className="text-success">{totalEarnings.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Deductions */}
              <Card>
                <CardHeader>
                  <CardTitle className={cn("flex items-center gap-2 text-destructive", isRTL && "flex-row-reverse")}>
                    <TrendingDown className="w-5 h-5" />{ar ? 'الخصومات' : 'Deductions'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deductions.filter(x => x.v > 0).map((item, i) => (
                    <div key={i} className={cn("flex justify-between py-2.5 border-b last:border-0", isRTL && "flex-row-reverse")}>
                      <span className="text-sm">{item.l}</span>
                      <span className="font-mono font-medium text-destructive">{item.v.toLocaleString()}</span>
                    </div>
                  ))}
                  {deductions.filter(x => x.v > 0).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">{ar ? 'لا توجد خصومات' : 'No deductions'}</p>
                  )}
                  <div className={cn("flex justify-between py-3 font-bold bg-destructive/10 px-3 rounded mt-2", isRTL && "flex-row-reverse")}>
                    <span>{ar ? 'إجمالي الخصومات' : 'Total Deductions'}</span>
                    <span className="text-destructive">{totalDeductions.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Employer Contributions */}
            <Card>
              <CardHeader>
                <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Building2 className="w-5 h-5" />{ar ? 'مساهمات صاحب العمل' : 'Employer Contributions'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {employerContributions.map((item, i) => (
                    <div key={i} className="text-center p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">{item.l}</p>
                      <p className="text-xl font-bold">{item.v.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className={cn("flex justify-between py-3 font-bold bg-muted px-3 rounded mt-4", isRTL && "flex-row-reverse")}>
                  <span>{ar ? 'إجمالي مساهمات صاحب العمل' : 'Total Employer Contributions'}</span>
                  <span>{totalEmployerContributions.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Net Salary */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 md:p-6">
                <div className={cn("flex flex-col sm:flex-row justify-between items-center gap-3", isRTL && "sm:flex-row-reverse")}>
                  <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                    <Wallet className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                    <span className="text-lg md:text-xl font-bold">{ar ? 'صافي الراتب' : 'Net Salary'}</span>
                  </div>
                  <span className="text-2xl md:text-3xl font-bold text-primary">{netSalary.toLocaleString()} <span className="text-sm md:text-base">{ar ? 'ج.م' : 'EGP'}</span></span>
                </div>
                {latest && (
                  <p className={cn("text-sm text-muted-foreground mt-2", isRTL && "text-right")}>
                    {ar ? `آخر معالجة: ${months[parseInt(latest.month) - 1]} ${latest.year}` : `Last processed: ${months[parseInt(latest.month) - 1]} ${latest.year}`}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Active Loans Summary */}
            {activeLoans.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <Wallet className="w-5 h-5" />{ar ? 'القروض النشطة المرتبطة بالراتب' : 'Active Loans Linked to Salary'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'رقم القرض' : 'Loan ID'}</TableHead>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'القسط الشهري' : 'Monthly'}</TableHead>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المتبقي' : 'Remaining'}</TableHead>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الأقساط' : 'Progress'}</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {activeLoans.map(l => (
                        <TableRow key={l.id}>
                          <TableCell className="font-mono text-xs">{l.id.slice(0, 8).toUpperCase()}</TableCell>
                          <TableCell>{l.amount.toLocaleString('ar-EG')}</TableCell>
                          <TableCell className="text-destructive font-medium">{l.monthlyPayment.toLocaleString('ar-EG')}</TableCell>
                          <TableCell>{l.remainingAmount.toLocaleString('ar-EG')}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{l.paidInstallments}/{l.installments}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={2}>{ar ? 'إجمالي الخصم الشهري' : 'Total Monthly Deduction'}</TableCell>
                        <TableCell className="text-destructive">{monthlyLoanPayment.toLocaleString('ar-EG')}</TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 2: Payslips */}
          <TabsContent value="payslips" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Wallet className="w-5 h-5" />{ar ? 'كشوف الرواتب المعالجة' : 'Processed Payslips'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الشهر' : 'Month'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الأساسي' : 'Basic'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'البدلات' : 'Allowances'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الإجمالي' : 'Gross'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الخصومات' : 'Deductions'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الصافي' : 'Net'}</TableHead>
                   </TableRow></TableHeader>
                  <TableBody>
                    {payroll.map((p, i) => {
                      const pGross = p.basicSalary + p.transportAllowance + p.incentives + p.stationAllowance + p.mobileAllowance + p.livingAllowance + p.overtimePay + p.bonusAmount;
                      const allowances = p.transportAllowance + p.incentives + p.stationAllowance + p.mobileAllowance + p.livingAllowance;
                      return (
                        <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedSlip(p)}>
                          <TableCell className="font-medium">{months[parseInt(p.month) - 1]} {p.year}</TableCell>
                          <TableCell>{p.basicSalary.toLocaleString()}</TableCell>
                          <TableCell className="text-success">{allowances.toLocaleString()}</TableCell>
                          <TableCell className="font-medium">{pGross.toLocaleString()}</TableCell>
                          <TableCell className="text-destructive">{p.totalDeductions.toLocaleString()}</TableCell>
                          <TableCell className="font-bold text-primary">{p.netSalary.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                    {payroll.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">{ar ? 'لا توجد كشوف رواتب معالجة' : 'No processed payslips'}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!hasData && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          {ar ? 'لا توجد بيانات رواتب بعد' : 'No salary data yet'}
        </CardContent></Card>
      )}

      {/* Slip Detail Dialog */}
      <Dialog open={!!selectedSlip} onOpenChange={() => setSelectedSlip(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className={cn(isRTL && "text-right")}>{ar ? 'تفاصيل القسيمة' : 'Slip Detail'}</DialogTitle>
          </DialogHeader>
          {selectedSlip && (() => {
            const slip = selectedSlip;
            const st = stationLocations.find(s => s.value === slip.stationLocation);
            const slipEarnings = getEarnings(slip);
            const slipDeductions = getDeductions(slip);
            const slipEmployer = getEmployerContributions(slip);
            const slipTotalEarnings = slipEarnings.reduce((s, e) => s + e.v, 0);
            return (
              <div className="space-y-4">
                <div className={cn("flex justify-between items-center", isRTL && "flex-row-reverse")}>
                  <div>
                    <p className="font-bold text-lg">{ar ? slip.employeeName : slip.employeeNameEn}</p>
                    <p className="text-sm text-muted-foreground">{slip.department && slip.department.length < 36 ? slip.department : ''} {slip.employeeCode ? `- ${slip.employeeCode}` : ''}</p>
                    <p className="text-sm text-muted-foreground">{st ? (ar ? st.labelAr : st.labelEn) : ''}</p>
                  </div>
                  <Badge variant="outline" className="text-base px-3 py-1">{months[parseInt(slip.month) - 1]} {slip.year}</Badge>
                </div>
                <Separator />

                <h4 className={cn("font-semibold text-success", isRTL && "text-right")}>{ar ? 'المستحقات' : 'Earnings'}</h4>
                {slipEarnings.filter(x => x.v > 0).map((item, i) => (
                  <div key={i} className={cn("flex justify-between text-sm", isRTL && "flex-row-reverse")}>
                    <span>{item.l}</span><span className="text-success font-mono">{item.v.toLocaleString()}</span>
                  </div>
                ))}
                <div className={cn("flex justify-between font-bold pt-1 border-t", isRTL && "flex-row-reverse")}>
                  <span>{ar ? 'إجمالي المستحقات' : 'Total Earnings'}</span>
                  <span className="text-success">{slipTotalEarnings.toLocaleString()}</span>
                </div>

                <Separator />
                <h4 className={cn("font-semibold text-destructive", isRTL && "text-right")}>{ar ? 'الخصومات' : 'Deductions'}</h4>
                {slipDeductions.filter(x => x.v > 0).map((item, i) => (
                  <div key={i} className={cn("flex justify-between text-sm", isRTL && "flex-row-reverse")}>
                    <span>{item.l}</span><span className="text-destructive font-mono">{item.v.toLocaleString()}</span>
                  </div>
                ))}
                <div className={cn("flex justify-between font-bold pt-1 border-t", isRTL && "flex-row-reverse")}>
                  <span>{ar ? 'إجمالي الخصومات' : 'Total Deductions'}</span>
                  <span className="text-destructive">{slip.totalDeductions.toLocaleString()}</span>
                </div>

                <Separator />
                <h4 className={cn("font-semibold", isRTL && "text-right")}>{ar ? 'مساهمات صاحب العمل' : 'Employer Contributions'}</h4>
                {slipEmployer.map((item, i) => (
                  <div key={i} className={cn("flex justify-between text-sm", isRTL && "flex-row-reverse")}>
                    <span>{item.l}</span><span className="font-mono">{item.v.toLocaleString()}</span>
                  </div>
                ))}

                <Separator />
                <div className={cn("flex justify-between items-center py-3 px-4 bg-primary/10 rounded-lg", isRTL && "flex-row-reverse")}>
                  <span className="text-lg font-bold">{ar ? 'صافي الراتب' : 'Net Salary'}</span>
                  <span className="text-2xl font-bold text-primary">{slip.netSalary.toLocaleString()} {ar ? 'ج.م' : 'EGP'}</span>
                </div>

              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
