import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Search, Edit, Users, Printer, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { useReportExport } from '@/hooks/useReportExport';
import { useNavigate } from 'react-router-dom';

export const EmployeeDirectory = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { employees } = useEmployeeData();
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const navigate = useNavigate();
  const { reportRef, handlePrint, exportBilingualCSV } = useReportExport();

  const stations = useMemo(() => {
    const set = new Set<string>();
    employees.filter(e => e.status === 'active' && e.stationName).forEach(e => set.add(e.stationName!));
    return Array.from(set).sort();
  }, [employees]);

  const depts = useMemo(() => {
    const set = new Set<string>();
    employees.filter(e => e.status === 'active' && e.department).forEach(e => set.add(e.department!));
    return Array.from(set).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    return employees
      .filter(e => e.status === 'active')
      .filter(e => {
        if (search && !e.nameAr.includes(search) && !e.nameEn.toLowerCase().includes(search.toLowerCase()) && !e.employeeId.includes(search)) return false;
        if (selectedStation !== 'all' && e.stationName !== selectedStation) return false;
        if (selectedDept !== 'all' && e.department !== selectedDept) return false;
        return true;
      })
      .sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'));
  }, [employees, search, selectedStation, selectedDept]);

  const { paginatedItems, currentPage, setCurrentPage, totalPages } = usePagination(filtered, 30);

  const handleExport = () => {
    const rows = filtered.map((e, i) => ({
      '#': i + 1,
      [ar ? 'كود الموظف' : 'Employee Code']: e.employeeId,
      [ar ? 'اسم الموظف' : 'Employee Name']: ar ? e.nameAr : e.nameEn,
      [ar ? 'القسم' : 'Department']: e.department || '-',
      [ar ? 'الوظيفة' : 'Job Title']: ar ? (e.jobTitleAr || '-') : (e.jobTitleEn || '-'),
      [ar ? 'المحطة' : 'Station']: e.stationName || '-',
    }));
    exportBilingualCSV(rows, ar ? 'دليل الموظفين' : 'Employee Directory');
  };

  return (
    <div className="space-y-4">
      <div className={cn("flex flex-wrap items-center gap-3 justify-between", isRTL && "flex-row-reverse")}>
        <div className={cn("flex flex-wrap items-center gap-3", isRTL && "flex-row-reverse")}>
          <div className="relative">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
            <Input
              placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn("w-64", isRTL ? "pr-10" : "pl-10")}
            />
          </div>
          <Select value={selectedStation} onValueChange={v => { setSelectedStation(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder={ar ? 'المحطة' : 'Station'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
              {stations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedDept} onValueChange={v => { setSelectedDept(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder={ar ? 'القسم' : 'Department'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? 'جميع الأقسام' : 'All Departments'}</SelectItem>
              {depts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />{ar ? 'طباعة' : 'Print'}</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" />{ar ? 'تصدير' : 'Export'}</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className={cn("flex items-center gap-2 text-sm text-muted-foreground mb-2", isRTL && "flex-row-reverse")}>
            <Users className="w-4 h-4" />
            <span>{ar ? `إجمالي: ${filtered.length} موظف` : `Total: ${filtered.length} employees`}</span>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef}>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary text-primary-foreground">
                  <TableHead className="text-primary-foreground w-12">#</TableHead>
                  <TableHead className="text-primary-foreground">{ar ? 'كود الموظف' : 'Code'}</TableHead>
                  <TableHead className="text-primary-foreground">{ar ? 'اسم الموظف' : 'Employee Name'}</TableHead>
                  <TableHead className="text-primary-foreground">{ar ? 'القسم' : 'Department'}</TableHead>
                  <TableHead className="text-primary-foreground">{ar ? 'الوظيفة' : 'Job Title'}</TableHead>
                  <TableHead className="text-primary-foreground">{ar ? 'المحطة' : 'Station'}</TableHead>
                  <TableHead className="text-primary-foreground print:hidden">{ar ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((emp, idx) => (
                  <TableRow key={emp.id} className="hover:bg-muted/50">
                    <TableCell className="text-muted-foreground">{(currentPage - 1) * 30 + idx + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{emp.employeeId}</TableCell>
                    <TableCell className="font-medium">{ar ? emp.nameAr : emp.nameEn}</TableCell>
                    <TableCell>{emp.department || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{ar ? (emp.jobTitleAr || '-') : (emp.jobTitleEn || '-')}</TableCell>
                    <TableCell>{emp.stationName || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="print:hidden">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => navigate(`/employees/${emp.id}?mode=edit`)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        {ar ? 'تعديل' : 'Edit'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {ar ? 'لا توجد نتائج' : 'No results'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {totalPages > 1 && (
        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      )}
    </div>
  );
};
