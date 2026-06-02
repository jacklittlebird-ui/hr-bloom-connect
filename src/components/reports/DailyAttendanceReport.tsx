import { Fragment, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  Download, Printer, FileText, Building2, Users, Clock,
  CalendarDays, Search, X, CalendarIcon,
  LogIn, LogOut, CheckCircle2, AlertTriangle, XCircle,
  Plane, Briefcase, Timer, FileClock, Star,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useReportExport } from '@/hooks/useReportExport';
import { WordPreviewDialog } from '@/components/reports/WordPreviewDialog';
import { toast } from '@/hooks/use-toast';
import { exportDailyAttendanceExcel } from '@/lib/dailyAttendanceExcel';

interface StationRow { id: string; name_ar: string; name_en: string; weekend_days?: number[] | null; }
interface EmployeeRow { id: string; employee_code: string; name_ar: string; name_en: string; station_id: string | null; department_id: string | null; }
interface DepartmentRow { id: string; name_ar: string; name_en: string; }
interface AttendanceRow {
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
  work_minutes: number | null;
  status: string;
  is_late: boolean | null;
  notes?: string | null;
}
interface LeaveRow { employee_id: string; leave_type: string; start_date: string; end_date: string; }
interface MissionRow { employee_id: string; date: string; mission_type: string; hours: number | null; }
interface PermissionRow { employee_id: string; date: string; hours: number | null; permission_type: string; start_time: string | null; end_time: string | null; }
interface OvertimeRow { employee_id: string; date: string; hours: number; overtime_type: string; }
interface StampEvent { employee_id: string; scan_time: string; event_type: string; }
interface HolidayRow { holiday_date: string; name_ar: string; name_en: string; station_ids: string[] | null; }

type DayFilter = 'all' | 'present' | 'late' | 'absent';

const LEAVE_LABEL_AR: Record<string, string> = { annual: 'سنوية', sick: 'مرضية', casual: 'عارضة', unpaid: 'بدون أجر', marriage: 'زواج' };
const LEAVE_LABEL_EN: Record<string, string> = { annual: 'Annual', sick: 'Sick', casual: 'Casual', unpaid: 'Unpaid', marriage: 'Marriage' };

const PIN_KEY = 'attendanceReport.pinSummary';
const AUTO_CLOSED_RE = /AUTO[_-]?CLOSED/i;

function formatTimeCairo(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(iso));
  } catch { return '—'; }
}

function toCairoDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(iso));
  } catch { return ''; }
}

function fmtHours(h: number): string {
  if (!h || h <= 0) return '0';
  return (Math.round(h * 100) / 100).toFixed(2);
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function permissionHoursFor(p: { hours: number | null; start_time: string | null; end_time: string | null }): number {
  const h = Number(p.hours || 0);
  if (h > 0) return Math.round(h * 100) / 100;
  if (p.start_time && p.end_time) {
    const [sh, sm] = p.start_time.split(':').map(Number);
    const [eh, em] = p.end_time.split(':').map(Number);
    if ([sh, sm, eh, em].every(n => Number.isFinite(n))) {
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins > 0) return Math.round((mins / 60) * 100) / 100;
    }
  }
  return 0;
}

export const DailyAttendanceReport = ({ allowedStationIds }: { allowedStationIds?: string[] } = {}) => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { reportRef, handlePrint, exportToPDF, exportToCSV, previewWordExport, downloadWordHtml } = useReportExport();
  const [wordPreviewOpen, setWordPreviewOpen] = useState(false);
  const [wordPreviewHtml, setWordPreviewHtml] = useState<string | null>(null);
  const [wordPreviewLoading, setWordPreviewLoading] = useState(false);
  const [wordPreviewTitle, setWordPreviewTitle] = useState('');

  const now = new Date();
  // Default range: current month
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const [fromDate, setFromDate] = useState<Date>(defaultFrom);
  const [toDate, setToDate] = useState<Date>(defaultTo);

  const [stationFilter, setStationFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [globalStatusFilter, setGlobalStatusFilter] = useState<DayFilter>('all');
  const [pinSummary, setPinSummary] = useState<boolean>(() => {
    const saved = localStorage.getItem(PIN_KEY);
    return saved === null ? true : saved === '1';
  });
  useEffect(() => { localStorage.setItem(PIN_KEY, pinSummary ? '1' : '0'); }, [pinSummary]);

  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState<StationRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [overtimes, setOvertimes] = useState<OvertimeRow[]>([]);

  const [stamps, setStamps] = useState<StampEvent[]>([]);

  // Load stations + departments once
  useEffect(() => {
    (async () => {
      const [{ data: st }, { data: dp }] = await Promise.all([
        supabase.from('stations').select('id,name_ar,name_en,weekend_days').order('name_ar'),
        supabase.from('departments').select('id,name_ar,name_en'),
      ]);
      const allStations = (st as StationRow[]) || [];
      const filtered = allowedStationIds && allowedStationIds.length
        ? allStations.filter(s => allowedStationIds.includes(s.id))
        : allStations;
      setStations(filtered);
      setDepartments((dp as DepartmentRow[]) || []);
      if (allowedStationIds && allowedStationIds.length === 1) {
        setStationFilter(allowedStationIds[0]);
      }
    })();
  }, [allowedStationIds]);

  // Load employees + attendance for the selected range
  useEffect(() => {
    if (fromDate > toDate) return;
    (async () => {
      setLoading(true);
      try {
        const startDate = toIsoDate(fromDate);
        const endDate = toIsoDate(toDate);

        let empQuery = supabase.from('employees')
          .select('id,employee_code,name_ar,name_en,station_id,department_id')
          .eq('status', 'active');
        if (stationFilter !== 'all') empQuery = empQuery.eq('station_id', stationFilter);
        else if (allowedStationIds && allowedStationIds.length) empQuery = empQuery.in('station_id', allowedStationIds);
        const { data: emps, error: empErr } = await empQuery.order('employee_code');
        if (empErr) throw empErr;
        const empRowsLoaded = (emps as EmployeeRow[]) || [];
        setEmployees(empRowsLoaded);
        const empIds = empRowsLoaded.map(e => e.id);

        // Paginated fetch of attendance records (up to 20k)
        const recs: AttendanceRow[] = [];
        const pageSize = 1000;
        for (let i = 0; i < 20; i++) {
          const from = i * pageSize;
          const to = from + pageSize - 1;
          let q = supabase
            .from('attendance_records')
            .select('employee_id,date,check_in,check_out,work_hours,work_minutes,status,is_late,notes')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true })
            .range(from, to);
          if (empIds.length && empIds.length <= 500) q = q.in('employee_id', empIds);
          const { data, error } = await q;
          if (error) throw error;
          const rows = (data as AttendanceRow[]) || [];
          recs.push(...rows);
          if (rows.length < pageSize) break;
        }
        setRecords(recs);

        // Fetch approved leaves overlapping the range, missions, permissions, overtime
        const [lvRes, msRes, prRes, otRes] = await Promise.all([
          supabase.from('leave_requests')
            .select('employee_id,leave_type,start_date,end_date,status')
            .eq('status', 'approved')
            .lte('start_date', endDate)
            .gte('end_date', startDate),
          supabase.from('missions')
            .select('employee_id,date,mission_type,hours,status')
            .eq('status', 'approved')
            .gte('date', startDate)
            .lte('date', endDate),
          supabase.from('permission_requests')
            .select('employee_id,date,hours,permission_type,start_time,end_time,status')
            .eq('status', 'approved')
            .gte('date', startDate)
            .lte('date', endDate),
          supabase.from('overtime_requests')
            .select('employee_id,date,hours,overtime_type,status')
            .eq('status', 'approved')
            .gte('date', startDate)
            .lte('date', endDate),
        ]);
        setLeaves((lvRes.data as LeaveRow[]) || []);
        setMissions((msRes.data as MissionRow[]) || []);
        setPermissions((prRes.data as PermissionRow[]) || []);
        setOvertimes((otRes.data as OvertimeRow[]) || []);

        // Fetch raw stamp events (check-in/out scans) so we can show all stamps per day
        const stampsAcc: StampEvent[] = [];
        if (empIds.length) {
          // range covers full day window in Cairo time; widen by 1 day on each side to be safe
          const startTs = startDate + 'T00:00:00+02:00';
          const endTs = endDate + 'T23:59:59+02:00';
          for (let i = 0; i < 20; i++) {
            const from = i * pageSize;
            const to = from + pageSize - 1;
            let q = supabase
              .from('attendance_events')
              .select('employee_id,scan_time,event_type')
              .gte('scan_time', startTs)
              .lte('scan_time', endTs)
              .order('scan_time', { ascending: true })
              .range(from, to);
            if (empIds.length <= 500) q = q.in('employee_id', empIds);
            const { data, error } = await q;
            if (error) { console.warn('[DailyAttendanceReport] stamps fetch error', error); break; }
            const rows = (data as StampEvent[]) || [];
            stampsAcc.push(...rows.filter(s => !!s.employee_id));
            if (rows.length < pageSize) break;
          }
        }
        setStamps(stampsAcc);
      } catch (e) {
        console.error('[DailyAttendanceReport] load error', e);
        toast({ title: ar ? 'تعذر تحميل البيانات' : 'Failed to load data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [fromDate, toDate, stationFilter, ar, allowedStationIds]);

  const stationMap = useMemo(() => {
    const m = new Map<string, StationRow>();
    stations.forEach(s => m.set(s.id, s));
    return m;
  }, [stations]);

  // Weekend day-of-week set per station (defaults to [5,6] = Fri/Sat).
  const weekendByStation = useMemo(() => {
    const m = new Map<string, Set<number>>();
    stations.forEach(s => {
      const arr = Array.isArray(s.weekend_days) ? s.weekend_days : [5, 6];
      const set = new Set<number>();
      arr.forEach((v: any) => {
        const n = typeof v === 'number' ? v : Number(v);
        if (Number.isFinite(n) && n >= 0 && n <= 6) set.add(n);
      });
      m.set(s.id, set.size ? set : new Set([5, 6]));
    });
    return m;
  }, [stations]);

  // Header weekend set: when filtering to one station use its days,
  // otherwise show the union across all stations so weekends remain visible.
  const headerWeekend = useMemo(() => {
    if (stationFilter !== 'all') {
      return weekendByStation.get(stationFilter) || new Set([5, 6]);
    }
    const u = new Set<number>();
    weekendByStation.forEach(s => s.forEach(d => u.add(d)));
    return u.size ? u : new Set([5, 6]);
  }, [weekendByStation, stationFilter]);

  const isHeaderWeekend = (dow: number) => headerWeekend.has(dow);
  const isEmpWeekend = (empStationId: string | null, dow: number) => {
    if (!empStationId) return headerWeekend.has(dow);
    return (weekendByStation.get(empStationId) || new Set([5, 6])).has(dow);
  };

  const deptMap = useMemo(() => {
    const m = new Map<string, DepartmentRow>();
    departments.forEach(d => m.set(d.id, d));
    return m;
  }, [departments]);

  const empMap = useMemo(() => {
    const m = new Map<string, EmployeeRow>();
    employees.forEach(e => m.set(e.id, e));
    return m;
  }, [employees]);

  // Apply employee-level search
  const visibleEmpIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    const set = new Set<string>();
    employees.forEach(e => {
      if (!e.station_id) return;
      if (!q) { set.add(e.id); return; }
      const dept = e.department_id ? deptMap.get(e.department_id) : null;
      const haystack = [
        e.name_ar, e.name_en, e.employee_code,
        dept?.name_ar, dept?.name_en,
      ].filter(Boolean).join(' ').toLowerCase();
      if (haystack.includes(q)) set.add(e.id);
    });
    return set;
  }, [employees, search, deptMap]);

  // Build the list of all dates in the selected range (inclusive).
  const dateRange = useMemo<string[]>(() => {
    const out: string[] = [];
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(0, 0, 0, 0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      out.push(toIsoDate(d));
    }
    return out;
  }, [fromDate, toDate]);

  // Cell shape for a single (employee, day) intersection.
  type DayCell = {
    record: AttendanceRow | null;
    hours: number;
    matchesStatus: boolean;
    kind: 'present' | 'late' | 'absent' | 'auto-closed' | 'mission-day' | 'none';
    leave?: LeaveRow | null;
    mission?: MissionRow | null;
    permission?: PermissionRow | null;
    overtime?: OvertimeRow | null;
    stamps?: StampEvent[];
  };

  // Map: employee_id -> date -> record
  const recordIndex = useMemo(() => {
    const m = new Map<string, Map<string, AttendanceRow>>();
    records.forEach(r => {
      let inner = m.get(r.employee_id);
      if (!inner) { inner = new Map(); m.set(r.employee_id, inner); }
      inner.set(r.date, r);
    });
    return m;
  }, [records]);

  // Index leaves by employee -> date (expand date ranges)
  const leaveIndex = useMemo(() => {
    const m = new Map<string, Map<string, LeaveRow>>();
    leaves.forEach(lv => {
      const start = new Date(lv.start_date + 'T00:00:00');
      const end = new Date(lv.end_date + 'T00:00:00');
      let inner = m.get(lv.employee_id);
      if (!inner) { inner = new Map(); m.set(lv.employee_id, inner); }
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        inner.set(toIsoDate(d), lv);
      }
    });
    return m;
  }, [leaves]);

  const missionIndex = useMemo(() => {
    const m = new Map<string, Map<string, MissionRow>>();
    missions.forEach(ms => {
      let inner = m.get(ms.employee_id);
      if (!inner) { inner = new Map(); m.set(ms.employee_id, inner); }
      inner.set(ms.date, ms);
    });
    return m;
  }, [missions]);

  const permissionIndex = useMemo(() => {
    const m = new Map<string, Map<string, PermissionRow>>();
    permissions.forEach(pr => {
      let inner = m.get(pr.employee_id);
      if (!inner) { inner = new Map(); m.set(pr.employee_id, inner); }
      inner.set(pr.date, pr);
    });
    return m;
  }, [permissions]);

  const overtimeIndex = useMemo(() => {
    const m = new Map<string, Map<string, OvertimeRow>>();
    overtimes.forEach(ot => {
      let inner = m.get(ot.employee_id);
      if (!inner) { inner = new Map(); m.set(ot.employee_id, inner); }
      // Aggregate hours if multiple types same day
      const prev = inner.get(ot.date);
      if (prev) {
        inner.set(ot.date, { ...prev, hours: Number(prev.hours || 0) + Number(ot.hours || 0) });
      } else {
        inner.set(ot.date, ot);
      }
    });
    return m;
  }, [overtimes]);

  // Index raw stamp events by employee_id -> Cairo date -> list (sorted by time)
  const stampsIndex = useMemo(() => {
    const m = new Map<string, Map<string, StampEvent[]>>();
    stamps.forEach(s => {
      if (!s.employee_id) return;
      const d = toCairoDate(s.scan_time);
      if (!d) return;
      let inner = m.get(s.employee_id);
      if (!inner) { inner = new Map(); m.set(s.employee_id, inner); }
      const list = inner.get(d) || [];
      list.push(s);
      inner.set(d, list);
    });
    m.forEach(inner => inner.forEach(list => list.sort((a, b) => a.scan_time.localeCompare(b.scan_time))));
    return m;
  }, [stamps]);

  type EmpRow = {
    employee: EmployeeRow;
    department: DepartmentRow | null;
    station: StationRow | null;
    cells: DayCell[];
    totals: { present: number; late: number; absent: number; hours: number; matched: number; leaves: number; missions: number; permissions: number; overtimeHours: number };
  };

  // Visible (pivoted) employee rows. We always render the full date range as columns;
  // the status filter only colors / counts matching cells (no rows are dropped because
  // a single employee can have mixed statuses across days).
  const empRows = useMemo<EmpRow[]>(() => {
    const rows: EmpRow[] = [];
    employees.forEach(emp => {
      if (!visibleEmpIds.has(emp.id)) return;
      const inner = recordIndex.get(emp.id);
      const lvInner = leaveIndex.get(emp.id);
      const msInner = missionIndex.get(emp.id);
      const prInner = permissionIndex.get(emp.id);
      const otInner = overtimeIndex.get(emp.id);
      const stInner = stampsIndex.get(emp.id);
      let present = 0, late = 0, absent = 0, hours = 0, matched = 0;
      let leavesCount = 0, missionsCount = 0, permissionsCount = 0, overtimeHours = 0;
      const cells: DayCell[] = dateRange.map(d => {
        const rec = inner?.get(d) || null;
        const leave = lvInner?.get(d) || null;
        const mission = msInner?.get(d) || null;
        const permission = prInner?.get(d) || null;
        const overtime = otInner?.get(d) || null;
        const dayStamps = stInner?.get(d) || [];
        let kind: DayCell['kind'] = 'none';
        let h = 0;
        if (rec) {
          // Hours: prefer timestamp delta, then work_minutes, then work_hours.
          if (rec.check_in && rec.check_out) {
            const diff = (new Date(rec.check_out).getTime() - new Date(rec.check_in).getTime()) / 3600000;
            if (diff > 0) h = diff;
          }
          if (!h && rec.work_minutes && Number(rec.work_minutes) > 0) h = Number(rec.work_minutes) / 60;
          if (!h && rec.work_hours && Number(rec.work_hours) > 0) h = Number(rec.work_hours);

          const s = String(rec.status || '').toLowerCase().replace(/_/g, '-');
          const autoClosed = s === 'auto-closed' || (!!rec.notes && AUTO_CLOSED_RE.test(rec.notes));
          const isMission = s === 'mission';
          if (autoClosed) kind = 'auto-closed';
          else if (isMission) kind = 'mission-day';
          else if (s === 'present' && !rec.is_late) kind = 'present';
          else if (s === 'present' && !!rec.is_late) kind = 'late';
          else if (s === 'absent') kind = 'absent';
          else if (rec.check_in) kind = rec.is_late ? 'late' : 'present';
        }
        const isPresentLike = kind === 'present' || kind === 'late' || kind === 'auto-closed' || kind === 'mission-day';
        const matchesStatus =
          globalStatusFilter === 'all'
            ? kind !== 'none' || !!leave || !!mission || !!permission || !!overtime
            : (globalStatusFilter === 'present' ? (kind === 'present' || kind === 'auto-closed' || kind === 'mission-day') : kind === globalStatusFilter);
        if (kind === 'present' || kind === 'auto-closed' || kind === 'mission-day') present++;
        else if (kind === 'late') late++;
        else if (kind === 'absent') absent++;
        if (leave) leavesCount++;
        if (mission) missionsCount++;
        if (permission) permissionsCount++;
        if (overtime) overtimeHours += Number(overtime.hours || 0);
        if (matchesStatus) {
          matched++;
          if (isPresentLike) hours += h;
        }
        return { record: rec, hours: h, matchesStatus, kind, leave, mission, permission, overtime, stamps: dayStamps };
      });
      if (globalStatusFilter !== 'all' && matched === 0) return;
      rows.push({
        employee: emp,
        department: emp.department_id ? (deptMap.get(emp.department_id) || null) : null,
        station: emp.station_id ? (stationMap.get(emp.station_id) || null) : null,
        cells,
        totals: { present, late, absent, hours, matched, leaves: leavesCount, missions: missionsCount, permissions: permissionsCount, overtimeHours },
      });
    });
    rows.sort((a, b) => {
      const sa = a.station ? (ar ? a.station.name_ar : a.station.name_en) : 'zzz';
      const sb = b.station ? (ar ? b.station.name_ar : b.station.name_en) : 'zzz';
      if (sa !== sb) return sa.localeCompare(sb, 'ar');
      const na = ar ? a.employee.name_ar : a.employee.name_en;
      const nb = ar ? b.employee.name_ar : b.employee.name_en;
      return (na || '').localeCompare(nb || '', 'ar');
    });
    return rows;
  }, [employees, visibleEmpIds, recordIndex, leaveIndex, missionIndex, permissionIndex, overtimeIndex, stampsIndex, dateRange, globalStatusFilter, deptMap, stationMap, ar]);

  // Counters (status badges) — across all visible employees and days, regardless of filter.
  const counters = useMemo(() => {
    let present = 0, late = 0, absent = 0;
    employees.forEach(emp => {
      if (!visibleEmpIds.has(emp.id)) return;
      const inner = recordIndex.get(emp.id);
      if (!inner) return;
      dateRange.forEach(d => {
        const r = inner.get(d);
        if (!r) return;
        const s = String(r.status || '').toLowerCase().replace(/_/g, '-');
        const autoClosed = s === 'auto-closed' || (!!r.notes && AUTO_CLOSED_RE.test(r.notes));
        if (autoClosed || s === 'mission') present++;
        else if (s === 'present' && !r.is_late) present++;
        else if (s === 'present' && r.is_late) late++;
        else if (s === 'absent') absent++;
        else if (r.check_in) { if (r.is_late) late++; else present++; }
      });
    });
    return { present, late, absent, total: present + late + absent };
  }, [employees, visibleEmpIds, recordIndex, dateRange]);

  // Totals after status filter (uses per-row totals so they reflect the filter).
  const totals = useMemo(() => {
    let totalHours = 0, present = 0, late = 0, absent = 0, matched = 0;
    let leavesCount = 0, missionsCount = 0, permissionsCount = 0, overtimeHours = 0;
    const stSet = new Set<string>();
    empRows.forEach(r => {
      if (r.station) stSet.add(r.station.id);
      totalHours += r.totals.hours;
      present += r.totals.present;
      late += r.totals.late;
      absent += r.totals.absent;
      matched += r.totals.matched;
      leavesCount += r.totals.leaves;
      missionsCount += r.totals.missions;
      permissionsCount += r.totals.permissions;
      overtimeHours += r.totals.overtimeHours;
    });
    return {
      totalHours, present, late, absent,
      employeesCount: empRows.length,
      stationsCount: stSet.size,
      rows: matched,
      leaves: leavesCount,
      missions: missionsCount,
      permissions: permissionsCount,
      overtimeHours,
    };
  }, [empRows]);

  // Export: one row per employee, with one block of columns per day (hours / in / out / status code).
  const buildExportRows = () => empRows.map((r, idx) => {
    const row: Record<string, unknown> = {
      _idx: idx + 1,
      station: r.station ? (ar ? r.station.name_ar : r.station.name_en) : (ar ? 'بدون محطة' : 'No Station'),
      code: r.employee.employee_code,
      name: ar ? r.employee.name_ar : r.employee.name_en,
      department: r.department ? (ar ? r.department.name_ar : r.department.name_en) : '—',
      present: r.totals.present,
      late: r.totals.late,
      absent: r.totals.absent,
      leaves: r.totals.leaves,
      missions: r.totals.missions,
      permissions: r.totals.permissions,
      overtime_hours: fmtHours(r.totals.overtimeHours),
      total_hours: fmtHours(r.totals.hours),
    };
    r.cells.forEach((c, i) => {
      const dateKey = dateRange[i];
      row[`${dateKey}__in`] = formatTimeCairo(c.record?.check_in ?? null);
      row[`${dateKey}__out`] = formatTimeCairo(c.record?.check_out ?? null);
      row[`${dateKey}__hours`] = c.kind === 'none' ? '' : fmtHours(c.hours);
      const extras: string[] = [];
      if (c.leave) extras.push((ar ? 'إجازة ' : 'Leave ') + (ar ? (LEAVE_LABEL_AR[c.leave.leave_type] || c.leave.leave_type) : (LEAVE_LABEL_EN[c.leave.leave_type] || c.leave.leave_type)));
      if (c.mission) extras.push(ar ? `مأمورية (${c.mission.hours || 0}س)` : `Mission (${c.mission.hours || 0}h)`);
      if (c.permission) extras.push(ar ? `إذن (${permissionHoursFor(c.permission)}س)` : `Permission (${permissionHoursFor(c.permission)}h)`);
      if (c.overtime) extras.push(ar ? `إضافي (${c.overtime.hours || 0}س)` : `Overtime (${c.overtime.hours || 0}h)`);
      const baseStatus = c.kind === 'present' ? (ar ? 'حاضر' : 'P')
        : c.kind === 'late' ? (ar ? 'متأخر' : 'L')
        : c.kind === 'absent' ? (ar ? 'غائب' : 'A')
        : (extras.length ? '' : '—');
      row[`${dateKey}__status`] = [baseStatus, ...extras].filter(Boolean).join(' / ');
    });
    return row;
  });

  const exportColumns = [
    { header: '#', key: '_idx' },
    { header: ar ? 'المحطة' : 'Station', key: 'station' },
    { header: ar ? 'الكود' : 'Code', key: 'code' },
    { header: ar ? 'الاسم' : 'Name', key: 'name' },
    { header: ar ? 'القسم' : 'Department', key: 'department' },
    { header: ar ? 'حاضر' : 'Present', key: 'present' },
    { header: ar ? 'متأخر' : 'Late', key: 'late' },
    { header: ar ? 'غائب' : 'Absent', key: 'absent' },
    { header: ar ? 'إجازات' : 'Leaves', key: 'leaves' },
    { header: ar ? 'مأموريات' : 'Missions', key: 'missions' },
    { header: ar ? 'أذونات' : 'Permissions', key: 'permissions' },
    { header: ar ? 'ساعات إضافي' : 'Overtime Hrs', key: 'overtime_hours' },
    { header: ar ? 'إجمالي الساعات' : 'Total Hours', key: 'total_hours' },
    ...dateRange.flatMap(d => {
      const short = format(new Date(d + 'T00:00:00'), 'dd/MM');
      return [
        { header: `${short} ${ar ? 'حضور' : 'In'}`, key: `${d}__in` },
        { header: `${short} ${ar ? 'انصراف' : 'Out'}`, key: `${d}__out` },
        { header: `${short} ${ar ? 'ساعات' : 'Hrs'}`, key: `${d}__hours` },
        { header: `${short} ${ar ? 'حالة' : 'St'}`, key: `${d}__status` },
      ];
    }),
  ];


  const reportTitle = ar
    ? `تقرير الحضور التفصيلي اليومي — ${format(fromDate, 'dd/MM/yyyy')} → ${format(toDate, 'dd/MM/yyyy')}`
    : `Daily Detailed Attendance Report — ${format(fromDate, 'dd/MM/yyyy')} → ${format(toDate, 'dd/MM/yyyy')}`;

  // Quick range presets
  const setThisMonth = () => {
    setFromDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setToDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  };
  const setLastMonth = () => {
    setFromDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    setToDate(new Date(now.getFullYear(), now.getMonth(), 0));
  };
  const setLast7 = () => {
    const t = new Date();
    const f = new Date(); f.setDate(t.getDate() - 6);
    setFromDate(f); setToDate(t);
  };
  const setLast30 = () => {
    const t = new Date();
    const f = new Date(); f.setDate(t.getDate() - 29);
    setFromDate(f); setToDate(t);
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={cn('flex flex-wrap gap-3 items-center justify-between', isRTL && 'flex-row-reverse')}>
            <div className={cn('flex flex-wrap gap-3 items-center', isRTL && 'flex-row-reverse')}>
              {/* Search */}
              <div className="relative w-64">
                <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none', isRTL ? 'right-2.5' : 'left-2.5')} />
                <Input
                  type="text"
                  inputMode="search"
                  placeholder={ar ? 'بحث: اسم الموظف أو القسم أو الكود' : 'Search: name, department, or code'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={cn('h-9 text-sm', isRTL ? 'pr-8 pl-7' : 'pl-8 pr-7')}
                  aria-label={ar ? 'بحث الموظفين' : 'Search employees'}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className={cn('absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground', isRTL ? 'left-2' : 'right-2')}
                    aria-label={ar ? 'مسح البحث' : 'Clear search'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* From / To date pickers */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="text-xs">{ar ? 'من' : 'From'}: {format(fromDate, 'dd/MM/yyyy')}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(d) => d && setFromDate(d)}
                    disabled={(d) => d > toDate}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    <span className="text-xs">{ar ? 'إلى' : 'To'}: {format(toDate, 'dd/MM/yyyy')}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(d) => d && setToDate(d)}
                    disabled={(d) => d < fromDate || d > new Date()}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>

              {/* Quick range presets */}
              <div className={cn('flex gap-1', isRTL && 'flex-row-reverse')}>
                <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={setThisMonth}>
                  {ar ? 'هذا الشهر' : 'This month'}
                </Button>
                <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={setLastMonth}>
                  {ar ? 'الشهر الماضي' : 'Last month'}
                </Button>
                <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={setLast7}>
                  {ar ? 'آخر 7 أيام' : 'Last 7'}
                </Button>
                <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={setLast30}>
                  {ar ? 'آخر 30 يوم' : 'Last 30'}
                </Button>
              </div>

              {/* Station */}
              <Select value={stationFilter} onValueChange={setStationFilter}>
                <SelectTrigger className="w-56"><SelectValue placeholder={ar ? 'كل المحطات' : 'All Stations'} /></SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  <SelectItem value="all">{ar ? 'كل المحطات' : 'All Stations'}</SelectItem>
                  {stations.map(s => (
                    <SelectItem key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status */}
              <Select value={globalStatusFilter} onValueChange={(v) => setGlobalStatusFilter(v as DayFilter)}>
                <SelectTrigger className="w-44"><SelectValue placeholder={ar ? 'حالة الأيام' : 'Day Status'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? `كل الحالات (${counters.total})` : `All Statuses (${counters.total})`}</SelectItem>
                  <SelectItem value="present">{ar ? `حاضر فقط (${counters.present})` : `Present only (${counters.present})`}</SelectItem>
                  <SelectItem value="late">{ar ? `متأخر فقط (${counters.late})` : `Late only (${counters.late})`}</SelectItem>
                  <SelectItem value="absent">{ar ? `غائب فقط (${counters.absent})` : `Absent only (${counters.absent})`}</SelectItem>
                </SelectContent>
              </Select>

              {/* Status counters */}
              <div className={cn('flex items-center gap-1.5 flex-wrap', isRTL && 'flex-row-reverse')}>
                <Badge
                  className={cn('cursor-pointer text-xs', globalStatusFilter === 'present' ? 'bg-green-700 hover:bg-green-700' : 'bg-green-600 hover:bg-green-600')}
                  onClick={() => setGlobalStatusFilter('present')}
                >
                  {ar ? 'حاضر' : 'Present'}: <span className="ms-1 tabular-nums">{counters.present}</span>
                </Badge>
                <Badge
                  className={cn('cursor-pointer text-xs', globalStatusFilter === 'late' ? 'bg-amber-600 hover:bg-amber-600' : 'bg-amber-500 hover:bg-amber-500')}
                  onClick={() => setGlobalStatusFilter('late')}
                >
                  {ar ? 'متأخر' : 'Late'}: <span className="ms-1 tabular-nums">{counters.late}</span>
                </Badge>
                <Badge
                  className={cn('cursor-pointer text-xs', globalStatusFilter === 'absent' ? 'bg-red-700 hover:bg-red-700' : 'bg-red-600 hover:bg-red-600')}
                  onClick={() => setGlobalStatusFilter('absent')}
                >
                  {ar ? 'غائب' : 'Absent'}: <span className="ms-1 tabular-nums">{counters.absent}</span>
                </Badge>
                {globalStatusFilter !== 'all' && (
                  <Badge variant="outline" className="cursor-pointer text-xs" onClick={() => setGlobalStatusFilter('all')}>
                    {ar ? 'إعادة تعيين' : 'Reset'}
                  </Badge>
                )}
              </div>

              {/* Pin summary */}
              <div className={cn('flex items-center gap-2 px-2 py-1 rounded-md border bg-background', isRTL && 'flex-row-reverse')}>
                <Switch id="pin-summary-daily" checked={pinSummary} onCheckedChange={setPinSummary} />
                <Label htmlFor="pin-summary-daily" className="text-xs cursor-pointer whitespace-nowrap">
                  {ar ? 'تثبيت ملخص أعلى الجدول' : 'Pin summary on top'}
                </Label>
              </div>
            </div>
            <div className={cn('flex gap-2', isRTL && 'flex-row-reverse')}>
              <Button variant="outline" size="sm" onClick={() => handlePrint(reportTitle)}>
                <Printer className="w-4 h-4 mr-2" />{ar ? 'طباعة' : 'Print'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToPDF({ title: reportTitle, data: buildExportRows(), columns: exportColumns })}>
                <Download className="w-4 h-4 mr-2" />PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                exportDailyAttendanceExcel({
                  title: reportTitle,
                  ar,
                  dateRange,
                  isHeaderWeekend: (dow: number) => isHeaderWeekend(dow),
                  fileName: ar ? 'تقرير_الحضور_التفصيلي' : 'daily_attendance_detailed',
                  totals: {
                    stationsCount: totals.stationsCount,
                    employeesCount: totals.employeesCount,
                    totalHours: fmtHours(totals.totalHours),
                    present: totals.present,
                    late: totals.late,
                    absent: totals.absent,
                    leaves: totals.leaves,
                    missions: totals.missions,
                    permissions: totals.permissions,
                    overtimeHours: fmtHours(totals.overtimeHours),
                  },
                  rows: empRows.map((r, idx) => ({
                    idx: idx + 1,
                    code: r.employee.employee_code,
                    name: ar ? r.employee.name_ar : r.employee.name_en,
                    station: r.station ? (ar ? r.station.name_ar : r.station.name_en) : '—',
                    department: r.department ? (ar ? r.department.name_ar : r.department.name_en) : '—',
                    present: r.totals.present,
                    late: r.totals.late,
                    absent: r.totals.absent,
                    hours: fmtHours(r.totals.hours),
                    cells: r.cells.map((c, ci) => {
                      const dow = new Date(dateRange[ci] + 'T00:00:00').getDay();
                      const isOff = isEmpWeekend(r.station?.id || null, dow);
                      const leaveLbl = c.leave ? (ar ? (LEAVE_LABEL_AR[c.leave.leave_type] || c.leave.leave_type) : (LEAVE_LABEL_EN[c.leave.leave_type] || c.leave.leave_type)) : null;
                      return {
                        in: formatTimeCairo(c.record?.check_in ?? null),
                        out: formatTimeCairo(c.record?.check_out ?? null),
                        hours: c.kind === 'none' ? '' : fmtHours(c.hours),
                        kind: c.kind,
                        isOff,
                        leave: leaveLbl,
                        mission: c.mission ? (ar ? `${c.mission.hours || 0}س` : `${c.mission.hours || 0}h`) : null,
                        permission: c.permission ? (ar ? `${permissionHoursFor(c.permission)}س` : `${permissionHoursFor(c.permission)}h`) : null,
                        overtime: c.overtime ? (ar ? `${c.overtime.hours || 0}س` : `${c.overtime.hours || 0}h`) : null,
                      };
                    }),
                  })),
                });
              }}>
                <FileText className="w-4 h-4 mr-2" />Excel
              </Button>
              <Button variant="outline" size="sm" onClick={async () => {
                setWordPreviewTitle(reportTitle);
                setWordPreviewOpen(true);
                setWordPreviewLoading(true);
                setWordPreviewHtml(null);
                const html = await previewWordExport({ title: reportTitle, data: buildExportRows(), columns: exportColumns });
                setWordPreviewHtml(html);
                setWordPreviewLoading(false);
              }}>
                <FileText className="w-4 h-4 mr-2" />Word
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef} className="space-y-6">
        {/* Header summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryStat icon={Building2} label={ar ? 'عدد المحطات' : 'Stations'} value={totals.stationsCount} color="text-blue-600" bg="bg-blue-100" />
          <SummaryStat icon={Users} label={ar ? 'إجمالي الموظفين' : 'Employees'} value={totals.employeesCount} color="text-indigo-600" bg="bg-indigo-100" />
          <SummaryStat icon={Clock} label={ar ? 'إجمالي ساعات العمل' : 'Total Work Hours'} value={fmtHours(totals.totalHours)} color="text-emerald-600" bg="bg-emerald-100" />
          <SummaryStat icon={CalendarDays} label={ar ? 'أيام الحضور' : 'Present Days'} value={totals.present} color="text-green-600" bg="bg-green-100" />
          <SummaryStat icon={AlertTriangle} label={ar ? 'أيام التأخير' : 'Late Days'} value={totals.late} color="text-amber-600" bg="bg-amber-100" />
          <SummaryStat icon={CalendarDays} label={ar ? 'أيام الغياب' : 'Absent Days'} value={totals.absent} color="text-red-600" bg="bg-red-100" />
          <SummaryStat icon={Plane} label={ar ? 'أيام الإجازات' : 'Leave Days'} value={totals.leaves} color="text-sky-600" bg="bg-sky-100" />
          <SummaryStat icon={Briefcase} label={ar ? 'المأموريات' : 'Missions'} value={totals.missions} color="text-purple-600" bg="bg-purple-100" />
          <SummaryStat icon={FileClock} label={ar ? 'الأذونات' : 'Permissions'} value={totals.permissions} color="text-cyan-600" bg="bg-cyan-100" />
          <SummaryStat icon={Timer} label={ar ? 'ساعات إضافي' : 'Overtime Hours'} value={fmtHours(totals.overtimeHours)} color="text-orange-600" bg="bg-orange-100" />
        </div>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {!loading && empRows.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">
            {ar ? 'لا توجد بيانات حضور لهذه الفترة' : 'No attendance data for this period'}
          </CardContent></Card>
        )}

        {!loading && empRows.length > 0 && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Legend */}
              <div className={cn('flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-muted/30 text-[11px]', isRTL && 'flex-row-reverse')}>
                <span className="font-semibold text-muted-foreground">{ar ? 'المفتاح:' : 'Legend:'}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-emerald-50/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                  <span className="text-emerald-700 font-medium">{ar ? 'حاضر' : 'Present'}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-amber-50">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" aria-hidden />
                  <span className="text-amber-700 font-medium">{ar ? 'متأخر' : 'Late'}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-red-100">
                  <XCircle className="w-3.5 h-3.5 text-red-700" aria-hidden />
                  <span className="text-red-700 font-medium">{ar ? 'غائب' : 'Absent'}</span>
                </span>
                <span className="mx-1 text-muted-foreground">|</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-background">
                  <LogIn className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
                  <span className="font-medium">{ar ? 'وقت الحضور' : 'Check-in'}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-background">
                  <LogOut className="w-3.5 h-3.5 text-rose-500" aria-hidden />
                  <span className="font-medium">{ar ? 'وقت الانصراف' : 'Check-out'}</span>
                </span>
                <span className="mx-1 text-muted-foreground">|</span>
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border-2 border-amber-500" aria-hidden />
                  <span className="font-medium">{ar ? 'يوم عطلة (حسب إعداد المحطة)' : 'Off-day (per station setting)'}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <span className="text-muted-foreground/60">—</span>
                  {ar ? 'لا يوجد سجل' : 'No record'}
                </span>
                <span className="mx-1 text-muted-foreground">|</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-sky-50">
                  <Plane className="w-3.5 h-3.5 text-sky-600" aria-hidden />
                  <span className="text-sky-700 font-medium">{ar ? 'إجازة' : 'Leave'}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-purple-50">
                  <Briefcase className="w-3.5 h-3.5 text-purple-600" aria-hidden />
                  <span className="text-purple-700 font-medium">{ar ? 'مأمورية' : 'Mission'}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-cyan-50">
                  <FileClock className="w-3.5 h-3.5 text-cyan-600" aria-hidden />
                  <span className="text-cyan-700 font-medium">{ar ? 'إذن' : 'Permission'}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border bg-orange-50">
                  <Timer className="w-3.5 h-3.5 text-orange-600" aria-hidden />
                  <span className="text-orange-700 font-medium">{ar ? 'إضافي' : 'Overtime'}</span>
                </span>
              </div>
              <div className={cn('overflow-auto bg-background', pinSummary && 'max-h-[640px]')}>
                <table className="text-xs border-collapse" style={{ minWidth: '100%' }}>
                  <thead>
                    {/* Top header row: groups */}
                    <tr className={cn('bg-muted/60', pinSummary && 'sticky top-0 z-30 shadow-sm')}>
                      <th className="border p-2 text-center" rowSpan={2} style={{ minWidth: 32 }}>#</th>
                      <th className="border p-2 text-center" rowSpan={2} style={{ minWidth: 80 }}>{ar ? 'الكود' : 'Code'}</th>
                      <th className="border p-2 text-center" rowSpan={2} style={{ minWidth: 200 }}>{ar ? 'الاسم' : 'Name'}</th>
                      <th className="border p-2 text-center" rowSpan={2} style={{ minWidth: 130 }}>{ar ? 'المحطة' : 'Station'}</th>
                      <th className="border p-2 text-center" rowSpan={2} style={{ minWidth: 120 }}>{ar ? 'القسم' : 'Department'}</th>
                      <th className="border p-2 text-center bg-emerald-50" colSpan={4}>
                        {ar ? 'الملخص' : 'Summary'}
                      </th>
                      {dateRange.map(d => {
                        const dObj = new Date(d + 'T00:00:00');
                        const dayLabel = dObj.toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { weekday: 'short' });
                        const dateLabel = format(dObj, 'dd/MM');
                        const dow = dObj.getDay();
                        const isOff = isHeaderWeekend(dow);
                        const isFri = dow === 5;
                        const headBg = isOff ? 'bg-amber-100' : 'bg-blue-50';
                        const borderCls = isOff ? 'border-x-2 border-x-amber-500' : '';
                        return (
                          <th
                            key={d}
                            colSpan={3}
                            className={cn('border p-1 text-center whitespace-nowrap relative', headBg, borderCls)}
                            style={{ minWidth: 150 }}
                          >
                            {isOff && (
                              <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" aria-hidden />
                            )}
                            <div className="font-bold tabular-nums flex items-center justify-center gap-1">
                              {isOff && isFri && <span aria-hidden>🕌</span>}
                              {dateLabel}
                            </div>
                            <div className={cn('text-[10px] font-normal', isOff ? 'text-amber-700 font-semibold' : 'text-muted-foreground')}>
                              {isOff ? `${dayLabel} — ${ar ? 'عطلة' : 'Off'}` : dayLabel}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                    {/* Second header row: subcolumns */}
                    <tr
                      className={cn('bg-muted/40', pinSummary && 'sticky z-20 shadow-sm')}
                      style={pinSummary ? { top: 56 } : undefined}
                    >
                      <th className="border p-1 text-center text-[10px] bg-emerald-50/70">{ar ? 'حاضر' : 'P'}</th>
                      <th className="border p-1 text-center text-[10px] bg-emerald-50/70">{ar ? 'متأخر' : 'L'}</th>
                      <th className="border p-1 text-center text-[10px] bg-emerald-50/70">{ar ? 'غائب' : 'A'}</th>
                      <th className="border p-1 text-center text-[10px] bg-emerald-50/70">{ar ? 'الساعات' : 'Hrs'}</th>
                      {dateRange.map(d => {
                        const dow = new Date(d + 'T00:00:00').getDay();
                        const sub = isHeaderWeekend(dow) ? 'bg-amber-100/70' : '';
                        return (
                        <Fragment key={d}>
                          <th className={cn('border p-1 text-center text-[10px] font-normal text-muted-foreground', sub)}>{ar ? 'حضور' : 'In'}</th>
                          <th className={cn('border p-1 text-center text-[10px] font-normal text-muted-foreground', sub)}>{ar ? 'انصراف' : 'Out'}</th>
                          <th className={cn('border p-1 text-center text-[10px] font-normal text-muted-foreground', sub)}>{ar ? 'س' : 'H'}</th>
                        </Fragment>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {empRows.map((r, i) => {
                      const absent = r.totals.absent;
                      const late = r.totals.late;
                      // Severity tiers — darker shading as counts grow.
                      // Absent dominates Late.
                      let rowFlag = 'hover:bg-muted/30';
                      let titleTxt: string | undefined;
                      if (absent >= 5) {
                        rowFlag = 'bg-red-300/70 hover:bg-red-300 text-red-950 font-bold ring-1 ring-red-400';
                        titleTxt = ar ? `غياب مرتفع جداً: ${absent} يوم` : `Critical absences: ${absent} days`;
                      } else if (absent >= 3) {
                        rowFlag = 'bg-red-200/70 hover:bg-red-200 font-bold';
                        titleTxt = ar ? `غياب مرتفع: ${absent} يوم` : `High absences: ${absent} days`;
                      } else if (absent >= 1) {
                        rowFlag = 'bg-red-100/70 hover:bg-red-100 font-bold';
                        titleTxt = ar ? `يحتوي على غياب: ${absent} يوم` : `Has absences: ${absent}`;
                      } else if (late >= 5) {
                        rowFlag = 'bg-amber-200/70 hover:bg-amber-200 font-bold';
                        titleTxt = ar ? `تأخير مرتفع: ${late} يوم` : `High late: ${late} days`;
                      } else if (late >= 3) {
                        rowFlag = 'bg-amber-100/80 hover:bg-amber-100 font-semibold';
                        titleTxt = ar ? `تأخير متوسط: ${late} يوم` : `Moderate late: ${late} days`;
                      } else if (late >= 1) {
                        rowFlag = 'bg-amber-50 hover:bg-amber-100/60 font-semibold';
                        titleTxt = ar ? `تأخير: ${late} يوم` : `Late: ${late}`;
                      }
                      return (
                      <tr key={r.employee.id} className={cn(rowFlag)} title={titleTxt}>
                        <td className="border p-2 text-center text-muted-foreground tabular-nums">{i + 1}</td>
                        <td className="border p-2 text-center font-mono">{r.employee.employee_code}</td>
                        <td className="border p-2 whitespace-pre-wrap break-words font-medium">
                          {ar ? r.employee.name_ar : r.employee.name_en}
                        </td>
                        <td className="border p-2 text-center">{r.station ? (ar ? r.station.name_ar : r.station.name_en) : '—'}</td>
                        <td className="border p-2 text-center text-muted-foreground">{r.department ? (ar ? r.department.name_ar : r.department.name_en) : '—'}</td>
                        <td className="border p-2 text-center text-green-700 font-semibold tabular-nums bg-emerald-50/30">{r.totals.present}</td>
                        <td className="border p-2 text-center text-amber-600 tabular-nums bg-emerald-50/30">{r.totals.late}</td>
                        <td className="border p-2 text-center text-red-600 tabular-nums bg-emerald-50/30">{r.totals.absent}</td>
                        <td className="border p-2 text-center font-bold tabular-nums bg-emerald-50/40">{fmtHours(r.totals.hours)}</td>
                        {r.cells.map((c, ci) => {
                          const dimmed = !c.matchesStatus;
                          const dow = new Date(dateRange[ci] + 'T00:00:00').getDay();
                          const isOff = isEmpWeekend(r.station?.id || null, dow);
                          const isFri = dow === 5;
                          const weekendBorder = isOff ? 'border-x-2 border-x-amber-500' : '';
                          const weekendBg = isOff ? 'bg-amber-50/60' : '';
                          const offTitle = isOff
                            ? (ar ? `${new Date(dateRange[ci] + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long' })} — عطلة` : `${new Date(dateRange[ci] + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long' })} — Off`)
                            : undefined;
                          const baseCell = cn('border p-1 text-center font-mono whitespace-nowrap', weekendBorder);

                          // Build small badges for permission/overtime/mission/leave overlays
                          const overlayBadges: JSX.Element[] = [];
                          if (c.leave) {
                            const lbl = ar ? (LEAVE_LABEL_AR[c.leave.leave_type] || c.leave.leave_type) : (LEAVE_LABEL_EN[c.leave.leave_type] || c.leave.leave_type);
                            overlayBadges.push(
                              <span key="lv" className="inline-flex items-center gap-0.5 px-1 rounded bg-sky-100 text-sky-800 text-[9px] font-semibold" title={ar ? 'إجازة' : 'Leave'}>
                                <Plane className="w-2.5 h-2.5" aria-hidden />{lbl}
                              </span>
                            );
                          }
                          if (c.mission) {
                            overlayBadges.push(
                              <span key="ms" className="inline-flex items-center gap-0.5 px-1 rounded bg-purple-100 text-purple-800 text-[9px] font-semibold" title={ar ? 'مأمورية' : 'Mission'}>
                                <Briefcase className="w-2.5 h-2.5" aria-hidden />{ar ? 'مأمورية' : 'Mission'} {c.mission.hours || 0}{ar ? 'س' : 'h'}
                              </span>
                            );
                          }
                          if (c.permission) {
                            overlayBadges.push(
                              <span key="pr" className="inline-flex items-center gap-0.5 px-1 rounded bg-cyan-100 text-cyan-800 text-[9px] font-semibold" title={ar ? 'إذن' : 'Permission'}>
                                <FileClock className="w-2.5 h-2.5" aria-hidden />{ar ? 'إذن' : 'Perm'} {permissionHoursFor(c.permission)}{ar ? 'س' : 'h'}
                              </span>
                            );
                          }
                          if (c.overtime) {
                            overlayBadges.push(
                              <span key="ot" className="inline-flex items-center gap-0.5 px-1 rounded bg-orange-100 text-orange-800 text-[9px] font-semibold" title={ar ? 'إضافي' : 'Overtime'}>
                                <Timer className="w-2.5 h-2.5" aria-hidden />+{c.overtime.hours || 0}{ar ? 'س' : 'h'}
                              </span>
                            );
                          }
                          const overlayRow = overlayBadges.length > 0 ? (
                            <div className="flex flex-wrap items-center justify-center gap-0.5 mt-0.5">{overlayBadges}</div>
                          ) : null;

                          if (c.kind === 'none') {
                            // No attendance record. If we have a leave/mission/etc., show that prominently.
                            if (c.leave) {
                              const lbl = ar ? (LEAVE_LABEL_AR[c.leave.leave_type] || c.leave.leave_type) : (LEAVE_LABEL_EN[c.leave.leave_type] || c.leave.leave_type);
                              return (
                                <Fragment key={ci}>
                                  <td colSpan={3} className={cn(baseCell, 'bg-sky-100 text-sky-800 font-semibold')} title={ar ? 'إجازة معتمدة' : 'Approved Leave'}>
                                    <span className="inline-flex items-center justify-center gap-1">
                                      <Plane className="w-3.5 h-3.5" aria-hidden />
                                      {ar ? 'إجازة' : 'Leave'} — {lbl}
                                    </span>
                                  </td>
                                </Fragment>
                              );
                            }
                            if (c.mission) {
                              return (
                                <Fragment key={ci}>
                                  <td colSpan={3} className={cn(baseCell, 'bg-purple-100 text-purple-800 font-semibold')} title={ar ? 'مأمورية' : 'Mission'}>
                                    <span className="inline-flex items-center justify-center gap-1">
                                      <Briefcase className="w-3.5 h-3.5" aria-hidden />
                                      {ar ? 'مأمورية' : 'Mission'} ({c.mission.hours || 0}{ar ? 'س' : 'h'})
                                    </span>
                                  </td>
                                </Fragment>
                              );
                            }
                            // Permission/overtime without attendance record — render overlay row only.
                            if (overlayBadges.length > 0) {
                              return (
                                <Fragment key={ci}>
                                  <td colSpan={3} className={cn(baseCell, 'bg-muted/20')}>
                                    <div className="flex flex-wrap items-center justify-center gap-0.5">{overlayBadges}</div>
                                  </td>
                                </Fragment>
                              );
                            }
                            return (
                              <Fragment key={ci}>
                                <td className={cn(baseCell, weekendBg, 'text-muted-foreground/40')} title={offTitle}>{isOff && isFri ? '🕌' : '—'}</td>
                                <td className={cn(baseCell, weekendBg, 'text-muted-foreground/40')}>—</td>
                                <td className={cn(baseCell, weekendBg, 'text-muted-foreground/40')}>—</td>
                              </Fragment>
                            );
                          }
                          if (c.kind === 'absent') {
                            return (
                              <Fragment key={ci}>
                                <td colSpan={3} className={cn(baseCell, 'text-red-700 font-bold', dimmed ? 'bg-red-50/30 opacity-40' : 'bg-red-100')}>
                                  <span className="inline-flex items-center justify-center gap-1">
                                    <XCircle className="w-3.5 h-3.5" aria-hidden />
                                    {ar ? 'غائب' : 'Absent'}
                                  </span>
                                  {overlayRow}
                                </td>
                              </Fragment>
                            );
                          }
                          const isLate = c.kind === 'late';
                          const isAuto = c.kind === 'auto-closed';
                          const isMissionDay = c.kind === 'mission-day';
                          const bg = isLate ? 'bg-amber-50'
                            : isAuto ? 'bg-emerald-50/60 ring-1 ring-inset ring-amber-300'
                            : isMissionDay ? 'bg-purple-50'
                            : 'bg-emerald-50/40';
                          const dimCls = dimmed ? 'opacity-40' : '';
                          const StatusIcon = isLate ? AlertTriangle : isMissionDay ? Briefcase : CheckCircle2;
                          const statusColor = isLate ? 'text-amber-600' : isMissionDay ? 'text-purple-600' : 'text-emerald-600';
                          const statusTitle = isLate ? (ar ? 'متأخر' : 'Late')
                            : isAuto ? (ar ? 'إغلاق تلقائي — يحتسب حضور' : 'Auto-closed — counted as present')
                            : isMissionDay ? (ar ? 'مأمورية' : 'Mission')
                            : (ar ? 'حاضر' : 'Present');

                          // Show extra stamps (beyond first/last) when there are multiples or a permission/mission
                          const showAllStamps = (c.stamps && c.stamps.length > 2) || !!c.permission || !!c.mission;
                          const extraStampsRow = showAllStamps && c.stamps && c.stamps.length > 0 ? (
                            <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5 border-t border-dashed border-muted-foreground/30 pt-0.5" title={ar ? 'جميع الأختام في هذا اليوم' : 'All stamps for this day'}>
                              {c.stamps.map((s, si) => (
                                <span
                                  key={si}
                                  className={cn(
                                    'inline-flex items-center gap-0.5 px-1 rounded text-[9px] font-mono',
                                    String(s.event_type).toLowerCase().includes('out')
                                      ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700',
                                  )}
                                >
                                  {String(s.event_type).toLowerCase().includes('out')
                                    ? <LogOut className="w-2.5 h-2.5" aria-hidden />
                                    : <LogIn className="w-2.5 h-2.5" aria-hidden />}
                                  {formatTimeCairo(s.scan_time)}
                                </span>
                              ))}
                            </div>
                          ) : null;

                          return (
                            <Fragment key={ci}>
                              <td className={cn(baseCell, bg, dimCls)} title={statusTitle}>
                                <span className="inline-flex items-center justify-center gap-1">
                                  <LogIn className={cn('w-3 h-3', statusColor)} aria-hidden />
                                  <StatusIcon className={cn('w-3 h-3', statusColor)} aria-hidden />
                                  <span>{formatTimeCairo(c.record!.check_in)}</span>
                                </span>
                              </td>
                              <td className={cn(baseCell, bg, dimCls)} title={statusTitle}>
                                <span className="inline-flex items-center justify-center gap-1">
                                  <LogOut className="w-3 h-3 text-rose-500" aria-hidden />
                                  <span>{c.record!.check_out ? formatTimeCairo(c.record!.check_out) : (isAuto ? (ar ? 'إغلاق تلقائي' : 'Auto') : '—')}</span>
                                </span>
                              </td>
                              <td className={cn(baseCell, bg, dimCls, 'tabular-nums font-semibold')}>
                                {fmtHours(c.hours)}
                                {overlayRow}
                                {extraStampsRow}
                              </td>
                            </Fragment>
                          );
                        })}
                      </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50 font-bold">
                      <td className="border p-2 text-center" colSpan={5}>
                        {ar ? 'الإجمالي العام (بعد التصفية)' : 'Grand Total (filtered)'}
                      </td>
                      <td className="border p-2 text-center tabular-nums">{totals.present}</td>
                      <td className="border p-2 text-center tabular-nums">{totals.late}</td>
                      <td className="border p-2 text-center tabular-nums">{totals.absent}</td>
                      <td className="border p-2 text-center tabular-nums">{fmtHours(totals.totalHours)}</td>
                      <td className="border p-2 text-center text-muted-foreground" colSpan={dateRange.length * 3}>
                        {ar ? 'عدد الموظفين' : 'Employees'}: {totals.employeesCount}
                        {' • '}
                        {ar ? 'عدد الأيام' : 'Days'}: {dateRange.length}
                        {' • '}
                        {ar ? 'سجلات مطابقة' : 'Matched records'}: {totals.rows}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <WordPreviewDialog
        open={wordPreviewOpen}
        onOpenChange={setWordPreviewOpen}
        html={wordPreviewHtml}
        loading={wordPreviewLoading}
        title={wordPreviewTitle}
        onConfirm={() => {
          if (wordPreviewHtml) {
            downloadWordHtml(wordPreviewHtml, wordPreviewTitle);
            setWordPreviewOpen(false);
          }
        }}
      />
    </div>
  );
};

const SummaryStat = ({ icon: Icon, label, value, color, bg }: { icon: React.ElementType; label: string; value: string | number; color: string; bg: string; }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2.5 rounded-lg', bg)}>
          <Icon className={cn('w-5 h-5', color)} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold tabular-nums">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);
