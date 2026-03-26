import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReportExport } from '@/hooks/useReportExport';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Building2, Users, Search, MapPin, Printer, FileText, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';

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

interface Station { id: string; name_ar: string; name_en: string; }
interface Department { id: string; name_ar: string; name_en: string; }

interface EmployeeHours {
  employeeId: string;
  employeeNameAr: string;
  employeeNameEn: string;
  employeeCode: string;
  stationNameAr: string;
  stationNameEn: string;
  stationId: string;
  departmentId: string;
  totalMinutes: number;
  recordCount: number;
}

export const WorkHoursByStation = () => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { reportRef, handlePrint, exportBilingualPDF, exportBilingualCSV } = useReportExport();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [employeeData, setEmployeeData] = useState<EmployeeHours[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));

  // Fetch stations & departments
  useEffect(() => {
    const fetchMeta = async () => {
      const [stRes, dRes] = await Promise.all([
        supabase.from('stations').select('id, name_ar, name_en').eq('is_active', true),
        supabase.from('departments').select('id, name_ar, name_en').eq('is_active', true),
      ]);
      if (stRes.data) setStations(stRes.data);
      if (dRes.data) setDepartments(dRes.data);
    };
    fetchMeta();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const startDate = `${selectedYear}-${selectedMonth}-01`;
      const endMonth = parseInt(selectedMonth);
      const endYear = parseInt(selectedYear);
      const lastDay = new Date(endYear, endMonth, 0).getDate();
      const endDate = `${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      // Fetch all records with pagination to avoid 1000 row limit
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: page, error } = await supabase
          .from('attendance_records')
          .select(`
            id, employee_id, work_hours, work_minutes,
            employees!attendance_records_employee_id_fkey(employee_code, name_ar, name_en, station_id, department_id, stations(id, name_ar, name_en))
          `)
          .gte('date', startDate)
          .lte('date', endDate)
          .not('check_in', 'is', null)
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('Error fetching work hours:', error);
          hasMore = false;
          break;
        }

        if (page && page.length > 0) {
          allData = allData.concat(page);
          from += pageSize;
          if (page.length < pageSize) hasMore = false;
        } else {
          hasMore = false;
        }
      }

      const data = allData;

      if (data.length > 0) {
        const empMap: Record<string, EmployeeHours> = {};

        data.forEach((r: any) => {
          const emp = r.employees;
          const station = emp?.stations;
          const empId = r.employee_id;

          if (!empMap[empId]) {
            empMap[empId] = {
              employeeId: empId,
              employeeNameAr: emp?.name_ar || '',
              employeeNameEn: emp?.name_en || '',
              employeeCode: emp?.employee_code || '',
              stationNameAr: station?.name_ar || 'بدون محطة',
              stationNameEn: station?.name_en || 'No Station',
              stationId: station?.id || 'no-station',
              departmentId: emp?.department_id || '',
              totalMinutes: 0,
              recordCount: 0,
            };
          }
          const mins = Number(r.work_minutes || 0);
          const hours = Number(r.work_hours || 0);
          const totalMins = mins > 0 ? Math.round(mins) : Math.round(hours * 60);
          empMap[empId].totalMinutes += totalMins;
          empMap[empId].recordCount++;
        });

        const result = Object.values(empMap).sort((a, b) => {
          const stCmp = a.stationNameAr.localeCompare(b.stationNameAr);
          if (stCmp !== 0) return stCmp;
          return a.employeeNameAr.localeCompare(b.employeeNameAr);
        });

        setEmployeeData(result);
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedMonth, selectedYear]);

  // Filtered data
  const filteredData = useMemo(() => {
    let result = employeeData;
    if (selectedStation !== 'all') {
      result = result.filter(e => e.stationId === selectedStation);
    }
    if (selectedDept !== 'all') {
      result = result.filter(e => e.departmentId === selectedDept);
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(e =>
        e.employeeNameAr.includes(searchTerm) ||
        e.employeeNameEn.toLowerCase().includes(s) ||
        e.employeeCode.toLowerCase().includes(s)
      );
    }
    return result;
  }, [employeeData, selectedStation, selectedDept, searchTerm]);

  const grandTotal = useMemo(() => filteredData.reduce((sum, e) => sum + e.totalMinutes, 0), [filteredData]);
  const stationCount = useMemo(() => new Set(filteredData.map(e => e.stationId)).size, [filteredData]);

  const { paginatedItems, currentPage, totalPages, totalItems, startIndex, endIndex, setCurrentPage } = usePagination(filteredData, 20);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [selectedStation, selectedDept, searchTerm]);

  const formatHM = (totalMin: number) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Pre-compute full station totals from all filtered data
  const stationTotals = useMemo(() => {
    const totals: Record<string, { totalMinutes: number; count: number; nameAr: string; nameEn: string }> = {};
    filteredData.forEach(emp => {
      if (!totals[emp.stationId]) {
        totals[emp.stationId] = { totalMinutes: 0, count: 0, nameAr: emp.stationNameAr, nameEn: emp.stationNameEn };
      }
      totals[emp.stationId].totalMinutes += emp.totalMinutes;
      totals[emp.stationId].count++;
    });
    return totals;
  }, [filteredData]);

  // Find the last index of each station in the full filtered dataset
  const lastStationIndex = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach((emp, idx) => { map[emp.stationId] = idx; });
    return map;
  }, [filteredData]);

  const buildRows = () => {
    const rows: Array<{ type: 'detail'; data: EmployeeHours } | { type: 'subtotal'; stationName: string; totalMinutes: number; count: number }> = [];

    paginatedItems.forEach((emp) => {
      rows.push({ type: 'detail', data: emp });

      // Show subtotal only if this employee is the very last one for this station in the full dataset
      const globalIdx = filteredData.indexOf(emp);
      if (globalIdx === lastStationIndex[emp.stationId]) {
        const st = stationTotals[emp.stationId];
        rows.push({ type: 'subtotal', stationName: ar ? st.nameAr : st.nameEn, totalMinutes: st.totalMinutes, count: st.count });
      }
    });

    return rows;
  };

  const tableRows = buildRows();

  // Export
  const exportColumns = [
    { headerAr: 'الكود', headerEn: 'Code', key: 'code' },
    { headerAr: 'الموظف (عربي)', headerEn: 'Employee (AR)', key: 'nameAr' },
    { headerAr: 'الموظف (إنجليزي)', headerEn: 'Employee (EN)', key: 'nameEn' },
    { headerAr: 'المحطة', headerEn: 'Station', key: 'station' },
    { headerAr: 'عدد الأيام', headerEn: 'Days', key: 'days' },
    { headerAr: 'إجمالي الساعات', headerEn: 'Total Hours', key: 'hours' },
  ];

  const getExportData = () => filteredData.map(e => ({
    code: e.employeeCode,
    nameAr: e.employeeNameAr,
    nameEn: e.employeeNameEn,
    station: `${e.stationNameAr} / ${e.stationNameEn}`,
    days: String(e.recordCount),
    hours: formatHM(e.totalMinutes),
  }));

  const monthLabel = months.find(m => m.value === selectedMonth);
  const reportTitle = {
    ar: `ساعات العمل الشهرية - ${monthLabel?.ar} ${selectedYear}`,
    en: `Monthly Work Hours - ${monthLabel?.en} ${selectedYear}`,
  };

  const onPrint = () => handlePrint(ar ? reportTitle.ar : reportTitle.en);
  const onPDF = () => exportBilingualPDF({ titleAr: reportTitle.ar, titleEn: reportTitle.en, data: getExportData(), columns: exportColumns, fileName: 'work_hours_by_station' });
  const onExcel = () => exportBilingualCSV({ titleAr: reportTitle.ar, titleEn: reportTitle.en, data: getExportData(), columns: exportColumns, fileName: 'work_hours_by_station' });

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-primary/10">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ar ? 'إجمالي الساعات' : 'Total Hours'}</p>
                <p className="text-3xl font-bold">{formatHM(grandTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-blue-100">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ar ? 'عدد المحطات' : 'Stations'}</p>
                <p className="text-3xl font-bold">{stationCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-green-100">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ar ? 'عدد الموظفين' : 'Employees'}</p>
                <p className="text-3xl font-bold">{filteredData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {ar ? 'ساعات العمل الشهرية' : 'Monthly Work Hours'}
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
                placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
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

            <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{ar ? m.ar : m.en}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={v => { setSelectedYear(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{ar ? 'لا توجد بيانات' : 'No data'}</p>
            </div>
          ) : (
            <div ref={reportRef}>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={cn(isRTL && "text-right")}>#</TableHead>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الكود' : 'Code'}</TableHead>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الموظف' : 'Employee'}</TableHead>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المحطة' : 'Station'}</TableHead>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'عدد الأيام' : 'Days'}</TableHead>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'إجمالي الساعات' : 'Total Hours'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((row, idx) => {
                      if (row.type === 'subtotal') {
                        return (
                          <TableRow key={`sub-${idx}`} className="bg-muted/50 font-bold">
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell>{ar ? `مجموع ${row.stationName}` : `${row.stationName} Total`}</TableCell>
                            <TableCell>{row.stationName}</TableCell>
                            <TableCell>{row.count}</TableCell>
                            <TableCell className="font-mono">{formatHM(row.totalMinutes)}</TableCell>
                          </TableRow>
                        );
                      }
                      const emp = row.data;
                      return (
                        <TableRow key={emp.employeeId}>
                          <TableCell>{startIndex + tableRows.slice(0, idx).filter(r => r.type === 'detail').length}</TableCell>
                          <TableCell className="font-mono text-xs">{emp.employeeCode}</TableCell>
                          <TableCell className="font-medium">{ar ? emp.employeeNameAr : emp.employeeNameEn}</TableCell>
                          <TableCell>{ar ? emp.stationNameAr : emp.stationNameEn}</TableCell>
                          <TableCell>{emp.recordCount}</TableCell>
                          <TableCell className="font-mono font-bold">{formatHM(emp.totalMinutes)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
