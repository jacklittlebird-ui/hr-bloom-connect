import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, XCircle, Clock, Edit, Ban } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ViolationRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNameAr: string;
  department: string;
  station: string;
  date: string;
  type: string;
  description: string;
  penalty: string;
  status: string;
  createdAt: string;
}

const violationTypes: Record<string, { ar: string; en: string }> = {
  absence: { ar: 'غياب بدون إذن', en: 'Unauthorized Absence' },
  late: { ar: 'تأخر متكرر', en: 'Repeated Tardiness' },
  conduct: { ar: 'سلوك غير لائق', en: 'Misconduct' },
  safety: { ar: 'مخالفة سلامة', en: 'Safety Violation' },
  other: { ar: 'أخرى', en: 'Other' },
};

interface Props {
  searchQuery: string;
  selectedDepartment: string;
  selectedStation: string;
}

export const ViolationsManagement = ({ searchQuery, selectedDepartment, selectedStation }: Props) => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [editDialog, setEditDialog] = useState<ViolationRecord | null>(null);
  const [editPenalty, setEditPenalty] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchViolations = useCallback(async () => {
    const { data: employees } = await supabase.from('employees').select('id, name_en, name_ar, department_id, station_id');
    const { data: depts } = await supabase.from('departments').select('id, name_ar, name_en');
    const { data: stations } = await supabase.from('stations').select('id, name_ar, name_en');
    const { data: viols } = await supabase.from('violations').select('*').order('created_at', { ascending: false });

    const empMap = new Map(employees?.map(e => [e.id, e]) || []);
    const deptMap = new Map(depts?.map(d => [d.id, d]) || []);
    const stMap = new Map(stations?.map(s => [s.id, s]) || []);

    setViolations((viols || []).map(v => {
      const emp = empMap.get(v.employee_id);
      const dept = emp?.department_id ? deptMap.get(emp.department_id) : null;
      const st = emp?.station_id ? stMap.get(emp.station_id) : null;
      return {
        id: v.id,
        employeeId: v.employee_id,
        employeeName: emp?.name_en || '',
        employeeNameAr: emp?.name_ar || '',
        department: dept ? (ar ? dept.name_ar : dept.name_en) : '',
        station: st ? (ar ? st.name_ar : st.name_en) : '',
        date: v.date,
        type: v.type,
        description: v.description || '',
        penalty: v.penalty || '',
        status: v.status,
        createdAt: v.created_at,
      };
    }));
  }, [ar]);

  useEffect(() => { fetchViolations(); }, [fetchViolations]);

  const filtered = violations.filter(v => {
    const matchSearch = !searchQuery ||
      v.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.employeeNameAr.includes(searchQuery);
    const matchStatus = filterStatus === 'all' || v.status === filterStatus;
    // dept/station filtering would need empDeptMap but we have it inline
    return matchSearch && matchStatus;
  });

  const pendingCount = violations.filter(v => v.status === 'pending').length;

  const handleApprove = async (id: string) => {
    await supabase.from('violations').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id);
    toast({ title: ar ? 'تمت الموافقة على المخالفة' : 'Violation approved' });
    fetchViolations();
  };

  const handleReject = async (id: string) => {
    await supabase.from('violations').update({ status: 'rejected' }).eq('id', id);
    toast({ title: ar ? 'تم رفض المخالفة' : 'Violation rejected' });
    setShowRejectDialog(null);
    setRejectReason('');
    fetchViolations();
  };

  const handleEdit = (v: ViolationRecord) => {
    setEditDialog(v);
    setEditPenalty(v.penalty);
    setEditDescription(v.description);
  };

  const handleSaveEdit = async () => {
    if (!editDialog) return;
    await supabase.from('violations').update({ penalty: editPenalty, description: editDescription }).eq('id', editDialog.id);
    toast({ title: ar ? 'تم التعديل' : 'Updated' });
    setEditDialog(null);
    fetchViolations();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning"><Clock className="w-3 h-3 mr-1" />{ar ? 'بانتظار الموافقة' : 'Pending'}</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive"><CheckCircle className="w-3 h-3 mr-1" />{ar ? 'نشطة' : 'Active'}</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-muted text-muted-foreground"><XCircle className="w-3 h-3 mr-1" />{ar ? 'مرفوضة' : 'Rejected'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-warning font-medium">{ar ? 'بانتظار الموافقة' : 'Pending Approval'}</p>
            <p className="text-3xl font-bold text-warning">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground font-medium">{ar ? 'إجمالي المخالفات' : 'Total Violations'}</p>
            <p className="text-3xl font-bold text-foreground">{violations.length}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-destructive font-medium">{ar ? 'نشطة' : 'Active'}</p>
            <p className="text-3xl font-bold text-destructive">{violations.filter(v => v.status === 'approved').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground font-medium">{ar ? 'مرفوضة' : 'Rejected'}</p>
            <p className="text-3xl font-bold text-foreground">{violations.filter(v => v.status === 'rejected').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
            <SelectItem value="pending">{ar ? 'بانتظار الموافقة' : 'Pending'}</SelectItem>
            <SelectItem value="approved">{ar ? 'نشطة' : 'Active'}</SelectItem>
            <SelectItem value="rejected">{ar ? 'مرفوضة' : 'Rejected'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {ar ? 'سجل المخالفات' : 'Violations Record'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الموظف' : 'Employee'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'القسم' : 'Department'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المحطة' : 'Station'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'النوع' : 'Type'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الوصف' : 'Description'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'العقوبة' : 'Penalty'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="w-32">{ar ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <Ban className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      {ar ? 'لا توجد مخالفات' : 'No violations'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(v => {
                    const typeLabel = violationTypes[v.type];
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{ar ? v.employeeNameAr : v.employeeName}</TableCell>
                        <TableCell>{v.department}</TableCell>
                        <TableCell>{v.station}</TableCell>
                        <TableCell>{v.date}</TableCell>
                        <TableCell>{typeLabel ? (ar ? typeLabel.ar : typeLabel.en) : v.type}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{v.description}</TableCell>
                        <TableCell>{v.penalty}</TableCell>
                        <TableCell>{getStatusBadge(v.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {v.status === 'pending' && (
                              <>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-success" onClick={() => handleApprove(v.id)} title={ar ? 'موافقة' : 'Approve'}>
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => setShowRejectDialog(v.id)} title={ar ? 'رفض' : 'Reject'}>
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(v)} title={ar ? 'تعديل' : 'Edit'}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ar ? 'تعديل المخالفة' : 'Edit Violation'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{ar ? 'الوصف' : 'Description'}</Label>
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{ar ? 'العقوبة' : 'Penalty'}</Label>
              <Input value={editPenalty} onChange={e => setEditPenalty(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(null)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSaveEdit}>{ar ? 'حفظ' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!showRejectDialog} onOpenChange={() => setShowRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ar ? 'رفض المخالفة' : 'Reject Violation'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{ar ? 'سبب الرفض (اختياري)' : 'Rejection Reason (optional)'}</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(null)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={() => showRejectDialog && handleReject(showRejectDialog)}>{ar ? 'رفض' : 'Reject'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
