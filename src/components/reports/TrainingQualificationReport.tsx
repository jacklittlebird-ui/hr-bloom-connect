import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Printer, FileText, FileSpreadsheet, ChevronsUpDown, Check } from 'lucide-react';
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
  education: string;
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

interface FilterOption { value: string; label: string }

const MultiSelectFilter = ({ ar, label, placeholder, options, selected, onChange }: {
  ar: boolean;
  label: string;
  placeholder: string;
  options: FilterOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) => {
  const selectedLabels = options.filter(o => selected.includes(o.value)).map(o => o.label);
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn('w-full justify-between text-xs font-normal h-10', selected.length > 0 && 'border-primary bg-primary/5')}
          >
            <span className="truncate text-start">
              {selected.length === 0
                ? placeholder
                : selected.length === 1
                  ? selectedLabels[0]
                  : `${selectedLabels[0]} +${selected.length - 1}`}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] max-w-[90vw] p-0" align="start">
          <Command>
            <CommandInput placeholder={ar ? 'بحث...' : 'Search...'} />
            <CommandList>
              <CommandEmpty>{ar ? 'لا توجد نتائج' : 'No results'}</CommandEmpty>
              <CommandGroup className="max-h-72 overflow-y-auto">
                {options.map(o => {
                  const checked = selected.includes(o.value);
                  return (
                    <CommandItem
                      key={o.value}
                      value={o.label}
                      onSelect={() => onChange(checked ? selected.filter(v => v !== o.value) : [...selected, o.value])}
                      className={cn('gap-2', ar && 'flex-row-reverse')}
                    >
                      <Check className={cn('h-4 w-4 shrink-0', checked ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate whitespace-pre-wrap break-words">{o.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="p-2 border-t flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{selected.length} / {options.length}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onChange(options.map(o => o.value))}>
                {ar ? 'تحديد الكل' : 'Select all'}
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={() => onChange([])}>
                {ar ? 'مسح' : 'Clear'}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export const TrainingQualificationReport = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { employees: contextEmployees } = useEmployeeData();
  const { reportRef, handlePrint, exportBilingualPDF, exportBilingualCSV } = useReportExport();

  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [stations, setStations] = useState<{ id: string; nameAr: string; nameEn: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; nameAr: string; nameEn: string }[]>([]);
  const [courseOptions, setCourseOptions] = useState<{ id: string; nameAr: string; nameEn: string; provider: string }[]>([]);

  const [filterStations, setFilterStations] = useState<string[]>([]);
  const [filterDepartments, setFilterDepartments] = useState<string[]>([]);
  const [filterCourses, setFilterCourses] = useState<string[]>([]);
  const [filterEmployees, setFilterEmployees] = useState<string[]>([]);
  const [filterTitles, setFilterTitles] = useState<string[]>([]);

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
      setCourseOptions((courses || []).map((c: any) => ({ id: c.id, nameAr: c.name_ar, nameEn: c.name_en, provider: c.provider || '' })));
      setAllRecords(records || []);
    };
    fetchAll();
  }, []);

  const groupedData = useMemo(() => {
    const empMap = new Map<string, EmployeeTrainingGroup>();
    const hasAnyFilter = filterStations.length > 0 || filterDepartments.length > 0 || filterCourses.length > 0 || filterEmployees.length > 0 || filterTitles.length > 0;
    if (!hasAnyFilter) return [];

    allRecords.forEach(r => {
      const emp = contextEmployees.find(e => e.id === r.employee_id);
      if (!emp) return;

      if (filterStations.length > 0 && !filterStations.includes(emp.stationId)) return;
      if (filterDepartments.length > 0 && !filterDepartments.includes(emp.departmentId)) return;
      if (filterCourses.length > 0 && !filterCourses.includes(r.course_id)) return;
      if (filterEmployees.length > 0 && !filterEmployees.includes(emp.id)) return;
      if (filterTitles.length > 0 && !filterTitles.some(t => t === (emp.jobTitleAr || '').trim() || t === (emp.jobTitleEn || '').trim())) return;

      if (!empMap.has(emp.id)) {
        empMap.set(emp.id, {
          employeeId: emp.id,
          employeeName: ar ? emp.nameAr : emp.nameEn,
          employeeCode: emp.employeeId || '',
          hireDate: emp.hireDate || '',
          jobTitle: ar ? (emp.jobTitleAr || '') : (emp.jobTitleEn || ''),
          education: emp.educationAr || '',
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
  }, [allRecords, contextEmployees, filterStations, filterDepartments, filterCourses, filterEmployees, filterTitles, ar]);

  const getFilterTitle = () => {
    const joinNames = (ids: string[], list: { id: string; nameAr: string; nameEn: string }[]) =>
      ids.map(id => { const f = list.find(x => x.id === id); return f ? (ar ? f.nameAr : f.nameEn) : ''; }).filter(Boolean).join('، ');
    const parts: string[] = [];
    const stnPart = joinNames(filterStations, stations);
    if (stnPart) parts.push(stnPart);
    const deptPart = joinNames(filterDepartments, departments);
    if (deptPart) parts.push(deptPart);
    if (filterEmployees.length) {
      const empPart = filterEmployees
        .map(id => { const e = contextEmployees.find(x => x.id === id); return e ? (ar ? e.nameAr : e.nameEn) : ''; })
        .filter(Boolean).join('، ');
      if (empPart) parts.push(empPart);
    }
    if (filterCourses.length) {
      const coursePart = filterCourses
        .map(id => { const c = courseOptions.find(x => x.id === id); return c ? (ar ? c.nameAr : c.nameEn) : ''; })
        .filter(Boolean).join('، ');
      if (coursePart) parts.push(coursePart);
    }
    if (filterTitles.length) parts.push(filterTitles.join('، '));
    return parts.join(' - ') || '';
  };

  const employeeOptions = useMemo(() => contextEmployees.map(e => ({
    value: e.id,
    label: `${e.employeeId ? e.employeeId + ' - ' : ''}${ar ? e.nameAr : e.nameEn}`,
  })), [contextEmployees, ar]);

  const jobTitleOptions = useMemo(() => {
    const set = new Set<string>();
    contextEmployees.forEach(e => { const t = (e.jobTitleAr || '').trim(); if (t) set.add(t); });
    return [...set].sort((a, b) => a.localeCompare(b, 'ar')).map(t => ({ value: t, label: t }));
  }, [contextEmployees]);

  const exportColumns = [
    { headerAr: 'اسم الموظف', headerEn: 'Employee Name', key: 'employeeName' },
    { headerAr: 'تاريخ التعيين', headerEn: 'Hire Date', key: 'hireDate' },
    { headerAr: 'الوظيفة', headerEn: 'Job Title', key: 'jobTitle' },
    { headerAr: 'المؤهل الدراسي', headerEn: 'Education', key: 'education' },
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
        hireDate: '', jobTitle: '', education: '', deptCode: '', courseName: '', provider: '', trainingDate: '', certLabel: '',
      });
    }
    for (const emp of groupedData) {
      emp.courses.forEach((c, idx) => {
        rows.push({
          employeeName: idx === 0 ? emp.employeeName : '',
          hireDate: idx === 0 ? emp.hireDate : '',
          jobTitle: idx === 0 ? emp.jobTitle : '',
          education: idx === 0 ? emp.education : '',
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

  const isFilterActive = filterStations.length > 0 || filterDepartments.length > 0 || filterCourses.length > 0 || filterEmployees.length > 0 || filterTitles.length > 0;

  const handleQualificationPrint = useCallback(() => {
    const logoUrl = `${window.location.origin}/images/company-logo.png`;
    const stampUrl = `${window.location.origin}/images/stamp-hdq.png`;
    const dir = ar ? 'rtl' : 'ltr';
    const title = getFilterTitle();
    const fullTitle = ar ? `سجل التدريب والتأهيل - ${title}` : `Training & Qualification Record - ${title}`;
    const footerText = ar
      ? 'لينك إيرو تريدنج إجنسي - إدارة التدريب'
      : 'Link Aero Trading Agency - Training Department';

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
      const empCodes = (emp.deptCode || '').split(',').map(s => s.trim()).filter(Boolean);
      const deptRow = DEPT_CODES.map(code =>
        `<span style="font-family:monospace;font-size:10px;margin:0 4px;">${code} ${empCodes.includes(code) ? '☑' : '☐'}</span>`
      ).join('');
      bodyRows += `<tr><td colspan="5" style="background:#f5f5f5;padding:4px 8px;border:1px solid #ddd;font-size:10px;">${deptRow}</td></tr>`;
      // Education row
      bodyRows += `<tr><td colspan="5" style="background:#fafafa;padding:4px 8px;border:1px solid #ddd;font-size:11px;"><strong>${ar ? 'المؤهل الدراسي' : 'Education'}:</strong> ${emp.education || '-'}</td></tr>`;

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
          @page { size: auto; margin: 15mm 12mm 15mm 12mm; }
          html, body { margin: 0; padding: 0; }
          body { font-family: 'Baloo Bhaijaan 2', 'Cairo', Arial, sans-serif; direction: ${dir}; }
          table.page-table { width: 100%; border-collapse: collapse; }
          table.page-table > thead { display: table-header-group; }
          table.page-table > tfoot { display: table-footer-group; }
          tr { page-break-inside: avoid; }
          .page-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 4px 0 6px 0; border-bottom: 2px solid #1e40af; gap: 12px;
            direction: ltr;
          }
          .page-header .ph-logo img { height: 48px; object-fit: contain; }
          .page-header .ph-stamp img { height: 56px; object-fit: contain; }
          .page-header .ph-title { flex: 1; text-align: center; }
          .page-header .ph-title h1 { font-size: 16px; margin: 0; color: #1e40af; font-weight: 700; }
          .page-header .ph-title p { font-size: 10px; color: #666; margin: 2px 0 0 0; }
          .page-footer {
            text-align: center; font-size: 11px; color: #1e40af; font-weight: 600;
            padding: 6px 0 4px 0; border-top: 2px solid #1e40af;
          }
          .data-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          @media print {
            html, body { margin: 0 !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; padding: 8mm 6mm !important; }
          }
        </style>
        <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body>
        <table class="page-table">
          <thead>
            <tr><td>
              <div class="page-header">
                <div class="ph-logo"><img src="${logoUrl}" /></div>
                <div class="ph-title" style="direction:${dir};">
                  <h1>${fullTitle}</h1>
                  <p>${new Date().toLocaleDateString(ar ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div class="ph-stamp"><img src="${stampUrl}" /></div>
              </div>
            </td></tr>
          </thead>
          <tfoot>
            <tr><td>
              <div class="page-footer">${footerText}</div>
            </td></tr>
          </tfoot>
          <tbody>
            <tr><td>
              <table class="data-table"><tbody>${bodyRows}</tbody></table>
            </td></tr>
          </tbody>
        </table>
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
      const empCodesPdf = (emp.deptCode || '').split(',').map(s => s.trim()).filter(Boolean);
      const deptRow = DEPT_CODES.map(code =>
        `<span style="font-family:monospace;font-size:10px;margin:0 4px;">${code} ${empCodesPdf.includes(code) ? '☑' : '☐'}</span>`
      ).join('');
      bodyRows += `<tr><td colspan="5" style="background:#f5f5f5;padding:4px 8px;border:1px solid #ddd;font-size:10px;">${deptRow}</td></tr>`;
      bodyRows += `<tr><td colspan="5" style="background:#fafafa;padding:4px 8px;border:1px solid #ddd;font-size:11px;"><strong>${ar ? 'المؤهل الدراسي' : 'Education'}:</strong> ${emp.education || '-'}</td></tr>`;

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
          <tr><td colspan="5" style="height:16px;"></td></tr>
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
            <FileText className="h-4 w-4 mr-1" />{ar ? 'معاينة PDF' : 'Preview PDF'}
          </Button>
          <Button variant="outline" size="sm" disabled={!isFilterActive} onClick={() => handleExcelExport()}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />Excel
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Station */}
            <MultiSelectFilter ar={ar} label={ar ? 'المحطة' : 'Station'} placeholder={ar ? 'الكل' : 'All'}
              options={stations.map(s => ({ value: s.id, label: ar ? s.nameAr : s.nameEn }))}
              selected={filterStations} onChange={setFilterStations} />

            {/* Department */}
            <MultiSelectFilter ar={ar} label={ar ? 'القسم' : 'Department'} placeholder={ar ? 'الكل' : 'All'}
              options={departments.map(d => ({ value: d.id, label: ar ? d.nameAr : d.nameEn }))}
              selected={filterDepartments} onChange={setFilterDepartments} />

            {/* Employee */}
            <MultiSelectFilter ar={ar} label={ar ? 'الموظف' : 'Employee'} placeholder={ar ? 'الكل' : 'All'}
              options={employeeOptions}
              selected={filterEmployees} onChange={setFilterEmployees} />

            {/* Course */}
            <MultiSelectFilter ar={ar} label={ar ? 'الدورة' : 'Course'} placeholder={ar ? 'الكل' : 'All'}
              options={courseOptions.map(c => ({ value: c.id, label: c.provider ? `${ar ? c.nameAr : c.nameEn} (${c.provider})` : (ar ? c.nameAr : c.nameEn) }))}
              selected={filterCourses} onChange={setFilterCourses} />

            {/* Job Title */}
            <MultiSelectFilter ar={ar} label={ar ? 'المسمى الوظيفي' : 'Job Title'} placeholder={ar ? 'الكل' : 'All'}
              options={jobTitleOptions}
              selected={filterTitles} onChange={setFilterTitles} />
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
                    {(() => {
                      const empCodesUi = (emp.deptCode || '').split(',').map(s => s.trim()).filter(Boolean);
                      return DEPT_CODES.map(code => (
                        <label key={code} className="flex items-center gap-0.5 text-[11px] text-gray-600">
                          <span className="font-mono font-semibold">{code}</span>
                          <input
                            type="checkbox"
                            checked={empCodesUi.includes(code)}
                            readOnly
                            className="h-3 w-3 accent-blue-600 pointer-events-none"
                          />
                        </label>
                      ));
                    })()}
                  </div>
                </div>

                {/* Education Row */}
                <div className="bg-gray-50/60 border-b border-gray-200 px-3 py-1.5 text-xs">
                  <span className="font-semibold text-foreground">{ar ? 'المؤهل الدراسي: ' : 'Education: '}</span>
                  <span className="text-muted-foreground">{emp.education || '-'}</span>
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
