import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Search, Edit, Users, Printer, Download, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { useReportExport } from '@/hooks/useReportExport';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const EmployeeDirectory = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { employees, refreshEmployees } = useEmployeeData();
  const [search, setSearch] = useState('');
  const [selectedStation, setSelectedStation] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const { reportRef, handlePrint, exportBilingualCSV } = useReportExport();

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<{ id: string; nameAr: string; nameEn: string } | null>(null);
  const [editForm, setEditForm] = useState({ departmentId: '', jobTitleAr: '', jobTitleEn: '' });
  const [saving, setSaving] = useState(false);

  // Departments from DB
  const [dbDepartments, setDbDepartments] = useState<{ id: string; nameAr: string; nameEn: string }[]>([]);

  useEffect(() => {
    supabase.from('departments').select('id, name_ar, name_en').eq('is_active', true)
      .then(({ data }) => setDbDepartments((data || []).map((d: any) => ({ id: d.id, nameAr: d.name_ar, nameEn: d.name_en }))));
  }, []);

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

  const { paginatedItems, currentPage, setCurrentPage, totalPages, totalItems, startIndex, endIndex } = usePagination(filtered, 30);

  const openEditDialog = (emp: typeof employees[0]) => {
    setEditingEmp({ id: emp.id, nameAr: emp.nameAr, nameEn: emp.nameEn });
    setEditForm({
      departmentId: emp.departmentId || '',
      jobTitleAr: emp.jobTitleAr || '',
      jobTitleEn: emp.jobTitleEn || '',
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingEmp) return;
    setSaving(true);
    const { error } = await supabase.from('employees').update({
      department_id: editForm.departmentId || null,
      job_title_ar: editForm.jobTitleAr || null,
      job_title_en: editForm.jobTitleEn || null,
    }).eq('id', editingEmp.id);

    if (error) {
      toast({ title: ar ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: ar ? 'تم الحفظ بنجاح' : 'Saved successfully' });
      setEditDialogOpen(false);
      refreshEmployees?.();
    }
    setSaving(false);
  };

  const handleExport = () => {
    const rows = filtered.map((e, i) => ({
      '#': String(i + 1),
      code: e.employeeId,
      name: ar ? e.nameAr : e.nameEn,
      department: e.department || '-',
      jobTitle: ar ? (e.jobTitleAr || '-') : (e.jobTitleEn || '-'),
      hireDate: e.hireDate ? e.hireDate.split('-').reverse().join('/') : '-',
      station: e.stationName || '-',
    }));
    exportBilingualCSV({
      titleAr: 'دليل الموظفين',
      titleEn: 'Employee Directory',
      data: rows,
      columns: [
        { headerAr: '#', headerEn: '#', key: '#' },
        { headerAr: 'كود الموظف', headerEn: 'Code', key: 'code' },
        { headerAr: 'اسم الموظف', headerEn: 'Name', key: 'name' },
        { headerAr: 'القسم', headerEn: 'Department', key: 'department' },
        { headerAr: 'الوظيفة', headerEn: 'Job Title', key: 'jobTitle' },
        { headerAr: 'تاريخ التعيين', headerEn: 'Hire Date', key: 'hireDate' },
        { headerAr: 'المحطة', headerEn: 'Station', key: 'station' },
      ],
      fileName: 'employee-directory',
    });
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
          <Button variant="outline" size="sm" onClick={() => handlePrint(ar ? 'دليل الموظفين' : 'Employee Directory')}><Printer className="w-4 h-4 mr-1" />{ar ? 'طباعة' : 'Print'}</Button>
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
                  <TableHead className="text-primary-foreground">{ar ? 'تاريخ التعيين' : 'Hire Date'}</TableHead>
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
                    <TableCell>{emp.hireDate ? emp.hireDate.split('-').reverse().join('/') : <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{emp.stationName || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell className="print:hidden">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => openEditDialog(emp)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        {ar ? 'تعديل' : 'Edit'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
        <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} onPageChange={setCurrentPage} />
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{ar ? 'تعديل بيانات الموظف' : 'Edit Employee Data'}</DialogTitle>
          </DialogHeader>
          {editingEmp && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-semibold">{ar ? editingEmp.nameAr : editingEmp.nameEn}</p>
              </div>
              <div>
                <Label>{ar ? 'القسم' : 'Department'}</Label>
                <Select value={editForm.departmentId} onValueChange={v => setEditForm(f => ({ ...f, departmentId: v }))}>
                  <SelectTrigger><SelectValue placeholder={ar ? '-- اختر القسم --' : '-- Select Department --'} /></SelectTrigger>
                  <SelectContent>
                    {dbDepartments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{ar ? d.nameAr : d.nameEn}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{ar ? 'الوظيفة (عربي)' : 'Job Title (Arabic)'}</Label>
                <Input value={editForm.jobTitleAr} onChange={e => setEditForm(f => ({ ...f, jobTitleAr: e.target.value }))} />
              </div>
              <div>
                <Label>{ar ? 'الوظيفة (إنجليزي)' : 'Job Title (English)'}</Label>
                <Input value={editForm.jobTitleEn} onChange={e => setEditForm(f => ({ ...f, jobTitleEn: e.target.value }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1">
              <Save className="w-4 h-4" />
              {saving ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
