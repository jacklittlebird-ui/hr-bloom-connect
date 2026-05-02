import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2, Users, Plus, Save, Edit2, Trash2, BarChart3, RefreshCw,
  Search, Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

const CHART_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

interface DeptRow {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  created_at: string;
}

const Departments = () => {
  const { t, isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { employees: allEmployees } = useEmployeeData();
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deletingDept, setDeletingDept] = useState<DeptRow | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const fetchDepartments = useCallback(async (showToast = false) => {
    if (showToast) setRefreshing(true);
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      toast.error(ar ? 'تعذر تحميل الأقسام' : 'Failed to load departments');
    } else if (data) {
      setDepartments(data);
      if (showToast) toast.success(ar ? 'تم التحديث' : 'Refreshed');
    }
    setLoading(false);
    setRefreshing(false);
  }, [ar]);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  // Count employees per department
  const deptEmployeeCount = useMemo(() => {
    const counts: Record<string, number> = {};
    allEmployees.forEach(e => {
      if (e.departmentId) {
        counts[e.departmentId] = (counts[e.departmentId] || 0) + 1;
      }
    });
    return counts;
  }, [allEmployees]);

  const totalEmployees = Object.values(deptEmployeeCount).reduce((s, c) => s + c, 0);
  const avgSize = departments.length ? Math.round(totalEmployees / departments.length) : 0;
  const populatedDepts = useMemo(
    () => departments.filter(d => (deptEmployeeCount[d.id] || 0) > 0).length,
    [departments, deptEmployeeCount]
  );

  const filteredDepartments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter(d =>
      d.name_ar.toLowerCase().includes(q) || d.name_en.toLowerCase().includes(q)
    );
  }, [departments, search]);

  const chartData = useMemo(
    () => departments
      .map((d, i) => ({
        name: ar ? d.name_ar : d.name_en,
        value: deptEmployeeCount[d.id] || 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .filter(d => d.value > 0),
    [departments, deptEmployeeCount, ar]
  );

  const resetForm = () => {
    setEditingId(null);
    setNameAr('');
    setNameEn('');
  };

  const handleSave = async () => {
    if (saving) return;
    const aN = nameAr.trim();
    const eN = nameEn.trim();
    if (!aN || !eN) {
      toast.error(ar ? 'يرجى إدخال اسم القسم بالعربي والإنجليزي' : 'Please enter department name in both languages');
      return;
    }
    // Duplicate check (case-insensitive, excluding current edit)
    const dup = departments.find(d =>
      d.id !== editingId &&
      (d.name_ar.trim().toLowerCase() === aN.toLowerCase() ||
       d.name_en.trim().toLowerCase() === eN.toLowerCase())
    );
    if (dup) {
      toast.error(ar ? 'يوجد قسم بنفس الاسم بالفعل' : 'A department with this name already exists');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('departments').update({ name_ar: aN, name_en: eN }).eq('id', editingId);
        if (error) throw error;
        toast.success(ar ? 'تم تحديث القسم بنجاح' : 'Department updated successfully');
      } else {
        const { error } = await supabase.from('departments').insert({ name_ar: aN, name_en: eN });
        if (error) throw error;
        toast.success(ar ? 'تم إضافة القسم بنجاح' : 'Department added successfully');
      }
      resetForm();
      await fetchDepartments();
    } catch (e: any) {
      toast.error((ar ? 'خطأ: ' : 'Error: ') + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (dept: DeptRow) => {
    setEditingId(dept.id);
    setNameAr(dept.name_ar);
    setNameEn(dept.name_en);
    setTimeout(() => { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
  };

  const confirmDelete = async () => {
    if (!deletingDept) return;
    const linked = deptEmployeeCount[deletingDept.id] || 0;
    if (linked > 0) {
      toast.error(
        ar
          ? `لا يمكن الحذف: ${linked} موظف مرتبط بهذا القسم`
          : `Cannot delete: ${linked} employee(s) linked to this department`
      );
      setDeletingDept(null);
      return;
    }
    const { error } = await supabase.from('departments').delete().eq('id', deletingDept.id);
    if (error) {
      toast.error(ar ? 'خطأ في الحذف' : 'Delete error');
    } else {
      toast.success(ar ? 'تم حذف القسم بنجاح' : 'Department deleted successfully');
      if (editingId === deletingDept.id) resetForm();
      fetchDepartments();
    }
    setDeletingDept(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="bg-primary rounded-xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-primary-foreground truncate">{t('departmentsPage.title')}</h1>
              <p className="text-primary-foreground/70 mt-1 text-sm truncate">{t('departmentsPage.subtitle')}</p>
            </div>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => fetchDepartments(true)}
              disabled={refreshing}
              aria-label={ar ? 'تحديث' : 'Refresh'}
              title={ar ? 'تحديث' : 'Refresh'}
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-600">
                <Building2 className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{t('departmentsPage.totalDepts')}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{departments.length}</p>
              <p className="text-xs text-muted-foreground">{t('departmentsPage.registeredDepts')}</p>
            </CardContent>
          </Card>

          <Card className="border bg-gradient-to-br from-emerald-500/10 to-emerald-600/5">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600">
                <Users className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{t('departmentsPage.totalEmps')}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalEmployees}</p>
              <p className="text-xs text-muted-foreground">{t('departmentsPage.acrossAllDepts')}</p>
            </CardContent>
          </Card>

          <Card className="border bg-gradient-to-br from-violet-500/10 to-violet-600/5">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-violet-600">
                <BarChart3 className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{t('departmentsPage.avgSize')}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{avgSize}</p>
              <p className="text-xs text-muted-foreground">{t('departmentsPage.empsPerDept')}</p>
            </CardContent>
          </Card>

          <Card className="border bg-gradient-to-br from-amber-500/10 to-amber-600/5">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-600">
                <Building2 className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">
                  {ar ? 'أقسام نشطة' : 'Populated Depts'}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{populatedDepts}</p>
              <p className="text-xs text-muted-foreground">
                {ar ? 'تحتوي على موظفين' : 'with employees'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add/Edit Form */}
          <Card className="lg:col-span-2" ref={formRef}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary shrink-0" />
                {editingId ? t('departmentsPage.editDept') : t('departmentsPage.addDept')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('departments.nameAr')}</Label>
                  <Input
                    value={nameAr}
                    onChange={e => setNameAr(e.target.value)}
                    placeholder={ar ? 'أدخل اسم القسم بالعربي' : 'Department name in Arabic'}
                    dir="rtl"
                    className="text-right"
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('departments.nameEn')}</Label>
                  <Input
                    value={nameEn}
                    onChange={e => setNameEn(e.target.value)}
                    placeholder={ar ? 'أدخل اسم القسم بالإنجليزي' : 'Department name in English'}
                    dir="ltr"
                    className="text-left"
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 justify-end">
                {editingId && (
                  <Button variant="outline" onClick={resetForm} disabled={saving}>
                    {ar ? 'إلغاء' : 'Cancel'}
                  </Button>
                )}
                <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
                  <Save className={cn('w-4 h-4', saving && 'animate-pulse')} />
                  {saving
                    ? (ar ? 'جاري الحفظ...' : 'Saving...')
                    : editingId
                      ? (ar ? 'تحديث القسم' : 'Update Department')
                      : t('departments.save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-primary shrink-0" />
                {t('departmentsPage.distribution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]" dir="ltr">
                {chartData.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Inbox className="w-8 h-8 opacity-50" />
                    <p className="text-sm">{ar ? 'لا توجد بيانات للعرض' : 'No data to display'}</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        fontSize={11}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, _n, p: any) => [
                          `${value} ${ar ? 'موظف' : 'emp'}`,
                          p?.payload?.name,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Departments Table */}
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                {t('departmentsPage.deptList')}
                <Badge variant="secondary">{filteredDepartments.length}</Badge>
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className={cn(
                  'absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none',
                  isRTL ? 'right-3' : 'left-3'
                )} />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={ar ? 'بحث عن قسم...' : 'Search department...'}
                  className={cn(isRTL ? 'pr-9' : 'pl-9')}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold w-12">#</TableHead>
                      <TableHead className="font-semibold">{t('departmentsPage.deptNameAr')}</TableHead>
                      <TableHead className="font-semibold">{t('departmentsPage.deptNameEn')}</TableHead>
                      <TableHead className="font-semibold">{t('departmentsPage.empCount')}</TableHead>
                      <TableHead className="font-semibold w-32">{t('departmentsPage.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          {ar ? 'جاري التحميل...' : 'Loading...'}
                        </TableCell>
                      </TableRow>
                    ) : filteredDepartments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Inbox className="w-8 h-8 opacity-50" />
                            <p>{search ? (ar ? 'لا توجد نتائج' : 'No results') : (ar ? 'لا توجد أقسام' : 'No departments')}</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDepartments.map((dept, index) => (
                        <TableRow key={dept.id} className={cn('hover:bg-muted/30', editingId === dept.id && 'bg-primary/5')}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="whitespace-pre-wrap break-words">{dept.name_ar}</TableCell>
                          <TableCell className="whitespace-pre-wrap break-words" dir="ltr">{dept.name_en}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-primary/30 text-primary">
                              {deptEmployeeCount[dept.id] || 0} {ar ? 'موظف' : 'emp'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={() => handleEdit(dept)}
                                aria-label={ar ? 'تعديل' : 'Edit'}
                                title={ar ? 'تعديل' : 'Edit'}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeletingDept(dept)}
                                aria-label={ar ? 'حذف' : 'Delete'}
                                title={ar ? 'حذف' : 'Delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {loading ? (
                  <p className="text-center text-muted-foreground py-8">{ar ? 'جاري التحميل...' : 'Loading...'}</p>
                ) : filteredDepartments.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground py-12">
                    <Inbox className="w-8 h-8 opacity-50" />
                    <p>{search ? (ar ? 'لا توجد نتائج' : 'No results') : (ar ? 'لا توجد أقسام' : 'No departments')}</p>
                  </div>
                ) : (
                  filteredDepartments.map((dept, index) => (
                    <div
                      key={dept.id}
                      className={cn('p-4 space-y-2', editingId === dept.id && 'bg-primary/5')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">#{index + 1}</span>
                            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                              {deptEmployeeCount[dept.id] || 0} {ar ? 'موظف' : 'emp'}
                            </Badge>
                          </div>
                          <p className="font-semibold whitespace-pre-wrap break-words">{dept.name_ar}</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words" dir="ltr">{dept.name_en}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            onClick={() => handleEdit(dept)}
                            aria-label={ar ? 'تعديل' : 'Edit'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeletingDept(dept)}
                            aria-label={ar ? 'حذف' : 'Delete'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete confirmation */}
        <AlertDialog open={!!deletingDept} onOpenChange={(open) => !open && setDeletingDept(null)}>
          <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
            <AlertDialogHeader>
              <AlertDialogTitle>{ar ? 'تأكيد حذف القسم' : 'Confirm Department Deletion'}</AlertDialogTitle>
              <AlertDialogDescription>
                {ar
                  ? `هل أنت متأكد من حذف قسم "${deletingDept?.name_ar}"؟ لا يمكن التراجع عن هذا الإجراء.`
                  : `Are you sure you want to delete "${deletingDept?.name_en}"? This action cannot be undone.`}
                {deletingDept && (deptEmployeeCount[deletingDept.id] || 0) > 0 && (
                  <span className="block mt-2 text-destructive font-semibold">
                    {ar
                      ? `⚠️ يوجد ${deptEmployeeCount[deletingDept.id]} موظف مرتبط بهذا القسم. لن يتم الحذف.`
                      : `⚠️ ${deptEmployeeCount[deletingDept.id]} employee(s) linked. Deletion will be blocked.`}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{ar ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {ar ? 'حذف' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Departments;
