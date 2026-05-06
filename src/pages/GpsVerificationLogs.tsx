import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface LogRow {
  id: string;
  user_id: string;
  employee_id: string | null;
  event_type: string;
  expected_recorded_at: string | null;
  found_recorded_at: string | null;
  matched_record_date: string | null;
  outcome: string;
  reason: string | null;
  created_at: string;
}

const fmt = (ts: string | null) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function GpsVerificationLogs() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | 'matched' | 'not_found' | 'error'>('all');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('gps_verification_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (outcomeFilter !== 'all') q = q.eq('outcome', outcomeFilter);
    const { data } = await q;
    setRows((data as LogRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [outcomeFilter]);

  const filtered = rows.filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.user_id.toLowerCase().includes(s) ||
      (r.employee_id || '').toLowerCase().includes(s) ||
      (r.reason || '').toLowerCase().includes(s)
    );
  });

  const stats = {
    total: rows.length,
    matched: rows.filter(r => r.outcome === 'matched').length,
    not_found: rows.filter(r => r.outcome === 'not_found').length,
    error: rows.filter(r => r.outcome === 'error').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 p-4" dir="rtl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">سجل تدقيق التحقق من GPS</h1>
          <Button onClick={() => void load()} disabled={loading} variant="outline" size="sm" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3"><div className="text-xs text-muted-foreground">الإجمالي</div><div className="text-2xl font-bold">{stats.total}</div></Card>
          <Card className="p-3"><div className="text-xs text-muted-foreground">مطابق</div><div className="text-2xl font-bold text-success">{stats.matched}</div></Card>
          <Card className="p-3"><div className="text-xs text-muted-foreground">غير موجود</div><div className="text-2xl font-bold text-destructive">{stats.not_found}</div></Card>
          <Card className="p-3"><div className="text-xs text-muted-foreground">خطأ</div><div className="text-2xl font-bold text-amber-600">{stats.error}</div></Card>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="بحث برقم الموظف / السبب..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />
          {(['all', 'matched', 'not_found', 'error'] as const).map(o => (
            <Button key={o} size="sm" variant={outcomeFilter === o ? 'default' : 'outline'} onClick={() => setOutcomeFilter(o)}>
              {o === 'all' ? 'الكل' : o === 'matched' ? 'مطابق' : o === 'not_found' ? 'غير موجود' : 'خطأ'}
            </Button>
          ))}
        </div>

        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-right">الوقت</th>
                <th className="p-2 text-right">النوع</th>
                <th className="p-2 text-right">النتيجة</th>
                <th className="p-2 text-right">المتوقع</th>
                <th className="p-2 text-right">الموجود</th>
                <th className="p-2 text-right">تاريخ السجل</th>
                <th className="p-2 text-right">السبب</th>
                <th className="p-2 text-right">معرّف الموظف</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-2 whitespace-nowrap">{fmt(r.created_at)}</td>
                  <td className="p-2">{r.event_type === 'check_in' ? 'حضور' : 'انصراف'}</td>
                  <td className="p-2">
                    <Badge variant={r.outcome === 'matched' ? 'default' : r.outcome === 'not_found' ? 'destructive' : 'secondary'}>
                      {r.outcome === 'matched' ? 'مطابق' : r.outcome === 'not_found' ? 'غير موجود' : 'خطأ'}
                    </Badge>
                  </td>
                  <td className="p-2 whitespace-nowrap text-xs">{fmt(r.expected_recorded_at)}</td>
                  <td className="p-2 whitespace-nowrap text-xs">{fmt(r.found_recorded_at)}</td>
                  <td className="p-2 whitespace-nowrap text-xs">{r.matched_record_date || '—'}</td>
                  <td className="p-2 text-xs break-all">{r.reason || '—'}</td>
                  <td className="p-2 text-xs font-mono">{r.employee_id?.slice(0, 8) || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">لا توجد سجلات</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
