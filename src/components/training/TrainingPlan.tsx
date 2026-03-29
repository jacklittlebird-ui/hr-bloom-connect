import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarDays, Users, BookOpen, FileText, FileSpreadsheet, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useReportExport } from '@/hooks/useReportExport';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export interface TrainingDebt {
  id: string;
  employeeId: string;
  courseName: string;
  cost: number;
  actualDate: string;
  expiryDate: string;
}

interface PlanRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  station: string;
  deptCode: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  endDate: string;
  plannedDate: string;
  validityYears: number;
  status: string;
  hasCert: boolean;
}

export const TrainingPlan = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { employees } = useEmployeeData();
  const [rawRecords, setRawRecords] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState('all');
  const [filterStation, setFilterStation] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [loading, setLoading] = useState(true);

  // Fetch departments and stations from DB
  const [departments, setDepartments] = useState<{ id: string; nameEn: string; nameAr: string }[]>([]);
  const [stations, setStations] = useState<{ id: string; code: string; nameEn: string; nameAr: string }[]>([]);
  useEffect(() => {
    supabase.from('departments').select('id, name_en, name_ar').eq('is_active', true).then(({ data }) => {
      setDepartments((data || []).map((d: any) => ({ id: d.id, nameEn: d.name_en, nameAr: d.name_ar })));
    });
    supabase.from('stations').select('id, code, name_en, name_ar').eq('is_active', true).then(({ data }) => {
      setStations((data || []).map((s: any) => ({ id: s.id, code: s.code, nameEn: s.name_en, nameAr: s.name_ar })));
    });
  }, []);

  // Fetch raw training records (only once, not dependent on employees)
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('training_records')
        .select('*, training_courses(name_en, name_ar, course_code, validity_years)')
        .not('planned_date', 'is', null);
      setRawRecords(data || []);
      setLoading(false);
    };
    fetchRecords();
  }, []);

  // Build enriched records from raw data + current employee data (always up to date)
  const records: PlanRecord[] = useMemo(() => {
    return rawRecords.map((r: any) => {
      const emp = employees.find(e => e.id === r.employee_id);
      return {
        id: r.id,
        employeeId: r.employee_id,
        employeeName: emp ? (ar ? emp.nameAr : emp.nameEn) : r.employee_id,
        employeeCode: emp?.employeeId || '',
        department: emp?.departmentId || '',
        station: emp?.stationId || '',
        deptCode: emp?.deptCode || '',
        courseId: r.course_id || '',
        courseName: r.training_courses ? (ar ? r.training_courses.name_ar : r.training_courses.name_en) : '',
        courseCode: r.training_courses?.course_code || '',
        endDate: r.end_date || '',
        plannedDate: r.planned_date || '',
        validityYears: r.training_courses?.validity_years || 1,
        status: r.status || 'enrolled',
        hasCert: r.has_cert || false,
      };
    });
  }, [rawRecords, employees, ar]);

  // Unique courses for filter
  const courseOptions = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach(r => { if (r.courseId && r.courseName) map.set(r.courseId, r.courseName); });
    return [...map.entries()].sort(([, a], [, b]) => a.localeCompare(b));
  }, [records]);

  // Filter records
  const filtered = useMemo(() => {
    return records.filter(r => {
      const deptMatch = filterDept === 'all' || r.department === filterDept;
      const stationMatch = filterStation === 'all' || r.station === filterStation;
      const courseMatch = filterCourse === 'all' || r.courseId === filterCourse;
      if (!deptMatch || !stationMatch || !courseMatch) return false;
      if (!r.plannedDate) return false;
      const d = new Date(r.plannedDate);
      const monthMatch = filterMonth === 'all' || (d.getMonth() + 1) === parseInt(filterMonth);
      const yearMatch = filterYear === 'all' || d.getFullYear() === parseInt(filterYear);
      return monthMatch && yearMatch;
    });
  }, [records, filterDept, filterStation, filterMonth, filterYear, filterCourse]);

  // Group by month
  const grouped = useMemo(() => {
    const groups = new Map<string, PlanRecord[]>();
    filtered.forEach(r => {
      if (!r.plannedDate) return;
      const d = new Date(r.plannedDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    });
    const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
    return sorted;
  }, [filtered]);

  const formatGroupLabel = (key: string) => {
    const [year, month] = key.split('-');
    const monthNames = ar
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500/10 text-green-700 border-green-300">{ar ? 'مكتمل' : 'Completed'}</Badge>;
      case 'failed': return <Badge variant="destructive">{ar ? 'راسب' : 'Failed'}</Badge>;
      default: return <Badge variant="secondary">{ar ? 'مسجل' : 'Enrolled'}</Badge>;
    }
  };

  const isOverdue = (plannedDate: string) => {
    return new Date(plannedDate) < new Date();
  };

  // Stats
  const totalRecords = filtered.length;
  const uniqueEmployees = new Set(filtered.map(r => r.employeeId)).size;
  const uniqueCourses = new Set(filtered.map(r => r.courseId)).size;
  const overdueCount = filtered.filter(r => isOverdue(r.plannedDate) && r.status !== 'completed').length;

  const { exportBilingualPDF, exportBilingualCSV } = useReportExport();

  const exportColumns = [
    { headerAr: 'كود الموظف', headerEn: 'Emp Code', key: 'employeeCode' },
    { headerAr: 'اسم الموظف', headerEn: 'Employee', key: 'employeeName' },
    { headerAr: 'القسم', headerEn: 'Dept Code', key: 'deptCode' },
    { headerAr: 'المحطة', headerEn: 'Station', key: 'stationName' },
    { headerAr: 'كود الدورة', headerEn: 'Course Code', key: 'courseCode' },
    { headerAr: 'اسم الدورة', headerEn: 'Course', key: 'courseName' },
    { headerAr: 'تاريخ الانتهاء', headerEn: 'End Date', key: 'endDate' },
    { headerAr: 'الصلاحية', headerEn: 'Validity', key: 'validity' },
    { headerAr: 'تاريخ التخطيط', headerEn: 'Planned Date', key: 'plannedDate' },
    { headerAr: 'الحالة', headerEn: 'Status', key: 'statusLabel' },
  ];

  const getExportData = useCallback(() => {
    return filtered.map(r => ({
      ...r,
      stationName: stations.find(s => s.id === r.station)?.[ar ? 'nameAr' : 'nameEn'] || '-',
      validity: `${r.validityYears} ${ar ? 'سنة' : 'yr'}`,
      statusLabel: r.status === 'completed' ? (ar ? 'مكتمل' : 'Completed') : r.status === 'failed' ? (ar ? 'راسب' : 'Failed') : (ar ? 'مسجل' : 'Enrolled'),
    }));
  }, [filtered, stations, ar]);

  const handleExportPDF = () => {
    exportBilingualPDF({
      titleAr: 'خطة التدريب',
      titleEn: 'Training Plan',
      data: getExportData(),
      columns: exportColumns,
      fileName: 'Training_Plan',
    });
  };

  const handleExportExcel = () => {
    exportBilingualCSV({
      titleAr: 'خطة التدريب',
      titleEn: 'Training Plan',
      data: getExportData(),
      columns: exportColumns,
      fileName: 'Training_Plan',
    });
  };

  return (
    <div dir="rtl" className="space-y-6">
      {/* Export Buttons */}
      <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
        <Button variant="outline" size="sm" onClick={handleExportPDF}>
          <FileText className="h-4 w-4 me-1" />
          {ar ? 'تصدير PDF' : 'Export PDF'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportExcel}>
          <FileSpreadsheet className="h-4 w-4 me-1" />
          {ar ? 'تصدير Excel' : 'Export Excel'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex gap-4 items-center flex-wrap", isRTL && "flex-row-reverse")}>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-1 block">{ar ? 'القسم' : 'Department'}</label>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع الأقسام' : 'All Departments'}</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{ar ? d.nameAr : d.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-1 block">{ar ? 'المحطة' : 'Station'}</label>
              <Select value={filterStation} onValueChange={setFilterStation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                  {stations.map(s => (
                    <SelectItem key={s.id} value={s.id}>{ar ? s.nameAr : s.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-1 block">{ar ? 'الدورة' : 'Course'}</label>
              <Select value={filterCourse} onValueChange={setFilterCourse}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع الدورات' : 'All Courses'}</SelectItem>
                  {courseOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-1 block">{ar ? 'الشهر' : 'Month'}</label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع الشهور' : 'All Months'}</SelectItem>
                  {(ar
                    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
                    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                  ).map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-1 block">{ar ? 'السنة' : 'Year'}</label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع السنوات' : 'All Years'}</SelectItem>
                  {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grouped Tables FIRST */}
      {loading ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</CardContent></Card>
      ) : grouped.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">{ar ? 'لا توجد سجلات تدريب بها تاريخ تخطيط' : 'No training records with planned dates'}</CardContent></Card>
      ) : (
        grouped.map(([key, items]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  {formatGroupLabel(key)}
                </span>
                <Badge variant="outline">{items.length} {ar ? 'سجل' : 'records'}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ar ? 'كود الموظف' : 'Emp Code'}</TableHead>
                    <TableHead>{ar ? 'اسم الموظف' : 'Employee'}</TableHead>
                    <TableHead>{ar ? 'القسم' : 'Dept Code'}</TableHead>
                    <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead>{ar ? 'كود الدورة' : 'Course Code'}</TableHead>
                    <TableHead>{ar ? 'اسم الدورة' : 'Course'}</TableHead>
                    <TableHead>{ar ? 'تاريخ الانتهاء' : 'End Date'}</TableHead>
                    <TableHead>{ar ? 'الصلاحية' : 'Validity'}</TableHead>
                    <TableHead>{ar ? 'تاريخ التخطيط' : 'Planned Date'}</TableHead>
                    <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(r => (
                    <TableRow key={r.id} className={cn(isOverdue(r.plannedDate) && r.status !== 'completed' && 'bg-destructive/5')}>
                      <TableCell className="font-mono text-xs">{r.employeeCode}</TableCell>
                      <TableCell className="font-medium">{r.employeeName}</TableCell>
                      <TableCell><Badge variant="outline">{r.deptCode || '-'}</Badge></TableCell>
                      <TableCell>{stations.find(s => s.id === r.station)?.nameAr || stations.find(s => s.id === r.station)?.nameEn || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{r.courseCode || '-'}</TableCell>
                      <TableCell>{r.courseName}</TableCell>
                      <TableCell>{r.endDate || '-'}</TableCell>
                      <TableCell>{r.validityYears} {ar ? 'سنة' : 'yr'}</TableCell>
                      <TableCell>
                        <span className={cn(isOverdue(r.plannedDate) && r.status !== 'completed' && 'text-destructive font-semibold')}>
                          {r.plannedDate}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      {/* Stats Cards AFTER tables */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><CalendarDays className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{totalRecords}</p><p className="text-xs text-muted-foreground">{ar ? 'إجمالي السجلات' : 'Total Records'}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{uniqueEmployees}</p><p className="text-xs text-muted-foreground">{ar ? 'الموظفين' : 'Employees'}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{uniqueCourses}</p><p className="text-xs text-muted-foreground">{ar ? 'الدورات' : 'Courses'}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-stat-green/10"><CheckCircle2 className="h-5 w-5 text-stat-green" /></div>
            <div><p className="text-2xl font-bold">{filtered.filter(r => r.status === 'completed').length}</p><p className="text-xs text-muted-foreground">{ar ? 'مكتمل' : 'Completed'}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><Clock className="h-5 w-5 text-muted-foreground" /></div>
            <div><p className="text-2xl font-bold">{filtered.filter(r => r.status === 'enrolled').length}</p><p className="text-xs text-muted-foreground">{ar ? 'مسجل' : 'Enrolled'}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold">{overdueCount}</p><p className="text-xs text-muted-foreground">{ar ? 'متأخرة' : 'Overdue'}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Progress */}
      {totalRecords > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{ar ? 'نسبة الإنجاز' : 'Completion Rate'}</span>
              <span className="text-sm font-bold text-primary">{Math.round((filtered.filter(r => r.status === 'completed').length / totalRecords) * 100)}%</span>
            </div>
            <Progress value={(filtered.filter(r => r.status === 'completed').length / totalRecords) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{ar ? 'التوزيع الشهري' : 'Monthly Distribution'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={(() => {
                const monthData = new Map<string, { month: string; count: number; completed: number; overdue: number }>();
                filtered.forEach(r => {
                  if (!r.plannedDate) return;
                  const d = new Date(r.plannedDate);
                  const monthNames = ar
                    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
                    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
                  if (!monthData.has(key)) monthData.set(key, { month: label, count: 0, completed: 0, overdue: 0 });
                  const entry = monthData.get(key)!;
                  entry.count++;
                  if (r.status === 'completed') entry.completed++;
                  if (isOverdue(r.plannedDate) && r.status !== 'completed') entry.overdue++;
                });
                return [...monthData.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
              })()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" name={ar ? 'الإجمالي' : 'Total'} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name={ar ? 'مكتمل' : 'Completed'} fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue" name={ar ? 'متأخر' : 'Overdue'} fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{ar ? 'توزيع الحالات' : 'Status Distribution'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: ar ? 'مكتمل' : 'Completed', value: filtered.filter(r => r.status === 'completed').length },
                    { name: ar ? 'مسجل' : 'Enrolled', value: filtered.filter(r => r.status === 'enrolled').length },
                    { name: ar ? 'راسب' : 'Failed', value: filtered.filter(r => r.status === 'failed').length },
                  ].filter(d => d.value > 0)}
                  cx="50%" cy="50%" outerRadius={80} dataKey="value" label
                >
                  <Cell fill="hsl(142, 76%, 36%)" />
                  <Cell fill="hsl(var(--primary))" />
                  <Cell fill="hsl(var(--destructive))" />
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{ar ? 'أكثر الدورات' : 'Top Courses'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart layout="vertical" data={(() => {
                const courseMap = new Map<string, number>();
                filtered.forEach(r => {
                  const name = r.courseName || (ar ? 'غير محدد' : 'Unknown');
                  courseMap.set(name, (courseMap.get(name) || 0) + 1);
                });
                return [...courseMap.entries()].sort(([, a], [, b]) => b - a).slice(0, 6).map(([name, count]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, count }));
              })()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="name" width={120} fontSize={10} />
                <Tooltip />
                <Bar dataKey="count" name={ar ? 'العدد' : 'Count'} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{ar ? 'توزيع المحطات' : 'Station Distribution'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={(() => {
                const stMap = new Map<string, number>();
                filtered.forEach(r => {
                  const stObj = stations.find(s => s.id === r.station);
                  const name = stObj ? (ar ? stObj.nameAr : stObj.nameEn) : '-';
                  stMap.set(name, (stMap.get(name) || 0) + 1);
                });
                return [...stMap.entries()].sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }));
              })()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" name={ar ? 'العدد' : 'Count'} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
