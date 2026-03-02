import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, FileText, FileSpreadsheet, Users, BookOpen, Award, TrendingUp, Star } from 'lucide-react';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { supabase } from '@/integrations/supabase/client';
import { useReportExport } from '@/hooks/useReportExport';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface ReportRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string;
  station: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  provider: string;
  location: string;
  startDate: string;
  endDate: string;
  status: string;
  score: number | null;
  hasCert: boolean;
  plannedDate: string;
  isFavorite: boolean;
}

export const TrainingRecordsReport = () => {
  const { t, language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { employees: contextEmployees } = useEmployeeData();
  const { reportRef, handlePrint, exportBilingualPDF, exportBilingualCSV } = useReportExport();

  const [allRecords, setAllRecords] = useState<ReportRecord[]>([]);
  const [departments, setDepartments] = useState<{ id: string; nameAr: string; nameEn: string }[]>([]);
  const [stations, setStations] = useState<{ id: string; nameAr: string; nameEn: string }[]>([]);
  const [courseOptions, setCourseOptions] = useState<{ id: string; nameAr: string; nameEn: string; provider: string }[]>([]);

  const [filterStation, setFilterStation] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterProvider, setFilterProvider] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterFavorite, setFilterFavorite] = useState('all');

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: depts }, { data: stns }, { data: courses }, { data: records }] = await Promise.all([
        supabase.from('departments').select('id, name_ar, name_en').eq('is_active', true),
        supabase.from('stations').select('id, name_ar, name_en').eq('is_active', true),
        supabase.from('training_courses').select('id, name_en, name_ar, provider, course_code').eq('is_active', true),
        supabase.from('training_records').select('*, training_courses(name_en, name_ar, course_code, provider)'),
      ]);
      setDepartments((depts || []).map((d: any) => ({ id: d.id, nameAr: d.name_ar, nameEn: d.name_en })));
      setStations((stns || []).map((s: any) => ({ id: s.id, nameAr: s.name_ar, nameEn: s.name_en })));
      setCourseOptions((courses || []).map((c: any) => ({ id: c.id, nameAr: c.name_ar, nameEn: c.name_en, provider: c.provider || '' })));

      const mapped: ReportRecord[] = (records || []).map((r: any) => {
        const emp = contextEmployees.find(e => e.id === r.employee_id);
        const stationObj = stns?.find((s: any) => s.id === emp?.stationId);
        const deptObj = depts?.find((d: any) => d.id === emp?.departmentId);
        const stName = stationObj ? (ar ? stationObj.name_ar : stationObj.name_en) : (emp?.stationLocation || '');
        const dName = deptObj ? (ar ? deptObj.name_ar : deptObj.name_en) : (emp?.department || '');
        return {
          id: r.id,
          employeeId: r.employee_id,
          employeeName: emp ? (ar ? emp.nameAr : emp.nameEn) : '',
          employeeCode: emp?.employeeId || '',
          department: dName,
          station: stName,
          courseId: r.course_id || '',
          courseName: r.training_courses ? (ar ? r.training_courses.name_ar : r.training_courses.name_en) : '',
          courseCode: r.training_courses?.course_code || '',
          provider: r.training_courses?.provider || r.provider || '',
          location: r.location || '',
          startDate: r.start_date || '',
          endDate: r.end_date || '',
          status: r.status || 'enrolled',
          score: r.score,
          hasCert: r.has_cert || false,
          plannedDate: r.planned_date || '',
          isFavorite: r.is_favorite || false,
        };
      });
      setAllRecords(mapped);
    };
    fetchAll();
  }, [contextEmployees, ar]);

  const providerOptions = useMemo(() => {
    const providers = [...new Set(courseOptions.map(c => c.provider).filter(Boolean))];
    return providers;
  }, [courseOptions]);

  const yearOptions = useMemo(() => {
    const years = [...new Set(allRecords.map(r => r.endDate ? r.endDate.substring(0, 4) : '').filter(Boolean))];
    return years.sort().reverse();
  }, [allRecords]);

  const filtered = useMemo(() => {
    return allRecords.filter(r => {
      if (filterStation !== 'all') {
        const stObj = stations.find(s => s.id === filterStation);
        if (stObj && r.station !== (ar ? stObj.nameAr : stObj.nameEn)) return false;
      }
      if (filterCourse !== 'all' && r.courseId !== filterCourse) return false;
      if (filterEmployee !== 'all' && r.employeeId !== filterEmployee) return false;
      if (filterDepartment !== 'all') {
        const dObj = departments.find(d => d.id === filterDepartment);
        if (dObj && r.department !== (ar ? dObj.nameAr : dObj.nameEn)) return false;
      }
      if (filterProvider !== 'all' && r.provider !== filterProvider) return false;
      if (filterYear !== 'all') {
        const year = r.endDate ? r.endDate.substring(0, 4) : '';
        if (year !== filterYear) return false;
      }
      if (filterFavorite !== 'all') {
        if (filterFavorite === 'yes' && !r.isFavorite) return false;
        if (filterFavorite === 'no' && r.isFavorite) return false;
      }
      return true;
    });
  }, [allRecords, filterStation, filterCourse, filterEmployee, filterDepartment, filterProvider, filterYear, filterFavorite, stations, departments, ar]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-stat-green">{ar ? 'مكتمل' : 'Completed'}</Badge>;
      case 'failed': return <Badge variant="destructive">{ar ? 'راسب' : 'Failed'}</Badge>;
      default: return <Badge variant="secondary">{ar ? 'مسجل' : 'Enrolled'}</Badge>;
    }
  };

  const exportColumns = [
    { headerAr: 'كود الموظف', headerEn: 'Employee Code', key: 'employeeCode' },
    { headerAr: 'اسم الموظف', headerEn: 'Employee Name', key: 'employeeName' },
    { headerAr: 'القسم', headerEn: 'Department', key: 'department' },
    { headerAr: 'المحطة', headerEn: 'Station', key: 'station' },
    { headerAr: 'كود الدورة', headerEn: 'Course Code', key: 'courseCode' },
    { headerAr: 'اسم الدورة', headerEn: 'Course Name', key: 'courseName' },
    { headerAr: 'الجهة المقدمة', headerEn: 'Provider', key: 'provider' },
    { headerAr: 'تاريخ البداية', headerEn: 'Start Date', key: 'startDate' },
    { headerAr: 'تاريخ النهاية', headerEn: 'End Date', key: 'endDate' },
    { headerAr: 'الحالة', headerEn: 'Status', key: 'statusLabel' },
    { headerAr: 'الدرجة', headerEn: 'Score', key: 'score' },
    { headerAr: 'شهادة', headerEn: 'Certificate', key: 'certLabel' },
  ];

  const getExportData = useCallback(() => {
    return filtered.map(r => ({
      ...r,
      statusLabel: r.status === 'completed' ? (ar ? 'مكتمل' : 'Completed') : r.status === 'failed' ? (ar ? 'راسب' : 'Failed') : (ar ? 'مسجل' : 'Enrolled'),
      score: r.score != null ? `${r.score}%` : '-',
      certLabel: r.hasCert ? (ar ? 'نعم' : 'Yes') : (ar ? 'لا' : 'No'),
    }));
  }, [filtered, ar]);

  const handleExportPDF = () => {
    exportBilingualPDF({
      titleAr: 'تقرير سجلات التدريب',
      titleEn: 'Training Records Report',
      data: getExportData(),
      columns: exportColumns,
      fileName: 'Training_Records_Report',
    });
  };

  const handleExportExcel = () => {
    exportBilingualCSV({
      titleAr: 'تقرير سجلات التدريب',
      titleEn: 'Training Records Report',
      data: getExportData(),
      columns: exportColumns,
      fileName: 'Training_Records_Report',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">{ar ? 'تقرير سجلات التدريب' : 'Training Records Report'}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handlePrint(ar ? 'تقرير سجلات التدريب' : 'Training Records Report')}>
            <Printer className="h-4 w-4 mr-1" />{ar ? 'طباعة' : 'Print'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 mr-1" />PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <Select value={filterStation} onValueChange={setFilterStation}>
              <SelectTrigger><SelectValue placeholder={ar ? 'المحطة' : 'Station'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
                {stations.map(s => (<SelectItem key={s.id} value={s.id}>{ar ? s.nameAr : s.nameEn}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger><SelectValue placeholder={ar ? 'القسم' : 'Department'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
                {departments.map(d => (<SelectItem key={d.id} value={d.id}>{ar ? d.nameAr : d.nameEn}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger><SelectValue placeholder={ar ? 'الدورة' : 'Course'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
                {courseOptions.map(c => (<SelectItem key={c.id} value={c.id}>{ar ? c.nameAr : c.nameEn}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger><SelectValue placeholder={ar ? 'الموظف' : 'Employee'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
                {contextEmployees.map(e => (<SelectItem key={e.id} value={e.id}>{ar ? e.nameAr : e.nameEn}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterProvider} onValueChange={setFilterProvider}>
              <SelectTrigger><SelectValue placeholder={ar ? 'الجهة المقدمة' : 'Provider'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
                {providerOptions.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger><SelectValue placeholder={ar ? 'السنة' : 'Year'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
                {yearOptions.map(y => (<SelectItem key={y} value={y}>{y}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={filterFavorite} onValueChange={setFilterFavorite}>
              <SelectTrigger><SelectValue placeholder={ar ? 'المفضلة' : 'Favorites'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
                <SelectItem value="yes">{ar ? 'مفضل' : 'Favorites'}</SelectItem>
                <SelectItem value="no">{ar ? 'غير مفضل' : 'Non-Favorites'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table FIRST */}
      <div ref={reportRef}>
        <Card>
          <CardContent className="p-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{ar ? 'كود الموظف' : 'Code'}</TableHead>
                  <TableHead>{ar ? 'اسم الموظف' : 'Employee'}</TableHead>
                  <TableHead>{ar ? 'القسم' : 'Dept'}</TableHead>
                  <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                  <TableHead>{ar ? 'الدورة' : 'Course'}</TableHead>
                  <TableHead>{ar ? 'الجهة' : 'Provider'}</TableHead>
                  <TableHead>{ar ? 'تاريخ البداية' : 'Start'}</TableHead>
                  <TableHead>{ar ? 'تاريخ النهاية' : 'End'}</TableHead>
                  <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{ar ? 'الدرجة' : 'Score'}</TableHead>
                   <TableHead>{ar ? 'شهادة' : 'Cert'}</TableHead>
                   <TableHead><Star className="h-4 w-4" /></TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={14} className="text-center text-muted-foreground py-8">{ar ? 'لا توجد سجلات' : 'No records found'}</TableCell></TableRow>
                ) : filtered.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{r.employeeCode}</TableCell>
                    <TableCell className="font-medium">{r.employeeName}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>{r.station}</TableCell>
                    <TableCell>{r.courseName}</TableCell>
                    <TableCell>{r.provider}</TableCell>
                    <TableCell>{r.startDate}</TableCell>
                    <TableCell>{r.endDate}</TableCell>
                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                    <TableCell>{r.score != null ? `${r.score}%` : '-'}</TableCell>
                    <TableCell>{r.hasCert ? '✓' : '-'}</TableCell>
                    <TableCell>{r.isFavorite ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards AFTER table */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{filtered.length}</p><p className="text-xs text-muted-foreground">{ar ? 'إجمالي السجلات' : 'Total Records'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{new Set(filtered.map(r => r.employeeId)).size}</p><p className="text-xs text-muted-foreground">{ar ? 'الموظفين' : 'Employees'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-stat-green/10"><TrendingUp className="h-5 w-5 text-stat-green" /></div>
          <div><p className="text-2xl font-bold">{filtered.filter(r => r.status === 'completed').length}</p><p className="text-xs text-muted-foreground">{ar ? 'مكتمل' : 'Completed'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><TrendingUp className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-2xl font-bold">{filtered.filter(r => r.status === 'failed').length}</p><p className="text-xs text-muted-foreground">{ar ? 'راسب' : 'Failed'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><BookOpen className="h-5 w-5 text-muted-foreground" /></div>
          <div><p className="text-2xl font-bold">{filtered.filter(r => r.status === 'enrolled').length}</p><p className="text-xs text-muted-foreground">{ar ? 'مسجل' : 'Enrolled'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Award className="h-5 w-5 text-primary" /></div>
          <div><p className="text-2xl font-bold">{filtered.filter(r => r.hasCert).length}</p><p className="text-xs text-muted-foreground">{ar ? 'حاصل على شهادة' : 'Certified'}</p></div>
        </CardContent></Card>
      </div>

      {/* Completion Progress */}
      {filtered.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{ar ? 'معدل النجاح' : 'Success Rate'}</span>
              <span className="text-sm font-bold text-primary">
                {Math.round((filtered.filter(r => r.status === 'completed').length / filtered.length) * 100)}%
              </span>
            </div>
            <Progress value={(filtered.filter(r => r.status === 'completed').length / filtered.length) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
          <CardHeader className="pb-2"><CardTitle className="text-sm">{ar ? 'توزيع الجهات المقدمة' : 'Provider Distribution'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart layout="vertical" data={(() => {
                const pMap = new Map<string, number>();
                filtered.forEach(r => {
                  const p = r.provider || (ar ? 'غير محدد' : 'Unknown');
                  pMap.set(p, (pMap.get(p) || 0) + 1);
                });
                return [...pMap.entries()].sort(([, a], [, b]) => b - a).slice(0, 6).map(([name, count]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, count }));
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
                const stMap = new Map<string, { name: string; completed: number; other: number }>();
                filtered.forEach(r => {
                  const name = r.station || '-';
                  if (!stMap.has(name)) stMap.set(name, { name, completed: 0, other: 0 });
                  const entry = stMap.get(name)!;
                  if (r.status === 'completed') entry.completed++;
                  else entry.other++;
                });
                return [...stMap.values()].sort((a, b) => (b.completed + b.other) - (a.completed + a.other));
              })()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="completed" name={ar ? 'مكتمل' : 'Completed'} stackId="a" fill="hsl(142, 76%, 36%)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="other" name={ar ? 'أخرى' : 'Other'} stackId="a" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">{ar ? 'أكثر الدورات' : 'Top Courses'}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart layout="vertical" data={(() => {
                const cMap = new Map<string, number>();
                filtered.forEach(r => {
                  const name = r.courseName || (ar ? 'غير محدد' : 'Unknown');
                  cMap.set(name, (cMap.get(name) || 0) + 1);
                });
                return [...cMap.entries()].sort(([, a], [, b]) => b - a).slice(0, 6).map(([name, count]) => ({ name: name.length > 20 ? name.substring(0, 20) + '...' : name, count }));
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
      </div>
    </div>
  );
};
