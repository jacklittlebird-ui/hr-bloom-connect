import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Printer, FileText, FileSpreadsheet, ChevronDown, Search, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { supabase } from '@/integrations/supabase/client';
import { useReportExport } from '@/hooks/useReportExport';

const DEPT_CODES = ['PS', 'OO', 'LC', 'IA', 'LL', 'RO', 'SC', 'AD', 'AC', 'WO', 'TR'];

interface EmployeeTrainingGroup {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  hireDate: string;
  jobTitle: string;
  deptCode: string;
  courses: {
    id: string;
    courseName: string;
    provider: string;
    trainingDate: string;
    hasCert: boolean;
  }[];
}

async function fetchAllTrainingRecords() {
  const PAGE_SIZE = 1000;
  let all: any[] = [];
  let from = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase
      .from('training_records')
      .select('*, training_courses(name_en, name_ar, course_code, provider)')
      .order('start_date', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error || !data) break;
    all = all.concat(data);
    hasMore = data.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }
  return all;
}

export const TrainingQualificationReport = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { employees: contextEmployees } = useEmployeeData();
  const { reportRef, handlePrint, exportBilingualPDF, exportBilingualCSV } = useReportExport();

  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [stations, setStations] = useState<{ id: string; nameAr: string; nameEn: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; nameAr: string; nameEn: string }[]>([]);
  const [courseOptions, setCourseOptions] = useState<{ id: string; nameAr: string; nameEn: string }[]>([]);

  const [filterType, setFilterType] = useState<'station' | 'department' | 'course' | 'employee'>('station');
  const [filterStation, setFilterStation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: stns }, { data: depts }, { data: courses }, records] = await Promise.all([
        supabase.from('stations').select('id, name_ar, name_en').eq('is_active', true),
        supabase.from('departments').select('id, name_ar, name_en').eq('is_active', true),
        supabase.from('training_courses').select('id, name_en, name_ar, provider').eq('is_active', true),
        fetchAllTrainingRecords(),
      ]);
      setStations((stns || []).map((s: any) => ({ id: s.id, nameAr: s.name_ar, nameEn: s.name_en })));
      setDepartments((depts || []).map((d: any) => ({ id: d.id, nameAr: d.name_ar, nameEn: d.name_en })));
      setCourseOptions((courses || []).map((c: any) => ({ id: c.id, nameAr: c.name_ar, nameEn: c.name_en })));
      setAllRecords(records || []);
    };
    fetchAll();
  }, []);

  const groupedData = useMemo(() => {
    // Build employee-course map
    const empMap = new Map<string, EmployeeTrainingGroup>();

    allRecords.forEach(r => {
      const emp = contextEmployees.find(e => e.id === r.employee_id);
      if (!emp) return;

      // Apply filters
      if (filterType === 'station' && filterStation !== 'all' && emp.stationId !== filterStation) return;
      if (filterType === 'department' && filterDepartment !== 'all' && emp.departmentId !== filterDepartment) return;
      if (filterType === 'course' && filterCourse !== 'all' && r.course_id !== filterCourse) return;
      if (filterType === 'employee' && filterEmployee !== 'all' && emp.id !== filterEmployee) return;

      // Must have at least one filter selected (not 'all')
      if (filterType === 'station' && filterStation === 'all') return;
      if (filterType === 'department' && filterDepartment === 'all') return;
      if (filterType === 'course' && filterCourse === 'all') return;
      if (filterType === 'employee' && filterEmployee === 'all') return;

      if (!empMap.has(emp.id)) {
        empMap.set(emp.id, {
          employeeId: emp.id,
          employeeName: ar ? emp.nameAr : emp.nameEn,
          employeeCode: emp.employeeId || '',
          hireDate: emp.hireDate || '',
          jobTitle: ar ? (emp.jobTitleAr || '') : (emp.jobTitleEn || ''),
          deptCode: emp.deptCode || '',
          courses: [],
        });
      }

      const courseName = r.training_courses ? (ar ? r.training_courses.name_ar : r.training_courses.name_en) : '';
      const provider = r.training_courses?.provider || r.provider || '';

      empMap.get(emp.id)!.courses.push({
        id: r.id,
        courseName,
        provider,
        trainingDate: r.end_date || r.start_date || '',
        hasCert: r.has_cert || false,
      });
    });

    // Sort employees alphabetically
    return [...empMap.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName, ar ? 'ar' : 'en'));
  }, [allRecords, contextEmployees, filterType, filterStation, filterDepartment, filterCourse, filterEmployee, ar]);

  const getFilterTitle = () => {
    if (filterType === 'station' && filterStation !== 'all') {
      const s = stations.find(s => s.id === filterStation);
      return s ? (ar ? s.nameAr : s.nameEn) : '';
    }
    if (filterType === 'department' && filterDepartment !== 'all') {
      const d = departments.find(d => d.id === filterDepartment);
      return d ? (ar ? d.nameAr : d.nameEn) : '';
    }
    if (filterType === 'course' && filterCourse !== 'all') {
      const c = courseOptions.find(c => c.id === filterCourse);
      return c ? (ar ? c.nameAr : c.nameEn) : '';
    }
    if (filterType === 'employee' && filterEmployee !== 'all') {
      const emp = contextEmployees.find(e => e.id === filterEmployee);
      return emp ? (ar ? emp.nameAr : emp.nameEn) : '';
    }
    return '';
  };

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return contextEmployees;
    const s = employeeSearch.toLowerCase();
    return contextEmployees.filter(e =>
      (e.nameAr || '').toLowerCase().includes(s) ||
      (e.nameEn || '').toLowerCase().includes(s) ||
      (e.employeeId || '').toLowerCase().includes(s)
    );
  }, [contextEmployees, employeeSearch]);

  const filteredCourses = useMemo(() => {
    if (!courseSearch) return courseOptions;
    const s = courseSearch.toLowerCase();
    return courseOptions.filter(c =>
      c.nameAr.toLowerCase().includes(s) || c.nameEn.toLowerCase().includes(s)
    );
  }, [courseOptions, courseSearch]);

  const exportColumns = [
    { headerAr: 'اسم الموظف', headerEn: 'Employee Name', key: 'employeeName' },
    { headerAr: 'تاريخ التعيين', headerEn: 'Hire Date', key: 'hireDate' },
    { headerAr: 'الوظيفة', headerEn: 'Job Title', key: 'jobTitle' },
    { headerAr: 'كود القسم', headerEn: 'Dept Code', key: 'deptCode' },
    { headerAr: 'اسم الدورة', headerEn: 'Course Name', key: 'courseName' },
    { headerAr: 'الجهة المقدمة', headerEn: 'Provider', key: 'provider' },
    { headerAr: 'تاريخ التدريب', headerEn: 'Training Date', key: 'trainingDate' },
    { headerAr: 'شهادة', headerEn: 'Certificate', key: 'certLabel' },
  ];

  const getExportData = useCallback(() => {
    const rows: Record<string, any>[] = [];
    const title = getFilterTitle();
    if (title) {
      rows.push({
        employeeName: `${ar ? 'الموقع' : 'Location'}: ${title}`,
        hireDate: '', jobTitle: '', deptCode: '', courseName: '', provider: '', trainingDate: '', certLabel: '',
      });
    }
    for (const emp of groupedData) {
      emp.courses.forEach((c, idx) => {
        rows.push({
          employeeName: idx === 0 ? emp.employeeName : '',
          hireDate: idx === 0 ? emp.hireDate : '',
          jobTitle: idx === 0 ? emp.jobTitle : '',
          deptCode: idx === 0 ? emp.deptCode : '',
          courseName: c.courseName,
          provider: c.provider,
          trainingDate: c.trainingDate,
          certLabel: c.hasCert ? '✓' : '',
        });
      });
    }
    return rows;
  }, [groupedData, ar]);

  const reportTitle = ar ? 'سجل التدريب والتأهيل' : 'Training & Qualification Record';

  const isFilterActive = (filterType === 'station' && filterStation !== 'all') ||
    (filterType === 'department' && filterDepartment !== 'all') ||
    (filterType === 'course' && filterCourse !== 'all') ||
    (filterType === 'employee' && filterEmployee !== 'all');

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">{reportTitle}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handlePrint(reportTitle)} disabled={!isFilterActive}>
            <Printer className="h-4 w-4 mr-1" />{ar ? 'طباعة' : 'Print'}
          </Button>
          <Button variant="outline" size="sm" disabled={!isFilterActive} onClick={() => exportBilingualPDF({
            titleAr: 'سجل التدريب والتأهيل - ' + getFilterTitle(),
            titleEn: 'Training & Qualification Record - ' + getFilterTitle(),
            data: getExportData(), columns: exportColumns, fileName: 'Training_Qualification_Report',
          })}>
            <FileText className="h-4 w-4 mr-1" />PDF
          </Button>
          <Button variant="outline" size="sm" disabled={!isFilterActive} onClick={() => exportBilingualCSV({
            titleAr: 'سجل التدريب والتأهيل - ' + getFilterTitle(),
            titleEn: 'Training & Qualification Record - ' + getFilterTitle(),
            data: getExportData(), columns: exportColumns, fileName: 'Training_Qualification_Report',
          })}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{ar ? 'تصفية حسب' : 'Filter By'}</label>
              <Select value={filterType} onValueChange={(v: any) => {
                setFilterType(v);
                setFilterStation('all');
                setFilterDepartment('all');
                setFilterCourse('all');
                setFilterEmployee('all');
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="station">{ar ? 'المحطة' : 'Station'}</SelectItem>
                  <SelectItem value="department">{ar ? 'القسم' : 'Department'}</SelectItem>
                  <SelectItem value="course">{ar ? 'الدورة' : 'Course'}</SelectItem>
                  <SelectItem value="employee">{ar ? 'الموظف' : 'Employee'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterType === 'station' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{ar ? 'المحطة' : 'Station'}</label>
                <Select value={filterStation} onValueChange={setFilterStation}>
                  <SelectTrigger><SelectValue placeholder={ar ? 'اختر المحطة' : 'Select Station'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ar ? 'اختر...' : 'Select...'}</SelectItem>
                    {stations.map(s => (
                      <SelectItem key={s.id} value={s.id}>{ar ? s.nameAr : s.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterType === 'department' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{ar ? 'القسم' : 'Department'}</label>
                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger><SelectValue placeholder={ar ? 'اختر القسم' : 'Select Department'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{ar ? 'اختر...' : 'Select...'}</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{ar ? d.nameAr : d.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterType === 'course' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{ar ? 'الدورة' : 'Course'}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-xs font-normal h-10">
                      {filterCourse === 'all' ? (ar ? 'اختر...' : 'Select...') : (() => {
                        const c = courseOptions.find(c => c.id === filterCourse);
                        return c ? (ar ? c.nameAr : c.nameEn) : '';
                      })()}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="start">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input placeholder={ar ? 'بحث...' : 'Search...'} value={courseSearch} onChange={e => setCourseSearch(e.target.value)}
                        className="h-8 text-sm border-0 p-0 focus-visible:ring-0" />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                      {filteredCourses.map(c => (
                        <button key={c.id}
                          className={cn("w-full text-right px-2 py-1.5 text-sm rounded hover:bg-muted truncate", filterCourse === c.id && 'bg-accent')}
                          onClick={() => { setFilterCourse(c.id); setCourseSearch(''); }}>
                          {ar ? c.nameAr : c.nameEn}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {filterType === 'employee' && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{ar ? 'الموظف' : 'Employee'}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-xs font-normal h-10">
                      {filterEmployee === 'all' ? (ar ? 'اختر...' : 'Select...') : (() => {
                        const emp = contextEmployees.find(e => e.id === filterEmployee);
                        return emp ? (ar ? emp.nameAr : emp.nameEn) : '';
                      })()}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="start">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input placeholder={ar ? 'بحث...' : 'Search...'} value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)}
                        className="h-8 text-sm border-0 p-0 focus-visible:ring-0" />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-0.5">
                      {filteredEmployees.map(e => (
                        <button key={e.id}
                          className={cn("w-full text-right px-2 py-1.5 text-sm rounded hover:bg-muted truncate", filterEmployee === e.id && 'bg-accent')}
                          onClick={() => { setFilterEmployee(e.id); setEmployeeSearch(''); }}>
                          {e.employeeId} - {ar ? e.nameAr : e.nameEn}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {!isFilterActive ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            {ar ? 'اختر فلتر لعرض التقرير' : 'Select a filter to view the report'}
          </CardContent>
        </Card>
      ) : (
        <div ref={reportRef} className="space-y-1">
          {/* Location Header */}
          <div className="bg-primary text-primary-foreground text-center py-2 rounded-t-lg">
            <h2 className="text-lg font-bold">{reportTitle}</h2>
            <p className="text-sm opacity-90">{getFilterTitle()}</p>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-px bg-primary/80 text-primary-foreground text-xs font-semibold">
            <div className="col-span-3 p-2">{ar ? 'الاسم' : 'Name'}</div>
            <div className="col-span-4 p-2">{ar ? 'اسم الدورة التدريبية' : 'Training Course Name'}</div>
            <div className="col-span-3 p-2">{ar ? 'الجهة المقدمة' : 'Provider & Location'}</div>
            <div className="col-span-1 p-2 text-center">{ar ? 'التاريخ' : 'Date'}</div>
            <div className="col-span-1 p-2 text-center">{ar ? 'شهادة' : 'Cert'}</div>
          </div>

          {groupedData.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                {ar ? 'لا توجد سجلات تدريب' : 'No training records found'}
              </CardContent>
            </Card>
          ) : (
            groupedData.map(emp => (
              <div key={emp.employeeId} className="border border-border rounded-sm mb-2 overflow-hidden">
                {/* Employee Header */}
                <div className="bg-muted/60 border-b border-border">
                  <div className="grid grid-cols-12 gap-2 items-center p-2">
                    <div className="col-span-3">
                      <span className="font-bold text-sm text-foreground">{emp.employeeName}</span>
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{ar ? 'تاريخ التعيين' : 'Hire Date'}</span>
                      <Badge variant="outline" className="bg-primary/10 text-primary font-bold text-xs">{emp.hireDate || '-'}</Badge>
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{ar ? 'الوظيفة' : 'Job Title'}</span>
                      <span className="text-xs font-semibold text-foreground">{emp.jobTitle || '-'}</span>
                    </div>
                    <div className="col-span-3" />
                  </div>
                  {/* Dept Codes */}
                  <div className="px-2 pb-2 flex flex-wrap gap-x-3 gap-y-1">
                    {DEPT_CODES.map(code => (
                      <label key={code} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="font-mono font-semibold">{code}</span>
                        <Checkbox checked={emp.deptCode === code} disabled className="h-3.5 w-3.5" />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Courses */}
                {emp.courses.map(c => (
                  <div key={c.id} className="grid grid-cols-12 gap-px border-b last:border-b-0 border-border/50 hover:bg-muted/30 text-sm">
                    <div className="col-span-3 p-2" />
                    <div className="col-span-4 p-2 text-foreground">{c.courseName}</div>
                    <div className="col-span-3 p-2 text-muted-foreground">{c.provider}</div>
                    <div className="col-span-1 p-2 text-center text-xs">{c.trainingDate}</div>
                    <div className="col-span-1 p-2 text-center">
                      <Checkbox checked={c.hasCert} disabled className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* Summary */}
      {isFilterActive && groupedData.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{ar ? 'الموظفين' : 'Employees'}: <strong className="text-foreground">{groupedData.length}</strong></span>
          <span>{ar ? 'الدورات' : 'Courses'}: <strong className="text-foreground">{groupedData.reduce((sum, e) => sum + e.courses.length, 0)}</strong></span>
          <span>{ar ? 'الشهادات' : 'Certificates'}: <strong className="text-foreground">{groupedData.reduce((sum, e) => sum + e.courses.filter(c => c.hasCert).length, 0)}</strong></span>
        </div>
      )}
    </div>
  );
};
