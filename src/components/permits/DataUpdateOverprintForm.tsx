import { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import type { PermitFormEmployee } from './TemporaryPermitForms';

/**
 * استمارة تحديث بيانات أفراد (سنوى) – نموذج معلومات ٣/٩٩٩
 * طباعة فوق الورقة الجاهزة: تُطبع القيم فقط بمواضع بالمليمتر مطابقة لخانات الورقة (A4).
 */
const COMPANY_AR = 'شركة لينك أيرو تريدنج أجنسي';

// حدود الأسطر الأفقية للجدول (مم من أعلى الورقة) مقاسة من الورقة الأصلية
const LINES = [45.4, 59.1, 71.8, 84.2, 96.7, 109.2, 121.7, 134.3, 146.8, 159.5, 172.0, 184.6, 197.1, 209.5, 222.2, 234.5, 247.2];
const VAL_LEFT = 18.5;   // بداية خانة القيمة من اليسار
const VAL_RIGHT = 62.2;  // المسافة من يمين الورقة لبداية عمود التسميات (210 - 147.8)
const NID_LEFT = 16.6, NID_W = (147.8 - 16.6) / 14;
const MOBILE_SPLIT = 72.8; // الفاصل بين المحمول والمنزل

interface Extra { education_ar: string | null; email: string | null; home_phone: string | null; station: string | null }
interface Defaults { places: string; duration: string; purpose: string }

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const natAr = (n?: string | null) => {
  const s = (n || '').trim().toLowerCase();
  if (!s || s === 'egyptian' || s.startsWith('مصر')) return 'مصري';
  return n || '';
};

const TOP_MARGIN_MM = 10; // هامش علوي إضافي 1 سم
function pageHtml(e: PermitFormEmployee, x: Extra, d: Defaults, offIn: { x: number; y: number }, bg?: string) {
  const off = { x: offIn.x, y: offIn.y + TOP_MARGIN_MM };
  const T = 'position:absolute;font-size:12pt;font-weight:600;white-space:nowrap;overflow:hidden;line-height:1;';
  // القيمة تجلس فوق السطر المنقط (حوالي 4.5 مم فوق الحد السفلي للصف)
  const base = (row: number) => LINES[row + 1] - 4.2 + off.y;
  const field = (row: number, v: unknown, extra = '') =>
    `<div style="${T}right:${VAL_RIGHT + 2 - off.x}mm;left:${VAL_LEFT + off.x}mm;top:${base(row) - 5}mm;text-align:right;${extra}">${esc(v)}</div>`;
  const nid = String(e.national_id || '').replace(/\D/g, '').slice(0, 14).padEnd(14, ' ');
  const nidCells = nid.split('').map((c, i) =>
    `<div style="${T}left:${NID_LEFT + i * NID_W + off.x}mm;width:${NID_W}mm;top:${LINES[2] + 4 + off.y}mm;text-align:center;font-size:15pt;font-weight:700">${c.trim()}</div>`).join('');
  const residence = [e.address, e.city, e.governorate].filter(Boolean).join(' - ');
  const bgImg = bg ? `<img src="${bg}" style="position:absolute;inset:0;width:210mm;height:297mm;opacity:.35"/>` : '';
  return `
<div class="duf-page" dir="rtl" style="position:relative;width:210mm;height:297mm;overflow:hidden;background:#fff;color:#000;font-family:'Baloo Bhaijaan 2',Arial,sans-serif">
  ${bgImg}
  ${field(0, e.name_ar)}
  ${field(1, natAr(e.nationality))}
  ${nidCells}
  ${field(3, e.birth_date ? formatDate(e.birth_date) : '')}
  ${field(4, x.education_ar)}
  ${field(5, e.job_title_ar)}
  ${field(6, residence, 'font-size:10.5pt')}
  ${field(7, 'لا يوجد')}
  ${field(8, COMPANY_AR)}
  ${field(9, '10 ش الجزيرة الوسطى - الزمالك')}
  ${field(10, x.email, 'direction:ltr;text-align:right')}
  <div style="${T}right:${VAL_RIGHT + 2 - off.x}mm;left:${MOBILE_SPLIT + 2 + off.x}mm;top:${base(11) - 5}mm;direction:ltr;text-align:right">${esc(e.phone)}</div>
  <div style="${T}left:${VAL_LEFT + off.x}mm;width:${MOBILE_SPLIT - VAL_LEFT - 18}mm;top:${base(11) - 5}mm;direction:ltr;text-align:right">${esc(x.home_phone)}</div>
  ${field(12, d.places)}
  ${field(13, d.duration)}
  ${field(14, d.purpose)}
  <div style="${T}left:${19.5 + off.x}mm;width:55mm;top:${254 + off.y}mm;text-align:right;font-size:11pt">${esc(e.name_ar)}</div>
</div>`;
}

async function loadExtras(ids: string[]): Promise<Map<string, Extra>> {
  const map = new Map<string, Extra>();
  const { data: st } = await supabase.from('stations').select('id, name_ar');
  const stName = new Map((st || []).map((s: any) => [s.id, s.name_ar]));
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.from('employees')
      .select('id, education_ar, email, home_phone, station_id').in('id', ids.slice(i, i + 100));
    if (error) throw error;
    (data || []).forEach((r: any) => map.set(r.id, {
      education_ar: r.education_ar, email: r.email, home_phone: r.home_phone,
      station: r.station_id ? stName.get(r.station_id) || null : null,
    }));
  }
  return map;
}

interface Props {
  employees: PermitFormEmployee[];
  employeeById: Map<string, PermitFormEmployee>;
  airportsIssueIds: string[];
  airportsRenewIds: string[];
  scanUrl?: string;
}

export const DataUpdateOverprintForm = ({ employees, employeeById, airportsIssueIds, airportsRenewIds }: Props) => {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [extra, setExtra] = useState<Extra | null>(null);
  const [busy, setBusy] = useState(false);
  const [d, setD] = useState<Defaults>({ places: 'عموم المطارات', duration: 'سنة', purpose: 'إنهاء إجراءات الركاب' });
  const [off, setOff] = useState({ x: 0, y: 0 });
  const selected = selectedId ? employeeById.get(selectedId) : undefined;

  const toList = (ids: string[]) => ids.map(id => employeeById.get(id)).filter(Boolean) as PermitFormEmployee[];
  const issueList = useMemo(() => toList(airportsIssueIds), [airportsIssueIds, employeeById]);
  const renewList = useMemo(() => toList(airportsRenewIds), [airportsRenewIds, employeeById]);

  const pick = async (id: string) => {
    setSelectedId(id); setOpen(false);
    try { setExtra((await loadExtras([id])).get(id) || null); }
    catch { toast.error('تعذر تحميل بيانات الموظف'); }
  };

  const print = async (list: PermitFormEmployee[], label: string) => {
    if (list.length === 0) { toast.error(`لا يوجد موظفون في قائمة ${label}`); return; }
    const w = window.open('', '_blank');
    if (!w) { toast.error('يرجى السماح بالنوافذ المنبثقة للطباعة'); return; }
    setBusy(true);
    try {
      const ex = await loadExtras(list.map(e => e.id));
      const empty: Extra = { education_ar: null, email: null, home_phone: null, station: null };
      const pages = list.map(e => pageHtml(e, ex.get(e.id) || empty, d, off)).join('');
      w.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>استمارة تحديث بيانات</title>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;600;700&display=swap" rel="stylesheet">
<style>@page{size:A4;margin:0}body{margin:0}.duf-page{page-break-after:always}.duf-page:last-child{page-break-after:auto}</style>
</head><body>${pages}<script>document.fonts.ready.then(()=>setTimeout(()=>window.print(),300));</script></body></html>`);
      w.document.close();
    } catch { w.close(); toast.error('تعذر تجهيز الاستمارات للطباعة'); }
    finally { setBusy(false); }
  };

  const downloadPdf = async () => {
    if (!selected || !extra) return;
    setBusy(true);
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;left:-10000px;top:0';
    host.innerHTML = pageHtml(selected, extra, d, off);
    document.body.appendChild(host);
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(host.firstElementChild as HTMLElement, { scale: 2, backgroundColor: '#ffffff' });
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, 210, 297);
      pdf.save(`استمارة تحديث بيانات - ${selected.name_ar}.pdf`);
    } catch { toast.error('تعذر إنشاء ملف PDF'); }
    finally { host.remove(); setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">استمارة تحديث بيانات (طباعة على الورقة الجاهزة)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-80 justify-between">
                <span className="truncate">{selected ? `${selected.employee_code} - ${selected.name_ar}` : 'اختر موظفا'}</span>
                <ChevronsUpDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <Command>
                <CommandInput placeholder="بحث بالاسم أو الكود" />
                <CommandList>
                  <CommandEmpty>لا توجد نتائج</CommandEmpty>
                  <CommandGroup>
                    {employees.map(e => (
                      <CommandItem key={e.id} value={`${e.employee_code} ${e.name_ar} ${e.name_en}`} onSelect={() => pick(e.id)}>
                        {e.employee_code} - {e.name_ar}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button onClick={downloadPdf} disabled={!selected || !extra || busy} className="gap-2"><Download className="w-4 h-4" /> تحميل PDF</Button>
          <Button variant="outline" onClick={() => selected && print([selected], 'الموظف')} disabled={!selected || busy} className="gap-2"><Printer className="w-4 h-4" /> طباعة</Button>
          <Button variant="secondary" onClick={() => print(issueList, 'مطارات - استخراج')} disabled={busy} className="gap-2"><Printer className="w-4 h-4" /> طباعة الجميع (مطارات - استخراج: {issueList.length})</Button>
          <Button variant="secondary" onClick={() => print(renewList, 'مطارات - تجديد')} disabled={busy} className="gap-2"><Printer className="w-4 h-4" /> طباعة الجميع (مطارات - تجديد: {renewList.length})</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div><Label>أماكن التردد</Label><Input value={d.places} onChange={e => setD({ ...d, places: e.target.value })} /></div>
          <div><Label>مدة التردد</Label><Input value={d.duration} onChange={e => setD({ ...d, duration: e.target.value })} /></div>
          <div><Label>الغرض من التردد</Label><Input value={d.purpose} onChange={e => setD({ ...d, purpose: e.target.value })} /></div>
          <div><Label>إزاحة أفقية (مم، + لليمين)</Label><Input type="number" step="0.5" value={off.x} onChange={e => setOff({ ...off, x: Number(e.target.value) || 0 })} /></div>
          <div><Label>إزاحة رأسية (مم، + للأسفل)</Label><Input type="number" step="0.5" value={off.y} onChange={e => setOff({ ...off, y: Number(e.target.value) || 0 })} /></div>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
          ضع الاستمارة الفارغة في الطابعة واطبع بمقاس A4 بنسبة 100% (بدون «ملاءمة للصفحة»). إذا ظهرت الكتابة منحرفة عن الخانات، عدّل الإزاحة ثم أعد الطباعة.
        </p>
        {selected && extra && (
          <div className="overflow-auto border rounded-md bg-muted p-4">
            <div style={{ width: '210mm', margin: '0 auto', outline: '1px solid hsl(var(--border))' }}
              dangerouslySetInnerHTML={{ __html: pageHtml(selected, extra, d, off) }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
