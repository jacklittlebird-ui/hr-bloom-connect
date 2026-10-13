import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Incident {
  id: string; incident_no: number; created_at: string; user_id: string | null;
  employee_id: string | null; station_id: string | null; event_type: string | null;
  category: string; risk_level: string; reasons: string[]; device_id: string | null;
  outcome: string; review_status: string; reviewer_name: string | null;
  review_notes: string | null; evidence: any; source: string;
}

const T: Record<string, [string, string]> = {
  account_sharing: ['مشاركة حساب/جهاز', 'Account/device sharing'],
  device_binding: ['تجاوز حد الأجهزة', 'Device binding violation'],
  new_device: ['جهاز جديد', 'New device'],
  outside_geofence: ['خارج نطاق المحطة', 'Outside geofence'],
  suspicious_location: ['موقع مشبوه', 'Suspicious location'],
  verification_bypass: ['محاولة تجاوز التحقق', 'Verification bypass'],
  other: ['أخرى', 'Other'],
  low: ['منخفض', 'Low'], medium: ['متوسط', 'Medium'], high: ['عالٍ', 'High'],
  accepted: ['مقبول', 'Accepted'], flagged: ['مقبول مع علامة', 'Flagged'],
  pending_verification: ['يحتاج تحقق', 'Pending verification'], rejected: ['مرفوض', 'Rejected'],
  new: ['جديد', 'New'], under_review: ['قيد المراجعة', 'Under review'],
  resolved: ['تم الحل', 'Resolved'], escalated: ['مُصعّد', 'Escalated'],
  check_in: ['حضور', 'Check-in'], check_out: ['انصراف', 'Check-out'],
  device_shared_fraud: ['جهاز استُخدم لموظف آخر اليوم', 'Device used by another employee today'],
  device_limit_reached: ['تجاوز الحد الأقصى للأجهزة', 'Max devices reached'],
  new_device_registered: ['تسجيل جهاز جديد', 'New device registered'],
  low_accuracy: ['دقة GPS ضعيفة', 'Poor GPS accuracy'],
  impossible_travel: ['تنقل غير منطقي بين موقعين', 'Implausible travel speed'],
  qr_required_gps_only: ['المحطة تتطلب QR', 'Station requires QR'],
};

const fmt = (ts: string) => {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

export default function TamperAttemptsTab() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const t = (k?: string | null) => (k ? (T[k] ? T[k][ar ? 0 : 1] : k) : '—');

  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(daysAgo(0));
  const [rows, setRows] = useState<Incident[]>([]);
  const [emps, setEmps] = useState<Record<string, { code: string; name: string }>>({});
  const [stations, setStations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [fStation, setFStation] = useState('all');
  const [fCat, setFCat] = useState('all');
  const [fRisk, setFRisk] = useState('all');
  const [fOutcome, setFOutcome] = useState('all');
  const [fStatus, setFStatus] = useState('all');
  const [sel, setSel] = useState<Incident | null>(null);
  const [notes, setNotes] = useState('');

  const load = async () => {
    setLoading(true);
    const all: Incident[] = [];
    for (let off = 0; ; off += 1000) {
      const { data, error } = await supabase
        .from('attendance_tamper_incidents' as any)
        .select('*')
        .gte('created_at', `${from}T00:00:00+02:00`)
        .lte('created_at', `${to}T23:59:59+02:00`)
        .order('created_at', { ascending: false })
        [fRisk === 'low' ? 'eq' : 'neq']('risk_level', 'low')
        .range(off, off + 999);
      if (error) { toast.error(error.message); break; }
      all.push(...((data as any) || []));
      if (!data || data.length < 1000) break;
    }
    setRows(all);
    const ids = [...new Set(all.map(r => r.employee_id).filter(Boolean))] as string[];
    const map: Record<string, { code: string; name: string }> = {};
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await supabase.from('employees').select('id, employee_code, name_ar, name_en').in('id', ids.slice(i, i + 200));
      (data || []).forEach((e: any) => { map[e.id] = { code: e.employee_code, name: ar ? e.name_ar : (e.name_en || e.name_ar) }; });
    }
    setEmps(map);
    setLoading(false);
  };

  useEffect(() => {
    supabase.from('stations').select('id, name_ar, name_en').then(({ data }) => {
      const m: Record<string, string> = {};
      (data || []).forEach((s: any) => { m[s.id] = ar ? s.name_ar : (s.name_en || s.name_ar); });
      setStations(m);
    });
  }, [ar]);
  useEffect(() => { void load(); }, [from, to, fRisk === 'low']);

  const filtered = useMemo(() => rows.filter(r => {
    if (fStation !== 'all' && r.station_id !== fStation) return false;
    if (fCat !== 'all' && r.category !== fCat) return false;
    if (fRisk !== 'all' && r.risk_level !== fRisk) return false;
    if (fOutcome !== 'all' && r.outcome !== fOutcome) return false;
    if (fStatus !== 'all' && r.review_status !== fStatus) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      const e = r.employee_id ? emps[r.employee_id] : undefined;
      if (!(`${e?.name || ''} ${e?.code || ''} ${r.incident_no} ${r.device_id || ''}`.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [rows, emps, search, fStation, fCat, fRisk, fOutcome, fStatus]);

  const stats = {
    total: filtered.length,
    fresh: filtered.filter(r => r.review_status === 'new').length,
    high: filtered.filter(r => r.risk_level === 'high').length,
    pending: filtered.filter(r => r.outcome === 'pending_verification').length,
    resolved: filtered.filter(r => r.review_status === 'resolved').length,
  };

  const review = async (status: string) => {
    if (!sel) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('attendance_tamper_incidents' as any).update({
      review_status: status, review_notes: notes || sel.review_notes,
      reviewer_id: u.user?.id, reviewer_name: u.user?.email, reviewed_at: new Date().toISOString(),
    }).eq('id', sel.id);
    if (error) { toast.error(error.message); return; }
    if (status === 'resolved' && sel.category === 'new_device' && sel.device_id && sel.user_id) {
      await supabase.from('user_devices').update({ approved_status: 'approved' } as any).eq('user_id', sel.user_id).eq('device_id', sel.device_id);
    }
    toast.success(ar ? 'تم الحفظ' : 'Saved');
    setSel(null);
    void load();
  };

  const revokeDevice = async () => {
    if (!sel?.device_id || !sel.user_id) return;
    const { error } = await supabase.from('user_devices').update({ is_active: false, approved_status: 'revoked' } as any)
      .eq('user_id', sel.user_id).eq('device_id', sel.device_id);
    if (error) toast.error(error.message); else toast.success(ar ? 'تم إلغاء الجهاز' : 'Device revoked');
  };

  const exportXlsx = () => {
    const data = filtered.map(r => {
      const e = r.employee_id ? emps[r.employee_id] : undefined;
      return {
        [ar ? 'رقم الحادثة' : 'Incident']: r.incident_no,
        [ar ? 'التاريخ' : 'Date']: fmt(r.created_at),
        [ar ? 'الموظف' : 'Employee']: e?.name || '',
        [ar ? 'الكود' : 'Code']: e?.code || '',
        [ar ? 'المحطة' : 'Station']: r.station_id ? stations[r.station_id] || '' : '',
        [ar ? 'النوع' : 'Type']: t(r.event_type),
        [ar ? 'الفئة' : 'Category']: t(r.category),
        [ar ? 'الخطورة' : 'Risk']: t(r.risk_level),
        [ar ? 'السبب' : 'Reason']: r.reasons.map(t).join('، '),
        [ar ? 'الجهاز' : 'Device']: r.device_id || '',
        [ar ? 'النتيجة' : 'Outcome']: t(r.outcome),
        [ar ? 'الحالة' : 'Status']: t(r.review_status),
        [ar ? 'المراجِع' : 'Reviewer']: r.reviewer_name || '',
        [ar ? 'ملاحظات' : 'Notes']: r.review_notes || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    if (ar) ws['!views'] = [{ RTL: true } as any];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tamper');
    XLSX.writeFile(wb, `tamper-attempts-${from}-${to}.xlsx`);
  };

  const sel2 = (v: string, set: (s: string) => void, keys: string[], label: string) => (
    <Select value={v} onValueChange={set}>
      <SelectTrigger className="w-40"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}: {ar ? 'الكل' : 'All'}</SelectItem>
        {keys.map(k => <SelectItem key={k} value={k}>{t(k)}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const riskVariant = (r: string) => (r === 'high' ? 'destructive' : r === 'medium' ? 'secondary' : 'outline') as any;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div><div className="text-xs text-muted-foreground">{ar ? 'من' : 'From'}</div><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div><div className="text-xs text-muted-foreground">{ar ? 'إلى' : 'To'}</div><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />{ar ? 'تحديث' : 'Refresh'}
        </Button>
        <Button variant="outline" size="sm" onClick={exportXlsx} className="gap-2"><Download className="h-4 w-4" />Excel</Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {ar ? 'كل رقم يمثل عدد المحاولات المسجلة (كل محاولة حضور أو انصراف مشبوهة = سجل واحد). العلامة لا تعني إثبات التلاعب، بل تحتاج مراجعة.'
            : 'Each count is the number of recorded attempts (one suspicious check-in/out = one record). A flag is not proof of fraud; it needs review.'}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          [ar ? 'إجمالي المحاولات' : 'Total attempts', stats.total],
          [ar ? 'جديدة غير مراجعة' : 'New / unreviewed', stats.fresh],
          [ar ? 'عالية الخطورة' : 'High risk', stats.high],
          [ar ? 'تحتاج تحقق' : 'Need verification', stats.pending],
          [ar ? 'تمت مراجعتها' : 'Resolved', stats.resolved],
        ].map(([l, v]) => (
          <Card key={l as string} className="p-3"><div className="text-xs text-muted-foreground">{l}</div><div className="text-2xl font-bold">{v}</div></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder={ar ? 'بحث بالاسم / الكود / رقم الحادثة' : 'Search name / code / incident'} value={search} onChange={e => setSearch(e.target.value)} />
        <Select value={fStation} onValueChange={setFStation}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? 'كل المحطات' : 'All stations'}</SelectItem>
            {Object.entries(stations).map(([id, n]) => <SelectItem key={id} value={id}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        {sel2(fCat, setFCat, ['account_sharing', 'device_binding', 'new_device', 'outside_geofence', 'suspicious_location', 'verification_bypass', 'other'], ar ? 'الفئة' : 'Category')}
        {sel2(fRisk, setFRisk, ['low', 'medium', 'high'], ar ? 'الخطورة (الافتراضي متوسط وعالٍ)' : 'Risk (default medium+high)')}
        {sel2(fOutcome, setFOutcome, ['accepted', 'flagged', 'pending_verification', 'rejected'], ar ? 'النتيجة' : 'Outcome')}
        {sel2(fStatus, setFStatus, ['new', 'under_review', 'resolved', 'escalated'], ar ? 'الحالة' : 'Status')}
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              {(ar ? ['#', 'الوقت', 'الموظف', 'المحطة', 'النوع', 'الفئة', 'الخطورة', 'السبب', 'الجهاز', 'النتيجة', 'الحالة', 'المراجِع', '']
                   : ['#', 'Time', 'Employee', 'Station', 'Type', 'Category', 'Risk', 'Reason', 'Device', 'Outcome', 'Status', 'Reviewer', '']).map((h, i) => (
                <th key={i} className="p-2 text-start whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map(r => {
              const e = r.employee_id ? emps[r.employee_id] : undefined;
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.incident_no}</td>
                  <td className="p-2 whitespace-nowrap">{fmt(r.created_at)}</td>
                  <td className="p-2"><div>{e?.name || '—'}</div><div className="text-xs text-muted-foreground">{e?.code}</div></td>
                  <td className="p-2">{r.station_id ? stations[r.station_id] : '—'}</td>
                  <td className="p-2">{t(r.event_type)}</td>
                  <td className="p-2">{t(r.category)}</td>
                  <td className="p-2"><Badge variant={riskVariant(r.risk_level)}>{t(r.risk_level)}</Badge></td>
                  <td className="p-2 text-xs whitespace-pre-wrap break-words">{r.reasons.map(t).join('، ')}</td>
                  <td className="p-2 text-xs font-mono">{r.device_id?.slice(0, 8) || '—'}</td>
                  <td className="p-2">{t(r.outcome)}</td>
                  <td className="p-2"><Badge variant="outline">{t(r.review_status)}</Badge></td>
                  <td className="p-2 text-xs">{r.reviewer_name || '—'}</td>
                  <td className="p-2"><Button size="icon" variant="ghost" onClick={() => { setSel(r); setNotes(r.review_notes || ''); }}><Eye className="h-4 w-4" /></Button></td>
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={13} className="p-6 text-center text-muted-foreground">{ar ? 'لا توجد محاولات مسجلة' : 'No attempts recorded'}</td></tr>}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!sel} onOpenChange={o => !o && setSel(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{ar ? 'تفاصيل الحادثة' : 'Incident details'} #{sel?.incident_no}</DialogTitle></DialogHeader>
          {sel && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>{ar ? 'الفئة' : 'Category'}: <b>{t(sel.category)}</b></div>
                <div>{ar ? 'الخطورة' : 'Risk'}: <b>{t(sel.risk_level)}</b></div>
                <div>{ar ? 'النتيجة' : 'Outcome'}: <b>{t(sel.outcome)}</b></div>
                <div>{ar ? 'المصدر' : 'Source'}: <b>{sel.source}</b></div>
              </div>
              <div className="text-xs text-muted-foreground">{ar ? 'الدليل الأصلي (لا يمكن تعديله)' : 'Original evidence (read-only)'}</div>
              <pre dir="ltr" className="bg-muted p-2 rounded text-xs overflow-auto max-h-48">{JSON.stringify(sel.evidence, null, 2)}</pre>
              <Textarea placeholder={ar ? 'ملاحظات المراجعة' : 'Review notes'} value={notes} onChange={e => setNotes(e.target.value)} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void review('under_review')}>{ar ? 'بدء المراجعة' : 'Start review'}</Button>
                <Button onClick={() => void review('resolved')}>{sel.category === 'new_device' ? (ar ? 'اعتماد الجهاز وحل' : 'Approve device & resolve') : (ar ? 'حل' : 'Resolve')}</Button>
                <Button variant="destructive" onClick={() => void review('escalated')}>{ar ? 'تصعيد' : 'Escalate'}</Button>
                {sel.device_id && <Button variant="outline" onClick={() => void revokeDevice()}>{ar ? 'إلغاء الجهاز' : 'Revoke device'}</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
