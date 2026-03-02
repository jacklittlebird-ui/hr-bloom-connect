import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalData } from '@/contexts/PortalDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ClipboardList, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

export const PortalRequests = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { getRequests, addRequest } = usePortalData();
  const requests = useMemo(() => getRequests(PORTAL_EMPLOYEE_ID), [getRequests]);
  const [showDialog, setShowDialog] = useState(false);
  const [reqType, setReqType] = useState('');
  const [reason, setReason] = useState('');

  const reqTypes = [
    { value: 'salary', ar: 'مفردات مرتب', en: 'Salary Statement' },
    { value: 'data_update', ar: 'طلب تعديل بيانات', en: 'Data Update Request' },
  ];

  const statusCls: Record<string, string> = {
    approved: 'bg-success/10 text-success border-success',
    pending: 'bg-warning/10 text-warning border-warning',
    rejected: 'bg-destructive/10 text-destructive border-destructive',
  };

  const handleSubmit = () => {
    if (!reqType) { toast.error(ar ? 'يرجى اختيار نوع الطلب' : 'Please select request type'); return; }
    if (!reason.trim()) { toast.error(ar ? 'يرجى كتابة السبب' : 'Please enter a reason'); return; }
    const t = reqTypes.find(r => r.value === reqType);
    addRequest({ employeeId: PORTAL_EMPLOYEE_ID, typeAr: t?.ar || '', typeEn: t?.en || '', date: new Date().toISOString().split('T')[0] });
    toast.success(ar ? 'تم تقديم الطلب بنجاح' : 'Request submitted');
    setShowDialog(false); setReqType(''); setReason('');
  };

  return (
    <div className="space-y-6">
      <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3", isRTL && "sm:flex-row-reverse")}>
        <h1 className="text-xl md:text-2xl font-bold">{ar ? 'الطلبات' : 'Requests'}</h1>
        <Button onClick={() => setShowDialog(true)} size="sm"><Plus className="w-4 h-4 me-1" />{ar ? 'طلب جديد' : 'New Request'}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}><ClipboardList className="w-5 h-5" />{ar ? 'جميع الطلبات' : 'All Requests'}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead className={cn(isRTL && "text-right")}>{ar ? 'النوع' : 'Type'}</TableHead>
              <TableHead className={cn(isRTL && "text-right")}>{ar ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الحالة' : 'Status'}</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {requests.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{ar ? r.typeAr : r.typeEn}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusCls[r.status]}>
                      {r.status === 'approved' ? (ar ? 'مقبول' : 'Approved') : r.status === 'pending' ? (ar ? 'معلق' : 'Pending') : (ar ? 'مرفوض' : 'Rejected')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">{ar ? 'لا توجد طلبات' : 'No requests'}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{ar ? 'طلب جديد' : 'New Request'}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>{ar ? 'نوع الطلب' : 'Request Type'} <span className="text-destructive">*</span></Label>
              <Select value={reqType} onValueChange={setReqType}>
                <SelectTrigger><SelectValue placeholder={ar ? 'اختر نوع الطلب' : 'Select type'} /></SelectTrigger>
                <SelectContent>{reqTypes.map(t => <SelectItem key={t.value} value={t.value}>{ar ? t.ar : t.en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{ar ? 'السبب / التفاصيل' : 'Reason / Details'} <span className="text-destructive">*</span></Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={ar ? 'اكتب سبب الطلب أو التفاصيل المطلوبة...' : 'Enter the reason or required details...'}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowDialog(false); setReqType(''); setReason(''); }}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSubmit}>{ar ? 'تقديم الطلب' : 'Submit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
