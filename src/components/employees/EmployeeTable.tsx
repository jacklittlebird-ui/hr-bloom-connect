import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Edit, Eye, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stationLocations } from '@/data/stationLocations';

interface EmployeeTableProps {
  employees: Employee[];
  onDelete?: (employeeId: string) => void;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

export const EmployeeTable = ({ employees, onDelete, currentPage = 1, pageSize = 30, onPageChange }: EmployeeTableProps) => {
  const { t, isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const totalPages = Math.max(1, Math.ceil(employees.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedEmployees = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return employees.slice(start, start + pageSize);
  }, [employees, safeCurrentPage, pageSize]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      active: { label: t('employees.status.active'), className: 'bg-success text-success-foreground hover:bg-success/90' },
      inactive: { label: t('employees.status.inactive'), className: 'text-warning border-warning' },
      suspended: { label: t('employees.status.suspended'), className: 'text-destructive border-destructive' },
      external_stations: { label: isRTL ? 'محطات خارجية' : 'External Stations', className: 'text-warning border-warning' },
      stopped: { label: isRTL ? 'موقوف' : 'Stopped', className: 'text-destructive border-destructive' },
      absent: { label: isRTL ? 'منقطع' : 'Absent', className: 'text-destructive border-destructive' },
      pending_hire: { label: isRTL ? 'تحت التعيين' : 'Pending Hire', className: 'text-warning border-warning' },
      resigned: { label: isRTL ? 'مستقيل' : 'Resigned', className: 'text-destructive border-destructive' },
      under_resignation: { label: isRTL ? 'تحت الاستقالة' : 'Under Resignation', className: 'text-warning border-warning' },
    };
    const s = statusMap[status] || { label: status, className: 'text-muted-foreground' };
    if (status === 'active') return <Badge className={s.className}>{s.label}</Badge>;
    return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card" dir={isRTL ? 'rtl' : 'ltr'}>
      <Table>
        <TableHeader>
          <TableRow className="bg-primary hover:bg-primary">
            <TableHead className={cn("text-primary-foreground font-semibold", isRTL && "text-right")}>
              {t('employees.table.photo')}
            </TableHead>
            <TableHead className={cn("text-primary-foreground font-semibold", isRTL && "text-right")}>
              {t('employees.table.employeeId')}
            </TableHead>
            <TableHead className={cn("text-primary-foreground font-semibold", isRTL && "text-right")}>
              {t('employees.table.name')}
            </TableHead>
            <TableHead className={cn("text-primary-foreground font-semibold", isRTL && "text-right")}>
              {language === 'ar' ? 'المحطة/الموقع' : 'Station/Location'}
            </TableHead>
            <TableHead className={cn("text-primary-foreground font-semibold", isRTL && "text-right")}>
              {t('employees.table.department')}
            </TableHead>
            <TableHead className={cn("text-primary-foreground font-semibold", isRTL && "text-right")}>
              {t('employees.table.jobTitle')}
            </TableHead>
            <TableHead className={cn("text-primary-foreground font-semibold", isRTL && "text-right")}>
              {t('employees.table.phone')}
            </TableHead>
            <TableHead className={cn("text-primary-foreground font-semibold", isRTL && "text-right")}>
              {t('employees.table.status')}
            </TableHead>
            <TableHead className={cn("text-primary-foreground font-semibold", isRTL && "text-right")}>
              {t('employees.table.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedEmployees.map((employee) => (
            <TableRow key={employee.id} className="hover:bg-muted/50">
              <TableCell>
                <Avatar className="w-16 h-16">
                  <AvatarImage src={employee.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(language === 'ar' ? employee.nameAr : employee.nameEn)}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className={cn("font-medium", isRTL && "text-right")}>
                {employee.employeeId}
              </TableCell>
              <TableCell className={cn(isRTL && "text-right")}>
                {language === 'ar' ? employee.nameAr : employee.nameEn}
              </TableCell>
              <TableCell className={cn(isRTL && "text-right")}>
                {(() => {
                  const st = stationLocations.find(s => s.value === employee.stationLocation);
                  return st ? (language === 'ar' ? st.labelAr : st.labelEn) : (employee.stationLocation || '-');
                })()}
              </TableCell>
              <TableCell className={cn(isRTL && "text-right")}>
                {employee.department}
              </TableCell>
              <TableCell className={cn(isRTL && "text-right")}>
                {employee.jobTitle}
              </TableCell>
              <TableCell className={cn(isRTL && "text-right")} dir="ltr">
                {employee.phone ? (
                  employee.phone
                ) : (
                  <span className="flex items-center gap-1 text-warning">
                    <AlertTriangle className="w-4 h-4" />
                    {t('employees.status.undefined')}
                  </span>
                )}
              </TableCell>
              <TableCell className={cn(isRTL && "text-right")}>
                {getStatusBadge(employee.status)}
              </TableCell>
              <TableCell>
                <div className={cn("flex gap-1", isRTL && "flex-row-reverse justify-end")}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(employee)}
                    title={language === 'ar' ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={() => navigate(`/employees/${employee.id}`)}
                    title={language === 'ar' ? 'تعديل' : 'Edit'}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate(`/employees/${employee.id}/view`)}
                    title={language === 'ar' ? 'عرض' : 'View'}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={cn("flex items-center justify-between px-4 py-3 border-t", isRTL && "flex-row-reverse")}>
          <span className="text-sm text-muted-foreground">
            {language === 'ar'
              ? `عرض ${((safeCurrentPage - 1) * pageSize) + 1} - ${Math.min(safeCurrentPage * pageSize, employees.length)} من ${employees.length}`
              : `Showing ${((safeCurrentPage - 1) * pageSize) + 1} - ${Math.min(safeCurrentPage * pageSize, employees.length)} of ${employees.length}`}
          </span>
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage <= 1}
              onClick={() => onPageChange?.(safeCurrentPage - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
              .reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                typeof p === 'string' ? (
                  <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={p}
                    variant={p === safeCurrentPage ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-[32px]"
                    onClick={() => onPageChange?.(p)}
                  >
                    {p}
                  </Button>
                )
              )}
            <Button
              variant="outline"
              size="sm"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => onPageChange?.(safeCurrentPage + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'ar' ? 'تأكيد حذف الموظف' : 'Confirm Employee Deletion'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'ar'
                ? `هل أنت متأكد من حذف الموظف "${deleteTarget?.nameAr}"؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete "${deleteTarget?.nameEn}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget && onDelete) {
                  onDelete(deleteTarget.id);
                }
                setDeleteTarget(null);
              }}
            >
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
