import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface InstallmentScheduleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: {
    id: string;
    employeeName: string;
    amount: number;
    installments: number;
    monthlyPayment: number;
    paidInstallments: number;
    startDate: string;
    status: string;
  } | null;
}

const getInstallmentDate = (startDate: string, index: number) => {
  if (!startDate) return '';
  const [year, month] = startDate.split('-').map(Number);
  const date = new Date(year, month - 1 + index);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (dateStr: string, lang: string) => {
  if (!dateStr) return '';
  const [year, month] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
};

type InstallmentStatus = 'paid' | 'current' | 'upcoming';

interface InstallmentRow {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
}

export const InstallmentScheduleDialog = ({ open, onOpenChange, loan }: InstallmentScheduleProps) => {
  const { isRTL, language } = useLanguage();
  const [scheduleRows, setScheduleRows] = useState<InstallmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !loan?.id) {
      setScheduleRows([]);
      return;
    }

    let active = true;
    const fetchInstallments = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('loan_installments')
        .select('id, installment_number, amount, due_date, status')
        .eq('loan_id', loan.id)
        .order('installment_number', { ascending: true });

      if (!active) return;
      if (error) {
        setScheduleRows([]);
      } else {
        setScheduleRows((data as InstallmentRow[]) || []);
      }
      setIsLoading(false);
    };

    fetchInstallments();

    return () => {
      active = false;
    };
  }, [open, loan?.id]);

  if (!loan) return null;

  const totalInstallmentsCount = scheduleRows.length > 0 ? scheduleRows.length : loan.installments;
  const paidInstallmentsCount = scheduleRows.length > 0
    ? scheduleRows.filter((row) => row.status === 'paid').length
    : loan.paidInstallments;

  const progressPercent = totalInstallmentsCount > 0
    ? (paidInstallmentsCount / totalInstallmentsCount) * 100
    : 0;

  const installments = (() => {
    if (scheduleRows.length > 0) {
      const firstPendingIndex = scheduleRows.findIndex((row) => row.status !== 'paid');
      let cumulative = 0;

      return scheduleRows.map((row, index) => {
        const amount = Number(row.amount) || 0;
        cumulative += amount;

        let status: InstallmentStatus = 'upcoming';
        if (row.status === 'paid') {
          status = 'paid';
        } else if (firstPendingIndex === index) {
          status = 'current';
        }

        return {
          number: row.installment_number,
          date: row.due_date?.slice(0, 7) || '',
          amount,
          cumulativePaid: Math.min(cumulative, loan.amount),
          remaining: Math.max(loan.amount - cumulative, 0),
          status,
        };
      });
    }

    let cumulative = 0;
    return Array.from({ length: loan.installments }, (_, i) => {
      const amount = i + 1 === loan.installments
        ? Math.max(loan.amount - (loan.monthlyPayment * (loan.installments - 1)), 0)
        : loan.monthlyPayment;
      cumulative += amount;

      let status: InstallmentStatus = 'upcoming';
      if (i < loan.paidInstallments) status = 'paid';
      else if (i === loan.paidInstallments) status = 'current';

      return {
        number: i + 1,
        date: getInstallmentDate(loan.startDate, i),
        amount,
        cumulativePaid: Math.min(cumulative, loan.amount),
        remaining: Math.max(loan.amount - cumulative, 0),
        status,
      };
    });
  })();

  const statusConfig: Record<InstallmentStatus, { label: string; labelEn: string; icon: typeof CheckCircle; color: string }> = {
    paid: { label: 'مدفوع', labelEn: 'Paid', icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-300' },
    current: { label: 'القسط الحالي', labelEn: 'Current', icon: Clock, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    upcoming: { label: 'قادم', labelEn: 'Upcoming', icon: AlertCircle, color: 'bg-muted text-muted-foreground border-border' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isRTL ? `جدول أقساط القرض - ${loan.employeeName}` : `Installment Schedule - ${loan.employeeName}`}
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{isRTL ? 'إجمالي القرض' : 'Total'}</p>
            <p className="font-bold">{loan.amount.toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{isRTL ? 'القسط الشهري' : 'Monthly'}</p>
            <p className="font-bold">{loan.monthlyPayment.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{isRTL ? 'المدفوع' : 'Paid'}</p>
            <p className="font-bold text-green-700">{paidInstallmentsCount} / {totalInstallmentsCount}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">{isRTL ? 'نسبة الإنجاز' : 'Progress'}</p>
            <p className="font-bold">{progressPercent.toFixed(0)}%</p>
          </div>
        </div>

        <Progress value={progressPercent} className="h-2 mb-4" />

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">#</TableHead>
              <TableHead>{isRTL ? 'الشهر' : 'Month'}</TableHead>
              <TableHead>{isRTL ? 'مبلغ القسط' : 'Amount'}</TableHead>
              <TableHead>{isRTL ? 'المدفوع تراكمياً' : 'Cumulative'}</TableHead>
              <TableHead>{isRTL ? 'المتبقي' : 'Remaining'}</TableHead>
              <TableHead>{isRTL ? 'الحالة' : 'Status'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {isRTL ? 'جاري تحميل جدول الأقساط...' : 'Loading installment schedule...'}
                </TableCell>
              </TableRow>
            ) : installments.map((inst) => {
              const config = statusConfig[inst.status];
              const Icon = config.icon;
              return (
                <TableRow key={inst.number} className={inst.status === 'current' ? 'bg-yellow-50/50' : ''}>
                  <TableCell className="text-center font-medium">{inst.number}</TableCell>
                  <TableCell>{getMonthLabel(inst.date, language)}</TableCell>
                  <TableCell>{inst.amount.toLocaleString()}</TableCell>
                  <TableCell className="text-green-600">{inst.cumulativePaid.toLocaleString()}</TableCell>
                  <TableCell className="text-destructive">{inst.remaining.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`${config.color} gap-1`}>
                      <Icon className="h-3 w-3" />
                      {isRTL ? config.label : config.labelEn}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
};
