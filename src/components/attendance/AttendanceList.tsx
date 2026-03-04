import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAttendanceData } from '@/contexts/AttendanceDataContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { List, Search, Building2, MapPin } from 'lucide-react';
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

interface Station { id: string; name_ar: string; name_en: string; }
interface Department { id: string; name_ar: string; name_en: string; }

export const AttendanceList = () => {
  const { t, isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { records } = useAttendanceData();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [stations, setStations] = useState<Station[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employeeStationMap, setEmployeeStationMap] = useState<Record<string, string>>({});
  const [employeeDeptMap, setEmployeeDeptMap] = useState<Record<string, string>>({});

  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));

  useEffect(() => {
    const fetchMeta = async () => {
      const [stRes, dRes, eRes] = await Promise.all([
        supabase.from('stations').select('id, name_ar, name_en').eq('is_active', true),
        supabase.from('departments').select('id, name_ar, name_en').eq('is_active', true),
        supabase.from('employees').select('id, station_id, department_id'),
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

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const d = new Date(r.date);
      const monthMatch = String(d.getMonth() + 1).padStart(2, '0') === selectedMonth;
      const yearMatch = String(d.getFullYear()) === selectedYear;
      if (!monthMatch || !yearMatch) return false;

      if (selectedStation !== 'all') {
        const empStation = employeeStationMap[r.employeeId];
        if (empStation !== selectedStation) return false;
      }

      if (selectedDept !== 'all') {
        const empDept = employeeDeptMap[r.employeeId];
        if (empDept !== selectedDept) return false;
      }

      if (statusFilter !== 'all' && r.status !== statusFilter) return false;

      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!r.employeeName.toLowerCase().includes(s) && !r.employeeNameAr.includes(searchTerm)) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, selectedMonth, selectedYear, selectedStation, selectedDept, statusFilter, searchTerm, employeeStationMap, employeeDeptMap]);

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
    const labels: Record<string, { ar: string; en: string }> = {
      present: { ar: 'حاضر', en: 'Present' },
      absent: { ar: 'غائب', en: 'Absent' },
      late: { ar: 'متأخر', en: 'Late' },
      'early-leave': { ar: 'انصراف مبكر', en: 'Early Leave' },
      'on-leave': { ar: 'إجازة', en: 'On Leave' },
      mission: { ar: 'مأمورية', en: 'Mission' },
      weekend: { ar: 'عطلة', en: 'Weekend' },
    };
    return (
      <Badge variant="outline" className={styles[status] || ''}>
        {ar ? labels[status]?.ar || status : labels[status]?.en || status}
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="w-5 h-5" />
          {ar ? 'سجل الحضور والانصراف' : 'Attendance Records'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className={cn("flex flex-wrap gap-3 mb-6", isRTL && "flex-row-reverse")}>
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
            <Input
              placeholder={ar ? 'بحث بالاسم...' : 'Search by name...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(isRTL ? "pr-10" : "pl-10")}
            />
          </div>

          {/* Station filter */}
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

          {/* Department filter */}
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

          {/* Month */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{ar ? m.ar : m.en}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Status */}
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
          {ar ? `${filteredRecords.length} سجل` : `${filteredRecords.length} records`}
        </p>

        {/* Table */}
        <div className="rounded-md border">
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
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {ar ? 'لا توجد سجلات حضور' : 'No attendance records'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.slice(0, 50).map((record, index) => (
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
      </CardContent>
    </Card>
  );
};
