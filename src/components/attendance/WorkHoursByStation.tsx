import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Building2, Users } from 'lucide-react';
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

interface EmployeeHours {
  employeeId: string;
  employeeNameAr: string;
  employeeNameEn: string;
  employeeCode: string;
  stationNameAr: string;
  stationNameEn: string;
  stationId: string;
  totalMinutes: number;
  recordCount: number;
}

export const WorkHoursByStation = () => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [employeeData, setEmployeeData] = useState<EmployeeHours[]>([]);
  const [loading, setLoading] = useState(true);
  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const startDate = `${selectedYear}-${selectedMonth}-01`;
      const endMonth = parseInt(selectedMonth);
      const endYear = parseInt(selectedYear);
      const lastDay = new Date(endYear, endMonth, 0).getDate();
      const endDate = `${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id, employee_id, work_hours, work_minutes,
          employees!attendance_records_employee_id_fkey(employee_code, name_ar, name_en, station_id, stations(id, name_ar, name_en))
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .not('check_in', 'is', null);

      if (!error && data) {
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
              totalMinutes: 0,
              recordCount: 0,
            };
          }
          const hours = Number(r.work_hours || 0);
          const mins = Number(r.work_minutes || 0);
          empMap[empId].totalMinutes += hours * 60 + mins;
          empMap[empId].recordCount++;
        });

        // Sort by station then by name
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

  const grandTotal = useMemo(() => {
    return employeeData.reduce((sum, e) => sum + e.totalMinutes, 0);
  }, [employeeData]);

  const stationCount = useMemo(() => {
    return new Set(employeeData.map(e => e.stationId)).size;
  }, [employeeData]);

  const { paginatedItems, currentPage, totalPages, totalItems, startIndex, endIndex, setCurrentPage } = usePagination(employeeData, 20);

  const formatHM = (totalMin: number) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // Detect station boundaries for subtotal rows
  const buildRows = () => {
    const rows: Array<{ type: 'detail'; data: EmployeeHours } | { type: 'subtotal'; stationName: string; totalMinutes: number; count: number }> = [];
    let currentStation = '';
    let stationMinutes = 0;
    let stationEmpCount = 0;

    paginatedItems.forEach((emp, idx) => {
      if (idx > 0 && emp.stationId !== currentStation) {
        rows.push({ type: 'subtotal', stationName: ar ? paginatedItems[idx - 1].stationNameAr : paginatedItems[idx - 1].stationNameEn, totalMinutes: stationMinutes, count: stationEmpCount });
        stationMinutes = 0;
        stationEmpCount = 0;
      }
      currentStation = emp.stationId;
      stationMinutes += emp.totalMinutes;
      stationEmpCount++;
      rows.push({ type: 'detail', data: emp });
    });

    if (stationEmpCount > 0 && paginatedItems.length > 0) {
      const last = paginatedItems[paginatedItems.length - 1];
      rows.push({ type: 'subtotal', stationName: ar ? last.stationNameAr : last.stationNameEn, totalMinutes: stationMinutes, count: stationEmpCount });
    }

    return rows;
  };

  const tableRows = buildRows();

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
                <p className="text-3xl font-bold">{employeeData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
        <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
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

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {ar ? 'ساعات العمل حسب المحطة' : 'Work Hours by Station'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
          ) : employeeData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{ar ? 'لا توجد بيانات' : 'No data'}</p>
            </div>
          ) : (
            <>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
