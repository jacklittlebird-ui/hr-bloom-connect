import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, ChevronsUpDown, UserX, Loader2 } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export const ABSENCE_REASON_AR = 'غياب بدون إذن';

interface AbsenceEmployee {
  id: string;
  employeeId?: string;
  nameAr?: string;
  nameEn?: string;
  department?: string;
}

interface UnauthorizedAbsenceProps {
  employees: AbsenceEmployee[];
}

interface AbsenceRow {
  id: string;
  employee_id: string;
  start_date: string;
  created_at: string;
}

export const UnauthorizedAbsence = ({ employees }: UnauthorizedAbsenceProps) => {
  const { language } = useLanguage();
  const t = (ar: string, en: string) => (language === 'ar' ? ar : en);

  const [open, setOpen] = useState(false);
  const [employeeUuid, setEmployeeUuid] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<AbsenceRow[]>([]);

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const selected = employeeUuid ? empMap.get(employeeUuid) : undefined;

  const empLabel = useCallback(
    (e?: AbsenceEmployee) => (!e ? '' : (language === 'ar' ? e.nameAr || e.nameEn : e.nameEn || e.nameAr) || ''),
    [language],
  );

  const fetchRows = useCallback(async () => {
    const ids = employees.map(e => e.id);
    if (ids.length === 0) { setRows([]); return; }
    const { data } = await supabase
      .from('leave_requests')
      .select('id, employee_id, start_date, created_at')
      .eq('leave_type', 'unpaid')
      .eq('reason', ABSENCE_REASON_AR)
      .in('employee_id', ids)
      .order('start_date', { ascending: false })
      .limit(100);
    setRows((data as AbsenceRow[]) || []);
  }, [employees]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleSave = async () => {
    if (!employeeUuid || !date) {
      toast.error(t('اختر الموظف واليوم', 'Select employee and date'));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('leave_requests').insert({
      employee_id: employeeUuid,
      leave_type: 'unpaid',
      start_date: date,
      end_date: date,
      days: 1,
      reason: ABSENCE_REASON_AR,
      status: 'approved',
    });
    setSaving(false);
    if (error) {
      toast.error(t('تعذر التسجيل: ', 'Failed to save: ') + error.message);
      return;
    }
    toast.success(t('تم تسجيل غياب بدون إذن كإجازة بدون راتب', 'Unauthorized absence recorded as unpaid leave'));
    setEmployeeUuid('');
    setDate('');
    fetchRows();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserX className="h-4 w-4 text-destructive" />
            {t('تسجيل غياب بدون إذن', 'Record Unauthorized Absence')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 md:items-end">
          <div className="space-y-2">
            <Label>{t('الموظف', 'Employee')}</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10">
                  <span className="truncate">
                    {selected ? empLabel(selected) : t('اختر الموظف', 'Select employee')}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 bg-popover z-50" align="start">
                <Command shouldFilter={true}>
                  <CommandInput placeholder={t('ابحث بالاسم أو الرقم الوظيفي...', 'Search by name or code...')} />
                  <CommandList className="max-h-[300px] overflow-y-auto">
                    <CommandEmpty>{t('لا يوجد موظف', 'No employee found')}</CommandEmpty>
                    <CommandGroup>
                      {employees.map(e => (
                        <CommandItem
                          key={e.id}
                          value={`${e.nameAr || ''} ${e.nameEn || ''} ${e.employeeId || ''}`}
                          onSelect={() => { setEmployeeUuid(e.id); setOpen(false); }}
                        >
                          <Check className={cn('mr-2 h-4 w-4 shrink-0', employeeUuid === e.id ? 'opacity-100' : 'opacity-0')} />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{empLabel(e)}</span>
                            <span className="text-xs text-muted-foreground truncate">{e.employeeId} - {e.department}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>{t('اليوم', 'Date')}</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10" />
          </div>

          <Button onClick={handleSave} disabled={saving} className="h-10">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t('تسجيل', 'Save')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('سجل الغياب بدون إذن', 'Unauthorized Absence Records')}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('الموظف', 'Employee')}</TableHead>
                <TableHead>{t('الرقم الوظيفي', 'Code')}</TableHead>
                <TableHead>{t('اليوم', 'Date')}</TableHead>
                <TableHead>{t('البيان', 'Details')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    {t('لا توجد سجلات', 'No records')}
                  </TableCell>
                </TableRow>
              ) : rows.map(r => {
                const e = empMap.get(r.employee_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-pre-wrap break-words">{empLabel(e) || '-'}</TableCell>
                    <TableCell>{e?.employeeId || '-'}</TableCell>
                    <TableCell>{formatDate(r.start_date)}</TableCell>
                    <TableCell>{ABSENCE_REASON_AR}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnauthorizedAbsence;
