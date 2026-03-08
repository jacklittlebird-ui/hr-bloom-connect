import { useState } from 'react';
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
import { Trash2, Edit, Eye, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stationLocations } from '@/data/stationLocations';

interface EmployeeTableProps {
  employees: Employee[];
  onDelete?: (employeeId: string) => void;
}

export const EmployeeTable = ({ employees, onDelete }: EmployeeTableProps) => {
  const { t, isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const getStatusBadge = (status: Employee['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-success text-success-foreground hover:bg-success/90">
            {t('employees.status.active')}
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="outline" className="text-warning border-warning">
            {t('employees.status.inactive')}
          </Badge>
        );
      case 'suspended':
        return (
          <Badge variant="outline" className="text-destructive border-destructive">
            {t('employees.status.suspended')}
          </Badge>
        );
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
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
          {employees.map((employee) => (
            <TableRow key={employee.id} className="hover:bg-muted/50">
              <TableCell>
                <Avatar className="w-10 h-10">
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
          <AlertDialogFooter className={cn(isRTL && "flex-row-reverse")}>
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
