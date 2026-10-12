import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Languages, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, cn } from '@/lib/utils';

type Emp = { id: string; employee_code: string; name_ar: string; name_en: string; station_id: string | null; job_title_ar: string | null };
type Station = { id: string; name_ar: string; name_en?: string | null; code: string };

const DAY_OPTS = ['0.25', '0.5', '1', '2', '3', '5'];

const QualityPortal = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const ar = language === 'ar';
  const L = (a: string, e: string) => (ar ? a : e);

  const [stations, setStations] = useState<Station[]>([]);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [stationId, setStationId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [empOpen, setEmpOpen] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [type, setType] = useState<'deduction' | 'warning' | 'gratitude'>('deduction');
  const [days, setDays] = useState('0.25');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [recordSearch, setRecordSearch] = useState('');

  const loadRecords = async () => {
    const all: any[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase.from('quality_records' as any).select('*')
        .order('created_at', { ascending: false }).range(from, from + 999);
      const page = (data as any) || [];
      all.push(...page);
      if (page.length < 1000) break;
    }
    setRecords(all);
  };

  useEffect(() => {
    supabase.from('stations').select('id, name_ar, name_en, code').order('name_ar').then(({ data }) => setStations((data as any) || []));
    supabase.rpc('get_quality_employees' as any).then(({ data }) => setEmployees((data as any) || []));
    void loadRecords();
  }, []);

  const empById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const stById = useMemo(() => new Map(stations.map(s => [s.id, s])), [stations]);
  const empName = (e: Emp) => (ar ? e.name_ar : e.name_en || e.name_ar);
  const stName = (s?: Station) => (s ? (ar ? s.name_ar : s.name_en || s.name_ar) : '');

  const stationEmps = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    return employees.filter(e => (!stationId || e.station_id === stationId) &&
      (!q || e.name_ar?.toLowerCase().includes(q) || e.name_en?.toLowerCase().includes(q) || e.employee_code?.toLowerCase().includes(q))).slice(0, 300);
  }, [employees, stationId, empSearch]);

  const filteredRecords = useMemo(() => {
    const q = recordSearch.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r => {
      const e = empById.get(r.employee_id);
      return !!e && (e.name_ar?.toLowerCase().includes(q) || e.name_en?.toLowerCase().includes(q) || e.employee_code?.toLowerCase().includes(q));
    });
  }, [records, empById, recordSearch]);

  const typeChange = (v: string) => {
    setType(v as any);
    setDays(v === 'warning' ? 'w1' : '0.25');
  };

  const recordLabel = (r: any) => {
    if (r.record_type === 'gratitude') return L('شهادة شكر', 'Gratitude certificate');
    if (r.record_type === 'warning') return r.warning_level === 2 ? L('إنذار ثاني', 'Second warning') : L('إنذار أول', 'First warning');
    return L(`خصم ${r.deduction_days} يوم`, `Deduction ${r.deduction_days} day(s)`);
  };

  const save = async () => {
    if (!employeeId || !reason.trim()) { toast.error(L('اختر الموظف واكتب السبب', 'Select an employee and enter a reason')); return; }
    const isWarning = days === 'w1' || days === 'w2';
    const recordType = type === 'gratitude' ? 'gratitude' : isWarning ? 'warning' : 'deduction';
    setSaving(true);
    const { error } = await supabase.from('quality_records' as any).insert({
      employee_id: employeeId,
      station_id: empById.get(employeeId)?.station_id || stationId || null,
      record_type: recordType,
      deduction_days: recordType === 'deduction' ? Number(days) : null,
      warning_level: recordType === 'warning' ? (days === 'w2' ? 2 : 1) : null,
      reason: reason.trim(),
      record_date: date,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(L('تم الحفظ', 'Saved'));
    setReason(''); setEmployeeId('');
    void loadRecords();
  };

  const remove = async (id: string) => {
    if (!confirm(L('حذف هذا السجل؟', 'Delete this record?'))) return;
    const { error } = await supabase.from('quality_records' as any).delete().eq('id', id);
    if (error) toast.error(error.message); else void loadRecords();
  };

  const selectedEmp = employeeId ? empById.get(employeeId) : undefined;
  const warnOpts = [{ v: 'w1', l: L('إنذار أول', 'First warning') }, { v: 'w2', l: L('إنذار ثاني', 'Second warning') }];

  return (
    <div dir={ar ? 'rtl' : 'ltr'} className="min-h-dvh bg-background p-4 space-y-4 max-w-5xl mx-auto">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> {L('بوابة الجودة', 'Quality Portal')}</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{ar ? user?.nameAr : (user as any)?.nameEn || user?.nameAr}</span>
          <Button variant="outline" size="sm" onClick={() => setLanguage(ar ? 'en' : 'ar')}><Languages className="h-4 w-4 me-1" /> {ar ? 'English' : 'العربية'}</Button>
          <Button variant="outline" size="sm" onClick={logout}><LogOut className="h-4 w-4 me-1" /> {L('خروج', 'Logout')}</Button>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-lg">{L('تسجيل خصم أو إنذار أو شهادة شكر', 'Record a deduction, warning or gratitude')}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div><Label>{L('المحطة', 'Station')}</Label>
            <Select value={stationId || 'all'} onValueChange={v => { setStationId(v === 'all' ? '' : v); setEmployeeId(''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">{L('كل المحطات', 'All stations')}</SelectItem>
                {stations.map(s => <SelectItem key={s.id} value={s.id}>{stName(s)}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label>{L('الموظف', 'Employee')}</Label>
            <Popover open={empOpen} onOpenChange={setEmpOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  <span className="truncate">{selectedEmp ? `${selectedEmp.employee_code} — ${empName(selectedEmp)}` : L('اختر الموظف', 'Select employee')}</span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[320px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput value={empSearch} onValueChange={setEmpSearch} placeholder={L('بحث بالاسم أو الكود...', 'Search by name or code...')} />
                  <CommandList className="max-h-72">
                    <CommandEmpty>{L('لا توجد نتائج', 'No results')}</CommandEmpty>
                    {stationEmps.map(e => (
                      <CommandItem key={e.id} value={e.id} onSelect={() => { setEmployeeId(e.id); setEmpOpen(false); }}>
                        <Check className={cn('h-4 w-4 me-2', employeeId === e.id ? 'opacity-100' : 'opacity-0')} />
                        <span className="whitespace-pre-wrap break-words">{e.employee_code} — {empName(e)}{ar && e.job_title_ar ? ` (${e.job_title_ar})` : ''}</span>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover></div>
          <div><Label>{L('النوع', 'Type')}</Label>
            <Select value={type} onValueChange={typeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deduction">{L('خصم', 'Deduction')}</SelectItem>
                <SelectItem value="warning">{L('إنذار', 'Warning')}</SelectItem>
                <SelectItem value="gratitude">{L('شهادة شكر', 'Gratitude certificate')}</SelectItem>
              </SelectContent>
            </Select></div>
          {type !== 'gratitude' && <div><Label>{type === 'warning' ? L('نوع الإنذار', 'Warning level') : L('عدد أيام الخصم', 'Deduction days')}</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {type === 'deduction' && DAY_OPTS.map(d => <SelectItem key={d} value={d}>{d} {L('يوم', 'day(s)')}</SelectItem>)}
                {warnOpts.map(o => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
              </SelectContent>
            </Select></div>}
          <div><Label>{L('التاريخ', 'Date')}</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>{L('السبب', 'Reason')}</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} /></div>
          <div className="sm:col-span-2"><Button onClick={save} disabled={saving} className="w-full">{saving ? L('جاري الحفظ...', 'Saving...') : L('حفظ', 'Save')}</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">{L('السجلات', 'Records')} ({filteredRecords.length}{filteredRecords.length !== records.length ? ` ${L('من', 'of')} ${records.length}` : ''})</CardTitle>
          <Input value={recordSearch} onChange={e => setRecordSearch(e.target.value)} placeholder={L('بحث باسم الموظف أو الكود...', 'Search by employee name or code...')} className="max-w-sm" />
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredRecords.length === 0 ? <p className="text-sm text-muted-foreground">{records.length === 0 ? L('لا توجد سجلات', 'No records') : L('لا توجد سجلات مطابقة للبحث', 'No matching records')}</p> : filteredRecords.map(r => {
            const e = empById.get(r.employee_id);
            return (
              <div key={r.id} className="flex items-start gap-2 border rounded-md p-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <Badge variant={r.record_type === 'gratitude' ? 'default' : r.record_type === 'warning' ? 'secondary' : 'destructive'}>{recordLabel(r)}</Badge>
                    <span>{e ? `${e.employee_code} — ${empName(e)}` : r.employee_id}</span>
                    <span className="text-xs text-muted-foreground">{stName(stById.get(r.station_id))} · {formatDate(r.record_date)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words">{r.reason}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityPortal;
