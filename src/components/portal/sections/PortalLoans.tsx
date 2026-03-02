import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLoanData } from '@/contexts/LoanDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { HandCoins } from 'lucide-react';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

export const PortalLoans = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { loans, advances } = useLoanData();

  const myLoans = useMemo(() => loans.filter(l => l.employeeId === PORTAL_EMPLOYEE_ID), [loans]);
  const myAdvances = useMemo(() => advances.filter(a => a.employeeId === PORTAL_EMPLOYEE_ID), [advances]);

  const totalLoanAmount = myLoans.reduce((s, l) => s + l.amount, 0);
  const totalPaid = myLoans.reduce((s, l) => s + l.paidAmount, 0);
  const totalRemaining = myLoans.reduce((s, l) => s + l.remainingAmount, 0);
  const totalAdvances = myAdvances.filter(a => a.status !== 'rejected').reduce((s, a) => s + a.amount, 0);

  const statusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      active: { label: ar ? 'جاري' : 'Active', className: 'bg-warning/10 text-warning border-warning' },
      completed: { label: ar ? 'مكتمل' : 'Completed', className: 'bg-success/10 text-success border-success' },
      pending: { label: ar ? 'معلق' : 'Pending', className: 'bg-muted text-muted-foreground' },
      approved: { label: ar ? 'موافق عليها' : 'Approved', className: 'bg-success/10 text-success border-success' },
      deducted: { label: ar ? 'تم الخصم' : 'Deducted', className: 'bg-muted text-muted-foreground' },
      rejected: { label: ar ? 'مرفوض' : 'Rejected', className: 'bg-destructive/10 text-destructive border-destructive' },
    };
    const c = config[status] || config.pending;
    return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <h1 className={cn("text-xl md:text-2xl font-bold", isRTL && "text-right")}>{ar ? 'قروضي وسلفي' : 'My Loans & Advances'}</h1>

      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <Card><CardContent className="p-3 md:p-5 text-center">
          <p className="text-xs md:text-sm text-muted-foreground">{ar ? 'إجمالي القروض' : 'Total Loans'}</p>
          <p className="text-lg md:text-2xl font-bold text-primary">{totalLoanAmount.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 md:p-5 text-center">
          <p className="text-xs md:text-sm text-muted-foreground">{ar ? 'المسدد' : 'Paid'}</p>
          <p className="text-lg md:text-2xl font-bold text-success">{totalPaid.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 md:p-5 text-center">
          <p className="text-xs md:text-sm text-muted-foreground">{ar ? 'المتبقي' : 'Remaining'}</p>
          <p className="text-lg md:text-2xl font-bold text-destructive">{totalRemaining.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 md:p-5 text-center">
          <p className="text-xs md:text-sm text-muted-foreground">{ar ? 'السلف' : 'Advances'}</p>
          <p className="text-lg md:text-2xl font-bold text-warning">{totalAdvances.toLocaleString()}</p>
        </CardContent></Card>
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader><CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}><HandCoins className="w-5 h-5" />{ar ? 'القروض' : 'Loans'}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className={cn(isRTL && "text-right")}>{ar ? 'رقم القرض' : 'Loan ID'}</TableHead>
              <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المبلغ' : 'Amount'}</TableHead>
              <TableHead className={cn(isRTL && "text-right")}>{ar ? 'القسط الشهري' : 'Monthly'}</TableHead>
              <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المسدد' : 'Paid'}</TableHead>
              <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المتبقي' : 'Remaining'}</TableHead>
              <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الأقساط' : 'Installments'}</TableHead>
              <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الحالة' : 'Status'}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {myLoans.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.id.slice(0, 8).toUpperCase()}</TableCell>
                  <TableCell>{l.amount.toLocaleString()}</TableCell>
                  <TableCell>{l.monthlyPayment.toLocaleString()}</TableCell>
                  <TableCell className="text-success">{l.paidAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-destructive">{l.remainingAmount.toLocaleString()}</TableCell>
                  <TableCell>{l.paidInstallments}/{l.installments}</TableCell>
                  <TableCell>{statusBadge(l.status)}</TableCell>
                </TableRow>
              ))}
              {myLoans.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">{ar ? 'لا توجد قروض' : 'No loans'}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Advances Table */}
      {myAdvances.length > 0 && (
        <Card>
          <CardHeader><CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}><HandCoins className="w-5 h-5" />{ar ? 'السلف' : 'Advances'}</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الرقم' : 'ID'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المبلغ' : 'Amount'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'تاريخ الطلب' : 'Request Date'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'شهر الخصم' : 'Deduction Month'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'السبب' : 'Reason'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الحالة' : 'Status'}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {myAdvances.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.id.slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell>{a.amount.toLocaleString()}</TableCell>
                    <TableCell>{a.requestDate}</TableCell>
                    <TableCell>{a.deductionMonth}</TableCell>
                    <TableCell>{a.reason}</TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
