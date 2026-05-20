import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Calendar, TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle, Timer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

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
}

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

  useEffect(() => {
    if (!PORTAL_EMPLOYEE_ID) return;
    const fetchRecords = async () => {
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

      // Fetch approved leaves & missions in range — they count as "covered" days, not absences
      const [leavesRes, missionsRes] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('start_date, end_date, status')
          .eq('employee_id', PORTAL_EMPLOYEE_ID)
          .eq('status', 'approved')
          .lte('start_date', dateTo)
          .gte('end_date', dateFrom),
        supabase
          .from('missions')
          .select('date, status')
          .eq('employee_id', PORTAL_EMPLOYEE_ID)
          .eq('status', 'approved')
          .gte('date', dateFrom)
          .lte('date', dateTo),
      ]);
      const leaveDates = new Set<string>();
      (leavesRes.data || []).forEach((l: any) => {
        const s = new Date(l.start_date + 'T00:00:00');
        const e = new Date(l.end_date + 'T00:00:00');
        for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
          leaveDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        }
      });
      const missionDates = new Set<string>((missionsRes.data || []).map((m: any) => m.date));
      const covered = new Set<string>([...leaveDates, ...missionDates]);
      setCoveredDates(covered);

      const attLogs: PortalAttendanceRecord[] = (attRes.data || []).map(r => {
        const holiday = holidayByDate.get(r.date) as any;
        const isAutoClosed = r.status === 'auto-closed'
          || !!(r.notes && /AUTO[_-]?CLOSED/i.test(r.notes));
        const ci = formatTime(r.check_in);
        const co = formatTime(r.check_out);

        // Prefer computing minutes directly from check_in -> check_out timestamps.
        // Auto-closed days still count as worked time (auto-checkout sets check_out & work_hours).
        let totalMins = 0;
        if (r.check_in && r.check_out) {
          const diff = (new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 60000;
          totalMins = diff > 0 ? Math.round(diff) : 0;
        }
        if (totalMins <= 0) {
          totalMins = r.work_minutes || (r.work_hours ? Math.round(Number(r.work_hours) * 60) : 0);
        }

        let status: string;
        if (holiday) status = 'official-holiday';
        else if (isAutoClosed) status = 'auto-closed';
        else if (r.is_late) status = 'late';
        else status = r.status || 'present';
        return {
          id: r.id,
          date: r.date,
          checkIn: ci,
          checkOut: co,
          status,
          workHours: Math.floor(totalMins / 60),
          workMinutes: totalMins % 60,
          holidayNameAr: holiday?.name_ar,
          holidayNameEn: holiday?.name_en,
        };
      });

      // Add official holidays for days where employee has no attendance record, while attendance rows on holidays are labeled above.
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

      const combined = [...attLogs, ...holidayLogs].sort((a, b) => b.date.localeCompare(a.date));
      setFilteredRecords(combined);
      setLoading(false);
    };
    fetchRecords();
  }, [PORTAL_EMPLOYEE_ID, dateFrom, dateTo]);

  const stats = useMemo(() => {
    let present = 0, late = 0, absent = 0, totalMinutes = 0;
    filteredRecords.forEach(r => {
      if (r.status === 'present' || r.status === 'late' || r.status === 'auto-closed') present++;
      if (r.status === 'late') late++;
      if (r.status === 'absent') absent++;
      totalMinutes += (r.workHours * 60) + r.workMinutes;
    });
    return { present, late, absent, totalHours: Math.floor(totalMinutes / 60), totalMinutes: totalMinutes % 60 };
  }, [filteredRecords]);

  // Working days = past + today only, excluding Fri/Sat and official holidays
  const localIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const { workingDaysInRange, coveredInRange } = useMemo(() => {
    if (!dateFrom || !dateTo) return { workingDaysInRange: 0, coveredInRange: 0 };
    const start = new Date(dateFrom + 'T00:00:00');
    const endRaw = new Date(dateTo + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = endRaw > today ? today : endRaw;
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return { workingDaysInRange: 0, coveredInRange: 0 };
    }
    const holidayDates = new Set(filteredRecords.filter(r => r.status === 'official-holiday').map(r => r.date));
    let count = 0;
    let covered = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      const iso = localIso(cur);
      if (day !== 5 && day !== 6 && !holidayDates.has(iso)) {
        count++;
        if (coveredDates.has(iso)) covered++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return { workingDaysInRange: count, coveredInRange: covered };
  }, [dateFrom, dateTo, filteredRecords, coveredDates]);

  // Numerator = days present (incl. late & auto-closed) + approved leave/mission days on working days.
  // This prevents "Rate" from dropping due to legitimate approved absences.
  const rate = workingDaysInRange > 0
    ? Math.min(100, ((stats.present + coveredInRange) / workingDaysInRange) * 100).toFixed(1)
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
    const map: Record<string, { cls: string; ar: string; en: string }> = {
      present: { cls: 'bg-success/10 text-success border-success', ar: 'حاضر', en: 'Present' },
      absent: { cls: 'bg-destructive/10 text-destructive border-destructive', ar: 'غائب', en: 'Absent' },
      late: { cls: 'bg-warning/10 text-warning border-warning', ar: 'متأخر', en: 'Late' },
      'early-leave': { cls: 'bg-orange-100 text-orange-600 border-orange-300', ar: 'انصراف مبكر', en: 'Early Leave' },
      weekend: { cls: 'bg-muted text-muted-foreground', ar: 'عطلة', en: 'Weekend' },
      'on-leave': { cls: 'bg-blue-100 text-blue-600 border-blue-300', ar: 'إجازة', en: 'On Leave' },
      mission: { cls: 'bg-purple-100 text-purple-600 border-purple-300', ar: 'مأمورية', en: 'Mission' },
      'auto-closed': { cls: 'bg-orange-100 text-orange-700 border-orange-300', ar: 'إغلاق بدون ختم', en: 'Closed without checkout' },
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
              </TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" /></TableCell></TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">{ar ? 'لا توجد سجلات' : 'No records'}</TableCell></TableRow>
                ) : filteredRecords.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{format(new Date(r.date), 'EEEE', { locale: ar ? arLocale : enUS })}</TableCell>
                    <TableCell className="font-mono">{r.checkIn || '--:--'}</TableCell>
                    <TableCell className="font-mono">{r.checkOut || '--:--'}</TableCell>
                    <TableCell>{r.workHours > 0 || r.workMinutes > 0 ? `${String(r.workHours).padStart(2, '0')}:${String(r.workMinutes).padStart(2, '0')}` : '-'}</TableCell>
                    <TableCell>{statusBadge(r)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};