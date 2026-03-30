import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Search, AlertTriangle, Briefcase, Printer, Download, Building2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { useReportExport } from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

export const MissingJobData = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { employees } = useEmployeeData();
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const navigate = useNavigate();
  const { reportRef, handlePrint, exportBilingualCSV } = useReportExport();

  const stations = useMemo(() => {
    const map = new Map<string, string>();
    employees.filter(e => e.status === 'active' && e.stationName).forEach(e => { if (!map.has(e.stationName!)) map.set(e.stationName!, e.stationName!); });
    return Array.from(map.keys());
  }, [employees]);

  const depts = useMemo(() => {
    const map = new Map<string, string>();
    employees.filter(e => e.status === 'active' && e.department).forEach(e => { if (!map.has(e.department!)) map.set(e.department!, e.department!); });
    return Array.from(map.keys());
  }, [employees]);

  const missingEmployees = useMemo(() => {
    return employees
      .filter(e => e.status === 'active')
      .filter(e => !e.hireDate || !e.jobLevel)
      .filter(e => {
        if (search && !e.nameAr.includes(search) && !e.nameEn.toLowerCase().includes(search.toLowerCase()) && !e.employeeId.includes(search)) return false;
        if (selectedStation !== 'all' && e.stationName !== selectedStation) return false;
        if (selectedDept !== 'all' && e.department !== selectedDept) return false;
        return true;
      });
  }, [employees, search, selectedStation, selectedDept]);

  const { paginatedItems, currentPage, totalPages, totalItems, setCurrentPage, startIndex, endIndex } = usePagination(missingEmployees, 20);

  const handleExportExcel = () => {
    const columns = [
      { headerAr: 'كود الموظف', headerEn: 'Code', key: 'code' },
      { headerAr: 'الاسم', headerEn: 'Name', key: 'nameAr' },
      { headerAr: 'الاسم بالإنجليزية', headerEn: 'Name (EN)', key: 'nameEn' },
      { headerAr: 'المحطة', headerEn: 'Station', key: 'station' },
      { headerAr: 'الوظيفة', headerEn: 'Job Title', key: 'jobTitle' },
      { headerAr: 'تاريخ التعيين', headerEn: 'Hire Date', key: 'hireDate' },
      { headerAr: 'المستوى الوظيفي', headerEn: 'Job Level', key: 'jobLevel' },
    ];
    const data = missingEmployees.map(e => ({
      code: e.employeeId, nameAr: e.nameAr, nameEn: e.nameEn,
      station: e.stationName || '—', jobTitle: e.jobTitle || '—',
      hireDate: e.hireDate || (ar ? 'غير محدد' : 'Missing'),
      jobLevel: e.jobLevel || (ar ? 'غير محدد' : 'Missing'),
    }));
    exportBilingualCSV({ titleAr: 'الموظفين بدون بيانات تعيين', titleEn: 'Employees Missing Job Data', data, columns, fileName: 'Missing_Job_Data',
      summaryCards: [{ label: ar ? 'بدون بيانات تعيين' : 'Missing Job Data', value: String(missingEmployees.length) }],
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="w-5 h-5 text-destructive" /></div><div><p className="text-2xl font-bold">{missingEmployees.length}</p><p className="text-xs text-muted-foreground">{ar ? 'موظف بدون تاريخ تعيين أو مستوى وظيفي' : 'Missing hire date or job level'}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Briefcase className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{employees.filter(e => e.status === 'active' && e.hireDate && e.jobLevel).length}</p><p className="text-xs text-muted-foreground">{ar ? 'موظف مكتمل البيانات' : 'Employees with complete data'}</p></div></CardContent></Card>
      </div>

      <div className={cn("flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3", isRTL && "sm:flex-row-reverse")}>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <Input placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'} value={search} onChange={e => setSearch(e.target.value)} className={cn("h-10", isRTL ? "pr-10" : "pl-10")} />
        </div>
        <Select value={selectedStation} onValueChange={setSelectedStation}>
          <SelectTrigger className="w-full sm:w-[200px] h-10"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><SelectValue placeholder={ar ? 'كل المحطات' : 'All Stations'} /></SelectTrigger>
          <SelectContent className="w-80 max-h-[300px] overflow-y-auto">
            <SelectItem value="all">{ar ? 'كل المحطات' : 'All Stations'}</SelectItem>
            {stations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedDept} onValueChange={setSelectedDept}>
          <SelectTrigger className="w-full sm:w-[200px] h-10"><Building2 className="h-4 w-4 text-muted-foreground shrink-0" /><SelectValue placeholder={ar ? 'كل الأقسام' : 'All Departments'} /></SelectTrigger>
          <SelectContent className="w-80 max-h-[300px] overflow-y-auto">
            <SelectItem value="all">{ar ? 'كل الأقسام' : 'All Departments'}</SelectItem>
            {depts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-10" onClick={() => handlePrint(ar ? 'الموظفين بدون بيانات تعيين' : 'Missing Job Data', [{ label: ar ? 'إجمالي' : 'Total', value: String(missingEmployees.length) }])}>
            <Printer className="w-4 h-4" /> {ar ? 'طباعة' : 'Print'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-10" onClick={handleExportExcel}>
            <Download className="w-4 h-4" /> {ar ? 'تصدير Excel' : 'Export Excel'}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div ref={reportRef}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ar ? 'كود الموظف' : 'Code'}</TableHead>
                  <TableHead>{ar ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                  <TableHead>{ar ? 'الوظيفة' : 'Job Title'}</TableHead>
                  <TableHead>{ar ? 'تاريخ التعيين' : 'Hire Date'}</TableHead>
                  <TableHead>{ar ? 'المستوى الوظيفي' : 'Job Level'}</TableHead>
                  <TableHead className="print:hidden">{ar ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-sm">{emp.employeeId}</TableCell>
                    <TableCell className="font-medium">{ar ? emp.nameAr : emp.nameEn}</TableCell>
                    <TableCell>{emp.stationName || '—'}</TableCell>
                    <TableCell>{emp.jobTitle || '—'}</TableCell>
                    <TableCell>{emp.hireDate ? emp.hireDate : <Badge variant="destructive" className="text-xs">{ar ? 'غير محدد' : 'Missing'}</Badge>}</TableCell>
                    <TableCell>{emp.jobLevel ? emp.jobLevel : <Badge variant="destructive" className="text-xs">{ar ? 'غير محدد' : 'Missing'}</Badge>}</TableCell>
                    <TableCell className="print:hidden">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/employees/${emp.id}`)}>{ar ? 'تعديل' : 'Edit'}</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedItems.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{ar ? 'جميع الموظفين لديهم بيانات مكتملة' : 'All employees have complete data'}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {totalPages > 1 && <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} startIndex={startIndex} endIndex={endIndex} totalItems={totalItems} />}
    </div>
  );
};
