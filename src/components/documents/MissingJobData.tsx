import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Search, AlertTriangle, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { useNavigate } from 'react-router-dom';

export const MissingJobData = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { employees } = useEmployeeData();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const missingEmployees = useMemo(() => {
    return employees
      .filter(e => e.status === 'active')
      .filter(e => !e.hireDate || !e.jobLevel)
      .filter(e => {
        if (!search) return true;
        return e.nameAr.includes(search) || e.nameEn.toLowerCase().includes(search.toLowerCase()) || e.employeeId.includes(search);
      });
  }, [employees, search]);

  const { paginatedItems, currentPage, totalPages, totalItems, setCurrentPage, startIndex, endIndex } = usePagination(missingEmployees, 20);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{missingEmployees.length}</p>
              <p className="text-xs text-muted-foreground">{ar ? 'موظف بدون تاريخ تعيين أو مستوى وظيفي' : 'Missing hire date or job level'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Briefcase className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{employees.filter(e => e.status === 'active' && e.hireDate && e.jobLevel).length}</p>
              <p className="text-xs text-muted-foreground">{ar ? 'موظف مكتمل البيانات' : 'Employees with complete data'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
        <Input
          placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={cn(isRTL ? "pr-10" : "pl-10")}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ar ? 'كود الموظف' : 'Code'}</TableHead>
                <TableHead>{ar ? 'الاسم' : 'Name'}</TableHead>
                <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                <TableHead>{ar ? 'الوظيفة' : 'Job Title'}</TableHead>
                <TableHead>{ar ? 'تاريخ التعيين' : 'Hire Date'}</TableHead>
                <TableHead>{ar ? 'المستوى الوظيفي' : 'Job Level'}</TableHead>
                <TableHead>{ar ? 'الإجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map(emp => (
                <TableRow key={emp.id}>
                  <TableCell className="font-mono text-sm">{emp.employeeId}</TableCell>
                  <TableCell className="font-medium">{ar ? emp.nameAr : emp.nameEn}</TableCell>
                  <TableCell>{emp.stationName || '—'}</TableCell>
                  <TableCell>{emp.jobTitle || '—'}</TableCell>
                  <TableCell>
                    {emp.hireDate ? emp.hireDate : <Badge variant="destructive" className="text-xs">{ar ? 'غير محدد' : 'Missing'}</Badge>}
                  </TableCell>
                  <TableCell>
                    {emp.jobLevel ? emp.jobLevel : <Badge variant="destructive" className="text-xs">{ar ? 'غير محدد' : 'Missing'}</Badge>}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/employees/${emp.id}`)}>
                      {ar ? 'تعديل' : 'Edit'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {ar ? 'جميع الموظفين لديهم بيانات مكتملة' : 'All employees have complete data'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          startIndex={startIndex}
          endIndex={endIndex}
          totalItems={totalItems}
        />
      )}
    </div>
  );
};
