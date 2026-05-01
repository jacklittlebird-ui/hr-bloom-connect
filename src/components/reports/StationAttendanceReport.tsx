import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Download, Printer, FileText, Building2, Users, Clock, CalendarDays, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useReportExport } from '@/hooks/useReportExport';
import { toast } from '@/hooks/use-toast';

interface StationRow { id: string; name_ar: string; name_en: string; }
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

const monthNamesAr = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const monthNamesEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatTimeCairo(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(iso));
  } catch { return '—'; }
}

// Calendar-aware week index inside a given month.
// weekStart: 0=Sunday, 1=Monday, ..., 6=Saturday.
// Returns 1-based week index. Days in the same calendar week share the same index.
function getWeekOfMonth(dateStr: string, year: number, month: number, weekStart: number): number {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDate();
  // Day-of-week of the 1st of the month (0=Sun..6=Sat)
  const firstDow = new Date(year, month - 1, 1).getDay();
  // How many days from the 1st belong to "week 1" (the partial first calendar week)
  const offset = (firstDow - weekStart + 7) % 7;
  const daysInFirstWeek = 7 - offset;
  if (day <= daysInFirstWeek) return 1;
  return Math.floor((day - daysInFirstWeek - 1) / 7) + 2;
}

// Number of calendar weeks the month spans, given a week-start day.
function getWeeksInMonth(year: number, month: number, weekStart: number): number {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = (firstDow - weekStart + 7) % 7;
  const daysInFirstWeek = 7 - offset;
  if (daysInMonth <= daysInFirstWeek) return 1;
  return 1 + Math.ceil((daysInMonth - daysInFirstWeek) / 7);
}

// Inclusive date range (DD/MM) covered by a given 1-based week index in the month.
function getWeekRangeLabel(weekIdx: number, year: number, month: number, weekStart: number): string {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const offset = (firstDow - weekStart + 7) % 7;
  const daysInFirstWeek = 7 - offset;
  let startDay: number, endDay: number;
  if (weekIdx === 1) { startDay = 1; endDay = Math.min(daysInFirstWeek, daysInMonth); }
  else {
    startDay = daysInFirstWeek + (weekIdx - 2) * 7 + 1;
    endDay = Math.min(startDay + 6, daysInMonth);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(startDay)}–${pad(endDay)}/${pad(month)}`;
}

function fmtHours(h: number): string {
  if (!h || h <= 0) return '0';
  return (Math.round(h * 100) / 100).toFixed(2);
}

export const StationAttendanceReport = () => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { reportRef, handlePrint, exportToPDF, exportToCSV } = useReportExport();

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1..12
  const [stationFilter, setStationFilter] = useState<string>('all');
  // Week start: 6=Saturday (default for Egypt/Arabic context), 0=Sunday, 1=Monday
  const [weekStart, setWeekStart] = useState<number>(() => {
    const saved = localStorage.getItem('attendanceReport.weekStart');
    return saved !== null ? Number(saved) : 6;
  });
  useEffect(() => { localStorage.setItem('attendanceReport.weekStart', String(weekStart)); }, [weekStart]);
  const [loading, setLoading] = useState(false);
  const [expandedEmp, setExpandedEmp] = useState<Set<string>>(new Set());
  type DayFilter = 'all' | 'present' | 'late' | 'absent';
  const [globalStatusFilter, setGlobalStatusFilter] = useState<DayFilter>('all');
  const [dayFilter, setDayFilter] = useState<Map<string, DayFilter>>(new Map());
  // Pin the per-employee summary row to the top while scrolling daily details
  const [pinSummary, setPinSummary] = useState<boolean>(() => {
    const saved = localStorage.getItem('attendanceReport.pinSummary');
    return saved === null ? true : saved === '1';
  });
  useEffect(() => { localStorage.setItem('attendanceReport.pinSummary', pinSummary ? '1' : '0'); }, [pinSummary]);

  // Per-employee filter falls back to the global filter when not explicitly overridden
  const getDayFilter = (id: string): DayFilter => dayFilter.get(id) ?? globalStatusFilter;
  const setEmpDayFilter = (id: string, f: DayFilter) => {
    setDayFilter(prev => {
      const next = new Map(prev);
      next.set(id, f);
      return next;
    });
  };

  const toggleEmp = (id: string) => {
    setExpandedEmp(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const [stations, setStations] = useState<StationRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [records, setRecords] = useState<AttendanceRow[]>([]);

  // Load stations + departments once
  useEffect(() => {
    (async () => {
      const [{ data: st }, { data: dp }] = await Promise.all([
        supabase.from('stations').select('id,name_ar,name_en').order('name_ar'),
        supabase.from('departments').select('id,name_ar,name_en'),
      ]);
      setStations((st as StationRow[]) || []);
      setDepartments((dp as DepartmentRow[]) || []);
    })();
  }, []);

  // Load employees + month attendance whenever filters change
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDateObj = new Date(year, month, 0); // last day of selected month
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

        // Fetch employees in batches of 1000 for the active set
        let empQuery = supabase.from('employees')
          .select('id,employee_code,name_ar,name_en,station_id,department_id')
          .eq('status', 'active');
        if (stationFilter !== 'all') empQuery = empQuery.eq('station_id', stationFilter);
        const { data: emps, error: empErr } = await empQuery.order('employee_code');
        if (empErr) throw empErr;
        const empList = (emps as EmployeeRow[]) || [];
        setEmployees(empList);

        // Fetch attendance records for the month using pagination (.range) up to 10k
        const recs: AttendanceRow[] = [];
        const pageSize = 1000;
        for (let i = 0; i < 10; i++) {
          const from = i * pageSize;
          const to = from + pageSize - 1;
          const { data, error } = await supabase
            .from('attendance_records')
            .select('employee_id,date,check_in,check_out,work_hours,work_minutes,status,is_late')
            .gte('date', startDate)
            .lte('date', endDate)
            .range(from, to);
          if (error) throw error;
          const rows = (data as AttendanceRow[]) || [];
          recs.push(...rows);
          if (rows.length < pageSize) break;
        }
        setRecords(recs);
      } catch (e) {
        console.error('[StationAttendanceReport] load error', e);
        toast({ title: ar ? 'تعذر تحميل البيانات' : 'Failed to load data', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [year, month, stationFilter, ar]);

  const stationMap = useMemo(() => {
    const m = new Map<string, StationRow>();
    stations.forEach(s => m.set(s.id, s));
    return m;
  }, [stations]);

  const deptMap = useMemo(() => {
    const m = new Map<string, DepartmentRow>();
    departments.forEach(d => m.set(d.id, d));
    return m;
  }, [departments]);

  // Filter to only employees that belong to a station (skip unassigned for cleanliness)
  const visibleEmployees = useMemo(
    () => employees.filter(e => !!e.station_id),
    [employees],
  );

  // Group records by employee
  const recordsByEmp = useMemo(() => {
    const m = new Map<string, AttendanceRow[]>();
    records.forEach(r => {
      const arr = m.get(r.employee_id) || [];
      arr.push(r);
      m.set(r.employee_id, arr);
    });
    return m;
  }, [records]);

  // Number of calendar weeks the selected month actually spans (4..6) given weekStart
  const weeksCount = useMemo(() => getWeeksInMonth(year, month, weekStart), [year, month, weekStart]);
  const weekRangeLabels = useMemo(
    () => Array.from({ length: weeksCount }, (_, i) => getWeekRangeLabel(i + 1, year, month, weekStart)),
    [weeksCount, year, month, weekStart],
  );

  // Aggregate per employee
  const empSummaries = useMemo(() => {
    return visibleEmployees.map(emp => {
      const recs = recordsByEmp.get(emp.id) || [];
      const weeks = Array.from({ length: weeksCount }, () => 0);
      const weekDays = Array.from({ length: weeksCount }, () => 0);
      let totalHours = 0;
      let presentDays = 0;
      let lateDays = 0;
      let absentDays = 0;
      recs.forEach(r => {
        const w = getWeekOfMonth(r.date, year, month, weekStart) - 1;
        if (w < 0 || w >= weeksCount) return;
        const h = Number(r.work_hours || (r.work_minutes ? r.work_minutes / 60 : 0)) || 0;
        weeks[w] += h;
        if (r.status === 'present') {
          presentDays++;
          weekDays[w]++;
          totalHours += h;
          if (r.is_late) lateDays++;
        } else if (r.status === 'absent') {
          absentDays++;
        }
      });
      return {
        employee: emp,
        records: recs.sort((a, b) => a.date.localeCompare(b.date)),
        weeks, weekDays,
        totalHours, presentDays, lateDays, absentDays,
      };
    });
  }, [visibleEmployees, recordsByEmp, weeksCount, year, month, weekStart]);

  // Group by station
  const stationGroups = useMemo(() => {
    const groups = new Map<string, { station: StationRow | null; rows: typeof empSummaries }>();
    empSummaries.forEach(row => {
      const sid = row.employee.station_id || 'none';
      if (!groups.has(sid)) {
        groups.set(sid, { station: stationMap.get(sid) || null, rows: [] });
      }
      groups.get(sid)!.rows.push(row);
    });
    // sort station groups by station name
    return Array.from(groups.values()).sort((a, b) => {
      const an = a.station ? (ar ? a.station.name_ar : a.station.name_en) : 'zzz';
      const bn = b.station ? (ar ? b.station.name_ar : b.station.name_en) : 'zzz';
      return an.localeCompare(bn, 'ar');
    });
  }, [empSummaries, stationMap, ar]);

  // Overall totals
  const totals = useMemo(() => {
    let employeesCount = 0, totalHours = 0, presentDays = 0, lateDays = 0, absentDays = 0;
    empSummaries.forEach(r => {
      employeesCount++;
      totalHours += r.totalHours;
      presentDays += r.presentDays;
      lateDays += r.lateDays;
      absentDays += r.absentDays;
    });
    return { employeesCount, totalHours, presentDays, lateDays, absentDays, stationsCount: stationGroups.length };
  }, [empSummaries, stationGroups]);

  // Export rows: one row per employee with weekly breakdown (dynamic week count)
  const buildExportRows = () => {
    const rows: Record<string, unknown>[] = [];
    stationGroups.forEach(group => {
      const stName = group.station ? (ar ? group.station.name_ar : group.station.name_en) : (ar ? 'بدون محطة' : 'No Station');
      group.rows.forEach((r, idx) => {
        const dept = r.employee.department_id ? deptMap.get(r.employee.department_id) : null;
        const row: Record<string, unknown> = {
          _idx: idx + 1,
          station: stName,
          code: r.employee.employee_code,
          name: ar ? r.employee.name_ar : r.employee.name_en,
          department: dept ? (ar ? dept.name_ar : dept.name_en) : '—',
          present: r.presentDays,
          late: r.lateDays,
          absent: r.absentDays,
        };
        for (let i = 0; i < weeksCount; i++) row[`w${i + 1}`] = fmtHours(r.weeks[i] || 0);
        row.total = fmtHours(r.totalHours);
        rows.push(row);
      });
      // station subtotal row
      const sub = group.rows.reduce((acc, r) => {
        acc.present += r.presentDays; acc.late += r.lateDays; acc.absent += r.absentDays;
        acc.total += r.totalHours;
        for (let i = 0; i < weeksCount; i++) acc.weeks[i] = (acc.weeks[i] || 0) + (r.weeks[i] || 0);
        return acc;
      }, { present: 0, late: 0, absent: 0, total: 0, weeks: Array.from({ length: weeksCount }, () => 0) as number[] });
      const subRow: Record<string, unknown> = {
        _idx: '',
        station: stName,
        code: ar ? 'مجموع المحطة' : 'Station Total',
        name: `${group.rows.length} ${ar ? 'موظف' : 'employees'}`,
        department: '',
        present: sub.present,
        late: sub.late,
        absent: sub.absent,
      };
      for (let i = 0; i < weeksCount; i++) subRow[`w${i + 1}`] = fmtHours(sub.weeks[i] || 0);
      subRow.total = fmtHours(sub.total);
      rows.push(subRow);
    });
    return rows;
  };

  const exportColumns = [
    { header: '#', key: '_idx' },
    { header: ar ? 'المحطة' : 'Station', key: 'station' },
    { header: ar ? 'الكود' : 'Code', key: 'code' },
    { header: ar ? 'الاسم' : 'Name', key: 'name' },
    { header: ar ? 'القسم' : 'Department', key: 'department' },
    { header: ar ? 'حضور' : 'Present', key: 'present' },
    { header: ar ? 'تأخير' : 'Late', key: 'late' },
    { header: ar ? 'غياب' : 'Absent', key: 'absent' },
    ...Array.from({ length: weeksCount }, (_, i) => ({
      header: `${ar ? 'أسبوع' : 'Week'} ${i + 1} (${weekRangeLabels[i]})`,
      key: `w${i + 1}`,
    })),
    { header: ar ? 'إجمالي ساعات الشهر' : 'Monthly Total Hours', key: 'total' },
  ];

  const monthLabel = ar ? monthNamesAr[month - 1] : monthNamesEn[month - 1];
  const reportTitle = ar
    ? `تقرير الحضور والانصراف الشهري — ${monthLabel} ${year}`
    : `Monthly Attendance Report — ${monthLabel} ${year}`;

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={cn('flex flex-wrap gap-3 items-center justify-between', isRTL && 'flex-row-reverse')}>
            <div className={cn('flex flex-wrap gap-3', isRTL && 'flex-row-reverse')}>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(ar ? monthNamesAr : monthNamesEn).map((n, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={stationFilter} onValueChange={setStationFilter}>
                <SelectTrigger className="w-56"><SelectValue placeholder={ar ? 'كل المحطات' : 'All Stations'} /></SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  <SelectItem value="all">{ar ? 'كل المحطات' : 'All Stations'}</SelectItem>
                  {stations.map(s => (
                    <SelectItem key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(weekStart)} onValueChange={(v) => setWeekStart(Number(v))}>
                <SelectTrigger className="w-44"><SelectValue placeholder={ar ? 'بداية الأسبوع' : 'Week starts on'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">{ar ? 'يبدأ السبت' : 'Starts Saturday'}</SelectItem>
                  <SelectItem value="0">{ar ? 'يبدأ الأحد' : 'Starts Sunday'}</SelectItem>
                  <SelectItem value="1">{ar ? 'يبدأ الإثنين' : 'Starts Monday'}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={globalStatusFilter}
                onValueChange={(v) => {
                  setGlobalStatusFilter(v as DayFilter);
                  // Reset per-employee overrides so the global filter applies to everyone
                  setDayFilter(new Map());
                }}
              >
                <SelectTrigger className="w-44"><SelectValue placeholder={ar ? 'حالة الأيام' : 'Day Status'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? `كل الحالات (${totals.presentDays + totals.lateDays + totals.absentDays})` : `All Statuses (${totals.presentDays + totals.lateDays + totals.absentDays})`}</SelectItem>
                  <SelectItem value="present">{ar ? `حاضر فقط (${totals.presentDays})` : `Present only (${totals.presentDays})`}</SelectItem>
                  <SelectItem value="late">{ar ? `متأخر فقط (${totals.lateDays})` : `Late only (${totals.lateDays})`}</SelectItem>
                  <SelectItem value="absent">{ar ? `غائب فقط (${totals.absentDays})` : `Absent only (${totals.absentDays})`}</SelectItem>
                </SelectContent>
              </Select>
              {/* Status counters next to the filter */}
              <div className={cn('flex items-center gap-1.5 flex-wrap', isRTL && 'flex-row-reverse')}>
                <Badge
                  className={cn('cursor-pointer text-xs', globalStatusFilter === 'present' ? 'bg-green-700 hover:bg-green-700' : 'bg-green-600 hover:bg-green-600')}
                  onClick={() => { setGlobalStatusFilter('present'); setDayFilter(new Map()); }}
                >
                  {ar ? 'حاضر' : 'Present'}: <span className="ms-1 tabular-nums">{totals.presentDays}</span>
                </Badge>
                <Badge
                  className={cn('cursor-pointer text-xs', globalStatusFilter === 'late' ? 'bg-amber-600 hover:bg-amber-600' : 'bg-amber-500 hover:bg-amber-500')}
                  onClick={() => { setGlobalStatusFilter('late'); setDayFilter(new Map()); }}
                >
                  {ar ? 'متأخر' : 'Late'}: <span className="ms-1 tabular-nums">{totals.lateDays}</span>
                </Badge>
                <Badge
                  className={cn('cursor-pointer text-xs', globalStatusFilter === 'absent' ? 'bg-red-700 hover:bg-red-700' : 'bg-red-600 hover:bg-red-600')}
                  onClick={() => { setGlobalStatusFilter('absent'); setDayFilter(new Map()); }}
                >
                  {ar ? 'غائب' : 'Absent'}: <span className="ms-1 tabular-nums">{totals.absentDays}</span>
                </Badge>
                {globalStatusFilter !== 'all' && (
                  <Badge
                    variant="outline"
                    className="cursor-pointer text-xs"
                    onClick={() => { setGlobalStatusFilter('all'); setDayFilter(new Map()); }}
                  >
                    {ar ? 'إعادة تعيين' : 'Reset'}
                  </Badge>
                )}
              </div>
              <div className={cn('flex items-center gap-2 px-2 py-1 rounded-md border bg-background', isRTL && 'flex-row-reverse')}>
                <Switch id="pin-summary" checked={pinSummary} onCheckedChange={setPinSummary} />
                <Label htmlFor="pin-summary" className="text-xs cursor-pointer whitespace-nowrap">
                  {ar ? 'تثبيت ملخص الموظف أعلى الجدول' : 'Pin employee summary on top'}
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
          <SummaryStat icon={CalendarDays} label={ar ? 'أيام الحضور' : 'Present Days'} value={totals.presentDays} color="text-green-600" bg="bg-green-100" />
          <SummaryStat icon={CalendarDays} label={ar ? 'أيام الغياب' : 'Absent Days'} value={totals.absentDays} color="text-red-600" bg="bg-red-100" />
        </div>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {!loading && stationGroups.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">
            {ar ? 'لا توجد بيانات حضور لهذه الفترة' : 'No attendance data for this period'}
          </CardContent></Card>
        )}

        {/* Per station */}
        {!loading && stationGroups.map(group => {
          const stName = group.station ? (ar ? group.station.name_ar : group.station.name_en) : (ar ? 'بدون محطة' : 'No Station');
          const sub = group.rows.reduce((acc, r) => {
            acc.present += r.presentDays; acc.late += r.lateDays; acc.absent += r.absentDays;
            acc.total += r.totalHours;
            for (let i = 0; i < weeksCount; i++) acc.weeks[i] = (acc.weeks[i] || 0) + (r.weeks[i] || 0);
            return acc;
          }, { present: 0, late: 0, absent: 0, total: 0, weeks: Array.from({ length: weeksCount }, () => 0) as number[] });

          return (
            <Card key={(group.station?.id) || 'none'} className="overflow-hidden border-2">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                <div className={cn('flex items-center justify-between flex-wrap gap-2', isRTL && 'flex-row-reverse')}>
                  <CardTitle className={cn('flex items-center gap-2 text-lg', isRTL && 'flex-row-reverse')}>
                    <Building2 className="w-5 h-5 text-primary" />
                    <span>{stName}</span>
                    <Badge variant="secondary">{group.rows.length} {ar ? 'موظف' : 'employees'}</Badge>
                  </CardTitle>
                  <div className={cn('flex items-center gap-2 text-sm', isRTL && 'flex-row-reverse')}>
                    <Badge className="bg-emerald-600 hover:bg-emerald-600">{ar ? 'إجمالي الساعات' : 'Total Hours'}: {fmtHours(sub.total)}</Badge>
                    <Badge className="bg-green-600 hover:bg-green-600">{ar ? 'حضور' : 'Present'}: {sub.present}</Badge>
                    <Badge className="bg-amber-500 hover:bg-amber-500">{ar ? 'تأخير' : 'Late'}: {sub.late}</Badge>
                    <Badge className="bg-red-600 hover:bg-red-600">{ar ? 'غياب' : 'Absent'}: {sub.absent}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>{ar ? 'الكود' : 'Code'}</TableHead>
                        <TableHead className="min-w-[200px]">{ar ? 'الاسم' : 'Name'}</TableHead>
                        <TableHead>{ar ? 'القسم' : 'Department'}</TableHead>
                        <TableHead className="text-center">{ar ? 'حضور' : 'Present'}</TableHead>
                        <TableHead className="text-center">{ar ? 'تأخير' : 'Late'}</TableHead>
                        <TableHead className="text-center">{ar ? 'غياب' : 'Absent'}</TableHead>
                        {Array.from({ length: weeksCount }, (_, i) => (
                          <TableHead key={i} className="text-center bg-blue-50 whitespace-nowrap">
                            <div className="leading-tight">
                              <div>{ar ? `أسبوع ${i + 1}` : `Week ${i + 1}`}</div>
                              <div className="text-[10px] font-normal text-muted-foreground tabular-nums">{weekRangeLabels[i]}</div>
                            </div>
                          </TableHead>
                        ))}
                        <TableHead className="text-center bg-emerald-50 font-bold">{ar ? 'إجمالي شهري' : 'Monthly Total'}</TableHead>
                        <TableHead className="text-center w-32">{ar ? 'تفاصيل الأيام' : 'Daily Details'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.rows.map((r, idx) => {
                        const dept = r.employee.department_id ? deptMap.get(r.employee.department_id) : null;
                        const isOpen = expandedEmp.has(r.employee.id);
                        return (
                          <>
                            <TableRow key={r.employee.id} className={cn('hover:bg-muted/30', isOpen && 'bg-primary/5')}>
                              <TableCell className="text-center text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="font-mono text-xs">{r.employee.employee_code}</TableCell>
                              <TableCell className="font-medium whitespace-pre-wrap break-words">{ar ? r.employee.name_ar : r.employee.name_en}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{dept ? (ar ? dept.name_ar : dept.name_en) : '—'}</TableCell>
                              <TableCell className="text-center text-green-700 font-semibold">{r.presentDays}</TableCell>
                              <TableCell className="text-center text-amber-600">{r.lateDays}</TableCell>
                              <TableCell className="text-center text-red-600">{r.absentDays}</TableCell>
                              {r.weeks.map((h, i) => (
                                <TableCell key={i} className="text-center tabular-nums">{fmtHours(h)}</TableCell>
                              ))}
                              <TableCell className="text-center tabular-nums font-bold bg-emerald-50/50">{fmtHours(r.totalHours)}</TableCell>
                              <TableCell className="text-center">
                                <Button
                                  variant={isOpen ? 'default' : 'outline'}
                                  size="sm"
                                  className="h-8 gap-1"
                                  onClick={() => toggleEmp(r.employee.id)}
                                  aria-expanded={isOpen}
                                  aria-label={ar ? 'عرض التفاصيل اليومية' : 'Show daily details'}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="text-xs">{isOpen ? (ar ? 'إخفاء' : 'Hide') : (ar ? 'عرض' : 'View')}</span>
                                  {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {isOpen && (
                              <TableRow key={`${r.employee.id}-details`} className="bg-muted/20 hover:bg-muted/20">
                                <TableCell colSpan={9 + weeksCount} className="p-4">
                                  <div className={cn('flex items-center justify-between mb-3 flex-wrap gap-2', isRTL && 'flex-row-reverse')}>
                                    <div className="font-semibold text-sm">
                                      {ar ? '📋 التفاصيل اليومية' : '📋 Daily Details'} — {r.employee.employee_code} — {ar ? r.employee.name_ar : r.employee.name_en}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {ar ? 'إجمالي السجلات' : 'Records'}: {r.records.length}
                                    </div>
                                  </div>
                                  {(() => {
                                    const f = getDayFilter(r.employee.id);
                                    const filtered = r.records.filter(rec => {
                                      if (f === 'all') return true;
                                      if (f === 'absent') return rec.status === 'absent';
                                      if (f === 'late') return rec.status === 'present' && !!rec.is_late;
                                      if (f === 'present') return rec.status === 'present' && !rec.is_late;
                                      return true;
                                    });
                                    const recHours = (x: AttendanceRow) =>
                                      Number(x.work_hours || (x.work_minutes ? x.work_minutes / 60 : 0)) || 0;
                                    const counts = {
                                      all: r.records.length,
                                      present: r.records.filter(x => x.status === 'present' && !x.is_late).length,
                                      late: r.records.filter(x => x.status === 'present' && !!x.is_late).length,
                                      absent: r.records.filter(x => x.status === 'absent').length,
                                    };
                                    const filteredHours = filtered.reduce((s, x) => s + recHours(x), 0);
                                    const filteredPresent = filtered.filter(x => x.status === 'present' && !x.is_late).length;
                                    const filteredLate = filtered.filter(x => x.status === 'present' && !!x.is_late).length;
                                    const filteredAbsent = filtered.filter(x => x.status === 'absent').length;
                                    const filterLabels: Record<DayFilter, string> = {
                                      all: ar ? 'كل الحالات' : 'All',
                                      present: ar ? 'حاضر' : 'Present',
                                      late: ar ? 'متأخر' : 'Late',
                                      absent: ar ? 'غائب' : 'Absent',
                                    };
                                    const FilterBtn = ({ k, label, cls }: { k: DayFilter; label: string; cls?: string }) => (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={f === k ? 'default' : 'outline'}
                                        className={cn('h-7 px-2 text-xs', f === k && cls)}
                                        onClick={() => setEmpDayFilter(r.employee.id, k)}
                                      >
                                        {label} <span className="ms-1 opacity-70 tabular-nums">({counts[k]})</span>
                                      </Button>
                                    );
                                    return (
                                      <>
                                        <div className={cn('flex flex-wrap gap-2 mb-3', isRTL && 'flex-row-reverse')}>
                                          <FilterBtn k="all" label={ar ? 'الكل' : 'All'} />
                                          <FilterBtn k="present" label={ar ? 'حاضر' : 'Present'} cls="bg-green-600 hover:bg-green-600" />
                                          <FilterBtn k="late" label={ar ? 'متأخر' : 'Late'} cls="bg-amber-500 hover:bg-amber-500" />
                                          <FilterBtn k="absent" label={ar ? 'غائب' : 'Absent'} cls="bg-red-600 hover:bg-red-600" />
                                        </div>
                                        {/* Filter-aware summary */}
                                        <div className={cn('flex flex-wrap gap-2 mb-3 items-center', isRTL && 'flex-row-reverse')}>
                                          <Badge variant="outline" className="text-xs">
                                            {ar ? 'التصفية' : 'Filter'}: {filterLabels[f]}
                                          </Badge>
                                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-xs">
                                            {ar ? 'إجمالي الساعات' : 'Total Hours'}: <span className="ms-1 tabular-nums">{fmtHours(filteredHours)}</span>
                                          </Badge>
                                          <Badge className="bg-blue-600 hover:bg-blue-600 text-xs">
                                            {ar ? 'عدد الأيام' : 'Days'}: <span className="ms-1 tabular-nums">{filtered.length}</span>
                                          </Badge>
                                          <Badge className="bg-green-600 hover:bg-green-600 text-xs">{ar ? 'حاضر' : 'Present'}: {filteredPresent}</Badge>
                                          <Badge className="bg-amber-500 hover:bg-amber-500 text-xs">{ar ? 'متأخر' : 'Late'}: {filteredLate}</Badge>
                                          <Badge className="bg-red-600 hover:bg-red-600 text-xs">{ar ? 'غائب' : 'Absent'}: {filteredAbsent}</Badge>
                                        </div>
                                        {filtered.length === 0 ? (
                                          <p className="text-xs text-muted-foreground text-center py-4">{ar ? 'لا توجد سجلات مطابقة للتصفية' : 'No records match this filter'}</p>
                                        ) : (
                                          <div className={cn('overflow-auto bg-background rounded-lg border', pinSummary && 'max-h-[420px]')}>
                                            <table className="w-full text-xs border-collapse">
                                              <thead>
                                                {pinSummary && (
                                                  <tr className="bg-emerald-50 font-bold sticky top-0 z-20 shadow-sm">
                                                    <td className="border p-2 text-center" colSpan={3}>
                                                      {ar ? 'ملخص الموظف (بعد التصفية)' : 'Employee Summary (filtered)'}
                                                    </td>
                                                    <td className="border p-2 text-center tabular-nums">
                                                      {ar ? 'عدد الأيام' : 'Days'}: {filtered.length}
                                                    </td>
                                                    <td className="border p-2 text-center tabular-nums">{fmtHours(filteredHours)}</td>
                                                    <td className="border p-2 text-center">
                                                      <div className={cn('flex flex-wrap gap-1 justify-center items-center', isRTL && 'flex-row-reverse')}>
                                                        <Badge className="bg-green-600 hover:bg-green-600 text-[10px] h-5 px-1.5">
                                                          {ar ? 'حاضر' : 'P'}: {filteredPresent}
                                                        </Badge>
                                                        <Badge className="bg-amber-500 hover:bg-amber-500 text-[10px] h-5 px-1.5">
                                                          {ar ? 'متأخر' : 'L'}: {filteredLate}
                                                        </Badge>
                                                        <Badge className="bg-red-600 hover:bg-red-600 text-[10px] h-5 px-1.5">
                                                          {ar ? 'غائب' : 'A'}: {filteredAbsent}
                                                        </Badge>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                )}
                                                <tr className={cn('bg-muted/40', pinSummary && 'sticky z-10 shadow-sm')} style={pinSummary ? { top: '41px' } : undefined}>
                                                  <th className="border p-2 text-center">{ar ? 'التاريخ' : 'Date'}</th>
                                                  <th className="border p-2 text-center">{ar ? 'الأسبوع' : 'Week'}</th>
                                                  <th className="border p-2 text-center">{ar ? 'الحضور' : 'Check-in'}</th>
                                                  <th className="border p-2 text-center">{ar ? 'الانصراف' : 'Check-out'}</th>
                                                  <th className="border p-2 text-center">{ar ? 'الساعات' : 'Hours'}</th>
                                                  <th className="border p-2 text-center">{ar ? 'الحالة' : 'Status'}</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {filtered.map((rec, i) => {
                                                  const hours = Number(rec.work_hours || (rec.work_minutes ? rec.work_minutes / 60 : 0)) || 0;
                                                  const dateObj = new Date(rec.date + 'T00:00:00');
                                                  const dayLabel = dateObj.toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { weekday: 'short', day: '2-digit', month: '2-digit' });
                                                  return (
                                                    <tr key={i} className={rec.status === 'absent' ? 'bg-red-50' : ''}>
                                                      <td className="border p-2 text-center">{dayLabel}</td>
                                                      <td className="border p-2 text-center">W{getWeekOfMonth(rec.date, year, month, weekStart)}</td>
                                                      <td className="border p-2 text-center font-mono">{formatTimeCairo(rec.check_in)}</td>
                                                      <td className="border p-2 text-center font-mono">{formatTimeCairo(rec.check_out)}</td>
                                                      <td className="border p-2 text-center tabular-nums">{fmtHours(hours)}</td>
                                                      <td className="border p-2 text-center">
                                                        {rec.status === 'present' && (
                                                          <Badge variant={rec.is_late ? 'outline' : 'secondary'} className={rec.is_late ? 'text-amber-700 border-amber-400' : ''}>
                                                            {rec.is_late ? (ar ? 'متأخر' : 'Late') : (ar ? 'حاضر' : 'Present')}
                                                          </Badge>
                                                        )}
                                                        {rec.status === 'absent' && <Badge variant="destructive">{ar ? 'غائب' : 'Absent'}</Badge>}
                                                        {rec.status !== 'present' && rec.status !== 'absent' && <Badge variant="outline">{rec.status}</Badge>}
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                              <tfoot>
                                                <tr className="bg-emerald-50 font-bold">
                                                  <td className="border p-2 text-center" colSpan={3}>
                                                    {ar ? 'الإجمالي بعد التصفية' : 'Filtered Total'}
                                                  </td>
                                                  <td className="border p-2 text-center tabular-nums">
                                                    {ar ? 'عدد الأيام' : 'Days'}: {filtered.length}
                                                  </td>
                                                  <td className="border p-2 text-center tabular-nums">{fmtHours(filteredHours)}</td>
                                                  <td className="border p-2 text-center">
                                                    <div className={cn('flex flex-wrap gap-1 justify-center items-center', isRTL && 'flex-row-reverse')}>
                                                      <Badge className="bg-green-600 hover:bg-green-600 text-[10px] h-5 px-1.5">
                                                        {ar ? 'حاضر' : 'P'}: {filteredPresent}
                                                      </Badge>
                                                      <Badge className="bg-amber-500 hover:bg-amber-500 text-[10px] h-5 px-1.5">
                                                        {ar ? 'متأخر' : 'L'}: {filteredLate}
                                                      </Badge>
                                                      <Badge className="bg-red-600 hover:bg-red-600 text-[10px] h-5 px-1.5">
                                                        {ar ? 'غائب' : 'A'}: {filteredAbsent}
                                                      </Badge>
                                                    </div>
                                                  </td>
                                                </tr>
                                              </tfoot>
                                            </table>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                      <TableRow className="bg-primary/10 font-bold">
                        <TableCell colSpan={4} className="text-end">{ar ? 'مجموع المحطة' : 'Station Total'}</TableCell>
                        <TableCell className="text-center">{sub.present}</TableCell>
                        <TableCell className="text-center">{sub.late}</TableCell>
                        <TableCell className="text-center">{sub.absent}</TableCell>
                        {sub.weeks.map((h, i) => (
                          <TableCell key={i} className="text-center tabular-nums">{fmtHours(h)}</TableCell>
                        ))}
                        <TableCell className="text-center tabular-nums">{fmtHours(sub.total)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
