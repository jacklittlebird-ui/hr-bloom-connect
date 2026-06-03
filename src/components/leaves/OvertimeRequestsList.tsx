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
import { Textarea } from '@/components/ui/textarea';
import { Clock, CheckCircle, XCircle, PlusCircle, Trash2, Pencil } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { OvertimeRequest } from '@/types/leaves';
import { ExportButton } from './ExportButton';
import type { ExportColumn } from '@/lib/leavesExport';

interface OvertimeEditData {
  id: string;
  date: string;
  hours: number;
  overtimeType: OvertimeRequest['overtimeType'];
  status: OvertimeRequest['status'];
  reason: string;
}

interface OvertimeRequestsListProps {
  requests: OvertimeRequest[];
  onDelete?: (id: string) => void;
  onEdit?: (data: OvertimeEditData) => void;
}

export const OvertimeRequestsList = ({ requests, onDelete, onEdit }: OvertimeRequestsListProps) => {
  const { t, isRTL, language } = useLanguage();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editData, setEditData] = useState<OvertimeEditData | null>(null);
  const { paginatedItems, currentPage, totalPages, totalItems, startIndex, endIndex, setCurrentPage } = usePagination(requests);

  const getStatusBadge = (status: OvertimeRequest['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning"><Clock className="w-3 h-3 mr-1" />{t('leaves.status.pending')}</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-success/10 text-success border-success"><CheckCircle className="w-3 h-3 mr-1" />{t('leaves.status.approved')}</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive"><XCircle className="w-3 h-3 mr-1" />{t('leaves.status.rejected')}</Badge>;
    }
  };

  const getOvertimeTypeBadge = (type: OvertimeRequest['overtimeType']) => {
    const colors: Record<string, string> = {
      regular: 'bg-blue-100 text-blue-700 border-blue-300',
      holiday: 'bg-red-100 text-red-700 border-red-300',
      weekend: 'bg-green-100 text-green-700 border-green-300',
      eid_first_day: 'bg-amber-100 text-amber-700 border-amber-300',
    };
    return <Badge variant="outline" className={colors[type]}>{t(`leaves.overtimeTypes.${type}`)}</Badge>;
  };

  const openEdit = (r: OvertimeRequest) => {
    setEditData({
      id: r.id,
      date: r.date,
      hours: r.hours,
      overtimeType: r.overtimeType,
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
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5" />
              {t('leaves.overtime.listTitle')}
            </CardTitle>
            <ExportButton
              rows={requests}
              filenameBase="overtime"
              title={language === 'ar' ? 'تقرير العمل الإضافي' : 'Overtime Report'}
              columns={[
                { header: language === 'ar' ? 'كود الموظف' : 'Employee ID', accessor: (r) => r.employeeCode || '' },
                { header: language === 'ar' ? 'الموظف' : 'Employee', accessor: (r) => language === 'ar' ? r.employeeNameAr : r.employeeName },
                { header: language === 'ar' ? 'القسم' : 'Department', accessor: (r) => r.department },
                { header: language === 'ar' ? 'النوع' : 'Type', accessor: (r) => r.overtimeType },
                { header: language === 'ar' ? 'التاريخ' : 'Date', accessor: (r) => formatDate(r.date) },
                { header: language === 'ar' ? 'الساعات' : 'Hours', accessor: (r) => r.hours },
                { header: language === 'ar' ? 'السبب' : 'Reason', accessor: (r) => r.reason || '' },
                { header: language === 'ar' ? 'الحالة' : 'Status', accessor: (r) => r.status },
              ] as ExportColumn<OvertimeRequest>[]}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(isRTL && "text-right")}>{language === 'ar' ? 'كود الموظف' : 'Employee ID'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.list.employee')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.list.department')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{language === 'ar' ? 'المحطة' : 'Station'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.list.type')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.overtime.date')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.overtime.hours')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.overtime.reason')}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{t('leaves.list.status')}</TableHead>
                  {(onDelete || onEdit) && <TableHead className="w-24"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(onDelete || onEdit) ? 10 : 9} className="text-center text-muted-foreground py-8">
                      {t('leaves.overtime.noRequests')}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-mono text-xs">{request.employeeCode || '—'}</TableCell>
                      <TableCell className="font-medium">{language === 'ar' ? request.employeeNameAr : request.employeeName}</TableCell>
                      <TableCell>{request.department}</TableCell>
                      <TableCell>{request.station || '—'}</TableCell>
                      <TableCell>{getOvertimeTypeBadge(request.overtimeType)}</TableCell>
                      <TableCell>{formatDate(request.date)}</TableCell>
                      <TableCell>{request.hours} {t('leaveBalance.hours')}</TableCell>
                      <TableCell className="max-w-[300px] whitespace-normal break-words">{request.reason}</TableCell>
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
          <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setCurrentPage} />
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
            <DialogTitle>{language === 'ar' ? 'تعديل العمل الإضافي' : 'Edit Overtime'}</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                <Select value={editData.overtimeType} onValueChange={(v) => setEditData({ ...editData, overtimeType: v as OvertimeRequest['overtimeType'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">{language === 'ar' ? 'عادي' : 'Regular'}</SelectItem>
                    <SelectItem value="holiday">{language === 'ar' ? 'عطلة' : 'Holiday'}</SelectItem>
                    <SelectItem value="weekend">{language === 'ar' ? 'عطلة نهاية الأسبوع' : 'Weekend'}</SelectItem>
                    <SelectItem value="eid_first_day">{language === 'ar' ? 'أول يوم عيد' : 'Eid First Day'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
                <Input type="date" value={editData.date} onChange={(e) => setEditData({ ...editData, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الساعات' : 'Hours'}</Label>
                <Input type="number" step="0.5" min="0.5" value={editData.hours} onChange={(e) => setEditData({ ...editData, hours: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v as OvertimeRequest['status'] })}>
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
                <Textarea value={editData.reason} onChange={(e) => setEditData({ ...editData, reason: e.target.value })} rows={3} />
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
