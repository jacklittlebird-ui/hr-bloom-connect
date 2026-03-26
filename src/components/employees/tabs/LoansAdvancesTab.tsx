import { useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLoanData } from '@/contexts/LoanDataContext';
import { Employee } from '@/types/employee';
import { cn, formatDate } from '@/lib/utils';
import { HandCoins } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface LoansAdvancesTabProps {
  employee: Employee;
}

export const LoansAdvancesTab = ({ employee }: LoansAdvancesTabProps) => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { loans, advances, refreshData } = useLoanData();

  useEffect(() => { refreshData(); }, []);

  const empLoans = useMemo(() => loans.filter(l => l.employeeId === employee.id), [loans, employee.id]);
  const empAdvances = useMemo(() => advances.filter(a => a.employeeId === employee.id), [advances, employee.id]);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700 border-green-300',
      completed: 'bg-blue-100 text-blue-700 border-blue-300',
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      paid: 'bg-blue-100 text-blue-700 border-blue-300',
    };
    return <span className={cn("px-2 py-1 rounded-md text-xs font-semibold border", colors[status] || 'bg-muted text-foreground')}>{status}</span>;
  };

  return (
    <div className="p-6 space-y-6">
      <h3 className={cn("text-lg font-semibold flex items-center gap-2", isRTL && "flex-row-reverse")}>
        <HandCoins className="w-5 h-5 text-primary" />
        {ar ? 'القروض' : 'Loans'}
      </h3>
      <div className="rounded-xl overflow-hidden border border-border/30">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary text-primary-foreground">
              <TableHead className="text-primary-foreground">{ar ? 'المبلغ' : 'Amount'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'القسط الشهري' : 'Monthly'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'الأقساط' : 'Installments'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'المسدد' : 'Paid'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'المتبقي' : 'Remaining'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'الحالة' : 'Status'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empLoans.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">{ar ? 'لا توجد قروض' : 'No loans'}</TableCell></TableRow>
            ) : (
              empLoans.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="font-bold">{l.amount.toLocaleString()}</TableCell>
                  <TableCell>{l.monthlyPayment.toLocaleString()}</TableCell>
                  <TableCell>{l.paidInstallments}/{l.installments}</TableCell>
                  <TableCell className="text-green-600">{l.paidAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-destructive">{l.remainingAmount.toLocaleString()}</TableCell>
                  <TableCell>{formatDate(l.startDate)}</TableCell>
                  <TableCell>{statusBadge(l.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <h3 className={cn("text-lg font-semibold flex items-center gap-2", isRTL && "flex-row-reverse")}>
        <HandCoins className="w-5 h-5 text-primary" />
        {ar ? 'السلف' : 'Advances'}
      </h3>
      <div className="rounded-xl overflow-hidden border border-border/30">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary text-primary-foreground">
              <TableHead className="text-primary-foreground">{ar ? 'المبلغ' : 'Amount'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'السبب' : 'Reason'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'الحالة' : 'Status'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empAdvances.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">{ar ? 'لا توجد سلف' : 'No advances'}</TableCell></TableRow>
            ) : (
              empAdvances.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-bold">{a.amount.toLocaleString()}</TableCell>
                  <TableCell>{formatDate(a.requestDate)}</TableCell>
                  <TableCell>{a.reason}</TableCell>
                  <TableCell>{statusBadge(a.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
