import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Play, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { rosterPeriod } from '@/lib/roster';
import { sharmAllowanceAmount, canRunSharmAllowance, SHARM_DAY_RATE } from '@/lib/sharmAllowance';

interface Row { employeeId: string; code: string; name: string; days: number; amount: number }

const cairoToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export const SharmAllowances = () => {
  const today = cairoToday();
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const period = useMemo(() => rosterPeriod(month), [month]);
  const canRun = canRunSharmAllowance(today, month);
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    if (!canRunSharmAllowance(cairoToday(), month)) {
      toast({ title: 'لا يمكن تشغيل البدلات', description: 'يتاح التشغيل بعد يوم 25 من الشهر المختار.', variant: 'destructive' });
      return;
    }
    setRunning(true);
    try {
      const { data: st } = await supabase.from('stations').select('id').eq('code', 'sharm').single();
      if (!st) throw new Error('محطة شرم الشيخ غير موجودة');
      const emps = await fetchAllPages<any>((f, t) => supabase.from('employees').select('id, employee_code, name_ar').eq('station_id', st.id).eq('status', 'active').order('id').range(f, t));
      const ids = emps.map(e => e.id);
      const allowance = new Set<string>();
      for (const part of chunk(ids, 200)) {
        const { data } = await supabase.rpc('roster_allowance_employee_ids', { p_ids: part });
        (data as any[] || []).forEach((r: any) => allowance.add(typeof r === 'string' ? r : r.roster_allowance_employee_ids));
      }
      const eligible = emps.filter(e => allowance.has(e.id));
      const days = new Map<string, Set<string>>();
      for (const part of chunk(eligible.map(e => e.id), 200)) {
        const att = await fetchAllPages<any>((f, t) => supabase.from('attendance_records').select('id, employee_id, date').in('employee_id', part).gte('date', period.start).lte('date', period.end).order('id').range(f, t));
        att.forEach(a => { if (a.date) (days.get(a.employee_id) || days.set(a.employee_id, new Set()).get(a.employee_id)!).add(a.date); });
      }
      const { data: { user } } = await supabase.auth.getUser();
      const result: Row[] = eligible.map(e => {
        const w = days.get(e.id)?.size || 0;
        return { employeeId: e.id, code: e.employee_code, name: e.name_ar, days: w, amount: sharmAllowanceAmount(w) };
      }).sort((a, b) => a.code.localeCompare(b.code));
      const payload = result.filter(r => r.amount > 0).map(r => ({ employee_id: r.employeeId, amount: r.amount, allowance_month: month, status: 'pending', uploaded_by: user?.id || null }));
      if (payload.length) {
        const { error } = await supabase.from('living_allowances').upsert(payload, { onConflict: 'employee_id,allowance_month' });
        if (error) throw error;
      }
      const { error: runErr } = await supabase.from('sharm_allowance_runs').upsert({
        run_month: month, employees_count: payload.length,
        total_amount: payload.reduce((s, p) => s + p.amount, 0), run_by: user?.id || null, run_at: new Date().toISOString(),
      });
      if (runErr) throw runErr;
      setRows(result);
      toast({ title: 'تم تشغيل بدلات شرم', description: `${payload.length} موظف — أضيفت المبالغ إلى بدل المعيشة لشهر ${month}` });
    } catch (e: any) {
      toast({ title: 'خطأ', description: e.message, variant: 'destructive' });
    } finally { setRunning(false); }
  };

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const exportXlsx = () => {
    const ws = XLSX.utils.json_to_sheet(rows.map(r => ({ 'كود الموظف': r.code, 'الاسم': r.name, 'أيام العمل W': r.days, 'أجر اليوم': SHARM_DAY_RATE, 'البدل': r.amount })));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sharm');
    XLSX.writeFile(wb, `بدلات-شرم-${month}.xlsx`);
  };

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle>بدلات شرم الشيخ — {month}</CardTitle>
        <p className="text-sm text-muted-foreground">فترة الروستر من {period.start.split('-').reverse().join('/')} إلى {period.end.split('-').reverse().join('/')} — أيام W × {SHARM_DAY_RATE} ج.م، تضاف إلى بدل المعيشة لأصحاب بدل الروستر فقط.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Label htmlFor="sharm-allowance-month">شهر البدلات</Label>
          <Input id="sharm-allowance-month" type="month" className="w-44" value={month} max={today.slice(0, 7)} disabled={running}
            onChange={e => {
              if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value)) {
                setMonth(e.target.value);
                setRows([]);
              }
            }} />
          <Button onClick={run} disabled={!canRun || running}>
            {running ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Play className="w-4 h-4 ml-2" />}تشغيل بدلات شرم
          </Button>
          {rows.length > 0 && <Button variant="outline" onClick={exportXlsx}><FileSpreadsheet className="w-4 h-4 ml-2" />تصدير Excel</Button>}
          {!canRun && <span className="text-sm text-muted-foreground">يتاح الزر بعد يوم 25 من الشهر المختار.</span>}
        </div>
        {rows.length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead className="text-right">الكود</TableHead><TableHead className="text-right">الاسم</TableHead><TableHead className="text-right">أيام W</TableHead><TableHead className="text-right">البدل (ج.م)</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map(r => <TableRow key={r.employeeId}><TableCell>{r.code}</TableCell><TableCell className="whitespace-pre-wrap break-words">{r.name}</TableCell><TableCell>{r.days}</TableCell><TableCell>{r.amount.toLocaleString()}</TableCell></TableRow>)}
              <TableRow className="font-bold"><TableCell colSpan={3}>الإجمالي</TableCell><TableCell>{total.toLocaleString()}</TableCell></TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default SharmAllowances;
