import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { usePagination } from '@/hooks/usePagination';
import { useReportExport } from '@/hooks/useReportExport';
import { Search, Download, Printer, Building2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';

interface ClosureEmployee {
  id: string;
  employee_code: string;
  name_ar: string;
  name_en: string;
  national_id: string | null;
  social_insurance_no: string | null;
  social_insurance_closed_date: string | null;
  hire_date: string | null;
  job_title_ar: string | null;
  job_title_en: string | null;
  station_id?: string | null;
  department_id?: string | null;
  station_name?: string;
  department_name?: string;
}

interface StationDept {
  id: string;
  name_ar: string;
  name_en: string;
}

export const InsuranceClosures = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [employees, setEmployees] = useState<ClosureEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [stations, setStations] = useState<StationDept[]>([]);
  const [departments, setDepartments] = useState<StationDept[]>([]);
  const { reportRef, handlePrint, exportBilingualCSV } = useReportExport();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('id, employee_code, name_ar, name_en, national_id, social_insurance_no, social_insurance_closed_date, hire_date, job_title_ar, job_title_en, station_id, department_id')
      .not('social_insurance_closed_date', 'is', null)
      .order('social_insurance_closed_date', { ascending: false });

    if (error) {
      setLoading(false);
      return;
    }

    const stationIds = [...new Set((data || []).map(e => e.station_id).filter(Boolean))];
    const deptIds = [...new Set((data || []).map(e => e.department_id).filter(Boolean))];

    const [stationsRes, deptsRes] = await Promise.all([
      stationIds.length > 0 ? supabase.from('stations').select('id, name_ar, name_en').in('id', stationIds) : { data: [] },
      deptIds.length > 0 ? supabase.from('departments').select('id, name_ar, name_en').in('id', deptIds) : { data: [] },
    ]);

    const stationList = (stationsRes.data || []) as StationDept[];
    const deptList = (deptsRes.data || []) as StationDept[];
    setStations(stationList);
    setDepartments(deptList);

    const stationMap = new Map(stationList.map(s => [s.id, ar ? s.name_ar : s.name_en]));
    const deptMap = new Map(deptList.map(d => [d.id, ar ? d.name_ar : d.name_en]));

    setEmployees((data || []).map((e: any) => ({
      id: e.id,
      employee_code: e.employee_code,
      name_ar: e.name_ar,
      name_en: e.name_en,
      national_id: e.national_id,
      social_insurance_no: e.social_insurance_no,
      social_insurance_closed_date: e.social_insurance_closed_date,
      hire_date: e.hire_date,
      job_title_ar: e.job_title_ar,
      job_title_en: e.job_title_en,
      station_id: e.station_id,
      department_id: e.department_id,
      station_name: e.station_id ? stationMap.get(e.station_id) || '' : '',
      department_name: e.department_id ? deptMap.get(e.department_id) || '' : '',
    })));
    setLoading(false);
  }, [ar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = employees.filter(e => {
    if (search) {
      const s = search.toLowerCase();
      if (!e.name_ar.includes(s) && !e.name_en.toLowerCase().includes(s) && !e.employee_code.toLowerCase().includes(s)) return false;
    }
    if (selectedStation !== 'all' && e.station_id !== selectedStation) return false;
    if (selectedDept !== 'all' && e.department_id !== selectedDept) return false;
    return true;
  });

  const { paginatedItems, currentPage, totalPages, totalItems, setCurrentPage, startIndex, endIndex } = usePagination(filtered, 30);

  const handleExportExcel = () => {
    const columns = [
      { headerAr: 'الكود', headerEn: 'Code', key: 'code' },
      { headerAr: 'اسم الموظف', headerEn: 'Employee Name', key: 'nameAr' },
      { headerAr: 'الاسم بالإنجليزية', headerEn: 'Name (EN)', key: 'nameEn' },
      { headerAr: 'الرقم القومي', headerEn: 'National ID', key: 'nationalId' },
      { headerAr: 'الرقم التأميني', headerEn: 'Insurance No.', key: 'insNo' },
      { headerAr: 'المحطة', headerEn: 'Station', key: 'station' },
      { headerAr: 'القسم', headerEn: 'Department', key: 'dept' },
      { headerAr: 'المسمى الوظيفي', headerEn: 'Job Title', key: 'jobTitle' },
      { headerAr: 'تاريخ إغلاق التأمينات', headerEn: 'Insurance Closure Date', key: 'closedDate' },
      { headerAr: 'تاريخ التعيين', headerEn: 'Hire Date', key: 'hireDate' },
    ];
    const data = filtered.map(e => ({
      code: e.employee_code,
      nameAr: e.name_ar,
      nameEn: e.name_en,
      nationalId: e.national_id || '-',
      insNo: e.social_insurance_no || '-',
      station: e.station_name || '-',
      dept: e.department_name || '-',
      jobTitle: (ar ? e.job_title_ar : e.job_title_en) || e.job_title_ar || e.job_title_en || '-',
      closedDate: formatDate(e.social_insurance_closed_date),
      hireDate: formatDate(e.hire_date),
    }));
    exportBilingualCSV({
      titleAr: 'إغلاق التأمينات',
      titleEn: 'Insurance Closures',
      data,
      columns,
      fileName: 'Insurance_Closures',
      summaryCards: [{ label: ar ? 'إجمالي' : 'Total', value: String(filtered.length) }],
    });
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className={cn("flex flex-wrap items-center justify-between gap-3", isRTL && "flex-row-reverse")}>
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">{ar ? 'إغلاق التأمينات' : 'Insurance Closures'}</h2>
            <span className="text-sm text-muted-foreground">({totalItems})</span>
          </div>
          <div className={cn("flex flex-wrap items-center gap-2", isRTL && "flex-row-reverse")}>
            <div className="relative w-56">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
              <Input
                placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={cn(isRTL ? "pr-10" : "pl-10")}
              />
            </div>
            <Select value={selectedStation} onValueChange={setSelectedStation}>
              <SelectTrigger className="w-44">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder={ar ? 'المحطة' : 'Station'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'كل المحطات' : 'All Stations'}</SelectItem>
                {stations.map(s => (
                  <SelectItem key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder={ar ? 'القسم' : 'Department'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ar ? 'كل الأقسام' : 'All Departments'}</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{ar ? d.name_ar : d.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> {ar ? 'طباعة' : 'Print'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
              <Download className="w-4 h-4" /> {ar ? 'تصدير Excel' : 'Export Excel'}
            </Button>
          </div>
        </div>

        <div ref={reportRef} className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الكود' : 'Code'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الاسم' : 'Name'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الرقم القومي' : 'National ID'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الرقم التأميني' : 'Insurance No.'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المحطة' : 'Station'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'القسم' : 'Department'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المسمى الوظيفي' : 'Job Title'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'تاريخ إغلاق التأمينات' : 'Insurance Closure Date'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'تاريخ التعيين' : 'Hire Date'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{ar ? 'لا توجد بيانات' : 'No data'}</TableCell></TableRow>
              ) : (
                paginatedItems.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium whitespace-nowrap" dir="ltr">{e.employee_code}</TableCell>
                    <TableCell className="whitespace-pre-wrap">{ar ? e.name_ar : (e.name_en || e.name_ar)}</TableCell>
                    <TableCell dir="ltr">{e.national_id || '-'}</TableCell>
                    <TableCell dir="ltr">{e.social_insurance_no || '-'}</TableCell>
                    <TableCell>{e.station_name || '-'}</TableCell>
                    <TableCell>{e.department_name || '-'}</TableCell>
                    <TableCell>{(ar ? e.job_title_ar : e.job_title_en) || e.job_title_ar || e.job_title_en || '-'}</TableCell>
                    <TableCell dir="ltr">{formatDate(e.social_insurance_closed_date)}</TableCell>
                    <TableCell dir="ltr">{formatDate(e.hire_date)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
        />
      </CardContent>
    </Card>
  );
};
