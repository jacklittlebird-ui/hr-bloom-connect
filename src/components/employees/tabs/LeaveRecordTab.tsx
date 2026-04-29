import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { cn, formatDate } from '@/lib/utils';
import { CalendarDays, Clock, PlusCircle, Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface LeaveRecordTabProps {
  employee: Employee;
}

type SubTab = 'leaves' | 'permissions' | 'extraDays';
type RecordStatus = 'approved' | 'pending' | 'rejected';

interface LeaveRecord {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: RecordStatus;
}

interface PermissionRecord {
  id: string;
  permissionType: string;
  date: string;
  fromTime: string;
  toTime: string;
  durationHours: number;
  reason: string;
  status: RecordStatus;
}

interface OvertimeRecord {
  id: string;
  date: string;
  overtimeType?: string;
  reason: string;
  status: RecordStatus;
}

const statusConfig: Record<RecordStatus, { label: string; labelAr: string; bg: string; text: string; border: string }> = {
  approved: { label: 'Approved', labelAr: 'موافق عليه', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  pending: { label: 'Pending', labelAr: 'قيد المراجعة', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  rejected: { label: 'Rejected', labelAr: 'مرفوضة', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

const StatusBadge = ({ status }: { status: RecordStatus }) => {
  const { language } = useLanguage();
  const config = statusConfig[status];
  return (
    <span className={cn('px-3 py-1 rounded-md text-xs font-semibold border', config.bg, config.text, config.border)}>
      {language === 'ar' ? config.labelAr : config.label}
    </span>
  );
};

const StatusSummaryCards = ({ 
  approved, pending, rejected, 
  approvedLabel, pendingLabel, rejectedLabel 
}: { 
  approved: number; pending: number; rejected: number;
  approvedLabel: string; pendingLabel: string; rejectedLabel: string;
}) => {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4 text-center">
        <p className="text-sm font-medium text-yellow-700 mb-1">{pendingLabel}</p>
        <p className="text-3xl font-bold text-yellow-600">{pending}</p>
      </div>
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 text-center">
        <p className="text-sm font-medium text-green-700 mb-1">{approvedLabel}</p>
        <p className="text-3xl font-bold text-green-600">{approved}</p>
      </div>
      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm font-medium text-red-700 mb-1">{rejectedLabel}</p>
        <p className="text-3xl font-bold text-red-600">{rejected}</p>
      </div>
    </div>
  );
};

const leaveTypeLabels: Record<string, { en: string; ar: string }> = {
  annual: { en: 'Annual Leave', ar: 'إجازة سنوية' },
  sick: { en: 'Sick Leave', ar: 'إجازة مرضية' },
  casual: { en: 'Casual Leave', ar: 'إجازة عارضة' },
  unpaid: { en: 'Unpaid Leave', ar: 'إجازة بدون راتب' },
};

const permissionTypeLabels: Record<string, { en: string; ar: string }> = {
  early_leave: { en: 'Early Leave', ar: 'خروج مبكر' },
  late_arrival: { en: 'Late Arrival', ar: 'حضور متأخر' },
  personal: { en: 'Personal', ar: 'شخصي' },
  medical: { en: 'Medical', ar: 'طبي' },
};

const EID_FIRST_DAY_TYPES = new Set(['eid_first_day', 'eid_first_day_adha_fitr']);

const getAddedDays = (overtimeType?: string | null) => (
  EID_FIRST_DAY_TYPES.has(overtimeType || '') ? 2 : 1
);

// NOTE: leave_balances is now opening-balance only (manual yearly input).
// Used / added days are computed live from leave_requests, permission_requests,
// and overtime_requests — never written back to leave_balances.
const recalcLeaveBalances = async (_employeeId: string) => {
  // No-op: kept for backward compatibility with call sites.
  return;
};

export const LeaveRecordTab = ({ employee }: LeaveRecordTabProps) => {
  const { t, isRTL, language } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('leaves');
  const [loading, setLoading] = useState(true);
  const [employeeLeaves, setEmployeeLeaves] = useState<LeaveRecord[]>([]);
  const [employeePermissions, setEmployeePermissions] = useState<PermissionRecord[]>([]);
  const [employeeOvertime, setEmployeeOvertime] = useState<OvertimeRecord[]>([]);

  // Opening balance only (manual yearly input). Used values are IGNORED here.
  const [dbBalance, setDbBalance] = useState<{
    annualTotal: number;
    sickTotal: number;
    casualTotal: number;
    permissionsTotal: number;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const employeeUuid = employee.id;
    const currentYear = new Date().getFullYear();

    const [leavesRes, permsRes, overtimeRes, balanceRes] = await Promise.all([
      supabase.from('leave_requests').select('*').eq('employee_id', employeeUuid).order('created_at', { ascending: false }),
      supabase.from('permission_requests').select('*').eq('employee_id', employeeUuid).order('created_at', { ascending: false }),
      supabase.from('overtime_requests').select('*').eq('employee_id', employeeUuid).order('created_at', { ascending: false }),
      supabase.from('leave_balances').select('*').eq('employee_id', employeeUuid).eq('year', currentYear).maybeSingle(),
    ]);

    if (leavesRes.data) {
      setEmployeeLeaves(leavesRes.data.map(r => ({
        id: r.id, leaveType: r.leave_type, startDate: r.start_date, endDate: r.end_date,
        days: r.days, reason: r.reason || '', status: r.status as RecordStatus,
      })));
    }

    if (permsRes.data) {
      setEmployeePermissions(permsRes.data.map(r => ({
        id: r.id, permissionType: r.permission_type, date: r.date,
        fromTime: r.start_time, toTime: r.end_time, durationHours: r.hours || 0,
        reason: r.reason || '', status: r.status as RecordStatus,
      })));
    }

    if (overtimeRes.data) {
      setEmployeeOvertime(overtimeRes.data.map(r => ({
        id: r.id,
        date: r.date,
        overtimeType: r.overtime_type || 'regular',
        reason: r.reason || '',
        status: r.status as RecordStatus,
      })));
    }

    if (balanceRes.data) {
      setDbBalance({
        annualTotal: Number(balanceRes.data.annual_total ?? 21),
        sickTotal: Number(balanceRes.data.sick_total ?? 5),
        casualTotal: Number(balanceRes.data.casual_total ?? 2),
        permissionsTotal: Number(balanceRes.data.permissions_total ?? 12),
      });
    }

    setLoading(false);
  }, [employee.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentYear = new Date().getFullYear();

  // Live computations from actual records (leave_transactions equivalent).
  const annualUsedLive = useMemo(() =>
    employeeLeaves
      .filter(r => r.status === 'approved' && r.leaveType === 'annual' && new Date(r.startDate).getFullYear() === currentYear)
      .reduce((s, r) => s + Number(r.days || 0), 0),
    [employeeLeaves, currentYear]
  );
  const casualUsedLive = useMemo(() =>
    employeeLeaves
      .filter(r => r.status === 'approved' && r.leaveType === 'casual' && new Date(r.startDate).getFullYear() === currentYear)
      .reduce((s, r) => s + Number(r.days || 0), 0),
    [employeeLeaves, currentYear]
  );
  const permissionsUsedLive = useMemo(() =>
    employeePermissions
      .filter(r => r.status === 'approved' && new Date(r.date).getFullYear() === currentYear)
      .reduce((s, r) => s + Number(r.durationHours || 0), 0),
    [employeePermissions, currentYear]
  );
  const overtimeAddedLive = useMemo(() =>
    employeeOvertime
      .filter(r => r.status === 'approved' && new Date(r.date).getFullYear() === currentYear)
      .reduce((s, r) => s + getAddedDays(r.overtimeType), 0),
    [employeeOvertime, currentYear]
  );

  const leaveSummary = useMemo(() => {
    const annualTotal = dbBalance?.annualTotal ?? (employee.annualLeaveBalance || 21);
    const casualTotal = dbBalance?.casualTotal ?? 0;
    // Available = AnnualOpening + CasualOpening - AnnualUsed - CasualUsed + AddedDays
    const remaining = annualTotal + casualTotal - annualUsedLive - casualUsedLive + overtimeAddedLive;
    return {
      total: annualTotal + casualTotal,
      used: annualUsedLive + casualUsedLive,
      remaining,
      approvedCount: employeeLeaves.filter(r => r.status === 'approved').length,
      pendingCount: employeeLeaves.filter(r => r.status === 'pending').length,
      rejectedCount: employeeLeaves.filter(r => r.status === 'rejected').length,
    };
  }, [employeeLeaves, dbBalance, employee.annualLeaveBalance, annualUsedLive, casualUsedLive, overtimeAddedLive]);

  const permissionSummary = useMemo(() => {
    const permTotal = dbBalance?.permissionsTotal ?? 12;
    return {
      total: permTotal,
      used: permissionsUsedLive,
      remaining: permTotal - permissionsUsedLive,
      approvedCount: employeePermissions.filter(r => r.status === 'approved').length,
      pendingCount: employeePermissions.filter(r => r.status === 'pending').length,
      rejectedCount: employeePermissions.filter(r => r.status === 'rejected').length,
    };
  }, [employeePermissions, dbBalance, permissionsUsedLive]);

  const overtimeSummary = useMemo(() => {
    const currentYearOvertime = employeeOvertime.filter(r => new Date(r.date).getFullYear() === currentYear);
    const approved = currentYearOvertime.filter(r => r.status === 'approved');
    const approvedDays = approved.reduce((sum, r) => sum + getAddedDays(r.overtimeType), 0);
    return {
      totalDays: approvedDays,
      approvedCount: approvedDays,
      pendingCount: currentYearOvertime.filter(r => r.status === 'pending').reduce((sum, r) => sum + getAddedDays(r.overtimeType), 0),
      rejectedCount: currentYearOvertime.filter(r => r.status === 'rejected').reduce((sum, r) => sum + getAddedDays(r.overtimeType), 0),
    };
  }, [employeeOvertime, currentYear]);

  const subTabs = [
    { id: 'leaves' as SubTab, icon: CalendarDays, label: t('leaveRecord.leaves'), count: employeeLeaves.length },
    { id: 'permissions' as SubTab, icon: Clock, label: t('leaveRecord.permissions'), count: employeePermissions.length },
    { id: 'extraDays' as SubTab, icon: PlusCircle, label: t('leaveRecord.extraDays'), count: employeeOvertime.length },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative rounded-2xl overflow-hidden h-28"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #c4b5fd 100%)' }}>
          <div className={cn("absolute inset-0 p-5 flex flex-col justify-between", isRTL ? "text-right" : "text-left")}>
            <p className="text-white/90 text-sm font-medium">{t('leaveRecord.annualLeaveBalance')}</p>
            <div>
              <span className="text-4xl font-bold text-white">{leaveSummary.remaining}</span>
              <span className="text-white/80 text-sm mr-2 ml-2">{t('leaveRecord.dayAvailable')}</span>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden h-28"
          style={{ background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #f9a8d4 100%)' }}>
          <div className={cn("absolute inset-0 p-5 flex flex-col justify-between", isRTL ? "text-right" : "text-left")}>
            <p className="text-white/90 text-sm font-medium">{t('leaveRecord.permissionsBalance')}</p>
            <div>
              <span className="text-4xl font-bold text-white">{permissionSummary.remaining}</span>
              <span className="text-white/80 text-sm mr-2 ml-2">{t('leaveRecord.hourAvailable')}</span>
            </div>
          </div>
        </div>

        <div className="relative rounded-2xl overflow-hidden h-28"
          style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 50%, #67e8f9 100%)' }}>
          <div className={cn("absolute inset-0 p-5 flex flex-col justify-between", isRTL ? "text-right" : "text-left")}>
            <p className="text-white/90 text-sm font-medium">{t('leaveRecord.extraDaysLabel')}</p>
            <div>
              <span className="text-4xl font-bold text-white">{overtimeSummary.totalDays}</span>
              <span className="text-white/80 text-sm mr-2 ml-2">{language === 'ar' ? 'يوم' : 'days'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={cn("flex items-center gap-2 justify-end", !isRTL && "justify-start")}>
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all",
                isActive ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:bg-muted/50",
                isRTL && "flex-row-reverse"
              )}>
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={cn("min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-xs font-bold",
                isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {activeSubTab === 'leaves' && (
        <LeavesContent leaves={employeeLeaves} summary={leaveSummary} employeeId={employee.id} onRefresh={fetchData} />
      )}
      {activeSubTab === 'permissions' && (
        <PermissionsContent permissions={employeePermissions} summary={permissionSummary} employeeId={employee.id} onRefresh={fetchData} />
      )}
      {activeSubTab === 'extraDays' && (
        <OvertimeContent overtime={employeeOvertime} summary={overtimeSummary} employeeId={employee.id} onRefresh={fetchData} />
      )}
    </div>
  );
};

// ========== Leaves Sub-Tab ==========
const LeavesContent = ({ leaves, summary, employeeId, onRefresh }: { 
  leaves: LeaveRecord[];
  summary: { approvedCount: number; pendingCount: number; rejectedCount: number };
  employeeId: string;
  onRefresh: () => void;
}) => {
  const { t, isRTL, language } = useLanguage();
  const [editData, setEditData] = useState<LeaveRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    const { error } = await supabase.from('leave_requests').update({
      leave_type: editData.leaveType,
      start_date: editData.startDate,
      end_date: editData.endDate,
      days: editData.days,
      reason: editData.reason,
      status: editData.status,
    }).eq('id', editData.id);

    if (error) {
      toast.error(language === 'ar' ? 'فشل التعديل' : 'Update failed');
    } else {
      await recalcLeaveBalances(employeeId);
      toast.success(language === 'ar' ? 'تم التعديل بنجاح' : 'Updated successfully');
      setEditData(null);
      onRefresh();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <StatusSummaryCards
        approved={summary.approvedCount} pending={summary.pendingCount} rejected={summary.rejectedCount}
        approvedLabel={t('leaveRecord.approvedLeaves')} pendingLabel={t('leaveRecord.pendingLeaves')} rejectedLabel={t('leaveRecord.rejectedLeaves')}
      />
      <div className="rounded-xl overflow-hidden border border-border/30">
        <table className="w-full">
          <thead>
            <tr className="bg-purple-600 text-white">
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.leaveType')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.startDate')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.endDate')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.days')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.status')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.reason')}</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{language === 'ar' ? 'لا توجد إجازات مسجلة' : 'No leaves recorded'}</td></tr>
            ) : (
              leaves.map((record, idx) => {
                const typeLabel = leaveTypeLabels[record.leaveType];
                return (
                  <tr key={record.id} className={cn("border-b border-border/20", idx % 2 === 0 ? "bg-card" : "bg-muted/30")}>
                    <td className="px-4 py-3 text-sm text-foreground">{language === 'ar' ? typeLabel?.ar : typeLabel?.en}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{formatDate(record.startDate)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{formatDate(record.endDate)}</td>
                    <td className="px-4 py-3 text-sm text-foreground font-medium">{record.days}</td>
                    <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                    <td className="px-4 py-3 text-sm text-foreground">{record.reason}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setEditData({ ...record })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editData} onOpenChange={(o) => !o && setEditData(null)}>
        <DialogContent className="sm:max-w-[480px]" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle>{language === 'ar' ? 'تعديل الإجازة' : 'Edit Leave'}</DialogTitle></DialogHeader>
          {editData && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                <Select value={editData.leaveType} onValueChange={(v) => setEditData({ ...editData, leaveType: v })}>
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
                <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v as RecordStatus })}>
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
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'ar' ? 'حفظ' : 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ========== Permissions Sub-Tab ==========
const PermissionsContent = ({ permissions, summary, employeeId, onRefresh }: { 
  permissions: PermissionRecord[];
  summary: { approvedCount: number; pendingCount: number; rejectedCount: number };
  employeeId: string;
  onRefresh: () => void;
}) => {
  const { t, isRTL, language } = useLanguage();
  const [editData, setEditData] = useState<PermissionRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    const { error } = await supabase.from('permission_requests').update({
      permission_type: editData.permissionType,
      date: editData.date,
      start_time: editData.fromTime,
      end_time: editData.toTime,
      hours: editData.durationHours,
      reason: editData.reason,
      status: editData.status,
    }).eq('id', editData.id);

    if (error) {
      toast.error(language === 'ar' ? 'فشل التعديل' : 'Update failed');
    } else {
      await recalcLeaveBalances(employeeId);
      toast.success(language === 'ar' ? 'تم التعديل بنجاح' : 'Updated successfully');
      setEditData(null);
      onRefresh();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 flex items-center justify-end gap-3" dir="rtl">
          <span className="text-yellow-700 font-semibold text-sm">{t('leaveRecord.pendingLabel')}</span>
          <span className="text-2xl font-bold text-yellow-600">{summary.pendingCount}</span>
        </div>
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-center justify-end gap-3" dir="rtl">
          <span className="text-green-700 font-semibold text-sm">{t('leaveRecord.approvedLabel')}</span>
          <span className="text-2xl font-bold text-green-600">{summary.approvedCount}</span>
        </div>
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-center justify-end gap-3" dir="rtl">
          <span className="text-red-700 font-semibold text-sm">{t('leaveRecord.rejectedLabel')}</span>
          <span className="text-2xl font-bold text-red-600">{summary.rejectedCount}</span>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-border/30">
        <table className="w-full">
          <thead>
            <tr className="bg-purple-600 text-white">
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.permType')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.date')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.time')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.duration')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.status')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.reason')}</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {permissions.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{language === 'ar' ? 'لا توجد أذونات مسجلة' : 'No permissions recorded'}</td></tr>
            ) : (
              permissions.map((record, idx) => {
                const typeLabel = permissionTypeLabels[record.permissionType];
                return (
                  <tr key={record.id} className={cn("border-b border-border/20", idx % 2 === 0 ? "bg-card" : "bg-muted/30")}>
                    <td className="px-4 py-3 text-sm text-foreground">{language === 'ar' ? typeLabel?.ar : typeLabel?.en}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{formatDate(record.date)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{record.fromTime} - {record.toTime}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{record.durationHours} {language === 'ar' ? 'ساعة' : 'hrs'}</td>
                    <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                    <td className="px-4 py-3 text-sm text-foreground">{record.reason}</td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setEditData({ ...record })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editData} onOpenChange={(o) => !o && setEditData(null)}>
        <DialogContent className="sm:max-w-[480px]" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle>{language === 'ar' ? 'تعديل الإذن' : 'Edit Permission'}</DialogTitle></DialogHeader>
          {editData && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'النوع' : 'Type'}</Label>
                <Select value={editData.permissionType} onValueChange={(v) => setEditData({ ...editData, permissionType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="early_leave">{language === 'ar' ? 'خروج مبكر' : 'Early Leave'}</SelectItem>
                    <SelectItem value="late_arrival">{language === 'ar' ? 'حضور متأخر' : 'Late Arrival'}</SelectItem>
                    <SelectItem value="personal">{language === 'ar' ? 'شخصي' : 'Personal'}</SelectItem>
                    <SelectItem value="medical">{language === 'ar' ? 'طبي' : 'Medical'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
                <Input type="date" value={editData.date} onChange={(e) => setEditData({ ...editData, date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'من' : 'From'}</Label>
                  <Input type="time" value={editData.fromTime} onChange={(e) => setEditData({ ...editData, fromTime: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'إلى' : 'To'}</Label>
                  <Input type="time" value={editData.toTime} onChange={(e) => setEditData({ ...editData, toTime: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'عدد الساعات' : 'Hours'}</Label>
                <Input type="number" step="0.5" min="0" value={editData.durationHours} onChange={(e) => setEditData({ ...editData, durationHours: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v as RecordStatus })}>
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
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'ar' ? 'حفظ' : 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ========== Overtime/Additions Sub-Tab ==========
const OvertimeContent = ({ overtime, summary, employeeId, onRefresh }: { 
  overtime: OvertimeRecord[];
  summary: { totalDays: number; approvedCount: number; pendingCount: number; rejectedCount: number };
  employeeId: string;
  onRefresh: () => void;
}) => {
  const { t, isRTL, language } = useLanguage();
  const [editData, setEditData] = useState<OvertimeRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    const { error } = await supabase.from('overtime_requests').update({
      date: editData.date,
      reason: editData.reason,
      status: editData.status,
      hours: 1, // each extra day = 1 day, stored as 1
    }).eq('id', editData.id);

    if (error) {
      toast.error(language === 'ar' ? 'فشل التعديل' : 'Update failed');
    } else {
      toast.success(language === 'ar' ? 'تم التعديل بنجاح' : 'Updated successfully');
      setEditData(null);
      onRefresh();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-4 text-center text-white font-semibold flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #ec4899, #f97316)' }}>
        <PlusCircle className="w-5 h-5" />
        {t('leaveRecord.extraDaysCurrentYear')}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 text-center">
          <p className="text-sm font-medium text-green-700 mb-1">{t('leaveRecord.approvedDays')}</p>
          <p className="text-3xl font-bold text-green-600">{summary.approvedCount}</p>
        </div>
        <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4 text-center">
          <p className="text-sm font-medium text-yellow-700 mb-1">{t('leaveRecord.pendingDays')}</p>
          <p className="text-3xl font-bold text-yellow-600">{summary.pendingCount}</p>
        </div>
        <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-sm font-medium text-blue-700 mb-1">{t('leaveRecord.totalAddedDays')}</p>
          <p className="text-3xl font-bold text-blue-600">{summary.totalDays}</p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-border/30">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/80">
              <th className={cn("px-4 py-3 text-sm font-semibold text-foreground", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.date')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold text-foreground", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.reason')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold text-foreground", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.status')}</th>
              <th className="px-4 py-3 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {overtime.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">{language === 'ar' ? 'لا توجد إضافات مسجلة' : 'No overtime recorded'}</td></tr>
            ) : (
              overtime.map((record, idx) => (
                <tr key={record.id} className={cn("border-b border-border/20", idx % 2 === 0 ? "bg-card" : "bg-muted/30")}>
                  <td className="px-4 py-3 text-sm text-foreground">{formatDate(record.date)}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{record.reason}</td>
                  <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setEditData({ ...record })}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editData} onOpenChange={(o) => !o && setEditData(null)}>
        <DialogContent className="sm:max-w-[400px]" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle>{language === 'ar' ? 'تعديل يوم إضافي' : 'Edit Extra Day'}</DialogTitle></DialogHeader>
          {editData && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
                <Input type="date" value={editData.date} onChange={(e) => setEditData({ ...editData, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الحالة' : 'Status'}</Label>
                <Select value={editData.status} onValueChange={(v) => setEditData({ ...editData, status: v as RecordStatus })}>
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
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (language === 'ar' ? 'حفظ' : 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
