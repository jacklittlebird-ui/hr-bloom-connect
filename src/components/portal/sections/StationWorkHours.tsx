import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Users, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeWorkMinutes } from '@/lib/attendanceClassification';

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
  department: string;
  totalMinutes: number;
  recordCount: number;
}

interface StationEmployee {
  id: string;
  department?: string;
}

interface StationWorkHoursProps {
  employeeIds?: string[];
  stationEmployees?: StationEmployee[];
}

export const StationWorkHours = ({ employeeIds: legacyIds, stationEmployees }: StationWorkHoursProps) => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [employeeData, setEmployeeData] = useState<EmployeeHours[]>([]);
  const [loading, setLoading] = useState(true);
  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));

  const employeeIds = useMemo(() => {
    if (stationEmployees) return stationEmployees.map(e => e.id);
    return legacyIds || [];
  }, [stationEmployees, legacyIds]);

  const empDeptMap = useMemo(() => {
    const map = new Map<string, string>();
    if (stationEmployees) stationEmployees.forEach(e => map.set(e.id, e.department || ''));
    return map;
  }, [stationEmployees]);

  const departments = useMemo(() => {
    const depts = [...new Set(Array.from(empDeptMap.values()).filter(Boolean))];
    return depts.sort();
  }, [empDeptMap]);

  useEffect(() => {
    const fetchData = async () => {
      if (employeeIds.length === 0) { setEmployeeData([]); setLoading(false); return; }
      setLoading(true);
      const startDate = `${selectedYear}-${selectedMonth}-01`;
      const endMonth = parseInt(selectedMonth);
      const endYear = parseInt(selectedYear);
      const lastDay = new Date(endYear, endMonth, 0).getDate();
      const endDate = `${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: page, error } = await supabase
          .from('attendance_records')
          .select(`id, employee_id, work_hours, work_minutes, employees!attendance_records_employee_id_fkey(employee_code, name_ar, name_en)`)
          .in('employee_id', employeeIds)
          .gte('date', startDate)
          .lte('date', endDate)
          .not('check_in', 'is', null)
          .range(from, from + pageSize - 1);

        if (error || !page || page.length === 0) { hasMore = false; break; }
        allData = allData.concat(page);
        from += pageSize;
        if (page.length < pageSize) hasMore = false;
      }

      const empMap: Record<string, EmployeeHours> = {};
      allData.forEach((r: any) => {
        const emp = r.employees;
        const empId = r.employee_id;
        if (!empMap[empId]) {
          empMap[empId] = {
            employeeId: empId,
            employeeNameAr: emp?.name_ar || '',
            employeeNameEn: emp?.name_en || '',
            employeeCode: emp?.employee_code || '',
            department: empDeptMap.get(empId) || '',
            totalMinutes: 0,
            recordCount: 0,
          };
        }
        const mins = Number(r.work_minutes || 0);
        const hours = Number(r.work_hours || 0);
        empMap[empId].totalMinutes += mins > 0 ? Math.round(mins) : Math.round(hours * 60);
        empMap[empId].recordCount++;
      });

      setEmployeeData(Object.values(empMap).sort((a, b) => a.employeeNameAr.localeCompare(b.employeeNameAr)));
      setLoading(false);
    };
    fetchData();
  }, [selectedMonth, selectedYear, employeeIds, empDeptMap]);

  const filteredData = useMemo(() => {
    let list = employeeData;
    if (deptFilter !== 'all') list = list.filter(e => e.department === deptFilter);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(e =>
        e.employeeNameAr.includes(searchTerm) ||
        e.employeeNameEn.toLowerCase().includes(s) ||
        e.employeeCode.toLowerCase().includes(s)
      );
    }
    return list;
  }, [employeeData, searchTerm, deptFilter]);

  const grandTotal = useMemo(() => filteredData.reduce((sum, e) => sum + e.totalMinutes, 0), [filteredData]);

  const formatHM = (totalMin: number) => {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          {ar ? 'ساعات العمل الشهرية' : 'Monthly Work Hours'}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
          {departments.length > 0 && (
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder={ar ? 'جميع الأقسام' : 'All Departments'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'جميع الأقسام' : 'All Departments'}</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m.value} value={m.value}>{ar ? m.ar : m.en}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <div className="p-2 rounded-lg bg-primary/10"><Clock className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{ar ? 'إجمالي الساعات' : 'Total Hours'}</p>
                  <p className="text-2xl font-bold">{formatHM(grandTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <div className="p-2 rounded-lg bg-green-100"><Users className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{ar ? 'عدد الموظفين' : 'Employees'}</p>
                  <p className="text-2xl font-bold">{filteredData.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <div className="p-2 rounded-lg bg-amber-100"><Clock className="w-5 h-5 text-amber-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{ar ? 'متوسط الساعات اليومية' : 'Avg Daily Hours'}</p>
                  <p className="text-2xl font-bold">
                    {(() => {
                      const totalDays = filteredData.reduce((s, e) => s + e.recordCount, 0);
                      if (totalDays === 0) return '0:00';
                      const avgMin = Math.round(grandTotal / totalDays);
                      return formatHM(avgMin);
                    })()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                <div className="p-2 rounded-lg bg-blue-100"><Clock className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">{ar ? 'إجمالي الأيام' : 'Total Days'}</p>
                  <p className="text-2xl font-bold">{filteredData.reduce((s, e) => s + e.recordCount, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{ar ? 'لا توجد بيانات' : 'No data'}</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={cn(isRTL && "text-right")}>#</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الكود' : 'Code'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الموظف' : 'Employee'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'عدد الأيام' : 'Days'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'إجمالي الساعات' : 'Total Hours'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'متوسط الساعات اليومية' : 'Avg Daily Hours'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((emp, idx) => {
                  const avgDailyMin = emp.recordCount > 0 ? Math.round(emp.totalMinutes / emp.recordCount) : 0;
                  return (
                    <TableRow key={emp.employeeId}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{emp.employeeCode}</TableCell>
                      <TableCell className="font-medium">{ar ? emp.employeeNameAr : emp.employeeNameEn}</TableCell>
                      <TableCell>{emp.recordCount}</TableCell>
                      <TableCell className="font-mono font-bold">{formatHM(emp.totalMinutes)}</TableCell>
                      <TableCell className="font-mono">
                        {formatHM(avgDailyMin)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell>{ar ? 'الإجمالي' : 'Total'}</TableCell>
                  <TableCell>{filteredData.reduce((s, e) => s + e.recordCount, 0)}</TableCell>
                  <TableCell className="font-mono">{formatHM(grandTotal)}</TableCell>
                  <TableCell className="font-mono">
                    {(() => {
                      const totalDays = filteredData.reduce((s, e) => s + e.recordCount, 0);
                      if (totalDays === 0) return '0:00';
                      return formatHM(Math.round(grandTotal / totalDays));
                    })()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
