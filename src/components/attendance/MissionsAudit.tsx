import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { MISSION_WINDOWS, MissionType, cairoLocalToIso, toCairoHHMM, validateMissionWindow } from '@/lib/missionTime';

interface AuditRow {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  mission_type: MissionType | null;
  check_in: string | null;
  check_out: string | null;
  cairoIn: string | null;
  cairoOut: string | null;
  inWindow: boolean;
  expected: { checkIn: string; checkOut: string } | null;
}

const firstDayOfMonth = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}-01`;
const lastDayOfMonth = (y: number, m: number) => {
  const d = new Date(y, m, 0); // m is 1-indexed, day 0 = last day of prev
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const MissionsAudit = () => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const now = new Date();
  const [from, setFrom] = useState(firstDayOfMonth(now.getFullYear(), 6));
  const [to, setTo] = useState(lastDayOfMonth(now.getFullYear(), 7));
  const [onlyOutOfWindow, setOnlyOutOfWindow] = useState(false);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: att, error } = await supabase
        .from('attendance_records')
        .select('id, employee_id, date, check_in, check_out')
        .eq('status', 'mission')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false })
        .limit(2000);
      if (error) throw error;
      const records = att || [];
      if (records.length === 0) {
        setRows([]);
        return;
      }
      const empIds = Array.from(new Set(records.map(r => r.employee_id)));
      const { data: emps } = await supabase
        .from('employees')
        .select('id, name_ar, name_en')
        .in('id', empIds);
      const empMap = new Map((emps || []).map(e => [e.id, ar ? e.name_ar : e.name_en]));

      // Fetch missions for these employees within window (with some slack)
      const { data: missions } = await supabase
        .from('missions')
        .select('employee_id, mission_type, date, start_date, end_date, status')
        .in('employee_id', empIds)
        .eq('status', 'approved')
        .or(`and(start_date.lte.${to},end_date.gte.${from}),date.gte.${from}`);

      const findType = (employeeId: string, d: string): MissionType | null => {
        const m = (missions || []).find(mm => {
          if (mm.employee_id !== employeeId) return false;
          const s = mm.start_date || mm.date;
          const e = mm.end_date || mm.date || s;
          return s && e && d >= s && d <= e;
        });
        return (m?.mission_type as MissionType) || null;
      };

      const out: AuditRow[] = records.map(r => {
        const type = findType(r.employee_id, r.date);
        const cairoIn = toCairoHHMM(r.check_in);
        const cairoOut = toCairoHHMM(r.check_out);
        let inWindow = false;
        let expected = null as AuditRow['expected'];
        if (type) {
          const v = validateMissionWindow(type, r.check_in, r.check_out);
          inWindow = v.ok === true;
          expected = MISSION_WINDOWS[type];
        }
        return {
          id: r.id,
          employee_id: r.employee_id,
          employee_name: empMap.get(r.employee_id) || r.employee_id.slice(0, 8),
          date: r.date,
          mission_type: type,
          check_in: r.check_in,
          check_out: r.check_out,
          cairoIn,
          cairoOut,
          inWindow,
          expected,
        };
      });
      setRows(out);
    } catch (e: any) {
      toast.error((ar ? 'فشل تحميل السجلات: ' : 'Failed to load: ') + (e?.message || ''));
    } finally {
      setLoading(false);
    }
  }, [from, to, ar]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => onlyOutOfWindow ? rows.filter(r => r.mission_type && !r.inWindow) : rows, [rows, onlyOutOfWindow]);

  const stats = useMemo(() => {
    const total = rows.length;
    const matched = rows.filter(r => r.mission_type).length;
    const bad = rows.filter(r => r.mission_type && !r.inWindow).length;
    const orphans = rows.filter(r => !r.mission_type).length;
    return { total, matched, bad, orphans };
  }, [rows]);

  const runBackfill = useCallback(async () => {
    const targets = rows.filter(r => r.mission_type && !r.inWindow);
    if (targets.length === 0) {
      toast.info(ar ? 'لا توجد سجلات خارج النطاق' : 'No out-of-window records');
      return;
    }
    if (!confirm(ar
      ? `سيتم تصحيح ${targets.length} سجل لتوقيت Africa/Cairo. هل تريد المتابعة؟`
      : `${targets.length} records will be corrected to Africa/Cairo time. Continue?`)) return;
    setFixing(true);
    let ok = 0, fail = 0;
    for (const r of targets) {
      const w = MISSION_WINDOWS[r.mission_type as MissionType];
      const ci = cairoLocalToIso(r.date, w.checkIn);
      const co = cairoLocalToIso(r.date, w.checkOut);
      const { error } = await supabase
        .from('attendance_records')
        .update({ check_in: ci, check_out: co })
        .eq('id', r.id);
      if (error) fail++; else ok++;
    }
    setFixing(false);
    toast[fail === 0 ? 'success' : 'warning'](
      ar ? `تم التصحيح: ${ok} ناجح، ${fail} فشل` : `Fixed: ${ok} ok, ${fail} failed`
    );
    await load();
  }, [rows, ar, load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          {ar ? 'مراجعة سجلات المأموريات (Africa/Cairo)' : 'Missions Audit (Africa/Cairo)'}
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {ar ? 'تحديث' : 'Refresh'}
          </Button>
          <Button size="sm" onClick={runBackfill} disabled={fixing || loading || stats.bad === 0}>
            {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
            {ar ? `تصحيح ${stats.bad} سجل` : `Backfill ${stats.bad}`}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label>{ar ? 'من تاريخ' : 'From'}</Label>
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>{ar ? 'إلى تاريخ' : 'To'}</Label>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="oow"
              type="checkbox"
              checked={onlyOutOfWindow}
              onChange={e => setOnlyOutOfWindow(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="oow" className="cursor-pointer">
              {ar ? 'إظهار السجلات خارج النطاق فقط' : 'Only out-of-window'}
            </Label>
          </div>
          <div className="text-sm text-muted-foreground">
            <div>{ar ? 'إجمالي' : 'Total'}: <b>{stats.total}</b></div>
            <div>{ar ? 'مطابقة' : 'In window'}: <b className="text-success">{stats.matched - stats.bad}</b></div>
            <div>{ar ? 'خارج النطاق' : 'Out of window'}: <b className="text-destructive">{stats.bad}</b></div>
            {stats.orphans > 0 && <div>{ar ? 'بدون مأمورية مطابقة' : 'Orphans'}: <b className="text-warning">{stats.orphans}</b></div>}
          </div>
        </div>

        <div className="rounded border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ar ? 'الموظف' : 'Employee'}</TableHead>
                <TableHead>{ar ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead>{ar ? 'النوع' : 'Type'}</TableHead>
                <TableHead>{ar ? 'الفعلي (القاهرة)' : 'Actual (Cairo)'}</TableHead>
                <TableHead>{ar ? 'المتوقع' : 'Expected'}</TableHead>
                <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={6} className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin inline" /></TableCell></TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">{ar ? 'لا توجد سجلات' : 'No records'}</TableCell></TableRow>
              )}
              {!loading && filtered.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employee_name}</TableCell>
                  <TableCell dir="ltr">{r.date}</TableCell>
                  <TableCell>
                    {r.mission_type ? (
                      <Badge variant="outline">{r.mission_type}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-warning border-warning">{ar ? 'غير محددة' : 'unknown'}</Badge>
                    )}
                  </TableCell>
                  <TableCell dir="ltr">{r.cairoIn || '—'} → {r.cairoOut || '—'}</TableCell>
                  <TableCell dir="ltr">{r.expected ? `${r.expected.checkIn} → ${r.expected.checkOut}` : '—'}</TableCell>
                  <TableCell>
                    {!r.mission_type ? (
                      <Badge variant="outline" className="text-warning border-warning gap-1">
                        <AlertTriangle className="w-3 h-3" /> {ar ? 'بدون مأمورية' : 'orphan'}
                      </Badge>
                    ) : r.inWindow ? (
                      <Badge variant="outline" className="text-success border-success gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {ar ? 'مطابق' : 'ok'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-destructive border-destructive gap-1">
                        <AlertTriangle className="w-3 h-3" /> {ar ? 'خارج النطاق' : 'out of window'}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
