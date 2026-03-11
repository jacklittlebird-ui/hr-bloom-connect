import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileText, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeaveRequest } from '@/types/leaves';

interface LeaveRequestsListProps {
  requests: LeaveRequest[];
  onDelete?: (id: string) => void;
}

export const LeaveRequestsList = ({ requests, onDelete }: LeaveRequestsListProps) => {
  const { t, isRTL, language } = useLanguage();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning"><Clock className="w-3 h-3 mr-1" />{t('leaves.status.pending')}</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success"><CheckCircle className="w-3 h-3 mr-1" />{t('leaves.status.approved')}</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive"><XCircle className="w-3 h-3 mr-1" />{t('leaves.status.rejected')}</Badge>;
    }
  };

  const getLeaveTypeBadge = (type: LeaveRequest['leaveType']) => {
    const colors: Record<string, string> = {
      annual: 'bg-blue-100 text-blue-700 border-blue-300',
      sick: 'bg-red-100 text-red-700 border-red-300',
      casual: 'bg-green-100 text-green-700 border-green-300',
      unpaid: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return <Badge variant="outline" className={colors[type]}>{t(`leaves.types.${type}`)}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('leaves.list.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.list.employee')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.list.department')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.list.type')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.list.startDate')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.list.endDate')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.list.days')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.list.status')}</TableHead>
                  {onDelete && <TableHead className="w-12"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={onDelete ? 8 : 7} className="text-center text-muted-foreground py-8">
                      {t('leaves.list.noRequests')}
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{language === 'ar' ? request.employeeNameAr : request.employeeName}</TableCell>
                      <TableCell>{request.department}</TableCell>
                      <TableCell>{getLeaveTypeBadge(request.leaveType)}</TableCell>
                      <TableCell>{request.startDate}</TableCell>
                      <TableCell>{request.endDate}</TableCell>
                      <TableCell>{request.days}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      {onDelete && (
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(request.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>{language === 'ar' ? 'هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this request? This action cannot be undone.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'ar' ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId && onDelete) { onDelete(deleteId); setDeleteId(null); } }}>
              {language === 'ar' ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
