import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Printer, FileText, FileSpreadsheet, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { supabase } from '@/integrations/supabase/client';
import { useReportExport } from '@/hooks/useReportExport';
import { toast } from '@/hooks/use-toast';

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
        supabase.from('training_courses').select('id, name_en, name_ar, provider'),
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
    const empMap = new Map<string, EmployeeTrainingGroup>();
    const hasAnyFilter = filterStation !== 'all' || filterDepartment !== 'all' || filterCourse !== 'all' || filterEmployee !== 'all';
    if (!hasAnyFilter) return [];

    allRecords.forEach(r => {
      const emp = contextEmployees.find(e => e.id === r.employee_id);
      if (!emp) return;

      if (filterStation !== 'all' && emp.stationId !== filterStation) return;
      if (filterDepartment !== 'all' && emp.departmentId !== filterDepartment) return;
      if (filterCourse !== 'all' && r.course_id !== filterCourse) return;
      if (filterEmployee !== 'all' && emp.id !== filterEmployee) return;

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
      const provider = r.provider || r.training_courses?.provider || '';

      empMap.get(emp.id)!.courses.push({
        id: r.id,
        courseName,
        provider,
        trainingDate: r.end_date || r.start_date || '',
        hasCert: r.has_cert || false,
      });
    });

    return [...empMap.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName, ar ? 'ar' : 'en'));
  }, [allRecords, contextEmployees, filterStation, filterDepartment, filterCourse, filterEmployee, ar]);

  const getFilterTitle = () => {
    const parts: string[] = [];
    if (filterStation !== 'all') {
      const s = stations.find(s => s.id === filterStation);
      if (s) parts.push(ar ? s.nameAr : s.nameEn);
    }
    if (filterDepartment !== 'all') {
      const d = departments.find(d => d.id === filterDepartment);
      if (d) parts.push(ar ? d.nameAr : d.nameEn);
    }
    if (filterEmployee !== 'all') {
      const emp = contextEmployees.find(e => e.id === filterEmployee);
      if (emp) parts.push(ar ? emp.nameAr : emp.nameEn);
    }
    if (filterCourse !== 'all') {
      const c = courseOptions.find(c => c.id === filterCourse);
      if (c) parts.push(ar ? c.nameAr : c.nameEn);
    }
    return parts.join(' - ') || '';
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

  const filterTypeLabel = getFilterTitle();

  const isFilterActive = filterStation !== 'all' || filterDepartment !== 'all' || filterCourse !== 'all' || filterEmployee !== 'all';

  const handleQualificationPrint = useCallback(() => {
    const logoUrl = `${window.location.origin}/images/company-logo.png`;
    const dir = ar ? 'rtl' : 'ltr';
    const title = getFilterTitle();
    const fullTitle = ar ? `سجل التدريب والتأهيل - ${title}` : `Training & Qualification Record - ${title}`;

    const headerRow = `
      <tr>
        <th style="width:25%;padding:6px 8px;font-size:12px;font-weight:700;border:1px solid #999;background:#e8e8e8;text-align:${ar ? 'right' : 'left'};">${ar ? 'الاسم' : 'Name'}</th>
        <th style="width:30%;padding:6px 8px;font-size:12px;font-weight:700;border:1px solid #999;background:#e8e8e8;text-align:center;">${ar ? 'اسم الدورة التدريبية' : 'Training Course Name'}</th>
        <th style="width:25%;padding:6px 8px;font-size:12px;font-weight:700;border:1px solid #999;background:#e8e8e8;text-align:center;">${ar ? 'الجهة المقدمة والموقع' : 'Provider & Location'}</th>
        <th style="width:12%;padding:6px 8px;font-size:12px;font-weight:700;border:1px solid #999;background:#e8e8e8;text-align:center;">${ar ? 'تاريخ التدريب' : 'Training Date'}</th>
        <th style="width:8%;padding:6px 8px;font-size:12px;font-weight:700;border:1px solid #999;background:#e8e8e8;text-align:center;">${ar ? 'شهادة' : 'Cert'}</th>
      </tr>
    `;

    let bodyRows = `
      <tr><td colspan="5" style="background:#4472C4;color:white;text-align:center;padding:6px;font-weight:700;font-size:13px;border:1px solid #3360a8;">${title}</td></tr>
    `;

    for (const emp of groupedData) {
      // Repeat header row before each employee
      bodyRows += headerRow;
      // Employee header row
      bodyRows += `
        <tr>
          <td style="background:#2E3B4E;color:white;padding:6px 8px;font-weight:700;font-size:12px;border:1px solid #555;">${emp.employeeName}</td>
          <td style="background:#2E3B4E;color:white;padding:6px 8px;font-size:11px;border:1px solid #555;">
            <span style="color:#ccc;">${ar ? 'تاريخ التعيين' : 'Hire Date'}</span> <span style="color:#FF6B6B;font-weight:700;">${emp.hireDate || '-'}</span>
          </td>
          <td colspan="2" style="background:#2E3B4E;color:white;padding:6px 8px;font-size:11px;border:1px solid #555;">
            <span style="color:#ccc;">${ar ? 'الوظيفة' : 'Job Title'}</span> <span style="font-weight:600;">${emp.jobTitle || '-'}</span>
          </td>
          <td style="background:#2E3B4E;border:1px solid #555;"></td>
        </tr>
      `;
      // Dept codes row
      const deptRow = DEPT_CODES.map(code =>
        `<span style="font-family:monospace;font-size:10px;margin:0 4px;">${code} ${emp.deptCode === code ? '☑' : '☐'}</span>`
      ).join('');
      bodyRows += `<tr><td colspan="5" style="background:#f5f5f5;padding:4px 8px;border:1px solid #ddd;font-size:10px;">${deptRow}</td></tr>`;

      // Course rows
      for (const c of emp.courses) {
        bodyRows += `
          <tr>
            <td style="border:1px solid #ddd;padding:4px 8px;"></td>
            <td style="border:1px solid #ddd;padding:4px 8px;font-size:12px;color:#2B7CD3;">${c.courseName}</td>
            <td style="border:1px solid #ddd;padding:4px 8px;font-size:12px;color:#2B7CD3;">${c.provider}</td>
            <td style="border:1px solid #ddd;padding:4px 8px;font-size:12px;text-align:center;">${c.trainingDate}</td>
            <td style="border:1px solid #ddd;padding:4px 8px;text-align:center;font-size:14px;">${c.hasCert ? '☑' : '☐'}</td>
          </tr>
        `;
      }
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) { window.print(); return; }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${dir}">
      <head>
        <title>${fullTitle}</title>
        <style>
          @page { margin: 15mm 10mm; }
          body { font-family: 'Baloo Bhaijaan 2', 'Cairo', Arial, sans-serif; margin: 0; padding: 0; direction: ${dir}; }
          table { width: 100%; border-collapse: collapse; }
          tr { page-break-inside: avoid; }
          .report-header { text-align: center; margin-bottom: 10px; }
          .report-header img { height: 50px; }
          .report-header h1 { font-size: 18px; margin: 4px 0; color: #1e40af; }
          .report-header p { font-size: 11px; color: #666; margin: 0; }
          .footer-note { text-align: center; font-size: 10px; color: #999; margin-top: 16px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body>
        <div class="report-header">
          <img src="${logoUrl}" />
          <h1>${fullTitle}</h1>
          <p>${new Date().toLocaleDateString(ar ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <table>
          <tbody>${bodyRows}</tbody>
        </table>
        <p class="footer-note">${ar ? 'تم إنشاء التقرير بواسطة نظام إدارة الموارد البشرية' : 'Generated by HR Management System'}</p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
  }, [groupedData, ar, getFilterTitle, filterTypeLabel]);

  const handleExcelExport = useCallback(() => {
    const title = getFilterTitle();
    const logoUrl = `${window.location.origin}/images/company-logo.png`;

    const headerRow = `
      <tr>
        <th style="background:#e8e8e8;font-weight:700;font-size:12px;padding:6px 8px;border:1px solid #999;text-align:${ar ? 'right' : 'left'};">${ar ? 'الاسم' : 'Name'}</th>
        <th style="background:#e8e8e8;font-weight:700;font-size:12px;padding:6px 8px;border:1px solid #999;text-align:center;">${ar ? 'اسم الدورة التدريبية' : 'Training Course Name'}</th>
        <th style="background:#e8e8e8;font-weight:700;font-size:12px;padding:6px 8px;border:1px solid #999;text-align:center;">${ar ? 'الجهة المقدمة والموقع' : 'Provider & Location'}</th>
        <th style="background:#e8e8e8;font-weight:700;font-size:12px;padding:6px 8px;border:1px solid #999;text-align:center;">${ar ? 'تاريخ التدريب' : 'Training Date'}</th>
        <th style="background:#e8e8e8;font-weight:700;font-size:12px;padding:6px 8px;border:1px solid #999;text-align:center;">${ar ? 'شهادة' : 'Cert'}</th>
      </tr>
    `;

    let bodyRows = `
      <tr><td colspan="5" style="background:#4472C4;color:white;text-align:center;padding:6px;font-weight:700;font-size:13px;border:1px solid #3360a8;">${title}</td></tr>
    `;

    for (const emp of groupedData) {
      bodyRows += headerRow;
      bodyRows += `
        <tr>
          <td style="background:#2E3B4E;color:white;padding:6px 8px;font-weight:700;font-size:12px;border:1px solid #555;">${emp.employeeName}</td>
          <td style="background:#2E3B4E;color:white;padding:6px 8px;font-size:11px;border:1px solid #555;">
            <span style="color:#ccc;">${ar ? 'تاريخ التعيين' : 'Hire Date'}</span> <span style="color:#FF6B6B;font-weight:700;">${emp.hireDate || '-'}</span>
          </td>
          <td colspan="2" style="background:#2E3B4E;color:white;padding:6px 8px;font-size:11px;border:1px solid #555;">
            <span style="color:#ccc;">${ar ? 'الوظيفة' : 'Job Title'}</span> <span style="font-weight:600;">${emp.jobTitle || '-'}</span>
          </td>
          <td style="background:#2E3B4E;border:1px solid #555;"></td>
        </tr>
      `;
      const deptRow = DEPT_CODES.map(code =>
        `<span style="font-family:monospace;font-size:10px;margin:0 4px;">${code} ${emp.deptCode === code ? '☑' : '☐'}</span>`
      ).join('');
      bodyRows += `<tr><td colspan="5" style="background:#f5f5f5;padding:4px 8px;border:1px solid #ddd;font-size:10px;">${deptRow}</td></tr>`;

      for (const c of emp.courses) {
        bodyRows += `
          <tr>
            <td style="border:1px solid #ddd;padding:4px 8px;"></td>
            <td style="border:1px solid #ddd;padding:4px 8px;font-size:12px;color:#2B7CD3;mso-number-format:'\\@';">${c.courseName}</td>
            <td style="border:1px solid #ddd;padding:4px 8px;font-size:12px;color:#2B7CD3;mso-number-format:'\\@';">${c.provider}</td>
            <td style="border:1px solid #ddd;padding:4px 8px;font-size:12px;text-align:center;mso-number-format:'\\@';">${c.trainingDate}</td>
            <td style="border:1px solid #ddd;padding:4px 8px;text-align:center;font-size:14px;">${c.hasCert ? '☑' : '☐'}</td>
          </tr>
        `;
      }
    }

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name><x:WorksheetOptions><x:DisplayRightToLeft/><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>td, th { font-family: 'Calibri', 'Arial', sans-serif; }</style>
      </head>
      <body>
        <table style="direction:${ar ? 'rtl' : 'ltr'};">
          <tr>
            <td rowspan="2"><img src="${logoUrl}" style="height:50px;" /></td>
            <td colspan="4" style="text-align:center;font-size:18px;font-weight:700;color:#1e40af;padding:8px;direction:rtl;">سجل التدريب والتأهيل - ${title}</td>
          </tr>
          <tr><td colspan="4" style="text-align:center;font-size:14px;color:#374151;padding:4px;">Training & Qualification Record - ${title}</td></tr>
          <tr><td colspan="5" style="text-align:center;color:#6b7280;font-size:11px;padding:6px;">${new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })} — ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
          ${bodyRows}
          <tr><td colspan="5"></td></tr>
          <tr><td colspan="5" style="text-align:center;color:#9ca3af;font-size:11px;padding:12px;">تم إنشاء التقرير بواسطة نظام إدارة الموارد البشرية — Generated by HR Management System</td></tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadName = `Training_Qualification_Report_${new Date().toISOString().slice(0, 10)}.xls`;

    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 1000);

    toast({ title: ar ? 'تم التصدير بنجاح' : 'Export completed successfully' });
  }, [groupedData, ar, getFilterTitle]);


  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold">{reportTitle}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleQualificationPrint()} disabled={!isFilterActive}>
            <Printer className="h-4 w-4 mr-1" />{ar ? 'طباعة' : 'Print'}
          </Button>
          <Button variant="outline" size="sm" disabled={!isFilterActive} onClick={() => exportBilingualPDF({
            titleAr: 'سجل التدريب والتأهيل - ' + getFilterTitle(),
            titleEn: 'Training & Qualification Record - ' + getFilterTitle(),
            data: getExportData(), columns: exportColumns, fileName: 'Training_Qualification_Report',
          })}>
            <FileText className="h-4 w-4 mr-1" />PDF
          </Button>
          <Button variant="outline" size="sm" disabled={!isFilterActive} onClick={() => handleExcelExport()}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Station */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{ar ? 'المحطة' : 'Station'}</label>
              <Select value={filterStation} onValueChange={setFilterStation}>
                <SelectTrigger><SelectValue placeholder={ar ? 'الكل' : 'All'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
                  {stations.map(s => (
                    <SelectItem key={s.id} value={s.id}>{ar ? s.nameAr : s.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{ar ? 'القسم' : 'Department'}</label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger><SelectValue placeholder={ar ? 'الكل' : 'All'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'الكل' : 'All'}</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{ar ? d.nameAr : d.nameEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{ar ? 'الموظف' : 'Employee'}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between text-xs font-normal h-10">
                    {filterEmployee === 'all' ? (ar ? 'الكل' : 'All') : (() => {
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
                    <button
                      className={cn("w-full text-right px-2 py-1.5 text-sm rounded hover:bg-muted", filterEmployee === 'all' && 'bg-accent')}
                      onClick={() => { setFilterEmployee('all'); setEmployeeSearch(''); }}>
                      {ar ? 'الكل' : 'All'}
                    </button>
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

            {/* Course */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{ar ? 'الدورة' : 'Course'}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between text-xs font-normal h-10">
                    {filterCourse === 'all' ? (ar ? 'الكل' : 'All') : (() => {
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
                    <button
                      className={cn("w-full text-right px-2 py-1.5 text-sm rounded hover:bg-muted", filterCourse === 'all' && 'bg-accent')}
                      onClick={() => { setFilterCourse('all'); setCourseSearch(''); }}>
                      {ar ? 'الكل' : 'All'}
                    </button>
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
        <div ref={reportRef} className="border border-border rounded-lg overflow-hidden bg-white">
          {/* Report Title */}
          <div className="text-center py-3 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">
              {ar ? `سجل التدريب والتأهيل ${filterTypeLabel}` : `Training & Qualification Record ${filterTypeLabel}`}
            </h2>
          </div>

          {/* Location Header */}
          <div className="bg-[#4472C4] text-white text-center py-1.5 border-b border-gray-300">
            <span className="text-sm font-bold tracking-wide">{getFilterTitle()}</span>
          </div>

          {groupedData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {ar ? 'لا توجد سجلات تدريب' : 'No training records found'}
            </div>
          ) : (
            groupedData.map(emp => (
              <div key={emp.employeeId}>
                {/* Table Header Row - repeated before each employee */}
                <div className="grid grid-cols-[25%_30%_25%_12%_8%] border-b-2 border-gray-400 bg-gray-50">
                  <div className="px-3 py-2 text-sm font-bold text-foreground border-r border-gray-300">
                    {ar ? 'الاسم' : 'Name'}
                  </div>
                  <div className="px-3 py-2 text-sm font-bold text-foreground border-r border-gray-300 text-center">
                    {ar ? 'اسم الدورة التدريبية' : 'Training Course Name'}
                  </div>
                  <div className="px-3 py-2 text-sm font-bold text-foreground border-r border-gray-300 text-center">
                    {ar ? 'الجهة المقدمة والموقع' : 'Provider & Location'}
                  </div>
                  <div className="px-3 py-2 text-sm font-bold text-foreground border-r border-gray-300 text-center">
                    {ar ? 'تاريخ التدريب' : 'Training Date'}
                  </div>
                  <div className="px-3 py-2 text-sm font-bold text-foreground text-center">
                    {ar ? 'شهادة' : 'Certificate'}
                  </div>
                </div>
                {/* Employee Header - Dark row with name, hire date, job title */}
                <div className="bg-[#2E3B4E] text-white">
                  <div className="grid grid-cols-[25%_30%_25%_20%] items-center">
                    <div className="px-3 py-1.5 text-sm font-bold truncate border-r border-gray-500">
                      {emp.employeeName}
                    </div>
                    <div className="px-3 py-1.5 flex items-center gap-2 border-r border-gray-500">
                      <span className="text-xs text-gray-300">{ar ? 'تاريخ التعيين' : 'Hire Date'}</span>
                      <span className="text-sm font-bold text-[#FF6B6B]">{emp.hireDate || '-'}</span>
                    </div>
                    <div className="px-3 py-1.5 flex items-center gap-2 border-r border-gray-500">
                      <span className="text-xs text-gray-300">{ar ? 'الوظيفة' : 'Job Title'}</span>
                    </div>
                    <div className="px-3 py-1.5 text-sm font-semibold text-right">
                      {emp.jobTitle || '-'}
                    </div>
                  </div>
                </div>

                {/* Dept Codes Row */}
                <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5">
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {DEPT_CODES.map(code => (
                      <label key={code} className="flex items-center gap-0.5 text-[11px] text-gray-600">
                        <span className="font-mono font-semibold">{code}</span>
                        <input
                          type="checkbox"
                          checked={emp.deptCode === code}
                          readOnly
                          className="h-3 w-3 accent-blue-600 pointer-events-none"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Course Rows */}
                {emp.courses.map(c => (
                  <div key={c.id} className="grid grid-cols-[25%_30%_25%_12%_8%] border-b border-gray-200 hover:bg-blue-50/30">
                    <div className="px-3 py-1.5 border-r border-gray-200" />
                    <div className="px-3 py-1.5 text-sm text-[#2B7CD3] border-r border-gray-200">
                      {c.courseName}
                    </div>
                    <div className="px-3 py-1.5 text-sm text-[#2B7CD3] border-r border-gray-200">
                      {c.provider}
                    </div>
                    <div className="px-3 py-1.5 text-sm text-foreground text-center border-r border-gray-200">
                      {c.trainingDate}
                    </div>
                    <div className="px-3 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={c.hasCert}
                        readOnly
                        className="h-3.5 w-3.5 accent-blue-600 pointer-events-none"
                      />
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
