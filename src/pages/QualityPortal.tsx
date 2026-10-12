import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

type Emp = { id: string; employee_code: string; name_ar: string; name_en: string; station_id: string | null; job_title_ar: string | null };
type Station = { id: string; name_ar: string; code: string };

const QualityPortal = () => {
  const { user, logout } = useAuth();
  const [stations, setStations] = useState<Station[]>([]);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [stationId, setStationId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [type, setType] = useState<'deduction' | 'gratitude'>('deduction');
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
    supabase.from('stations').select('id, name_ar, code').order('name_ar').then(({ data }) => setStations((data as any) || []));
    supabase.rpc('get_quality_employees' as any).then(({ data }) => setEmployees((data as any) || []));
    void loadRecords();
  }, []);

  const empById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
  const stById = useMemo(() => new Map(stations.map(s => [s.id, s])), [stations]);
  const stationEmps = useMemo(() => {
    const q = empSearch.trim().toLowerCase();
    return employees.filter(e => (!stationId || e.station_id === stationId) &&
      (!q || e.name_ar?.toLowerCase().includes(q) || e.employee_code?.toLowerCase().includes(q))).slice(0, 300);
  }, [employees, stationId, empSearch]);

  const filteredRecords = useMemo(() => {
    const q = recordSearch.trim().toLowerCase();
    if (!q) return records;
    return records.filter(r => {
      const e = empById.get(r.employee_id);
      return !!e && (e.name_ar?.toLowerCase().includes(q) || e.name_en?.toLowerCase().includes(q) || e.employee_code?.toLowerCase().includes(q));
    });
  }, [records, empById, recordSearch]);

  const save = async () => {
    if (!employeeId || !reason.trim()) { toast.error('اختر الموظف واكتب السبب'); return; }
    setSaving(true);
    const { error } = await supabase.from('quality_records' as any).insert({
      employee_id: employeeId,
      station_id: empById.get(employeeId)?.station_id || stationId || null,
      record_type: type,
      deduction_days: type === 'deduction' ? Number(days) : null,
      reason: reason.trim(),
      record_date: date,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('تم الحفظ');
    setReason(''); setEmployeeId('');
    void loadRecords();
  };

  const remove = async (id: string) => {
    if (!confirm('حذف هذا السجل؟')) return;
    const { error } = await supabase.from('quality_records' as any).delete().eq('id', id);
    if (error) toast.error(error.message); else void loadRecords();
  };

  return (
    <div dir="rtl" className="min-h-dvh bg-background p-4 space-y-4 max-w-5xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" /> بوابة الجودة</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{user?.nameAr}</span>
          <Button variant="outline" size="sm" onClick={logout}><LogOut className="h-4 w-4 ms-1" /> خروج</Button>
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle className="text-lg">تسجيل خصم أو شهادة شكر</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div><Label>المحطة</Label>
            <Select value={stationId || 'all'} onValueChange={v => { setStationId(v === 'all' ? '' : v); setEmployeeId(''); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">كل المحطات</SelectItem>
                {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name_ar}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label>بحث عن موظف (الاسم أو الكود)</Label>
            <Input value={empSearch} onChange={e => setEmpSearch(e.target.value)} placeholder="بحث..." /></div>
          <div className="sm:col-span-2"><Label>الموظف</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
              <SelectContent className="max-h-80">
                {stationEmps.map(e => <SelectItem key={e.id} value={e.id}>{e.employee_code} — {e.name_ar}{e.job_title_ar ? ` (${e.job_title_ar})` : ''}</SelectItem>)}
              </SelectContent>
            </Select></div>
          <div><Label>النوع</Label>
            <Select value={type} onValueChange={v => setType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="deduction">خصم</SelectItem><SelectItem value="gratitude">شهادة شكر</SelectItem></SelectContent>
            </Select></div>
          {type === 'deduction' && <div><Label>عدد أيام الخصم</Label>
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{['0.25', '0.5', '1', '2', '3', '5'].map(d => <SelectItem key={d} value={d}>{d} يوم</SelectItem>)}</SelectContent>
            </Select></div>}
          <div><Label>التاريخ</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>السبب</Label><Textarea value={reason} onChange={e => setReason(e.target.value)} /></div>
          <div className="sm:col-span-2"><Button onClick={save} disabled={saving} className="w-full">{saving ? 'جاري الحفظ...' : 'حفظ'}</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-lg">السجلات ({filteredRecords.length}{filteredRecords.length !== records.length ? ` من ${records.length}` : ''})</CardTitle>
          <Input value={recordSearch} onChange={e => setRecordSearch(e.target.value)} placeholder="بحث باسم الموظف أو الكود..." className="max-w-sm" />
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredRecords.length === 0 ? <p className="text-sm text-muted-foreground">{records.length === 0 ? 'لا توجد سجلات' : 'لا توجد سجلات مطابقة للبحث'}</p> : filteredRecords.map(r => {
            const e = empById.get(r.employee_id);
            return (
              <div key={r.id} className="flex items-start gap-2 border rounded-md p-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {r.record_type === 'gratitude' ? <Badge>شهادة شكر</Badge> : <Badge variant="destructive">خصم {r.deduction_days} يوم</Badge>}
                    <span>{e ? `${e.employee_code} — ${e.name_ar}` : r.employee_id}</span>
                    <span className="text-xs text-muted-foreground">{stById.get(r.station_id)?.name_ar} · {formatDate(r.record_date)}</span>
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
