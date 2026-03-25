import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReportExport } from '@/hooks/useReportExport';
import { supabase } from '@/integrations/supabase/client';
import { calculateWorkTime } from '@/contexts/AttendanceDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { List, Search, Building2, MapPin, Printer, FileText, FileSpreadsheet, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const months = [
  { value: '01', ar: 'يناير', en: 'January' },
  { value: '02', ar: 'فبراير', en: 'February' },
  { value: '03', ar: 'مارس', en: 'March' },
  { value: '04', ar: 'أبريل', en: 'April' },
  { value: '05', ar: 'مايو', en: 'May' },
  { value: '06', ar: 'يونيو', en: 'June' },
  { value: '07', ar: 'يوليو', en: 'July' },
  { value: '08', ar: 'أغسطس', en: 'August' },
  { value: '09', ar: 'سبتمبر', en: 'September' },
  { value: '10', ar: 'أكتوبر', en: 'October' },
  { value: '11', ar: 'نوفمبر', en: 'November' },
  { value: '12', ar: 'ديسمبر', en: 'December' },
];

const statusLabels: Record<string, { ar: string; en: string }> = {
  present: { ar: 'حاضر', en: 'Present' },
  absent: { ar: 'غائب', en: 'Absent' },
  late: { ar: 'متأخر', en: 'Late' },
  'early-leave': { ar: 'انصراف مبكر', en: 'Early Leave' },
  'on-leave': { ar: 'إجازة', en: 'On Leave' },
  mission: { ar: 'مأمورية', en: 'Mission' },
  weekend: { ar: 'عطلة', en: 'Weekend' },
};

interface Station { id: string; name_ar: string; name_en: string; }
interface Department { id: string; name_ar: string; name_en: string; }

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNameAr: string;
  department: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workHours: number;
  workMinutes: number;
  overtime: number;
  notes?: string;
}

const PAGE_SIZE = 50;

const formatTime = (ts: string | null): string | null => {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch { return null; }
};

export const AttendanceList = () => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { reportRef, handlePrint, exportBilingualPDF, exportBilingualCSV } = useReportExport();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [stations, setStations] = useState<Station[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employeeStationMap, setEmployeeStationMap] = useState<Record<string, string>>({});
  const [employeeDeptMap, setEmployeeDeptMap] = useState<Record<string, string>>({});

  // Pagination state
  const [page, setPage] = useState(0);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));

  const daysInMonth = useMemo(() => {
    const y = parseInt(selectedYear);
    const m = parseInt(selectedMonth);
    const count = new Date(y, m, 0).getDate();
    return Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, '0'));
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const fetchMeta = async () => {
      const [stRes, dRes, eRes] = await Promise.all([
        supabase.from('stations').select('id, name_ar, name_en').eq('is_active', true),
        supabase.from('departments').select('id, name_ar, name_en').eq('is_active', true),
        supabase.from('employees').select('id, employee_code, station_id, department_id').order('employee_code'),
      ]);
      if (stRes.data) setStations(stRes.data);
      if (dRes.data) setDepartments(dRes.data);
      if (eRes.data) {
        const sMap: Record<string, string> = {};
        const dMap: Record<string, string> = {};
        eRes.data.forEach(e => {
          if (e.station_id) sMap[e.id] = e.station_id;
          if (e.department_id) dMap[e.id] = e.department_id;
        });
        setEmployeeStationMap(sMap);
        setEmployeeDeptMap(dMap);
      }
    };
    fetchMeta();
  }, []);

  // Fetch records with server-side date filtering and pagination
  const fetchPage = useCallback(async (pageNum: number) => {
    setLoading(true);
    const y = parseInt(selectedYear);
    const m = parseInt(selectedMonth);
    
    let startDate: string;
    let endDate: string;

    if (selectedDay !== 'all') {
      const day = parseInt(selectedDay);
      startDate = `${y}-${selectedMonth}-${String(day).padStart(2, '0')}`;
      endDate = startDate;
    } else {
      startDate = `${y}-${selectedMonth}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      endDate = `${y}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
    }

    let query = supabase
      .from('attendance_records')
      .select('*, employees(name_en, name_ar, department_id, station_id, departments(name_ar))', { count: 'exact' })
      .gte('date', startDate)
      .lte('date', endDate)
      .order('check_in', { ascending: false, nullsFirst: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    // Apply station/dept filter via employee IDs
    if (selectedStation !== 'all' || selectedDept !== 'all') {
      const matchingEmpIds = Object.keys(employeeStationMap).filter(empId => {
        if (selectedStation !== 'all' && employeeStationMap[empId] !== selectedStation) return false;
        if (selectedDept !== 'all' && employeeDeptMap[empId] !== selectedDept) return false;
        return true;
      });
      if (matchingEmpIds.length > 0) {
        query = query.in('employee_id', matchingEmpIds);
      } else {
        setRecords([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }
    }

    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, count } = await query;

    if (data) {
      const mapped: AttendanceRecord[] = data.map(r => {
        const ci = formatTime(r.check_in);
        const co = formatTime(r.check_out);
        const wt = calculateWorkTime(ci, co);
        const hasDbHours = (r.work_hours != null && r.work_hours > 0) || (r.work_minutes != null && r.work_minutes > 0);
        let finalHours: number;
        let finalMinutes: number;
        if (hasDbHours) {
          const dbM = r.work_minutes ?? 0;
          const totalMins = dbM > 0 ? Math.round(dbM) : Math.round((r.work_hours ?? 0) * 60);
          finalHours = Math.floor(totalMins / 60);
          finalMinutes = totalMins % 60;
        } else {
          finalHours = wt.hours;
          finalMinutes = wt.minutes;
        }
        return {
          id: r.id,
          employeeId: r.employee_id,
          employeeName: (r.employees as any)?.name_en || '',
          employeeNameAr: (r.employees as any)?.name_ar || '',
          department: (r.employees as any)?.departments?.name_ar || '',
          date: r.date,
          checkIn: ci,
          checkOut: co,
          status: r.status,
          workHours: finalHours,
          workMinutes: finalMinutes,
          overtime: Math.max(0, finalHours - 8),
          notes: r.notes || undefined,
        };
      });
      setRecords(mapped);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, [selectedMonth, selectedYear, selectedDay, statusFilter, selectedStation, selectedDept, employeeStationMap, employeeDeptMap]);

  // Re-fetch when filters or page change
  useEffect(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [selectedMonth, selectedYear, selectedDay, selectedStation, selectedDept, statusFilter]);

  // Client-side search filter (name search)
  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    const s = searchTerm.toLowerCase();
    return records.filter(r =>
      r.employeeName.toLowerCase().includes(s) || r.employeeNameAr.includes(searchTerm)
    );
  }, [records, searchTerm]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      present: 'bg-success/10 text-success border-success',
      absent: 'bg-destructive/10 text-destructive border-destructive',
      late: 'bg-warning/10 text-warning border-warning',
      'early-leave': 'bg-orange-100 text-orange-700 border-orange-300',
      'on-leave': 'bg-blue-100 text-blue-700 border-blue-300',
      mission: 'bg-purple-100 text-purple-700 border-purple-300',
      weekend: 'bg-muted text-muted-foreground border-border',
    };
    return (
      <Badge variant="outline" className={styles[status] || ''}>
        {ar ? statusLabels[status]?.ar || status : statusLabels[status]?.en || status}
      </Badge>
    );
  };

  const getDeptName = (employeeId: string) => {
    const deptId = employeeDeptMap[employeeId];
    if (!deptId) return '-';
    const dept = departments.find(d => d.id === deptId);
    return dept ? (ar ? dept.name_ar : dept.name_en) : '-';
  };

  const formatWorkTime = (hours: number, minutes: number) => {
    return `${hours}:${String(minutes).padStart(2, '0')}`;
  };

  const getStatusText = (status: string) => statusLabels[status]?.ar || status;
  const getStatusTextEn = (status: string) => statusLabels[status]?.en || status;

  const exportColumns = [
    { headerAr: 'التاريخ', headerEn: 'Date', key: 'date' },
    { headerAr: 'الموظف (عربي)', headerEn: 'Employee (AR)', key: 'employeeNameAr' },
    { headerAr: 'الموظف (إنجليزي)', headerEn: 'Employee (EN)', key: 'employeeName' },
    { headerAr: 'القسم', headerEn: 'Department', key: 'department' },
    { headerAr: 'الحضور', headerEn: 'Check In', key: 'checkIn' },
    { headerAr: 'الانصراف', headerEn: 'Check Out', key: 'checkOut' },
    { headerAr: 'ساعات العمل', headerEn: 'Work Hours', key: 'workTime' },
    { headerAr: 'الحالة', headerEn: 'Status', key: 'status' },
  ];

  const getExportData = () => filteredRecords.map(r => ({
    date: r.date,
    employeeNameAr: r.employeeNameAr,
    employeeName: r.employeeName,
    department: getDeptName(r.employeeId),
    checkIn: r.checkIn || '-',
    checkOut: r.checkOut || '-',
    workTime: formatWorkTime(r.workHours, r.workMinutes),
    status: `${getStatusText(r.status)} / ${getStatusTextEn(r.status)}`,
  }));

  const monthLabel = months.find(m => m.value === selectedMonth);
  const reportTitle = {
    ar: `سجل الحضور والانصراف - ${monthLabel?.ar} ${selectedYear}`,
    en: `Attendance Records - ${monthLabel?.en} ${selectedYear}`,
  };

  const onPrint = () => handlePrint(ar ? reportTitle.ar : reportTitle.en);
  const onPDF = () => exportBilingualPDF({ titleAr: reportTitle.ar, titleEn: reportTitle.en, data: getExportData(), columns: exportColumns, fileName: 'attendance_records' });
  const onExcel = () => exportBilingualCSV({ titleAr: reportTitle.ar, titleEn: reportTitle.en, data: getExportData(), columns: exportColumns, fileName: 'attendance_records' });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <List className="w-5 h-5" />
            {ar ? 'سجل الحضور والانصراف' : 'Attendance Records'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onPrint} className="gap-1.5">
              <Printer className="w-4 h-4" />
              {ar ? 'طباعة' : 'Print'}
            </Button>
            <Button variant="outline" size="sm" onClick={onPDF} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
              <FileText className="w-4 h-4" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={onExcel} className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5">
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className={cn("flex flex-wrap gap-3 mb-6", isRTL && "flex-row-reverse")}>
          <div className="relative min-w-[200px] flex-1">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
            <Input
              placeholder={ar ? 'بحث بالاسم...' : 'Search by name...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(isRTL ? "pr-10" : "pl-10")}
            />
          </div>

          <Select value={selectedStation} onValueChange={setSelectedStation}>
            <SelectTrigger className="w-[160px]">
              <MapPin className="w-4 h-4 shrink-0 opacity-50" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? 'كل المحطات' : 'All Stations'}</SelectItem>
              {stations.map(s => (
                <SelectItem key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDept} onValueChange={setSelectedDept}>
            <SelectTrigger className="w-[160px]">
              <Building2 className="w-4 h-4 shrink-0 opacity-50" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? 'كل الأقسام' : 'All Departments'}</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>{ar ? d.name_ar : d.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setSelectedDay('all'); }}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{ar ? m.ar : m.en}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger className="w-[100px]">
              <CalendarDays className="w-4 h-4 shrink-0 opacity-50" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? 'كل الأيام' : 'All Days'}</SelectItem>
              {daysInMonth.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? 'كل الحالات' : 'All Statuses'}</SelectItem>
              <SelectItem value="present">{ar ? 'حاضر' : 'Present'}</SelectItem>
              <SelectItem value="late">{ar ? 'متأخر' : 'Late'}</SelectItem>
              <SelectItem value="absent">{ar ? 'غائب' : 'Absent'}</SelectItem>
              <SelectItem value="early-leave">{ar ? 'انصراف مبكر' : 'Early Leave'}</SelectItem>
              <SelectItem value="on-leave">{ar ? 'إجازة' : 'On Leave'}</SelectItem>
              <SelectItem value="mission">{ar ? 'مأمورية' : 'Mission'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-3">
          {ar
            ? `${totalCount} سجل — صفحة ${page + 1} من ${totalPages || 1}`
            : `${totalCount} records — page ${page + 1} of ${totalPages || 1}`}
        </p>

        {/* Table */}
        <div className="rounded-md border" ref={reportRef}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الموظف' : 'Employee'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'القسم' : 'Department'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الحضور' : 'Check In'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الانصراف' : 'Check Out'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'ساعات العمل' : 'Work Hours'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'إضافي' : 'Overtime'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الحالة' : 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {ar ? 'جاري التحميل...' : 'Loading...'}
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {ar ? 'لا توجد سجلات حضور' : 'No attendance records'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record, index) => (
                  <TableRow key={`${record.id}-${index}`}>
                    <TableCell>{record.date}</TableCell>
                    <TableCell className="font-medium">
                      {ar ? record.employeeNameAr : record.employeeName}
                    </TableCell>
                    <TableCell>{getDeptName(record.employeeId)}</TableCell>
                    <TableCell>{record.checkIn || '-'}</TableCell>
                    <TableCell>{record.checkOut || '-'}</TableCell>
                    <TableCell>{formatWorkTime(record.workHours, record.workMinutes)}</TableCell>
                    <TableCell>
                      {record.overtime > 0 ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary">
                          +{record.overtime}h
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || loading}
              onClick={() => setPage(p => p - 1)}
              className="gap-1.5"
            >
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {ar ? 'السابق' : 'Previous'}
            </Button>
            <span className="text-sm font-medium">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage(p => p + 1)}
              className="gap-1.5"
            >
              {ar ? 'التالي' : 'Next'}
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
