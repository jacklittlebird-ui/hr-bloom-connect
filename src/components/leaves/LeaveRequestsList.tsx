import { useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Clock, CheckCircle, XCircle, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeaveRequest } from '@/types/leaves';

interface LeaveEditData {
  id: string;
  leaveType: LeaveRequest['leaveType'];
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveRequest['status'];
  reason: string;
}

interface LeaveRequestsListProps {
  requests: LeaveRequest[];
  onDelete?: (id: string) => void;
  onEdit?: (data: LeaveEditData) => void;
}

export const LeaveRequestsList = ({ requests, onDelete, onEdit }: LeaveRequestsListProps) => {
  const { t, isRTL, language } = useLanguage();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editData, setEditData] = useState<LeaveEditData | null>(null);
  const { paginatedItems, currentPage, totalPages, totalItems, startIndex, endIndex, setCurrentPage } = usePagination(requests);

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

  const openEdit = (r: LeaveRequest) => {
    setEditData({
      id: r.id,
      leaveType: r.leaveType,
      startDate: r.startDate,
      endDate: r.endDate,
      days: r.days,
      status: r.status,
      reason: r.reason,
    });
  };

  const handleSaveEdit = () => {
    if (editData && onEdit) {
      onEdit(editData);
      setEditData(null);
    }
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
                  {(onDelete || onEdit) && <TableHead className="w-24"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(onDelete || onEdit) ? 8 : 7} className="text-center text-muted-foreground py-8">
                      {t('leaves.list.noRequests')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{language === 'ar' ? request.employeeNameAr : request.employeeName}</TableCell>
                      <TableCell>{request.department}</TableCell>
                      <TableCell>{getLeaveTypeBadge(request.leaveType)}</TableCell>
                      <TableCell>{request.startDate}</TableCell>
                      <TableCell>{request.endDate}</TableCell>
                      <TableCell>{request.days}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      {(onDelete || onEdit) && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {onEdit && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary" onClick={() => openEdit(request)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {onDelete && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(request.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
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

      {/* Delete Dialog */}
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

      {/* Edit Dialog */}
      <Dialog open={!!editData} onOpenChange={(open) => !open && setEditData(null)}>
        <DialogContent className="sm:max-w-[480px]" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{language === 'ar' ? 'تعديل الإجازة' : 'Edit Leave'}</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                <Select value={editData.leaveType} onValueChange={(v) => setEditData({ ...editData, leaveType: v as LeaveRequest['leaveType'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">{language === 'ar' ? 'سنوية' : 'Annual'}</SelectItem>
                    <SelectItem value="sick">{language === 'ar' ? 'مرضية' : 'Sick'}</SelectItem>
                    <SelectItem value="casual">{language === 'ar' ? 'عارضة' : 'Casual'}</SelectItem>
                    <SelectItem value="unpaid">{language === 'ar' ? 'بدون راتب' : 'Unpaid'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'من تاريخ' : 'Start Date'}</Label>
                  <Input type="date" value={editData.startDate} onChange={(e) => setEditData({ ...editData, startDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'إلى تاريخ' : 'End Date'}</Label>
                  <Input type="date" value={editData.endDate} onChange={(e) => setEditData({ ...editData, endDate: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'عدد الأيام' : 'Days'}</Label>
                <Input type="number" step="0.5" min="0.5" value={editData.days} onChange={(e) => setEditData({ ...editData, days: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v as LeaveRequest['status'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                    <SelectItem value="approved">{language === 'ar' ? 'معتمد' : 'Approved'}</SelectItem>
                    <SelectItem value="rejected">{language === 'ar' ? 'مرفوض' : 'Rejected'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'السبب' : 'Reason'}</Label>
                <Input value={editData.reason} onChange={(e) => setEditData({ ...editData, reason: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditData(null)}>{language === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSaveEdit}>{language === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
