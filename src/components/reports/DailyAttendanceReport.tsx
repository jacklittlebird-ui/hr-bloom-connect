import { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import { Input } from '@/components/ui/input';
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
        supabase.from('stations').select('id,name_ar,name_en').order('name_ar'),
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

  // Build flat daily rows
  type FlatRow = AttendanceRow & {
    employee: EmployeeRow;
    department: DepartmentRow | null;
    station: StationRow | null;
    hours: number;
  };

  const flatRows = useMemo<FlatRow[]>(() => {
    const out: FlatRow[] = [];
    records.forEach(r => {
      const emp = empMap.get(r.employee_id);
      if (!emp) return;
      if (!visibleEmpIds.has(emp.id)) return;
      // Status filter
      if (globalStatusFilter !== 'all') {
        if (globalStatusFilter === 'absent' && r.status !== 'absent') return;
        if (globalStatusFilter === 'late' && !(r.status === 'present' && !!r.is_late)) return;
        if (globalStatusFilter === 'present' && !(r.status === 'present' && !r.is_late)) return;
      }
      const hours = Number(r.work_hours || (r.work_minutes ? r.work_minutes / 60 : 0)) || 0;
      out.push({
        ...r,
        employee: emp,
        department: emp.department_id ? (deptMap.get(emp.department_id) || null) : null,
        station: emp.station_id ? (stationMap.get(emp.station_id) || null) : null,
        hours,
      });
    });
    // Sort by date asc, then station, then employee code
    out.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const sa = a.station ? (ar ? a.station.name_ar : a.station.name_en) : 'zzz';
      const sb = b.station ? (ar ? b.station.name_ar : b.station.name_en) : 'zzz';
      if (sa !== sb) return sa.localeCompare(sb, 'ar');
      return a.employee.employee_code.localeCompare(b.employee.employee_code);
    });
    return out;
  }, [records, empMap, visibleEmpIds, globalStatusFilter, deptMap, stationMap, ar]);

  // Counters (for the badges) — always show counts BEFORE the status filter
  const counters = useMemo(() => {
    let present = 0, late = 0, absent = 0;
    records.forEach(r => {
      const emp = empMap.get(r.employee_id);
      if (!emp || !visibleEmpIds.has(emp.id)) return;
      if (r.status === 'present' && !r.is_late) present++;
      else if (r.status === 'present' && r.is_late) late++;
      else if (r.status === 'absent') absent++;
    });
    return { present, late, absent, total: present + late + absent };
  }, [records, empMap, visibleEmpIds]);

  // Totals after status filter
  const totals = useMemo(() => {
    let totalHours = 0, present = 0, late = 0, absent = 0;
    const empSet = new Set<string>();
    const stSet = new Set<string>();
    flatRows.forEach(r => {
      empSet.add(r.employee.id);
      if (r.station) stSet.add(r.station.id);
      totalHours += r.hours;
      if (r.status === 'present' && !r.is_late) present++;
      else if (r.status === 'present' && r.is_late) late++;
      else if (r.status === 'absent') absent++;
    });
    return {
      totalHours, present, late, absent,
      employeesCount: empSet.size,
      stationsCount: stSet.size,
      rows: flatRows.length,
    };
  }, [flatRows]);

  const buildExportRows = () => flatRows.map((r, idx) => ({
    _idx: idx + 1,
    date: r.date,
    station: r.station ? (ar ? r.station.name_ar : r.station.name_en) : (ar ? 'بدون محطة' : 'No Station'),
    code: r.employee.employee_code,
    name: ar ? r.employee.name_ar : r.employee.name_en,
    department: r.department ? (ar ? r.department.name_ar : r.department.name_en) : '—',
    check_in: formatTimeCairo(r.check_in),
    check_out: formatTimeCairo(r.check_out),
    hours: fmtHours(r.hours),
    status: r.status === 'absent'
      ? (ar ? 'غائب' : 'Absent')
      : r.is_late
        ? (ar ? 'متأخر' : 'Late')
        : (ar ? 'حاضر' : 'Present'),
  }));

  const exportColumns = [
    { header: '#', key: '_idx' },
    { header: ar ? 'التاريخ' : 'Date', key: 'date' },
    { header: ar ? 'المحطة' : 'Station', key: 'station' },
    { header: ar ? 'الكود' : 'Code', key: 'code' },
    { header: ar ? 'الاسم' : 'Name', key: 'name' },
    { header: ar ? 'القسم' : 'Department', key: 'department' },
    { header: ar ? 'الحضور' : 'Check-in', key: 'check_in' },
    { header: ar ? 'الانصراف' : 'Check-out', key: 'check_out' },
    { header: ar ? 'الساعات' : 'Hours', key: 'hours' },
    { header: ar ? 'الحالة' : 'Status', key: 'status' },
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

        {!loading && flatRows.length === 0 && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">
            {ar ? 'لا توجد بيانات حضور لهذه الفترة' : 'No attendance data for this period'}
          </CardContent></Card>
        )}

        {!loading && flatRows.length > 0 && (
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className={cn('overflow-auto bg-background', pinSummary && 'max-h-[640px]')}>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    {pinSummary && (
                      <tr className="bg-emerald-50 font-bold sticky top-0 z-20 shadow-sm">
                        <td className="border p-2 text-center" colSpan={5}>
                          {ar ? 'الإجمالي بعد التصفية' : 'Filtered Total'}
                        </td>
                        <td className="border p-2 text-center tabular-nums" colSpan={3}>
                          {ar ? 'عدد السجلات' : 'Records'}: {totals.rows}
                        </td>
                        <td className="border p-2 text-center tabular-nums">{fmtHours(totals.totalHours)}</td>
                        <td className="border p-2 text-center">
                          <div className={cn('flex flex-wrap gap-1 justify-center items-center', isRTL && 'flex-row-reverse')}>
                            <Badge className="bg-green-600 hover:bg-green-600 text-[10px] h-5 px-1.5">{ar ? 'حاضر' : 'P'}: {totals.present}</Badge>
                            <Badge className="bg-amber-500 hover:bg-amber-500 text-[10px] h-5 px-1.5">{ar ? 'متأخر' : 'L'}: {totals.late}</Badge>
                            <Badge className="bg-red-600 hover:bg-red-600 text-[10px] h-5 px-1.5">{ar ? 'غائب' : 'A'}: {totals.absent}</Badge>
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr
                      className={cn('bg-muted/50', pinSummary && 'sticky z-10 shadow-sm')}
                      style={pinSummary ? { top: '41px' } : undefined}
                    >
                      <th className="border p-2 text-center w-12">#</th>
                      <th className="border p-2 text-center whitespace-nowrap">{ar ? 'التاريخ' : 'Date'}</th>
                      <th className="border p-2 text-center">{ar ? 'المحطة' : 'Station'}</th>
                      <th className="border p-2 text-center">{ar ? 'الكود' : 'Code'}</th>
                      <th className="border p-2 text-center min-w-[180px]">{ar ? 'الاسم' : 'Name'}</th>
                      <th className="border p-2 text-center">{ar ? 'القسم' : 'Department'}</th>
                      <th className="border p-2 text-center">{ar ? 'الحضور' : 'Check-in'}</th>
                      <th className="border p-2 text-center">{ar ? 'الانصراف' : 'Check-out'}</th>
                      <th className="border p-2 text-center">{ar ? 'الساعات' : 'Hours'}</th>
                      <th className="border p-2 text-center">{ar ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatRows.map((r, i) => {
                      const dateObj = new Date(r.date + 'T00:00:00');
                      const dayLabel = dateObj.toLocaleDateString(ar ? 'ar-EG' : 'en-GB', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
                      return (
                        <tr key={`${r.employee_id}-${r.date}-${i}`} className={cn('hover:bg-muted/30', r.status === 'absent' && 'bg-red-50/40')}>
                          <td className="border p-2 text-center text-muted-foreground tabular-nums">{i + 1}</td>
                          <td className="border p-2 text-center whitespace-nowrap">{dayLabel}</td>
                          <td className="border p-2 text-center">{r.station ? (ar ? r.station.name_ar : r.station.name_en) : '—'}</td>
                          <td className="border p-2 text-center font-mono">{r.employee.employee_code}</td>
                          <td className="border p-2 whitespace-pre-wrap break-words font-medium">{ar ? r.employee.name_ar : r.employee.name_en}</td>
                          <td className="border p-2 text-center text-muted-foreground">{r.department ? (ar ? r.department.name_ar : r.department.name_en) : '—'}</td>
                          <td className="border p-2 text-center font-mono">{formatTimeCairo(r.check_in)}</td>
                          <td className="border p-2 text-center font-mono">{formatTimeCairo(r.check_out)}</td>
                          <td className="border p-2 text-center tabular-nums">{fmtHours(r.hours)}</td>
                          <td className="border p-2 text-center">
                            {r.status === 'present' && (
                              <Badge variant={r.is_late ? 'outline' : 'secondary'} className={r.is_late ? 'text-amber-700 border-amber-400' : ''}>
                                {r.is_late ? (ar ? 'متأخر' : 'Late') : (ar ? 'حاضر' : 'Present')}
                              </Badge>
                            )}
                            {r.status === 'absent' && <Badge variant="destructive">{ar ? 'غائب' : 'Absent'}</Badge>}
                            {r.status !== 'present' && r.status !== 'absent' && <Badge variant="outline">{r.status}</Badge>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-50 font-bold">
                      <td className="border p-2 text-center" colSpan={5}>
                        {ar ? 'الإجمالي بعد التصفية' : 'Filtered Total'}
                      </td>
                      <td className="border p-2 text-center tabular-nums" colSpan={3}>
                        {ar ? 'عدد السجلات' : 'Records'}: {totals.rows}
                      </td>
                      <td className="border p-2 text-center tabular-nums">{fmtHours(totals.totalHours)}</td>
                      <td className="border p-2 text-center">
                        <div className={cn('flex flex-wrap gap-1 justify-center items-center', isRTL && 'flex-row-reverse')}>
                          <Badge className="bg-green-600 hover:bg-green-600 text-[10px] h-5 px-1.5">{ar ? 'حاضر' : 'P'}: {totals.present}</Badge>
                          <Badge className="bg-amber-500 hover:bg-amber-500 text-[10px] h-5 px-1.5">{ar ? 'متأخر' : 'L'}: {totals.late}</Badge>
                          <Badge className="bg-red-600 hover:bg-red-600 text-[10px] h-5 px-1.5">{ar ? 'غائب' : 'A'}: {totals.absent}</Badge>
                        </div>
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
