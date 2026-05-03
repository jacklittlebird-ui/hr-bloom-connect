import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ClipboardList, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface EmployeeRequestItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNameAr: string;
  employeeCode: string;
  typeAr: string;
  typeEn: string;
  reason: string | null;
  date: string;
  status: string;
}

interface Props {
  requests: EmployeeRequestItem[];
  onRefresh: () => void;
}

export const EmployeeRequestsList = ({ requests, onRefresh }: Props) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = async (id: string) => {
    await supabase.from('employee_requests').update({ status: 'approved' } as any).eq('id', id);
    toast.success(ar ? 'تمت الموافقة على الطلب' : 'Request approved');
    onRefresh();
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    await supabase.from('employee_requests').update({ status: 'rejected', admin_notes: rejectReason } as any).eq('id', rejectDialog);
    toast.success(ar ? 'تم رفض الطلب' : 'Request rejected');
    setRejectDialog(null);
    setRejectReason('');
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('employee_requests').delete().eq('id', id);
    toast.success(ar ? 'تم حذف الطلب' : 'Request deleted');
    onRefresh();
  };

  const statusCls: Record<string, string> = {
    approved: 'bg-success/10 text-success border-success',
    pending: 'bg-warning/10 text-warning border-warning',
    rejected: 'bg-destructive/10 text-destructive border-destructive',
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            {ar ? 'طلبات الموظفين' : 'Employee Requests'}
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="mr-2">{requests.filter(r => r.status === 'pending').length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ar ? 'الموظف' : 'Employee'}</TableHead>
                <TableHead>{ar ? 'الكود' : 'Code'}</TableHead>
                <TableHead>{ar ? 'النوع' : 'Type'}</TableHead>
                <TableHead>{ar ? 'السبب' : 'Reason'}</TableHead>
                <TableHead>{ar ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                <TableHead>{ar ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{ar ? r.employeeNameAr : r.employeeName}</TableCell>
                  <TableCell>{r.employeeCode}</TableCell>
                  <TableCell>{ar ? r.typeAr : r.typeEn}</TableCell>
                  <TableCell className="max-w-[300px] whitespace-normal break-words">{r.reason || '-'}</TableCell>
                  <TableCell>{formatDate(r.date)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusCls[r.status]}>
                      {r.status === 'approved' ? (ar ? 'مقبول' : 'Approved') : r.status === 'pending' ? (ar ? 'معلق' : 'Pending') : (ar ? 'مرفوض' : 'Rejected')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {r.status === 'pending' && (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:text-success" onClick={() => handleApprove(r.id)}>
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setRejectDialog(r.id)}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {ar ? 'لا توجد طلبات' : 'No requests'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!rejectDialog} onOpenChange={() => { setRejectDialog(null); setRejectReason(''); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>{ar ? 'سبب الرفض' : 'Rejection Reason'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>{ar ? 'الملاحظات' : 'Notes'}</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={ar ? 'اكتب سبب الرفض...' : 'Enter rejection reason...'} rows={3} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectDialog(null); setRejectReason(''); }}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={handleReject}>{ar ? 'رفض' : 'Reject'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
