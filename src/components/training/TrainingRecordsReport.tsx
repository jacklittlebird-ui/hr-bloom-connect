import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, FileText, FileSpreadsheet } from 'lucide-react';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { stationLocations } from '@/data/stationLocations';
import { supabase } from '@/integrations/supabase/client';
import { useReportExport } from '@/hooks/useReportExport';

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

  // Filters
  const [filterStation, setFilterStation] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterProvider, setFilterProvider] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  // Fetch data
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

      // Build records with employee data
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
        };
      });
      setAllRecords(mapped);
    };
    fetchAll();
  }, [contextEmployees, ar]);

  // Provider options from courses
  const providerOptions = useMemo(() => {
    const providers = [...new Set(courseOptions.map(c => c.provider).filter(Boolean))];
    return providers;
  }, [courseOptions]);

  // Year options from end dates
  const yearOptions = useMemo(() => {
    const years = [...new Set(allRecords.map(r => r.endDate ? r.endDate.substring(0, 4) : '').filter(Boolean))];
    return years.sort().reverse();
  }, [allRecords]);

  // Filtered
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
      return true;
    });
  }, [allRecords, filterStation, filterCourse, filterEmployee, filterDepartment, filterProvider, filterYear, stations, departments, ar]);

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-primary">{filtered.length}</div>
          <div className="text-xs text-muted-foreground">{ar ? 'إجمالي السجلات' : 'Total Records'}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-stat-green">{filtered.filter(r => r.status === 'completed').length}</div>
          <div className="text-xs text-muted-foreground">{ar ? 'مكتمل' : 'Completed'}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-destructive">{filtered.filter(r => r.status === 'failed').length}</div>
          <div className="text-xs text-muted-foreground">{ar ? 'راسب' : 'Failed'}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <div className="text-2xl font-bold text-accent-foreground">{filtered.filter(r => r.status === 'enrolled').length}</div>
          <div className="text-xs text-muted-foreground">{ar ? 'مسجل' : 'Enrolled'}</div>
        </CardContent></Card>
      </div>

      {/* Table */}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">{ar ? 'لا توجد سجلات' : 'No records found'}</TableCell></TableRow>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
