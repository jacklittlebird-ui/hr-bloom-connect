import { Suspense, lazy, useMemo, useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Employee } from '@/types/employee';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const Form01 = lazy(() => import('@/components/documents/Form01').then(m => ({ default: m.Form01 })));
const Form06 = lazy(() => import('@/components/documents/Form06').then(m => ({ default: m.Form06 })));
const EmploymentContract = lazy(() => import('@/components/documents/EmploymentContract').then(m => ({ default: m.EmploymentContract })));
const ClearanceCertificate = lazy(() => import('@/components/documents/ClearanceCertificate').then(m => ({ default: m.ClearanceCertificate })));
const ExperienceCertificate = lazy(() => import('@/components/documents/ExperienceCertificate').then(m => ({ default: m.ExperienceCertificate })));
const MutualTermination = lazy(() => import('@/components/documents/MutualTermination').then(m => ({ default: m.MutualTermination })));
const FinalSettlement = lazy(() => import('@/components/documents/FinalSettlement').then(m => ({ default: m.FinalSettlement })));
const EmployeeDataForm = lazy(() => import('@/components/documents/EmployeeDataForm').then(m => ({ default: m.EmployeeDataForm })));

const DOC_TABS = [
  { key: 'form01', ar: 'استمارة 1', en: 'Form 1', Comp: Form01 },
  { key: 'form06', ar: 'استمارة 6', en: 'Form 6', Comp: Form06 },
  { key: 'contract', ar: 'عقد عمل', en: 'Employment Contract', Comp: EmploymentContract },
  { key: 'clearance', ar: 'إخلاء طرف', en: 'Clearance', Comp: ClearanceCertificate },
  { key: 'experience', ar: 'شهادة خبرة', en: 'Experience Certificate', Comp: ExperienceCertificate },
  { key: 'mutual', ar: 'إنهاء علاقة عمل بالتراضي', en: 'Mutual Termination', Comp: MutualTermination },
  { key: 'settlement', ar: 'مخالصة نهائية', en: 'Final Settlement', Comp: FinalSettlement },
  { key: 'dataForm', ar: 'نموذج بيانات موظف', en: 'Employee Data Form', Comp: EmployeeDataForm },
] as const;

export const EmployeeForms = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { employees, ensureFullEmployee } = useEmployeeData();

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>('');
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);

  const sorted = useMemo(
    () => [...employees].sort((a, b) => (a.employeeId || '').localeCompare(b.employeeId || '')),
    [employees]
  );
  const selected = sorted.find(e => e.id === selectedId);

  useEffect(() => {
    let cancelled = false;
    if (!selectedId) { setEmployee(null); return; }
    setLoading(true);
    ensureFullEmployee(selectedId)
      .then(full => { if (!cancelled) setEmployee(full ?? sorted.find(e => e.id === selectedId) ?? null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardContent className="p-4 space-y-2">
          <Label className="text-xs font-bold">{ar ? 'اختر الموظف' : 'Select employee'}</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={open} className="w-full md:w-[420px] justify-between">
                {selected
                  ? `${selected.employeeId} — ${ar ? selected.nameAr : (selected.nameEn || selected.nameAr)}`
                  : (ar ? 'ابحث بالاسم أو الرقم الوظيفي...' : 'Search by name or code...')}
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 bg-popover z-50" align="start">
              <Command shouldFilter={true}>
                <CommandInput placeholder={ar ? 'ابحث بالاسم أو الرقم الوظيفي...' : 'Search by name or code...'} />
                <CommandList className="max-h-[300px] overflow-y-auto">
                  <CommandEmpty>{ar ? 'لا توجد نتائج' : 'No results'}</CommandEmpty>
                  <CommandGroup>
                    {sorted.map(emp => (
                      <CommandItem
                        key={emp.id}
                        value={`${emp.nameAr} ${emp.nameEn} ${emp.employeeId}`}
                        onSelect={() => { setSelectedId(emp.id); setOpen(false); }}
                      >
                        <Check className={cn('mx-2 h-4 w-4 shrink-0', selectedId === emp.id ? 'opacity-100' : 'opacity-0')} />
                        <div className={cn('flex flex-col min-w-0', isRTL && 'items-end')}>
                          <span className="font-medium truncate">{ar ? emp.nameAr : (emp.nameEn || emp.nameAr)}</span>
                          <span className="text-xs text-muted-foreground truncate">{emp.employeeId}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {!employee ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              {loading ? (ar ? 'جاري التحميل...' : 'Loading...') : (ar ? 'اختر موظفاً لعرض النماذج' : 'Select an employee to view the forms')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={DOC_TABS[0].key} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {DOC_TABS.map(t => (
              <TabsTrigger key={t.key} value={t.key}>{ar ? t.ar : t.en}</TabsTrigger>
            ))}
          </TabsList>
          {DOC_TABS.map(({ key, Comp }) => (
            <TabsContent key={key} value={key}>
              <Suspense fallback={<div className="p-8 text-center text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</div>}>
                <Comp key={employee.id} employee={employee} />
              </Suspense>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};
