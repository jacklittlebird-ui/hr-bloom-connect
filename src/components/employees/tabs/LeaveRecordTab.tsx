import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { cn, formatDate } from '@/lib/utils';
import { CalendarDays, Clock, PlusCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  hours: number;
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

const overtimeTypeLabels: Record<string, { en: string; ar: string }> = {
  regular: { en: 'Regular', ar: 'عادي' },
  holiday: { en: 'Holiday', ar: 'إجازة رسمية' },
  weekend: { en: 'Weekend', ar: 'نهاية أسبوع' },
};

export const LeaveRecordTab = ({ employee }: LeaveRecordTabProps) => {
  const { t, isRTL, language } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('leaves');
  const [loading, setLoading] = useState(true);
  const [employeeLeaves, setEmployeeLeaves] = useState<LeaveRecord[]>([]);
  const [employeePermissions, setEmployeePermissions] = useState<PermissionRecord[]>([]);
  const [employeeOvertime, setEmployeeOvertime] = useState<OvertimeRecord[]>([]);

  // DB balances for current year
  const [dbBalance, setDbBalance] = useState<{
    annualTotal: number; annualUsed: number;
    sickTotal: number; sickUsed: number;
    casualTotal: number; casualUsed: number;
    permissionsTotal: number; permissionsUsed: number;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
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
          id: r.id,
          leaveType: r.leave_type,
          startDate: r.start_date,
          endDate: r.end_date,
          days: r.days,
          reason: r.reason || '',
          status: r.status as RecordStatus,
        })));
      }

      if (permsRes.data) {
        setEmployeePermissions(permsRes.data.map(r => ({
          id: r.id,
          permissionType: r.permission_type,
          date: r.date,
          fromTime: r.start_time,
          toTime: r.end_time,
          durationHours: r.hours || 0,
          reason: r.reason || '',
          status: r.status as RecordStatus,
        })));
      }

      if (overtimeRes.data) {
        setEmployeeOvertime(overtimeRes.data.map(r => ({
          id: r.id,
          date: r.date,
          hours: r.hours,
          reason: r.reason || '',
          status: r.status as RecordStatus,
        })));
      }

      if (balanceRes.data) {
        setDbBalance({
          annualTotal: Number(balanceRes.data.annual_total ?? 21),
          annualUsed: Number(balanceRes.data.annual_used ?? 0),
          sickTotal: Number(balanceRes.data.sick_total ?? 5),
          sickUsed: Number(balanceRes.data.sick_used ?? 0),
          casualTotal: Number(balanceRes.data.casual_total ?? 2),
          casualUsed: Number(balanceRes.data.casual_used ?? 0),
          permissionsTotal: Number(balanceRes.data.permissions_total ?? 12),
          permissionsUsed: Number(balanceRes.data.permissions_used ?? 0),
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [employee.id]);

  const leaveSummary = useMemo(() => {
    // Combined balance: annual + casual
    const annualTotal = dbBalance?.annualTotal ?? (employee.annualLeaveBalance || 21);
    const annualUsed = dbBalance?.annualUsed ?? 0;
    const casualTotal = dbBalance?.casualTotal ?? 2;
    const casualUsed = dbBalance?.casualUsed ?? 0;
    const combinedTotal = annualTotal + casualTotal;
    const combinedUsed = annualUsed + casualUsed;
    return {
      total: combinedTotal,
      used: combinedUsed,
      remaining: combinedTotal - combinedUsed,
      approvedCount: employeeLeaves.filter(r => r.status === 'approved').length,
      pendingCount: employeeLeaves.filter(r => r.status === 'pending').length,
      rejectedCount: employeeLeaves.filter(r => r.status === 'rejected').length,
    };
  }, [employeeLeaves, dbBalance, employee.annualLeaveBalance]);

  const permissionSummary = useMemo(() => {
    const permTotal = dbBalance?.permissionsTotal ?? 12;
    const permUsed = dbBalance?.permissionsUsed ?? 0;
    return {
      total: permTotal,
      used: permUsed,
      remaining: permTotal - permUsed,
      approvedCount: employeePermissions.filter(r => r.status === 'approved').length,
      pendingCount: employeePermissions.filter(r => r.status === 'pending').length,
      rejectedCount: employeePermissions.filter(r => r.status === 'rejected').length,
    };
  }, [employeePermissions, dbBalance]);
  const overtimeSummary = useMemo(() => {
    const approved = employeeOvertime.filter(r => r.status === 'approved');
    return {
      totalHours: approved.reduce((sum, r) => sum + r.hours, 0),
      approvedCount: approved.length,
      pendingCount: employeeOvertime.filter(r => r.status === 'pending').length,
      rejectedCount: employeeOvertime.filter(r => r.status === 'rejected').length,
    };
  }, [employeeOvertime]);

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
      {/* Top Summary Cards */}
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
              <span className="text-4xl font-bold text-white">{overtimeSummary.totalHours}</span>
              <span className="text-white/80 text-sm mr-2 ml-2">{language === 'ar' ? 'ساعة' : 'hours'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className={cn("flex items-center gap-2 justify-end", !isRTL && "justify-start")}>
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:bg-muted/50",
                isRTL && "flex-row-reverse"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={cn(
                "min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-xs font-bold",
                isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeSubTab === 'leaves' && (
        <LeavesContent leaves={employeeLeaves} summary={leaveSummary} />
      )}
      {activeSubTab === 'permissions' && (
        <PermissionsContent permissions={employeePermissions} summary={permissionSummary} />
      )}
      {activeSubTab === 'extraDays' && (
        <OvertimeContent overtime={employeeOvertime} summary={overtimeSummary} />
      )}
    </div>
  );
};

// ========== Leaves Sub-Tab ==========
const LeavesContent = ({ leaves, summary }: { 
  leaves: LeaveRecord[];
  summary: { approvedCount: number; pendingCount: number; rejectedCount: number } 
}) => {
  const { t, isRTL, language } = useLanguage();

  return (
    <div className="space-y-5">
      <StatusSummaryCards
        approved={summary.approvedCount}
        pending={summary.pendingCount}
        rejected={summary.rejectedCount}
        approvedLabel={t('leaveRecord.approvedLeaves')}
        pendingLabel={t('leaveRecord.pendingLeaves')}
        rejectedLabel={t('leaveRecord.rejectedLeaves')}
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
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {language === 'ar' ? 'لا توجد إجازات مسجلة' : 'No leaves recorded'}
                </td>
              </tr>
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ========== Permissions Sub-Tab ==========
const PermissionsContent = ({ permissions, summary }: { 
  permissions: PermissionRecord[];
  summary: { approvedCount: number; pendingCount: number; rejectedCount: number } 
}) => {
  const { t, isRTL, language } = useLanguage();

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
            </tr>
          </thead>
          <tbody>
            {permissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {language === 'ar' ? 'لا توجد أذونات مسجلة' : 'No permissions recorded'}
                </td>
              </tr>
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ========== Overtime/Additions Sub-Tab ==========
const OvertimeContent = ({ overtime, summary }: { 
  overtime: OvertimeRecord[];
  summary: { totalHours: number; approvedCount: number; pendingCount: number; rejectedCount: number } 
}) => {
  const { t, isRTL, language } = useLanguage();

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
          <p className="text-3xl font-bold text-blue-600">{summary.totalHours}</p>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-border/30">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/80">
              <th className={cn("px-4 py-3 text-sm font-semibold text-foreground", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.date')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold text-foreground", isRTL ? "text-right" : "text-left")}>{language === 'ar' ? 'الساعات' : 'Hours'}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold text-foreground", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.reason')}</th>
              <th className={cn("px-4 py-3 text-sm font-semibold text-foreground", isRTL ? "text-right" : "text-left")}>{t('leaveRecord.status')}</th>
            </tr>
          </thead>
          <tbody>
            {overtime.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  {language === 'ar' ? 'لا توجد إضافات مسجلة' : 'No overtime recorded'}
                </td>
              </tr>
            ) : (
              overtime.map((record, idx) => (
                <tr key={record.id} className={cn("border-b border-border/20", idx % 2 === 0 ? "bg-card" : "bg-muted/30")}>
                  <td className="px-4 py-3 text-sm text-foreground">{formatDate(record.date)}</td>
                  <td className="px-4 py-3 text-sm text-foreground font-medium">{record.hours}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{record.reason}</td>
                  <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
