import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePerformanceData } from '@/contexts/PerformanceDataContext';
import { Employee } from '@/types/employee';
import { cn, formatDate } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Star } from 'lucide-react';

interface EvaluationsTabProps {
  employee: Employee;
}

export const EvaluationsTab = ({ employee }: EvaluationsTabProps) => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { reviews } = usePerformanceData();

  const empEvals = useMemo(
    () => reviews
      .filter(r => r.employeeId === employee.employeeId || r.employeeId === employee.id)
      .sort((a, b) => `${b.year}-${b.quarter}`.localeCompare(`${a.year}-${a.quarter}`)),
    [reviews, employee.employeeId, employee.id]
  );

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-blue-600';
    if (score >= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const statusLabel = (status: string) => {
    if (status === 'approved') return ar ? 'معتمد' : 'Approved';
    if (status === 'submitted') return ar ? 'مقدّم' : 'Submitted';
    return ar ? 'مسودة' : 'Draft';
  };

  const statusColor = (status: string) => {
    if (status === 'approved') return 'bg-success/10 text-success border-success';
    if (status === 'submitted') return 'bg-warning/10 text-warning border-warning';
    return 'bg-muted text-muted-foreground border-muted';
  };

  return (
    <div className="p-6 space-y-6">
      <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
        <h3 className={cn("text-lg font-semibold flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <BarChart3 className="w-5 h-5 text-primary" />
          {ar ? 'سجل التقييمات' : 'Evaluation Record'}
        </h3>
      </div>

      <div className="rounded-xl overflow-hidden border border-border/30">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary text-primary-foreground">
              <TableHead className="text-primary-foreground">{ar ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'الربع' : 'Quarter'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'السنة' : 'Year'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'الدرجة' : 'Score'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'المقيّم' : 'Reviewer'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'نقاط القوة' : 'Strengths'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empEvals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {ar ? 'لا توجد تقييمات' : 'No evaluations'}
                </TableCell>
              </TableRow>
            ) : (
              empEvals.map(ev => (
                <TableRow key={ev.id}>
                  <TableCell>{formatDate(ev.reviewDate)}</TableCell>
                  <TableCell>{ev.quarter}</TableCell>
                  <TableCell>{ev.year}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className={cn("font-bold", getScoreColor(ev.score))}>{ev.score}/5</span>
                      <Star className={cn("w-4 h-4", ev.score >= 3 ? "text-warning fill-warning" : "text-muted")} />
                    </div>
                  </TableCell>
                  <TableCell>{ev.reviewer}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor(ev.status)}>{statusLabel(ev.status)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{ev.strengths || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
