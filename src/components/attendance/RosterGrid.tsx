import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { getCairoDateString } from '@/lib/cairoDate';
import { compareRoster, rosterPeriod, rosterCode, rosterTotals, currentRosterMonth, expandRange, RosterCode, DayFlags } from '@/lib/roster';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2, Printer, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  employees: Employee[];
  /** Optional station picker values (admin view). */
  stations?: string[];
}

const CODE_CLASS: Record<string, string> = {
  W: 'bg-primary/15 text-primary',
  H: 'bg-warning/20 text-warning-foreground',
  M: 'bg-accent text-accent-foreground',
  X: 'bg-destructive/15 text-destructive',
};

const chunk = <T,>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export function RosterGrid({ employees, stations }: Props) {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const today = getCairoDateString();
  const [month, setMonth] = useState(currentRosterMonth(today));
  const [station, setStation] = useState<string>(stations?.[0] || '');
  const [dept, setDept] = useState('all');
  const [search, setSearch] = useState('');
  const [flags, setFlags] = useState<Record<string, Record<string, DayFlags>>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (stations && !stations.includes(station)) setStation(stations[0] || ''); }, [stations, station]);

  const period = useMemo(() => rosterPeriod(month), [month]);
  const scoped = useMemo(() => stations ? employees.filter(e => e.stationLocation === station) : employees, [employees, stations, station]);
  const idsKey = scoped.map(e => e.id).join(',');
  const ids = useMemo(() => (idsKey ? idsKey.split(',') : []), [idsKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ids.length) { setFlags({}); return; }
      setLoading(true);
      const map: Record<string, Record<string, DayFlags>> = {};
      const set = (emp: string, day: string, k: keyof DayFlags) => { ((map[emp] ||= {})[day] ||= {})[k] = true; };
      try {
        for (const part of chunk(ids, 200)) {
          const [att, lv, ms] = await Promise.all([
            fetchAllPages<any>((f, t) => supabase.from('attendance_records').select('id,employee_id,date').in('employee_id', part).gte('date', period.start).lte('date', period.end).order('id').range(f, t)),
            fetchAllPages<any>((f, t) => supabase.from('leave_requests').select('id,employee_id,start_date,end_date,status').in('employee_id', part).lte('start_date', period.end).gte('end_date', period.start).neq('status', 'rejected').order('id').range(f, t)),
            fetchAllPages<any>((f, t) => supabase.from('missions').select('id,employee_id,date,start_date,end_date,status').in('employee_id', part).neq('status', 'rejected').order('id').range(f, t)),
          ]);
          att.forEach(r => r.date && set(r.employee_id, r.date, 'attended'));
          lv.forEach(r => expandRange(r.start_date, r.end_date, period.start, period.end).forEach(d => set(r.employee_id, d, 'leave')));
          ms.forEach(r => {
            const from = r.start_date || r.date; if (!from) return;
            expandRange(from, r.end_date || r.date, period.start, period.end).forEach(d => set(r.employee_id, d, 'mission'));
          });
        }
        if (!cancelled) setFlags(map);
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [ids, period]);

  const [allowanceIds, setAllowanceIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    if (!ids.length) { setAllowanceIds(new Set()); return; }
    (async () => {
      const out = new Set<string>();
      for (const part of chunk(ids, 200)) {
        const { data } = await supabase.rpc('roster_allowance_employee_ids', { p_ids: part });
        (data as any[] || []).forEach((r: any) => out.add(typeof r === 'string' ? r : r.roster_allowance_employee_ids));
      }
      if (!cancelled) setAllowanceIds(out);
    })();
    return () => { cancelled = true; };
  }, [ids]);

  const depts = useMemo(() => Array.from(new Set(scoped.map(e => e.department).filter(Boolean))).sort(), [scoped]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped
      .filter(e => dept === 'all' || e.department === dept)
      .filter(e => !q || [e.nameAr, e.nameEn, e.employeeId].some(v => (v || '').toLowerCase().includes(q)))
      .filter(e => e.status === 'active')
      .sort((a, b) => compareRoster({ ...a, hasRosterAllowance: allowanceIds.has(a.id) }, { ...b, hasRosterAllowance: allowanceIds.has(b.id) }))
      .map(e => {
        const codes: RosterCode[] = period.days.map(d => rosterCode(flags[e.id]?.[d], d, today));
        return { e, codes, totals: rosterTotals(codes) };
      });
  }, [scoped, dept, search, flags, period, today, allowanceIds]);

  const dayTotals = useMemo(() => period.days.map((_, i) => rosterTotals(rows.map(r => r.codes[i]))), [rows, period]);
  const grand = useMemo(() => rows.reduce((a, r) => ({ W: a.W + r.totals.W, H: a.H + r.totals.H, M: a.M + r.totals.M, X: a.X + r.totals.X }), { W: 0, H: 0, M: 0, X: 0 }), [rows]);

  const months = useMemo(() => {
    const base = currentRosterMonth(today);
    const [y, m] = base.split('-').map(Number);
    return Array.from({ length: 13 }, (_, i) => new Date(Date.UTC(y, m - 1 - i + 1, 1)).toISOString().slice(0, 7));
  }, [today]);

  const dd = (d: string) => d.slice(8, 10);
  const name = (e: Employee) => (ar ? e.nameAr : e.nameEn) || e.nameAr || e.nameEn;

  const exportExcel = () => {
    const header = [ar ? 'الكود' : 'Code', ar ? 'الاسم' : 'Name', ar ? 'المسمى' : 'Title', ...period.days.map(d => `${dd(d)}/${d.slice(5, 7)}`), 'W', 'H', 'M', 'X'];
    const data = rows.map(r => [r.e.employeeId, name(r.e), r.e.jobTitleAr || r.e.jobTitle, ...r.codes, r.totals.W, r.totals.H, r.totals.M, r.totals.X]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...data, ['', ar ? 'المجموع' : 'Total', '', ...dayTotals.map(t => `W${t.W} H${t.H} M${t.M} X${t.X}`), grand.W, grand.H, grand.M, grand.X]]);
    if (isRTL) ws['!views'] = [{ RTL: true } as any];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roster');
    XLSX.writeFile(wb, `Roster-${station || 'station'}-${month}.xlsx`);
  };

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'} className="print:shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarRange className="h-5 w-5 text-primary" />Roster</CardTitle>
        <p className="text-sm text-muted-foreground">
          {ar ? `الفترة من ${period.start.split('-').reverse().join('/')} إلى ${period.end.split('-').reverse().join('/')}` : `Period ${period.start.split('-').reverse().join('/')} → ${period.end.split('-').reverse().join('/')}`}
        </p>
        <div className="flex flex-wrap gap-2 pt-2 print:hidden">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m.split('-').reverse().join('/')}</SelectItem>)}</SelectContent>
          </Select>
          {stations && (
            <Select value={station} onValueChange={setStation}>
              <SelectTrigger className="w-48"><SelectValue placeholder={ar ? 'المحطة' : 'Station'} /></SelectTrigger>
              <SelectContent>{stations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? 'كل الأقسام' : 'All departments'}</SelectItem>
              {depts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="w-56" value={search} onChange={e => setSearch(e.target.value)} placeholder={ar ? 'بحث بالاسم أو الكود' : 'Search name or code'} />
          <Button variant="outline" className="gap-2" onClick={exportExcel} disabled={!rows.length}><Download className="h-4 w-4" />Excel</Button>
          <Button variant="outline" className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" />{ar ? 'طباعة' : 'Print'}</Button>
        </div>
        <div className="flex flex-wrap gap-3 text-xs pt-2">
          {(['W', 'H', 'M', 'X'] as const).map(c => (
            <span key={c} className="flex items-center gap-1">
              <span className={cn('inline-flex w-6 h-6 items-center justify-center rounded font-bold', CODE_CLASS[c])}>{c}</span>
              {{ W: ar ? 'حضور' : 'Worked', H: ar ? 'إجازة' : 'Leave', M: ar ? 'مأمورية' : 'Mission', X: ar ? 'لا شيء' : 'None' }[c]}: <b>{grand[c]}</b>
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !rows.length ? (
          <p className="text-center text-muted-foreground p-8">{ar ? 'لا يوجد موظفون' : 'No employees'}</p>
        ) : (
          <div className="overflow-auto max-h-[70vh] border rounded">
            <table className="text-xs border-collapse w-max">
              <thead className="sticky top-0 bg-muted z-10">
                <tr>
                  <th className="p-1 border sticky start-0 bg-muted min-w-[70px]">{ar ? 'الكود' : 'Code'}</th>
                  <th className="p-1 border min-w-[160px]">{ar ? 'الاسم' : 'Name'}</th>
                  {period.days.map(d => <th key={d} className="p-1 border w-7">{dd(d)}</th>)}
                  {(['W', 'H', 'M', 'X'] as const).map(c => <th key={c} className="p-1 border w-8">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.e.id}>
                    <td className="p-1 border sticky start-0 bg-background">{r.e.employeeId}</td>
                    <td className="p-1 border whitespace-pre-wrap break-words">{name(r.e)}</td>
                    {r.codes.map((c, i) => <td key={i} className={cn('p-1 border text-center font-bold', c && CODE_CLASS[c])}>{c}</td>)}
                    {(['W', 'H', 'M', 'X'] as const).map(c => <td key={c} className="p-1 border text-center font-bold">{r.totals[c]}</td>)}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted font-bold">
                {(['W', 'H', 'M', 'X'] as const).map(c => (
                  <tr key={c}>
                    <td className="p-1 border sticky start-0 bg-muted">{c}</td>
                    <td className="p-1 border">{ar ? 'المجموع' : 'Total'}</td>
                    {dayTotals.map((t, i) => <td key={i} className="p-1 border text-center">{t[c]}</td>)}
                    <td colSpan={4} className="p-1 border text-center">{grand[c]}</td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
