import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { writeXlsxRtl } from '@/lib/xlsxRtl';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { classifyAttachment, previousPeriod, AttachmentEntry } from '@/lib/payrollAttachment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { FileText, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';

const CARGO_CODES = ['capital', 'lkcargo_alex'];

interface EmpInfo { code: string; nameAr: string; nameEn: string; jobAr: string; jobEn: string; hireDate: string | null; status: string; }

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
};
const fmtMoney = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export function PayrollAttachmentReport() {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const now = new Date();
  const [period, setPeriod] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [company, setCompany] = useState<'aero' | 'cargo'>('aero');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<AttachmentEntry[]>([]);
  const [stations, setStations] = useState<Map<string, { code: string; nameAr: string; nameEn: string }>>(new Map());
  const [emps, setEmps] = useState<Map<string, EmpInfo>>(new Map());

  const [year, month] = period.split('-');

  useEffect(() => {
    if (!year || !month) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [rows, st] = await Promise.all([
          fetchAllPages<AttachmentEntry>((from, to) =>
            supabase.from('payroll_entries')
              .select('employee_id, month, year, net_salary, station_id')
              .eq('is_published', true)
              .lte('year', year)
              .order('id', { ascending: true })
              .range(from, to) as any),
          supabase.from('stations').select('id, code, name_ar, name_en'),
        ]);
        const stMap = new Map<string, { code: string; nameAr: string; nameEn: string }>();
        (st.data || []).forEach((s: any) => stMap.set(s.id, { code: s.code, nameAr: s.name_ar, nameEn: s.name_en }));
        const p = previousPeriod(year, month);
        const ids = [...new Set(rows.filter(r => (r.year === year && r.month === month) || (r.year === p.year && r.month === p.month)).map(r => r.employee_id))];
        const empMap = new Map<string, EmpInfo>();
        for (let i = 0; i < ids.length; i += 200) {
          const { data, error } = await supabase.from('employees')
            .select('id, employee_code, name_ar, name_en, job_title_ar, job_title_en, hire_date, status')
            .in('id', ids.slice(i, i + 200));
          if (error) throw error;
          (data || []).forEach((e: any) => empMap.set(e.id, { code: e.employee_code, nameAr: e.name_ar, nameEn: e.name_en, jobAr: e.job_title_ar, jobEn: e.job_title_en, hireDate: e.hire_date, status: e.status }));
        }
        if (cancelled) return;
        setEntries(rows); setStations(stMap); setEmps(empMap);
      } catch {
        if (!cancelled) toast.error(ar ? 'تعذر تحميل بيانات الرواتب' : 'Could not load payroll data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [year, month]);

  const isCargo = (stationId: string | null) => !!stationId && CARGO_CODES.includes(stations.get(stationId)?.code || '');

  const result = useMemo(() => {
    const filtered = entries.filter(e => company === 'cargo' ? isCargo(e.station_id) : !isCargo(e.station_id));
    // "new" must be first payment ever in any company, so check prior history across all entries
    const all = classifyAttachment(entries, year, month);
    const scoped = classifyAttachment(filtered, year, month);
    const everPaidBefore = new Set(entries.filter(e => `${e.year}-${e.month}` < `${year}-${month}`).map(e => e.employee_id));
    return { ...scoped, newHires: scoped.newHires.filter(e => !everPaidBefore.has(e.employee_id)), _all: all };
  }, [entries, company, year, month, stations]);

  const prev = previousPeriod(year, month);
  const companyLabel = company === 'aero' ? (ar ? 'لينك إيرو' : 'Link Aero') : (ar ? 'لينك كارجو' : 'Link Cargo');
  const stName = (id: string | null) => { const s = id ? stations.get(id) : undefined; return s ? (ar ? s.nameAr : s.nameEn || s.nameAr) : '—'; };
  const emp = (id: string) => emps.get(id);
  const name = (id: string) => { const e = emp(id); return e ? (ar ? e.nameAr : e.nameEn || e.nameAr) : '—'; };
  const job = (id: string) => { const e = emp(id); return e ? (ar ? e.jobAr : e.jobEn || e.jobAr) || '—' : '—'; };
  const sortByCode = <T extends AttachmentEntry>(arr: T[]) => [...arr].sort((a, b) => (emp(a.employee_id)?.code || '').localeCompare(emp(b.employee_id)?.code || '', undefined, { numeric: true }));
  const newHires = sortByCode(result.newHires);
  const stopped = sortByCode(result.stopped);
  const newTotal = newHires.reduce((s, e) => s + (e.net_salary || 0), 0);
  const stoppedTotal = stopped.reduce((s, e) => s + (e.net_salary || 0), 0);
  const statusLabel = (s?: string) => {
    const m: Record<string, [string, string]> = { active: ['نشط', 'Active'], inactive: ['غير نشط', 'Inactive'], suspended: ['موقوف', 'Suspended'], external_stations: ['محطات خارجية', 'External Stations'], stopped: ['متوقف', 'Stopped'], absent: ['منقطع', 'Absent'], pending_hire: ['تحت التعيين', 'Pending Hire'], resigned: ['مستقيل', 'Resigned'], under_resignation: ['تحت الاستقالة', 'Under Resignation'] };
    return s && m[s] ? m[s][ar ? 0 : 1] : (s || '—');
  };

  const newHeaders = ar ? ['م', 'الكود', 'الاسم', 'المحطة', 'المسمى الوظيفي', 'تاريخ التعيين', 'صافي الراتب'] : ['#', 'Code', 'Name', 'Station', 'Job Title', 'Hire Date', 'Net Salary'];
  const stoppedHeaders = ar ? ['م', 'الكود', 'الاسم', 'المحطة', 'الحالة الحالية', 'صافي راتب الشهر السابق'] : ['#', 'Code', 'Name', 'Station', 'Current Status', 'Previous Net Salary'];
  const newRows = newHires.map((e, i) => [i + 1, emp(e.employee_id)?.code || '—', name(e.employee_id), stName(e.station_id), job(e.employee_id), fmtDate(emp(e.employee_id)?.hireDate || null), e.net_salary || 0]);
  const stoppedRows = stopped.map((e, i) => [i + 1, emp(e.employee_id)?.code || '—', name(e.employee_id), stName(e.station_id), statusLabel(emp(e.employee_id)?.status), e.net_salary || 0]);
  const title = `${ar ? 'مرفق المرتبات' : 'Payroll Attachment'} - ${companyLabel} - ${month}/${year}`;
  const summary = [
    [ar ? `عدد الموظفين المحوّل لهم شهر ${prev.month}/${prev.year}` : `Paid employees ${prev.month}/${prev.year}`, result.previousCount],
    [ar ? `عدد الموظفين المحوّل لهم شهر ${month}/${year}` : `Paid employees ${month}/${year}`, result.currentCount],
    [ar ? 'الفرق' : 'Difference', result.currentCount - result.previousCount],
  ];

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const sheet = (rows: any[][]) => { const ws = XLSX.utils.aoa_to_sheet(rows); if (ar) (ws as any)['!views'] = [{ RTL: true }]; return ws; };
    XLSX.utils.book_append_sheet(wb, sheet([[title], [], ...summary]), ar ? 'الملخص' : 'Summary');
    XLSX.utils.book_append_sheet(wb, sheet([newHeaders, ...newRows, ['', '', '', '', '', ar ? 'الإجمالي' : 'Total', newTotal]]), ar ? 'الموظفون الجدد' : 'New');
    XLSX.utils.book_append_sheet(wb, sheet([stoppedHeaders, ...stoppedRows, ['', '', '', '', ar ? 'الإجمالي' : 'Total', stoppedTotal]]), ar ? 'لم يحول لهم' : 'Not Paid');
    void writeXlsxRtl(wb, `${title}.xlsx`);
  };

  const printReport = () => {
    const table = (heads: string[], rows: any[][], total: number) => `<table><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td>${i === r.length - 1 ? fmtMoney(Number(c)) : c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${heads.length}">${ar ? 'لا يوجد' : 'None'}</td></tr>`}</tbody><tfoot><tr><td colspan="${heads.length - 1}">${ar ? 'الإجمالي' : 'Total'}</td><td>${fmtMoney(total)}</td></tr></tfoot></table>`;
    const html = `<html dir="${ar ? 'rtl' : 'ltr'}"><head><title>${title}</title><style>body{font-family:'Baloo Bhaijaan 2',Arial;padding:16px}table{width:100%;border-collapse:collapse;margin-bottom:18px;font-size:12px}th,td{border:1px solid #999;padding:4px 6px;text-align:center}th,tfoot td{background:#eee;font-weight:bold}h2,h3{margin:8px 0}</style></head><body>
      <h2>${title}</h2>
      <table>${summary.map(s => `<tr><th>${s[0]}</th><td>${s[1]}</td></tr>`).join('')}</table>
      <h3>${ar ? 'الموظفون الجدد (أول تحويل راتب)' : 'New employees (first salary)'} (${newRows.length})</h3>${table(newHeaders, newRows, newTotal)}
      <h3>${ar ? `حُوّل لهم الشهر السابق ولم يُحوّل لهم هذا الشهر` : 'Paid last month, not paid this month'} (${stoppedRows.length})</h3>${table(stoppedHeaders, stoppedRows, stoppedTotal)}
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  };

  const renderTable = (heads: string[], rows: any[][], total: number) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow>{heads.map(h => <TableHead key={h} className="text-center whitespace-nowrap">{h}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow><TableCell colSpan={heads.length} className="text-center text-muted-foreground">{ar ? 'لا يوجد موظفون' : 'No employees'}</TableCell></TableRow>
          ) : rows.map((r, i) => (
            <TableRow key={i}>{r.map((c, j) => <TableCell key={j} className="text-center whitespace-pre-wrap break-words">{j === r.length - 1 ? fmtMoney(Number(c)) : c}</TableCell>)}</TableRow>
          ))}
        </TableBody>
        <TableFooter><TableRow><TableCell colSpan={heads.length - 1} className="text-center font-bold">{ar ? 'الإجمالي' : 'Total'}</TableCell><TableCell className="text-center font-bold">{fmtMoney(total)}</TableCell></TableRow></TableFooter>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">{ar ? 'الشهر' : 'Month'}</label>
            <Input type="month" value={period} onChange={e => e.target.value && setPeriod(e.target.value)} className="w-44" />
          </div>
          <div className="text-sm text-muted-foreground">{ar ? `مقارنة مع ${prev.month}/${prev.year}` : `Compared with ${prev.month}/${prev.year}`}</div>
          <div className="flex gap-2 ms-auto">
            <Button variant="outline" size="sm" onClick={printReport} disabled={loading}><Printer className="w-4 h-4 me-1" />{ar ? 'طباعة' : 'Print'}</Button>
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={loading}><FileText className="w-4 h-4 me-1" />Excel</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={company} onValueChange={v => setCompany(v as 'aero' | 'cargo')} dir={isRTL ? 'rtl' : 'ltr'}>
        <TabsList>
          <TabsTrigger value="aero">{ar ? 'لينك إيرو' : 'Link Aero'}</TabsTrigger>
          <TabsTrigger value="cargo">{ar ? 'لينك كارجو' : 'Link Cargo'}</TabsTrigger>
        </TabsList>
        <TabsContent value={company} className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {summary.map(([label, val]) => (
                  <Card key={String(label)}><CardContent className="p-4"><div className="text-sm text-muted-foreground">{label}</div><div className="text-2xl font-bold">{val}</div></CardContent></Card>
                ))}
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">{ar ? 'الموظفون الجدد (أول تحويل راتب)' : 'New employees (first salary)'} ({newRows.length})</CardTitle></CardHeader>
                <CardContent>{renderTable(newHeaders, newRows, newTotal)}</CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">{ar ? 'حُوّل لهم الراتب الشهر السابق ولم يُحوّل لهم هذا الشهر' : 'Paid last month, not paid this month'} ({stoppedRows.length})</CardTitle></CardHeader>
                <CardContent>{renderTable(stoppedHeaders, stoppedRows, stoppedTotal)}</CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
