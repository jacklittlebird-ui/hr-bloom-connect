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
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useReportExport } from '@/hooks/useReportExport';
import { toast } from '@/hooks/use-toast';

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
}

type DayFilter = 'all' | 'present' | 'late' | 'absent';

const PIN_KEY = 'attendanceReport.pinSummary';

function formatTimeCairo(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(iso));
  } catch { return '—'; }
}

function fmtHours(h: number): string {
  if (!h || h <= 0) return '0';
  return (Math.round(h * 100) / 100).toFixed(2);
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const DailyAttendanceReport = () => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { reportRef, handlePrint, exportToPDF, exportToCSV } = useReportExport();

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

  // Load stations + departments once
  useEffect(() => {
    (async () => {
      const [{ data: st }, { data: dp }] = await Promise.all([
        supabase.from('stations').select('id,name_ar,name_en,weekend_days').order('name_ar'),
        supabase.from('departments').select('id,name_ar,name_en'),
      ]);
      setStations((st as StationRow[]) || []);
      setDepartments((dp as DepartmentRow[]) || []);
    })();
  }, []);

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
        const { data: emps, error: empErr } = await empQuery.order('employee_code');
        if (empErr) throw empErr;
        setEmployees((emps as EmployeeRow[]) || []);

        // Paginated fetch of attendance records (up to 20k)
        const recs: AttendanceRow[] = [];
        const pageSize = 1000;
        for (let i = 0; i < 20; i++) {
          const from = i * pageSize;
          const to = from + pageSize - 1;
          const { data, error } = await supabase
            .from('attendance_records')
            .select('employee_id,date,check_in,check_out,work_hours,work_minutes,status,is_late')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true })
            .range(from, to);
          if (error) throw error;
          const rows = (data as AttendanceRow[]) || [];
          recs.push(...rows);
          if (rows.length < pageSize) break;
        }
        setRecords(recs);
      } catch (e) {
        console.error('[DailyAttendanceReport] load error', e);
        toast({ title: ar ? 'تعذر تحميل البيانات' : 'Failed to load data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [fromDate, toDate, stationFilter, ar]);

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
    matchesStatus: boolean; // does this cell match the active status filter?
    kind: 'present' | 'late' | 'absent' | 'none';
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

  type EmpRow = {
    employee: EmployeeRow;
    department: DepartmentRow | null;
    station: StationRow | null;
    cells: DayCell[];
    totals: { present: number; late: number; absent: number; hours: number; matched: number };
  };

  // Visible (pivoted) employee rows. We always render the full date range as columns;
  // the status filter only colors / counts matching cells (no rows are dropped because
  // a single employee can have mixed statuses across days).
  const empRows = useMemo<EmpRow[]>(() => {
    const rows: EmpRow[] = [];
    employees.forEach(emp => {
      if (!visibleEmpIds.has(emp.id)) return;
      const inner = recordIndex.get(emp.id);
      let present = 0, late = 0, absent = 0, hours = 0, matched = 0;
      const cells: DayCell[] = dateRange.map(d => {
        const rec = inner?.get(d) || null;
        let kind: DayCell['kind'] = 'none';
        let h = 0;
        if (rec) {
          h = Number(rec.work_hours || (rec.work_minutes ? rec.work_minutes / 60 : 0)) || 0;
          if (rec.status === 'present' && !rec.is_late) kind = 'present';
          else if (rec.status === 'present' && !!rec.is_late) kind = 'late';
          else if (rec.status === 'absent') kind = 'absent';
        }
        const matchesStatus =
          globalStatusFilter === 'all'
            ? kind !== 'none'
            : kind === globalStatusFilter;
        if (kind === 'present') present++;
        else if (kind === 'late') late++;
        else if (kind === 'absent') absent++;
        if (matchesStatus) {
          matched++;
          if (kind === 'present' || kind === 'late') hours += h;
        }
        return { record: rec, hours: h, matchesStatus, kind };
      });
      // If a status filter is active, hide employees with zero matching days.
      if (globalStatusFilter !== 'all' && matched === 0) return;
      rows.push({
        employee: emp,
        department: emp.department_id ? (deptMap.get(emp.department_id) || null) : null,
        station: emp.station_id ? (stationMap.get(emp.station_id) || null) : null,
        cells,
        totals: { present, late, absent, hours, matched },
      });
    });
    // Sort by station then employee code
    rows.sort((a, b) => {
      const sa = a.station ? (ar ? a.station.name_ar : a.station.name_en) : 'zzz';
      const sb = b.station ? (ar ? b.station.name_ar : b.station.name_en) : 'zzz';
      if (sa !== sb) return sa.localeCompare(sb, 'ar');
      return a.employee.employee_code.localeCompare(b.employee.employee_code);
    });
    return rows;
  }, [employees, visibleEmpIds, recordIndex, dateRange, globalStatusFilter, deptMap, stationMap, ar]);

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
        if (r.status === 'present' && !r.is_late) present++;
        else if (r.status === 'present' && r.is_late) late++;
        else if (r.status === 'absent') absent++;
      });
    });
    return { present, late, absent, total: present + late + absent };
  }, [employees, visibleEmpIds, recordIndex, dateRange]);

  // Totals after status filter (uses per-row totals so they reflect the filter).
  const totals = useMemo(() => {
    let totalHours = 0, present = 0, late = 0, absent = 0, matched = 0;
    const stSet = new Set<string>();
    empRows.forEach(r => {
      if (r.station) stSet.add(r.station.id);
      totalHours += r.totals.hours;
      present += r.totals.present;
      late += r.totals.late;
      absent += r.totals.absent;
      matched += r.totals.matched;
    });
    return {
      totalHours, present, late, absent,
      employeesCount: empRows.length,
      stationsCount: stSet.size,
      rows: matched,
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
      total_hours: fmtHours(r.totals.hours),
    };
    r.cells.forEach((c, i) => {
      const dateKey = dateRange[i];
      row[`${dateKey}__in`] = formatTimeCairo(c.record?.check_in ?? null);
      row[`${dateKey}__out`] = formatTimeCairo(c.record?.check_out ?? null);
      row[`${dateKey}__hours`] = c.kind === 'none' ? '' : fmtHours(c.hours);
      row[`${dateKey}__status`] = c.kind === 'present' ? (ar ? 'حاضر' : 'P')
        : c.kind === 'late' ? (ar ? 'متأخر' : 'L')
        : c.kind === 'absent' ? (ar ? 'غائب' : 'A')
        : '—';
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
              <Button variant="outline" size="sm" onClick={() => exportToCSV({ title: reportTitle, data: buildExportRows(), columns: exportColumns })}>
                <FileText className="w-4 h-4 mr-2" />Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef} className="space-y-6">
        {/* Header summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryStat icon={Building2} label={ar ? 'عدد المحطات' : 'Stations'} value={totals.stationsCount} color="text-blue-600" bg="bg-blue-100" />
          <SummaryStat icon={Users} label={ar ? 'إجمالي الموظفين' : 'Employees'} value={totals.employeesCount} color="text-indigo-600" bg="bg-indigo-100" />
          <SummaryStat icon={Clock} label={ar ? 'إجمالي ساعات العمل' : 'Total Work Hours'} value={fmtHours(totals.totalHours)} color="text-emerald-600" bg="bg-emerald-100" />
          <SummaryStat icon={CalendarDays} label={ar ? 'أيام الحضور' : 'Present Days'} value={totals.present} color="text-green-600" bg="bg-green-100" />
          <SummaryStat icon={CalendarDays} label={ar ? 'أيام الغياب' : 'Absent Days'} value={totals.absent} color="text-red-600" bg="bg-red-100" />
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
                  <span aria-hidden>🕌</span>
                  <span className="font-medium">{ar ? 'الجمعة (عطلة)' : 'Friday (Off)'}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <span className="inline-block w-3 h-3 rounded-sm bg-amber-50 border-2 border-amber-300" aria-hidden />
                  <span className="font-medium">{ar ? 'السبت' : 'Saturday'}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <span className="text-muted-foreground/60">—</span>
                  {ar ? 'لا يوجد سجل' : 'No record'}
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
                          if (c.kind === 'none') {
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
                                </td>
                              </Fragment>
                            );
                          }
                          const isLate = c.kind === 'late';
                          const bg = isLate ? 'bg-amber-50' : 'bg-emerald-50/40';
                          const dimCls = dimmed ? 'opacity-40' : '';
                          const StatusIcon = isLate ? AlertTriangle : CheckCircle2;
                          const statusColor = isLate ? 'text-amber-600' : 'text-emerald-600';
                          const statusTitle = isLate
                            ? (ar ? 'متأخر' : 'Late')
                            : (ar ? 'حاضر' : 'Present');
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
                                  <span>{formatTimeCairo(c.record!.check_out)}</span>
                                </span>
                              </td>
                              <td className={cn(baseCell, bg, dimCls, 'tabular-nums font-semibold')}>{fmtHours(c.hours)}</td>
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
