import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Calendar, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, Timer, Loader2, Info, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';
import { classifyAttendance, formatHM, type ClassifiedAttendance } from '@/lib/attendanceClassification';

interface PortalAttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workHours: number;
  workMinutes: number;
  holidayNameAr?: string;
  holidayNameEn?: string;
  leaveType?: string;
  permissionType?: string;
  permissionFrom?: string | null;
  permissionTo?: string | null;
  missionLocation?: string;
  audit?: ClassifiedAttendance;
}

const LEAVE_LABEL_AR: Record<string, string> = {
  annual: 'سنوية', sick: 'مرضية', emergency: 'عارضة', maternity: 'وضع',
  unpaid: 'بدون أجر', hajj: 'حج', bereavement: 'وفاة', marriage: 'زواج',
  study: 'دراسية', compensatory: 'تعويضية', other: 'أخرى',
};
const LEAVE_LABEL_EN: Record<string, string> = {
  annual: 'Annual', sick: 'Sick', emergency: 'Emergency', maternity: 'Maternity',
  unpaid: 'Unpaid', hajj: 'Hajj', bereavement: 'Bereavement', marriage: 'Marriage',
  study: 'Study', compensatory: 'Compensatory', other: 'Other',
};

const formatTime = (ts: string | null): string | null => {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch { return null; }
};

export const PortalAttendance = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [filteredRecords, setFilteredRecords] = useState<PortalAttendanceRecord[]>([]);
  const [coveredDates, setCoveredDates] = useState<Set<string>>(new Set());
  const [auditRow, setAuditRow] = useState<PortalAttendanceRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!PORTAL_EMPLOYEE_ID) return;
    setLoading(true);

    // Get employee's station_id to filter holidays correctly
    const { data: empRow } = await supabase
      .from('employees')
      .select('station_id')
      .eq('id', PORTAL_EMPLOYEE_ID)
      .maybeSingle();
    const stationId = empRow?.station_id;

    const [attRes, holRes] = await Promise.all([
      supabase
        .from('attendance_records')
        .select('id, date, check_in, check_out, status, work_hours, work_minutes, is_late, notes')
        .eq('employee_id', PORTAL_EMPLOYEE_ID)
        .gte('date', dateFrom)
        .lte('date', dateTo)
        .order('date', { ascending: false }),
      supabase
        .from('official_holidays')
        .select('id, name_ar, name_en, holiday_date, station_ids')
        .gte('holiday_date', dateFrom)
        .lte('holiday_date', dateTo),
    ]);

    if (attRes.error) {
      console.error('Portal attendance fetch error:', attRes.error);
      setFilteredRecords([]);
      setLoading(false);
      return;
    }

    if (holRes.error) {
      console.error('Portal official holidays fetch error:', holRes.error);
    }

    const matchingHolidays = (holRes.data || []).filter((h: any) => {
      const holidayStations = h.station_ids || [];
      return !stationId || holidayStations.length === 0 || holidayStations.includes(stationId);
    });
    const holidayByDate = new Map(matchingHolidays.map((h: any) => [h.holiday_date, h]));

    // Fetch approved leaves, missions, and permissions in range
    const [leavesRes, missionsRes, permsRes] = await Promise.all([
      supabase
        .from('leave_requests')
        .select('start_date, end_date, status, leave_type')
        .eq('employee_id', PORTAL_EMPLOYEE_ID)
        .eq('status', 'approved')
        .lte('start_date', dateTo)
        .gte('end_date', dateFrom),
      supabase
        .from('missions')
        .select('id, date, status, location')
        .eq('employee_id', PORTAL_EMPLOYEE_ID)
        .eq('status', 'approved')
        .gte('date', dateFrom)
        .lte('date', dateTo),
      supabase
        .from('permission_requests')
        .select('id, date, status, permission_type, start_time, end_time')
        .eq('employee_id', PORTAL_EMPLOYEE_ID)
        .eq('status', 'approved')
        .gte('date', dateFrom)
        .lte('date', dateTo),
    ]);
    const leaveByDate = new Map<string, string>(); // date -> leave_type
    (leavesRes.data || []).forEach((l: any) => {
      const s = new Date(l.start_date + 'T00:00:00');
      const e = new Date(l.end_date + 'T00:00:00');
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!leaveByDate.has(iso)) leaveByDate.set(iso, l.leave_type);
      }
    });
    const leaveDates = new Set<string>(leaveByDate.keys());
    const missionByDate = new Map<string, any>();
    (missionsRes.data || []).forEach((m: any) => { missionByDate.set(m.date, m); });
    const missionDates = new Set<string>(missionByDate.keys());
    const covered = new Set<string>([...leaveDates, ...missionDates]);
    setCoveredDates(covered);

    const attLogs: PortalAttendanceRecord[] = (attRes.data || []).map(r => {
      const holiday = holidayByDate.get(r.date) as any;
      const onLeave = leaveDates.has(r.date);
      const audit = classifyAttendance(r as any, { isOfficialHoliday: !!holiday, isOnLeave: onLeave && !r.check_in });
      return {
        id: r.id,
        date: r.date,
        checkIn: formatTime(r.check_in),
        checkOut: formatTime(r.check_out),
        status: audit.status,
        workHours: Math.floor(audit.totalMinutes / 60),
        workMinutes: audit.totalMinutes % 60,
        holidayNameAr: holiday?.name_ar,
        holidayNameEn: holiday?.name_en,
        leaveType: onLeave ? leaveByDate.get(r.date) : undefined,
        missionLocation: audit.status === 'mission' ? missionByDate.get(r.date)?.location : undefined,
        audit,
      };
    });

    const datesWithRecords = new Set(attLogs.map(l => l.date));
    const holidayLogs: PortalAttendanceRecord[] = matchingHolidays
      .filter((h: any) => !datesWithRecords.has(h.holiday_date))
      .map((h: any) => ({
        id: `holiday-${h.id}`,
        date: h.holiday_date,
        checkIn: null,
        checkOut: null,
        status: 'official-holiday',
        workHours: 0,
        workMinutes: 0,
        holidayNameAr: h.name_ar,
        holidayNameEn: h.name_en,
      } as any));

    // Synthetic rows for leave/mission dates without attendance record
    const leaveLogs: PortalAttendanceRecord[] = Array.from(leaveByDate.entries())
      .filter(([d]) => !datesWithRecords.has(d) && !holidayByDate.has(d))
      .map(([d, lt]) => ({
        id: `leave-${d}`,
        date: d,
        checkIn: null,
        checkOut: null,
        status: 'on-leave',
        workHours: 0,
        workMinutes: 0,
        leaveType: lt,
      } as any));

    const missionLogs: PortalAttendanceRecord[] = Array.from(missionByDate.entries())
      .filter(([d]) => !datesWithRecords.has(d) && !holidayByDate.has(d))
      .map(([d, m]) => ({
        id: `mission-${m.id}`,
        date: d,
        checkIn: null,
        checkOut: null,
        status: 'mission',
        workHours: 0,
        workMinutes: 0,
        missionLocation: m.location,
      } as any));

    // Permissions are partial-day — always show as their own row alongside attendance
    const permLogs: PortalAttendanceRecord[] = (permsRes.data || []).map((p: any) => ({
      id: `perm-${p.id}`,
      date: p.date,
      checkIn: null,
      checkOut: null,
      status: 'permission',
      workHours: 0,
      workMinutes: 0,
      permissionType: p.permission_type,
      permissionFrom: p.start_time,
      permissionTo: p.end_time,
    } as any));

    const combined = [...attLogs, ...holidayLogs, ...leaveLogs, ...missionLogs, ...permLogs];

    // Fill in every day in range (including Fri/Sat and days with no record)
    const dateOccupied = new Set(combined.filter(r => r.status !== 'permission').map(r => r.date));
    const startD = new Date(dateFrom + 'T00:00:00');
    const endD = new Date(dateTo + 'T00:00:00');
    const todayD = new Date(); todayD.setHours(0, 0, 0, 0);
    const emptyLogs: PortalAttendanceRecord[] = [];
    if (!isNaN(startD.getTime()) && !isNaN(endD.getTime())) {
      for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dateOccupied.has(iso)) continue;
        const dow = d.getDay(); // 5=Fri, 6=Sat
        const isWeekend = dow === 5 || dow === 6;
        const isFuture = d > todayD;
        emptyLogs.push({
          id: `empty-${iso}`,
          date: iso,
          checkIn: null,
          checkOut: null,
          status: isWeekend ? 'weekend' : (isFuture ? 'weekend' : 'no-record'),
          workHours: 0,
          workMinutes: 0,
        } as any);
      }
    }

    const all = [...combined, ...emptyLogs].sort((a, b) => b.date.localeCompare(a.date));
    setFilteredRecords(all);
    setLoading(false);
  }, [PORTAL_EMPLOYEE_ID, dateFrom, dateTo]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const stats = useMemo(() => {
    let present = 0, late = 0, absent = 0, totalMinutes = 0;
    filteredRecords.forEach(r => {
      if (r.status === 'present' || r.status === 'late' || r.status === 'auto-closed' || r.status === 'mission') present++;
      if (r.status === 'late') late++;
      if (r.status === 'absent') absent++;
      totalMinutes += (r.workHours * 60) + r.workMinutes;
    });
    return { present, late, absent, totalHours: Math.floor(totalMinutes / 60), totalMinutes: totalMinutes % 60 };
  }, [filteredRecords]);

  // Working days = past + today only, excluding Fri/Sat and official holidays
  const localIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Rate formula: (actual present days incl. missions) / (24 - official holidays - approved leaves)
  const { workingDaysInRange } = useMemo(() => {
    if (!dateFrom || !dateTo) return { workingDaysInRange: 0 };
    const holidayCount = filteredRecords.filter(r => r.status === 'official-holiday').length;
    // Count approved leave days inside the range (cap at range length).
    const start = new Date(dateFrom + 'T00:00:00');
    const endRaw = new Date(dateTo + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = endRaw > today ? today : endRaw;
    let leaveCount = 0;
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
      const cur = new Date(start);
      while (cur <= end) {
        if (coveredDates.has(localIso(cur))) leaveCount++;
        cur.setDate(cur.getDate() + 1);
      }
    }
    const denom = Math.max(0, 24 - holidayCount - leaveCount);
    return { workingDaysInRange: denom };
  }, [dateFrom, dateTo, filteredRecords, coveredDates]);

  const rate = workingDaysInRange > 0
    ? Math.min(100, (stats.present / workingDaysInRange) * 100).toFixed(1)
    : '0';

  const statusBadge = (r: PortalAttendanceRecord) => {
    const s = r.status;
    if (s === 'official-holiday') {
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
          {ar ? `إجازة رسمية: ${r.holidayNameAr || ''}` : `Official Holiday: ${r.holidayNameEn || ''}`}
        </Badge>
      );
    }
    if (s === 'on-leave' && r.leaveType) {
      const lbl = ar ? (LEAVE_LABEL_AR[r.leaveType] || r.leaveType) : (LEAVE_LABEL_EN[r.leaveType] || r.leaveType);
      return (
        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
          {ar ? `إجازة: ${lbl}` : `Leave: ${lbl}`}
        </Badge>
      );
    }
    if (s === 'mission') {
      return (
        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
          {ar ? `مأمورية${r.missionLocation ? `: ${r.missionLocation}` : ''}` : `Mission${r.missionLocation ? `: ${r.missionLocation}` : ''}`}
        </Badge>
      );
    }
    if (s === 'permission') {
      const time = r.permissionFrom && r.permissionTo ? ` (${r.permissionFrom}-${r.permissionTo})` : '';
      return (
        <Badge variant="outline" className="bg-teal-100 text-teal-700 border-teal-300">
          {ar ? `إذن${r.permissionType ? `: ${r.permissionType}` : ''}${time}` : `Permission${r.permissionType ? `: ${r.permissionType}` : ''}${time}`}
        </Badge>
      );
    }
    const map: Record<string, { cls: string; ar: string; en: string }> = {
      present: { cls: 'bg-success/10 text-success border-success', ar: 'حاضر', en: 'Present' },
      absent: { cls: 'bg-destructive/10 text-destructive border-destructive', ar: 'غائب', en: 'Absent' },
      late: { cls: 'bg-warning/10 text-warning border-warning', ar: 'متأخر', en: 'Late' },
      'early-leave': { cls: 'bg-orange-100 text-orange-600 border-orange-300', ar: 'انصراف مبكر', en: 'Early Leave' },
      weekend: { cls: 'bg-muted text-muted-foreground', ar: 'عطلة', en: 'Weekend' },
      'on-leave': { cls: 'bg-blue-100 text-blue-600 border-blue-300', ar: 'إجازة', en: 'On Leave' },
      mission: { cls: 'bg-purple-100 text-purple-600 border-purple-300', ar: 'مأمورية', en: 'Mission' },
      'auto-closed': { cls: 'bg-orange-100 text-orange-700 border-orange-300', ar: 'إغلاق بدون ختم', en: 'Closed without checkout' },
      'no-record': { cls: 'bg-transparent text-muted-foreground border-transparent', ar: '—', en: '—' },
    };
    const m = map[s] || map.absent;
    return <Badge variant="outline" className={m.cls}>{ar ? m.ar : m.en}</Badge>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">{ar ? 'الحضور والانصراف' : 'Attendance'}</h1>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { l: { ar: 'حضور', en: 'Present' }, v: stats.present, icon: CheckCircle, gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { l: { ar: 'تأخير', en: 'Late' }, v: stats.late, icon: AlertTriangle, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-950/40' },
          { l: { ar: 'غياب', en: 'Absent' }, v: stats.absent, icon: XCircle, gradient: 'from-red-500 to-rose-500', bg: 'bg-red-50 dark:bg-red-950/40' },
          { l: { ar: 'إجمالي الساعات', en: 'Total Hours' }, v: `${String(stats.totalHours).padStart(2, '0')}:${String(stats.totalMinutes).padStart(2, '0')}`, icon: Timer, gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-50 dark:bg-violet-950/40' },
        ].map((s, i) => (
          <Card key={i} className={cn("border-0 shadow-sm", s.bg)}>
            <CardContent className="p-3 md:p-4 text-center">
              <div className={cn("w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center bg-gradient-to-br", s.gradient)}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xl md:text-2xl font-bold">{s.v}</p>
              <p className="text-xs md:text-sm text-muted-foreground truncate">{ar ? s.l.ar : s.l.en}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Calendar className="w-4 h-4 md:w-5 md:h-5" />
              {ar ? 'سجل الحضور الشهري' : 'Monthly Record'}
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">{ar ? 'من' : 'From'}</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[140px] md:w-[160px] h-8 text-xs md:text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">{ar ? 'إلى' : 'To'}</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[140px] md:w-[160px] h-8 text-xs md:text-sm" />
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => fetchRecords()} disabled={loading} aria-label={ar ? 'تحديث' : 'Refresh'}>
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                <span className="hidden sm:inline text-xs">{ar ? 'تحديث' : 'Refresh'}</span>
              </Button>
            </div>
          </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="font-medium">{ar ? 'نسبة الحضور:' : 'Rate:'}</span>
            <Badge variant="outline" className="bg-success/10 text-success text-lg px-3">{rate}%</Badge>
          </div>
          <div className="overflow-x-auto max-h-[400px]">
            <Table className="min-w-[500px]">
              <TableHeader><TableRow>
                <TableHead>{ar ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead>{ar ? 'اليوم' : 'Day'}</TableHead>
                <TableHead>{ar ? 'الحضور' : 'In'}</TableHead>
                <TableHead>{ar ? 'الانصراف' : 'Out'}</TableHead>
                <TableHead>{ar ? 'الساعات' : 'Hours'}</TableHead>
                <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="w-12 text-center">{ar ? 'تدقيق' : 'Audit'}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-4">{ar ? 'لا توجد سجلات' : 'No records'}</TableCell></TableRow>
                ) : filteredRecords.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{format(new Date(r.date), 'EEEE', { locale: ar ? arLocale : enUS })}</TableCell>
                    <TableCell className="font-mono">{r.checkIn || '--:--'}</TableCell>
                    <TableCell className="font-mono">{r.checkOut || '--:--'}</TableCell>
                    <TableCell>{r.workHours > 0 || r.workMinutes > 0 ? `${String(r.workHours).padStart(2, '0')}:${String(r.workMinutes).padStart(2, '0')}` : '-'}</TableCell>
                    <TableCell>{statusBadge(r)}</TableCell>
                    <TableCell className="text-center">
                      {r.audit ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAuditRow(r)} aria-label={ar ? 'تدقيق الحساب' : 'Audit'}>
                          <Info className="w-4 h-4 text-primary" />
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!auditRow} onOpenChange={(o) => !o && setAuditRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              {ar ? 'تدقيق حساب اليوم' : 'Day Calculation Audit'}
            </DialogTitle>
            <DialogDescription>
              {auditRow?.date} — {auditRow && format(new Date(auditRow.date), 'EEEE', { locale: ar ? arLocale : enUS })}
            </DialogDescription>
          </DialogHeader>
          {auditRow?.audit && (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{ar ? 'التصنيف' : 'Classification'}</span><span>{statusBadge(auditRow)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{ar ? 'يحتسب حضوراً' : 'Counted as Present'}</span><span>{auditRow.audit.isPresentDay ? (ar ? 'نعم' : 'Yes') : (ar ? 'لا' : 'No')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{ar ? 'الحضور' : 'Check-in'}</span><span className="font-mono">{auditRow.checkIn || '--:--'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{ar ? 'الانصراف' : 'Check-out'}</span><span className="font-mono">{auditRow.checkOut || '--:--'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{ar ? 'الساعات' : 'Hours'}</span><span className="font-mono">{formatHM(auditRow.audit.totalMinutes)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{ar ? 'مصدر الساعات' : 'Hours source'}</span><span>{auditRow.audit.hoursSource}</span></div>
              <div className="pt-2 border-t">
                <div className="text-muted-foreground mb-1">{ar ? 'السبب' : 'Reason'}</div>
                <div className="leading-relaxed">{ar ? auditRow.audit.reasonAr : auditRow.audit.reasonEn}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};