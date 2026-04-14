import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Search, Edit, AlertTriangle, Check, ChevronsUpDown } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface MissingRecord {
  id: string;
  employeeName: string;
  employeeCode: string;
  provider: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

interface Course {
  id: string;
  name_en: string;
  name_ar: string;
  provider: string | null;
}

export const MissingCourseRecords = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [records, setRecords] = useState<MissingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [editRecord, setEditRecord] = useState<MissingRecord | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [courseSearchOpen, setCourseSearchOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const PAGE_SIZE = 1000;
    let all: any[] = [];
    let from = 0;
    let hasMore = true;
    while (hasMore) {
      const { data } = await supabase
        .from('training_records')
        .select('id, provider, start_date, end_date, status, employees(name_ar, name_en, employee_code)')
        .is('course_id', null)
        .order('start_date', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (!data || data.length === 0) break;
      all = all.concat(data);
      hasMore = data.length === PAGE_SIZE;
      from += PAGE_SIZE;
    }
    setRecords(all.map((r: any) => ({
      id: r.id,
      employeeName: ar ? r.employees?.name_ar : r.employees?.name_en,
      employeeCode: r.employees?.employee_code || '',
      provider: r.provider,
      startDate: r.start_date,
      endDate: r.end_date,
      status: r.status,
    })));
    setLoading(false);
  }, [ar]);

  const fetchCourses = useCallback(async () => {
    const { data } = await supabase
      .from('training_courses')
      .select('id, name_en, name_ar, provider')
      .order('name_en');
    if (data) setCourses(data);
  }, []);

  useEffect(() => { fetchRecords(); fetchCourses(); }, [fetchRecords, fetchCourses]);

  const filtered = useMemo(() => {
    if (!search.trim()) return records;
    const s = search.toLowerCase();
    return records.filter(r =>
      r.employeeName?.toLowerCase().includes(s) ||
      r.employeeCode?.toLowerCase().includes(s) ||
      r.provider?.toLowerCase().includes(s)
    );
  }, [records, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openEdit = (r: MissingRecord) => {
    setEditRecord(r);
    setSelectedCourseId('');
    setEditProvider(r.provider || '');
    setEditStartDate(r.startDate || '');
  };

  const handleSave = async () => {
    if (!editRecord || !selectedCourseId) {
      toast({ title: ar ? 'اختر دورة' : 'Select a course', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const updateData: any = { course_id: selectedCourseId };
    if (editProvider) updateData.provider = editProvider;
    if (editStartDate) updateData.start_date = editStartDate;

    const { error } = await supabase
      .from('training_records')
      .update(updateData)
      .eq('id', editRecord.id);

    if (error) {
      toast({ title: ar ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: ar ? 'تم التحديث' : 'Updated' });
      setEditRecord(null);
      fetchRecords();
    }
    setSaving(false);
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  const statusLabels: Record<string, { ar: string; en: string; color: string }> = {
    completed: { ar: 'مكتمل', en: 'Completed', color: 'bg-green-100 text-green-700' },
    enrolled: { ar: 'مسجل', en: 'Enrolled', color: 'bg-blue-100 text-blue-700' },
    failed: { ar: 'راسب', en: 'Failed', color: 'bg-red-100 text-red-700' },
  };

  return (
    <div className="space-y-4">
      <div className={cn("flex items-center gap-3 flex-wrap", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700", isRTL && "flex-row-reverse")}>
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">
            {ar ? `${filtered.length} سجل بدون دورة محددة` : `${filtered.length} records without course`}
          </span>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <Input
            placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className={cn("h-9", isRTL ? "pr-9" : "pl-9")}
          />
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-border/30">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary text-primary-foreground">
              <TableHead className="text-primary-foreground">#</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'كود الموظف' : 'Code'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'اسم الموظف' : 'Employee'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'الجهة' : 'Provider'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'من' : 'From'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'إلى' : 'To'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'إجراء' : 'Action'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {ar ? 'جاري التحميل...' : 'Loading...'}
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {ar ? 'لا توجد سجلات' : 'No records'}
                </TableCell>
              </TableRow>
            ) : paginated.map((r, idx) => {
              const sl = statusLabels[r.status] || statusLabels['enrolled'];
              return (
                <TableRow key={r.id}>
                  <TableCell>{(page - 1) * pageSize + idx + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{r.employeeCode}</TableCell>
                  <TableCell className="font-medium">{r.employeeName}</TableCell>
                  <TableCell>{r.provider || '-'}</TableCell>
                  <TableCell>{formatDate(r.startDate)}</TableCell>
                  <TableCell>{formatDate(r.endDate)}</TableCell>
                  <TableCell>
                    <span className={cn("px-2 py-0.5 rounded text-xs font-semibold", sl.color)}>
                      {ar ? sl.ar : sl.en}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          startIndex={(page - 1) * pageSize}
          endIndex={Math.min(page * pageSize, filtered.length)}
          onPageChange={setPage}
        />
      )}

      <Dialog open={!!editRecord} onOpenChange={open => !open && setEditRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{ar ? 'تعديل سجل التدريب' : 'Edit Training Record'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{ar ? 'الموظف' : 'Employee'}</Label>
              <p className="text-sm text-muted-foreground mt-1">{editRecord?.employeeName} ({editRecord?.employeeCode})</p>
            </div>
            <div>
              <Label>{ar ? 'الدورة التدريبية' : 'Course'}</Label>
              <Popover open={courseSearchOpen} onOpenChange={setCourseSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between mt-1 h-auto min-h-[36px] text-wrap text-left">
                    {selectedCourse
                      ? `${ar ? selectedCourse.name_ar : selectedCourse.name_en}${selectedCourse.provider ? ` — ${selectedCourse.provider}` : ''}`
                      : (ar ? 'اختر الدورة...' : 'Select course...')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={ar ? 'ابحث عن الدورة...' : 'Search course...'} />
                    <CommandList>
                      <CommandEmpty>{ar ? 'لا توجد نتائج' : 'No results'}</CommandEmpty>
                      <CommandGroup>
                        {courses.map(c => (
                          <CommandItem
                            key={c.id}
                            value={`${c.name_en} ${c.name_ar} ${c.provider || ''}`}
                            onSelect={() => {
                              setSelectedCourseId(c.id);
                              if (c.provider && !editProvider) setEditProvider(c.provider);
                              setCourseSearchOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", selectedCourseId === c.id ? "opacity-100" : "opacity-0")} />
                            <span className="flex-1">
                              {ar ? c.name_ar : c.name_en}
                              {c.provider && <span className="text-muted-foreground text-xs ml-2">— {c.provider}</span>}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>{ar ? 'الجهة المقدمة' : 'Provider'}</Label>
              <Input value={editProvider} onChange={e => setEditProvider(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>{ar ? 'تاريخ البداية' : 'Start Date'}</Label>
              <Input type="date" value={editStartDate} onChange={e => setEditStartDate(e.target.value)} className="mt-1" />
            </div>
            <Button onClick={handleSave} disabled={saving || !selectedCourseId} className="w-full">
              {saving ? (ar ? 'جاري الحفظ...' : 'Saving...') : (ar ? 'حفظ' : 'Save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
