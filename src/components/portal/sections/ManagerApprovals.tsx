import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Search, Calendar, Clock, RefreshCw, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Employee {
  id: string;
  nameAr: string;
  nameEn: string;
  employeeId: string;
  department: string;
}

interface ManagerApprovalsProps {
  stationEmployees: Employee[];
}

const leaveTypeLabels: Record<string, { ar: string; en: string }> = {
  annual: { ar: 'سنوية', en: 'Annual' },
  sick: { ar: 'مرضية', en: 'Sick' },
  casual: { ar: 'عارضة', en: 'Casual' },
  unpaid: { ar: 'بدون راتب', en: 'Unpaid' },
};

const permissionTypeLabels: Record<string, { ar: string; en: string }> = {
  late: { ar: 'تأخير', en: 'Late Arrival' },
  early: { ar: 'انصراف مبكر', en: 'Early Leave' },
  midday: { ar: 'منتصف اليوم', en: 'Midday' },
};

const overtimeTypeLabels: Record<string, { ar: string; en: string }> = {
  regular: { ar: 'عمل إضافي', en: 'Regular Overtime' },
  holiday: { ar: 'عمل في إجازة', en: 'Holiday Work' },
};

const missionTypeLabels: Record<string, { ar: string; en: string }> = {
  morning: { ar: 'صباحية', en: 'Morning' },
  evening: { ar: 'مسائية', en: 'Evening' },
  full_day: { ar: 'يوم كامل', en: 'Full Day' },
};

export const ManagerApprovals = ({ stationEmployees }: ManagerApprovalsProps) => {
  const { language, isRTL } = useLanguage();
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const ar = language === 'ar';

  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [permissionRequests, setPermissionRequests] = useState<any[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<any[]>([]);
  const [missionRequests, setMissionRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');

  // Rejection dialog
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectType, setRejectType] = useState<'leave' | 'permission' | 'overtime' | 'mission'>('leave');
  const [rejectId, setRejectId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const empIds = useMemo(() => stationEmployees.map(e => e.id), [stationEmployees]);
  const empMap = useMemo(() => {
    const map = new Map<string, Employee>();
    stationEmployees.forEach(e => map.set(e.id, e));
    return map;
  }, [stationEmployees]);

  const fetchAll = useCallback(async () => {
    if (empIds.length === 0) return;
    setLoading(true);
    const [leaves, permissions, overtime, missions] = await Promise.all([
      supabase.from('leave_requests').select('*').in('employee_id', empIds).order('created_at', { ascending: false }),
      supabase.from('permission_requests').select('*').in('employee_id', empIds).order('created_at', { ascending: false }),
      supabase.from('overtime_requests').select('*').in('employee_id', empIds).order('created_at', { ascending: false }),
      supabase.from('missions').select('*').in('employee_id', empIds).order('created_at', { ascending: false }),
    ]);
    setLeaveRequests(leaves.data || []);
    setPermissionRequests(permissions.data || []);
    setOvertimeRequests(overtime.data || []);
    setMissionRequests(missions.data || []);
    setLoading(false);
  }, [empIds]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApprove = async (type: 'leave' | 'permission' | 'overtime' | 'mission', id: string) => {
    const table = type === 'leave' ? 'leave_requests' : type === 'permission' ? 'permission_requests' : type === 'mission' ? 'missions' : 'overtime_requests';
    const { error } = await supabase.from(table).update({ status: 'approved' }).eq('id', id);
    if (error) {
      toast({ title: t('حدث خطأ', 'Error occurred'), variant: 'destructive' });
    } else {
      toast({ title: t('تمت الموافقة', 'Approved') });
      await fetchAll();
    }
  };

  const openReject = (type: 'leave' | 'permission' | 'overtime' | 'mission', id: string) => {
    setRejectType(type);
    setRejectId(id);
    setRejectReason('');
    setRejectDialog(true);
  };

  const handleReject = async () => {
    const table = rejectType === 'leave' ? 'leave_requests' : rejectType === 'permission' ? 'permission_requests' : rejectType === 'mission' ? 'missions' : 'overtime_requests';
    const updateData: any = { status: 'rejected' };
    if (rejectType === 'leave') updateData.rejection_reason = rejectReason;
    const { error } = await supabase.from(table).update(updateData).eq('id', rejectId);
    if (error) {
      toast({ title: t('حدث خطأ', 'Error occurred'), variant: 'destructive' });
    } else {
      toast({ title: t('تم الرفض', 'Rejected') });
      setRejectDialog(false);
      await fetchAll();
    }
  };

  const filterByStatus = (list: any[]) => {
    let filtered = statusFilter === 'all' ? list : list.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(r => {
        const emp = empMap.get(r.employee_id);
        return emp && (emp.nameAr.toLowerCase().includes(q) || emp.nameEn.toLowerCase().includes(q) || emp.employeeId.toLowerCase().includes(q));
      });
    }
    return filtered;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-[hsl(var(--stat-yellow))]/10 text-[hsl(var(--stat-yellow))] border-[hsl(var(--stat-yellow))]/30">{t('معلق', 'Pending')}</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-[hsl(var(--stat-green))]/10 text-[hsl(var(--stat-green))] border-[hsl(var(--stat-green))]/30">{t('موافق', 'Approved')}</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">{t('مرفوض', 'Rejected')}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCounts = useMemo(() => ({
    leaves: leaveRequests.filter(r => r.status === 'pending').length,
    permissions: permissionRequests.filter(r => r.status === 'pending').length,
    overtime: overtimeRequests.filter(r => r.status === 'pending').length,
    missions: missionRequests.filter(r => r.status === 'pending').length,
  }), [leaveRequests, permissionRequests, overtimeRequests, missionRequests]);

  const filteredLeaves = filterByStatus(leaveRequests);
  const filteredPermissions = filterByStatus(permissionRequests);
  const filteredOvertime = filterByStatus(overtimeRequests);
  const filteredMissions = filterByStatus(missionRequests);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-[hsl(var(--stat-blue))]/10 to-transparent border-[hsl(var(--stat-blue))]/20">
          <CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto mb-1 text-[hsl(var(--stat-blue))]" />
            <div className="text-2xl font-bold text-[hsl(var(--stat-blue))]">{pendingCounts.leaves}</div>
            <div className="text-xs text-muted-foreground">{t('إجازات معلقة', 'Pending Leaves')}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[hsl(var(--stat-yellow))]/10 to-transparent border-[hsl(var(--stat-yellow))]/20">
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-1 text-[hsl(var(--stat-yellow))]" />
            <div className="text-2xl font-bold text-[hsl(var(--stat-yellow))]">{pendingCounts.permissions}</div>
            <div className="text-xs text-muted-foreground">{t('أذونات معلقة', 'Pending Permissions')}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[hsl(var(--stat-green))]/10 to-transparent border-[hsl(var(--stat-green))]/20">
          <CardContent className="p-4 text-center">
            <RefreshCw className="h-6 w-6 mx-auto mb-1 text-[hsl(var(--stat-green))]" />
            <div className="text-2xl font-bold text-[hsl(var(--stat-green))]">{pendingCounts.overtime}</div>
            <div className="text-xs text-muted-foreground">{t('إضافي معلق', 'Pending Overtime')}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardContent className="p-4 text-center">
            <MapPin className="h-6 w-6 mx-auto mb-1 text-purple-500" />
            <div className="text-2xl font-bold text-purple-500">{pendingCounts.missions}</div>
            <div className="text-xs text-muted-foreground">{t('مأموريات معلقة', 'Pending Missions')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('بحث بالاسم...', 'Search by name...')} value={search} onChange={e => setSearch(e.target.value)} className="ps-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">{t('معلق', 'Pending')}</SelectItem>
            <SelectItem value="approved">{t('موافق', 'Approved')}</SelectItem>
            <SelectItem value="rejected">{t('مرفوض', 'Rejected')}</SelectItem>
            <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 me-1", loading && "animate-spin")} />
          {t('تحديث', 'Refresh')}
        </Button>
      </div>

      {/* Inner tabs */}
      <Tabs defaultValue="leaves" dir={isRTL ? 'rtl' : 'ltr'}>
        <TabsList className="inline-grid grid-cols-4" dir="rtl">
          <TabsTrigger value="leaves" className="gap-1 text-xs md:text-sm">
            <Calendar className="h-3.5 w-3.5" />
            {t('الإجازات', 'Leaves')}
            {pendingCounts.leaves > 0 && <Badge variant="destructive" className="ms-1 h-5 min-w-5 text-[10px] px-1">{pendingCounts.leaves}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1 text-xs md:text-sm">
            <Clock className="h-3.5 w-3.5" />
            {t('الأذونات', 'Permissions')}
            {pendingCounts.permissions > 0 && <Badge variant="destructive" className="ms-1 h-5 min-w-5 text-[10px] px-1">{pendingCounts.permissions}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="overtime" className="gap-1 text-xs md:text-sm">
            <RefreshCw className="h-3.5 w-3.5" />
            {t('الإضافي', 'Overtime')}
            {pendingCounts.overtime > 0 && <Badge variant="destructive" className="ms-1 h-5 min-w-5 text-[10px] px-1">{pendingCounts.overtime}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="missions" className="gap-1 text-xs md:text-sm">
            <MapPin className="h-3.5 w-3.5" />
            {t('المأموريات', 'Missions')}
            {pendingCounts.missions > 0 && <Badge variant="destructive" className="ms-1 h-5 min-w-5 text-[10px] px-1">{pendingCounts.missions}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Leaves */}
        <TabsContent value="leaves">
          <Card>
            <CardHeader><CardTitle>{t('طلبات الإجازات', 'Leave Requests')}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{t('الموظف', 'Employee')}</TableHead>
                    <TableHead className="text-right">{t('النوع', 'Type')}</TableHead>
                    <TableHead className="text-right">{t('من', 'From')}</TableHead>
                    <TableHead className="text-right">{t('إلى', 'To')}</TableHead>
                    <TableHead className="text-right">{t('الأيام', 'Days')}</TableHead>
                    <TableHead className="text-right">{t('السبب', 'Reason')}</TableHead>
                    <TableHead className="text-right">{t('الحالة', 'Status')}</TableHead>
                    <TableHead className="text-right">{t('إجراء', 'Action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeaves.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">{t('لا توجد طلبات', 'No requests')}</TableCell></TableRow>
                  )}
                  {filteredLeaves.map(req => {
                    const emp = empMap.get(req.employee_id);
                    const typeLabel = leaveTypeLabels[req.leave_type];
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{ar ? emp?.nameAr : emp?.nameEn || '-'}</TableCell>
                        <TableCell>{typeLabel ? (ar ? typeLabel.ar : typeLabel.en) : req.leave_type}</TableCell>
                        <TableCell>{req.start_date}</TableCell>
                        <TableCell>{req.end_date}</TableCell>
                        <TableCell>{req.days}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{req.reason || '-'}</TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell>
                          {req.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[hsl(var(--stat-green))]" onClick={() => handleApprove('leave', req.id)}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => openReject('leave', req.id)}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader><CardTitle>{t('طلبات الأذونات', 'Permission Requests')}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{t('الموظف', 'Employee')}</TableHead>
                    <TableHead className="text-right">{t('النوع', 'Type')}</TableHead>
                    <TableHead className="text-right">{t('التاريخ', 'Date')}</TableHead>
                    <TableHead className="text-right">{t('من', 'From')}</TableHead>
                    <TableHead className="text-right">{t('إلى', 'To')}</TableHead>
                    <TableHead className="text-right">{t('الساعات', 'Hours')}</TableHead>
                    <TableHead className="text-right">{t('الحالة', 'Status')}</TableHead>
                    <TableHead className="text-right">{t('إجراء', 'Action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPermissions.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">{t('لا توجد طلبات', 'No requests')}</TableCell></TableRow>
                  )}
                  {filteredPermissions.map(req => {
                    const emp = empMap.get(req.employee_id);
                    const typeLabel = permissionTypeLabels[req.permission_type];
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{ar ? emp?.nameAr : emp?.nameEn || '-'}</TableCell>
                        <TableCell>{typeLabel ? (ar ? typeLabel.ar : typeLabel.en) : req.permission_type}</TableCell>
                        <TableCell>{req.date}</TableCell>
                        <TableCell>{req.start_time}</TableCell>
                        <TableCell>{req.end_time}</TableCell>
                        <TableCell>{req.hours}</TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell>
                          {req.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[hsl(var(--stat-green))]" onClick={() => handleApprove('permission', req.id)}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => openReject('permission', req.id)}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overtime */}
        <TabsContent value="overtime">
          <Card>
            <CardHeader><CardTitle>{t('طلبات العمل الإضافي', 'Overtime Requests')}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{t('الموظف', 'Employee')}</TableHead>
                    <TableHead className="text-right">{t('النوع', 'Type')}</TableHead>
                    <TableHead className="text-right">{t('التاريخ', 'Date')}</TableHead>
                    <TableHead className="text-right">{t('الساعات', 'Hours')}</TableHead>
                    <TableHead className="text-right">{t('السبب', 'Reason')}</TableHead>
                    <TableHead className="text-right">{t('الحالة', 'Status')}</TableHead>
                    <TableHead className="text-right">{t('إجراء', 'Action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOvertime.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t('لا توجد طلبات', 'No requests')}</TableCell></TableRow>
                  )}
                  {filteredOvertime.map(req => {
                    const emp = empMap.get(req.employee_id);
                    const typeLabel = overtimeTypeLabels[req.overtime_type];
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{ar ? emp?.nameAr : emp?.nameEn || '-'}</TableCell>
                        <TableCell>{typeLabel ? (ar ? typeLabel.ar : typeLabel.en) : req.overtime_type}</TableCell>
                        <TableCell>{req.date}</TableCell>
                        <TableCell>{req.hours}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{req.reason || '-'}</TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell>
                          {req.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[hsl(var(--stat-green))]" onClick={() => handleApprove('overtime', req.id)}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => openReject('overtime', req.id)}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Missions */}
        <TabsContent value="missions">
          <Card>
            <CardHeader><CardTitle>{t('طلبات المأموريات', 'Mission Requests')}</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{t('الموظف', 'Employee')}</TableHead>
                    <TableHead className="text-right">{t('النوع', 'Type')}</TableHead>
                    <TableHead className="text-right">{t('التاريخ', 'Date')}</TableHead>
                    <TableHead className="text-right">{t('الوجهة', 'Destination')}</TableHead>
                    <TableHead className="text-right">{t('السبب', 'Reason')}</TableHead>
                    <TableHead className="text-right">{t('الحالة', 'Status')}</TableHead>
                    <TableHead className="text-right">{t('إجراء', 'Action')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMissions.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t('لا توجد طلبات', 'No requests')}</TableCell></TableRow>
                  )}
                  {filteredMissions.map(req => {
                    const emp = empMap.get(req.employee_id);
                    const typeLabel = missionTypeLabels[req.mission_type];
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{ar ? emp?.nameAr : emp?.nameEn || '-'}</TableCell>
                        <TableCell>{typeLabel ? (ar ? typeLabel.ar : typeLabel.en) : req.mission_type}</TableCell>
                        <TableCell>{req.date}</TableCell>
                        <TableCell>{req.destination || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{req.reason || '-'}</TableCell>
                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                        <TableCell>
                          {req.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[hsl(var(--stat-green))]" onClick={() => handleApprove('mission', req.id)}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => openReject('mission', req.id)}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('سبب الرفض', 'Rejection Reason')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>{t('السبب (اختياري)', 'Reason (optional)')}</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder={t('أدخل سبب الرفض...', 'Enter rejection reason...')} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>{t('إلغاء', 'Cancel')}</Button>
            <Button variant="destructive" onClick={handleReject}>{t('تأكيد الرفض', 'Confirm Rejection')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
