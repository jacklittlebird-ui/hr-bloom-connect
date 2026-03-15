import { useMemo, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { cn, formatDate } from '@/lib/utils';
import { MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MissionRecordTabProps {
  employee: Employee;
}

interface MissionRow {
  id: string;
  mission_type: string;
  date: string;
  destination: string | null;
  reason: string | null;
  status: string;
}

type RecordStatus = 'approved' | 'pending' | 'rejected';

const statusConfig: Record<RecordStatus, { label: string; labelAr: string; bg: string; text: string; border: string }> = {
  approved: { label: 'Approved', labelAr: 'موافق عليه', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  pending: { label: 'Pending', labelAr: 'قيد المراجعة', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  rejected: { label: 'Rejected', labelAr: 'مرفوضة', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

const missionTypeLabels: Record<string, { en: string; ar: string }> = {
  morning: { en: 'Morning Mission', ar: 'مأمورية صباحية' },
  evening: { en: 'Evening Mission', ar: 'مأمورية مسائية' },
  full_day: { en: 'Full Day Mission', ar: 'مأمورية يوم كامل' },
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

export const MissionRecordTab = ({ employee }: MissionRecordTabProps) => {
  const { isRTL, language } = useLanguage();
  const [missions, setMissions] = useState<MissionRow[]>([]);

  // Resolve employee UUID from employee code
  useEffect(() => {
    const fetch = async () => {
      // First get UUID
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('employee_code', employee.employeeId)
        .single();
      if (!emp) return;

      const { data } = await supabase
        .from('missions')
        .select('id, mission_type, date, destination, reason, status')
        .eq('employee_id', emp.id)
        .order('created_at', { ascending: false });

      setMissions(data || []);
    };
    fetch();
  }, [employee.employeeId]);

  const summary = useMemo(() => ({
    total: missions.length,
    approvedCount: missions.filter(m => m.status === 'approved').length,
    pendingCount: missions.filter(m => m.status === 'pending').length,
    rejectedCount: missions.filter(m => m.status === 'rejected').length,
  }), [missions]);

  return (
    <div className="p-6 space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden h-28"
        style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%)' }}>
        <div className={cn("absolute inset-0 p-5 flex flex-col justify-between", isRTL ? "text-right" : "text-left")}>
          <p className="text-white/90 text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {language === 'ar' ? 'سجل المأموريات' : 'Mission Record'}
          </p>
          <div>
            <span className="text-4xl font-bold text-white">{summary.total}</span>
            <span className="text-white/80 text-sm mr-2 ml-2">
              {language === 'ar' ? 'مأمورية' : 'missions'}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4 text-center">
          <p className="text-sm font-medium text-yellow-700 mb-1">{language === 'ar' ? 'قيد المراجعة' : 'Pending'}</p>
          <p className="text-3xl font-bold text-yellow-600">{summary.pendingCount}</p>
        </div>
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 text-center">
          <p className="text-sm font-medium text-green-700 mb-1">{language === 'ar' ? 'موافق عليها' : 'Approved'}</p>
          <p className="text-3xl font-bold text-green-600">{summary.approvedCount}</p>
        </div>
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-700 mb-1">{language === 'ar' ? 'مرفوضة' : 'Rejected'}</p>
          <p className="text-3xl font-bold text-red-600">{summary.rejectedCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border border-border/30">
        <table className="w-full">
          <thead>
            <tr className="bg-purple-600 text-white">
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>
                {language === 'ar' ? 'نوع المأمورية' : 'Mission Type'}
              </th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>
                {language === 'ar' ? 'التاريخ' : 'Date'}
              </th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>
                {language === 'ar' ? 'الوجهة' : 'Destination'}
              </th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>
                {language === 'ar' ? 'السبب' : 'Reason'}
              </th>
              <th className={cn("px-4 py-3 text-sm font-semibold", isRTL ? "text-right" : "text-left")}>
                {language === 'ar' ? 'الحالة' : 'Status'}
              </th>
            </tr>
          </thead>
          <tbody>
            {missions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {language === 'ar' ? 'لا توجد مأموريات مسجلة' : 'No missions recorded'}
                </td>
              </tr>
            ) : (
              missions.map((record, idx) => {
                const typeLabel = missionTypeLabels[record.mission_type];
                return (
                  <tr key={record.id} className={cn("border-b border-border/20", idx % 2 === 0 ? "bg-card" : "bg-muted/30")}>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {language === 'ar' ? typeLabel?.ar : typeLabel?.en}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{formatDate(record.date)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{record.destination || '-'}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{record.reason || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={record.status as RecordStatus} /></td>
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
