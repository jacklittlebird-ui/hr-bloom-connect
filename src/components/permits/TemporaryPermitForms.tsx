import { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

export interface PermitFormEmployee {
  id: string;
  employee_code: string;
  name_ar: string;
  name_en: string;
  permit_name_en?: string | null;
  job_title_ar: string | null;
  job_title_en: string | null;
  nationality: string | null;
  birth_date: string | null;
  birth_governorate: string | null;
  national_id: string | null;
  governorate: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
}

interface Extra { gender: string | null; avatar: string | null }

const COMPANY_AR = 'لينك أيرو تريدنج أجنسي';
const COMPANY_EN = 'Link Aero Trading Agency';

const genderAr = (g?: string | null) => {
  const s = (g || '').toLowerCase();
  if (s === 'male' || s === 'ذكر') return 'ذكر';
  if (s === 'female' || s === 'أنثى' || s === 'انثى') return 'أنثى';
  return g || '';
};
const natAr = (n?: string | null) => {
  const s = (n || '').trim().toLowerCase();
  if (!s || s === 'egyptian' || s === 'مصري' || s === 'مصرى' || s === 'مصرية') return 'مصري';
  return n || '';
};
const natEn = (n?: string | null) => {
  const s = (n || '').trim().toLowerCase();
  if (!s || s === 'egyptian' || s.startsWith('مصر')) return 'Egyptian';
  return /[a-z]/i.test(n || '') ? (n as string) : '';
};

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const NAVY = '#1f3a68';

function formHtml(e: PermitFormEmployee, x: Extra) {
  const box = (v: unknown, extra = '') =>
    `<div style="border:1.5px solid ${NAVY};border-radius:3px;height:30px;display:flex;align-items:center;padding:0 8px;font-size:13px;font-weight:600;${extra}">${esc(v)}</div>`;
  const lbl = (t: string, size = 14) => `<div style="font-weight:700;font-size:${size}px;white-space:nowrap">${t}</div>`;
  const row = (label: string, content: string) =>
    `<div style="display:grid;grid-template-columns:110px 1fr;gap:10px;align-items:center;margin-bottom:8px">${lbl(label)}${content}</div>`;
  const pair = (a: unknown, midLabel: string, b: unknown) =>
    `<div style="display:grid;grid-template-columns:1fr 95px 1fr;gap:8px;align-items:center">${box(a)}<div style="font-size:11px;font-weight:700;text-align:center">${midLabel}</div>${box(b)}</div>`;
  const header = (t: string) =>
    `<div style="background:${NAVY};color:#fff;text-align:center;font-weight:700;font-size:13px;padding:5px;margin:18px 0 14px">${t}</div>`;
  const photo = x.avatar
    ? `<img src="${esc(x.avatar)}" style="width:100%;height:100%;object-fit:cover" crossorigin="anonymous"/>`
    : '';
  return `
<div class="tpf-page" dir="rtl" style="width:794px;height:1123px;box-sizing:border-box;padding:48px 52px;background:#fff;color:#111;font-family:'Baloo Bhaijaan 2',Arial,sans-serif">
  <div style="border-top:2px solid ${NAVY};border-bottom:2px solid ${NAVY};text-align:center;padding:6px 0;font-size:22px;font-weight:800;color:${NAVY}">نموذج بيان موظف للتصاريح المؤقتة</div>
  ${header('البيانات الشخصية')}
  <div style="display:grid;grid-template-columns:1fr 130px;gap:14px">
    <div>
      ${row('الاسم بالعربية', box(e.name_ar))}
      ${row('الاسم بالانجليزية', box(e.permit_name_en || e.name_en, 'direction:ltr;justify-content:flex-end'))}
      ${row('النوع', pair(genderAr(x.gender), 'تاريخ الميلاد', e.birth_date ? formatDate(e.birth_date) : ''))}
      ${row('الجنسية بالعربية', pair(natAr(e.nationality), 'الجنسية بالانجليزية', natEn(e.nationality)))}
      ${row('محل الميلاد', pair(e.birth_governorate, 'محافظة الميلاد', e.birth_governorate))}
      ${row('الرقم القومي', box(e.national_id, 'letter-spacing:2px'))}
      ${row('محافظة الاقامة', pair(e.governorate, 'قسم / مركز', e.city))}
      ${row('محل الاقامة', box(e.address, 'font-size:12px'))}
    </div>
    <div>
      <div style="border:1.5px solid ${NAVY};height:200px;overflow:hidden">${photo}</div>
      <div style="font-size:10px;text-align:center;margin-top:4px">صورة شخصية ٤ × ٦</div>
    </div>
  </div>
  ${header('البيانات الوظيفية')}
  <div style="width:calc(100% - 144px)">
    ${row('اسم الشركة بالعربية', box(COMPANY_AR))}
    ${row('اسم الشركة بالانجليزية', box(COMPANY_EN, 'direction:ltr;justify-content:flex-end'))}
    ${row('المهنة بالعربية', box(e.job_title_ar))}
    ${row('المهنة بالانجليزية', box(e.job_title_en, 'direction:ltr;justify-content:flex-end'))}
    ${row('رقم الهاتف', box(e.phone, 'direction:ltr;justify-content:flex-end'))}
  </div>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:30px">
    <div style="text-align:center">
      <div style="font-weight:700;font-size:14px;margin-bottom:8px">ختم الشركة</div>
      <div style="width:80px;height:80px;border:2px solid ${NAVY};border-radius:50%;margin:auto"></div>
    </div>
    <div style="margin-top:40px;margin-left:120px;font-weight:700">يعتمد / ..................................</div>
  </div>
</div>`;
}

async function loadExtras(ids: string[]): Promise<Map<string, Extra>> {
  const map = new Map<string, Extra>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase.from('employees').select('id, gender, avatar').in('id', ids.slice(i, i + 100));
    if (error) throw error;
    (data || []).forEach((r: any) => map.set(r.id, { gender: r.gender, avatar: r.avatar }));
  }
  return map;
}

interface Props {
  employees: PermitFormEmployee[];
  airportsIssueIds: string[];
  employeeById: Map<string, PermitFormEmployee>;
}

export const TemporaryPermitForms = ({ employees, airportsIssueIds, employeeById }: Props) => {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const holder = useRef<HTMLDivElement>(null);
  const selected = selectedId ? employeeById.get(selectedId) : undefined;

  const airportEmployees = useMemo(
    () => airportsIssueIds.map(id => employeeById.get(id)).filter(Boolean) as PermitFormEmployee[],
    [airportsIssueIds, employeeById],
  );

  const pick = async (id: string) => {
    setSelectedId(id); setOpen(false);
    const emp = employeeById.get(id);
    if (!emp) return;
    try {
      const ex = await loadExtras([id]);
      setPreview(formHtml(emp, ex.get(id) || { gender: null, avatar: null }));
    } catch { toast.error('تعذر تحميل بيانات الموظف'); }
  };

  const downloadPdf = async () => {
    if (!selected || !holder.current) return;
    setBusy(true);
    try {
      await document.fonts.ready;
      const page = holder.current.querySelector('.tpf-page') as HTMLElement;
      const canvas = await html2canvas(page, { scale: 1.6, backgroundColor: '#ffffff', useCORS: true });
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', 0, 0, 210, 297);
      pdf.save(`نموذج بيان موظف للتصاريح المؤقتة - ${selected.name_ar}.pdf`);
    } catch { toast.error('تعذر إنشاء ملف PDF'); }
    finally { setBusy(false); }
  };

  const printForms = async (list: PermitFormEmployee[]) => {
    if (list.length === 0) { toast.error('لا يوجد موظفون في قائمة مطارات - استخراج'); return; }
    const w = window.open('', '_blank');
    if (!w) { toast.error('يرجى السماح بالنوافذ المنبثقة للطباعة'); return; }
    setBusy(true);
    try {
      const ex = await loadExtras(list.map(e => e.id));
      const pages = list.map(e => formHtml(e, ex.get(e.id) || { gender: null, avatar: null })).join('');
      w.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>نماذج بيان موظف للتصاريح المؤقتة</title>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>@page{size:A4;margin:0}body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.tpf-page{page-break-after:always;overflow:hidden}.tpf-page:last-child{page-break-after:auto}</style>
</head><body>${pages}<script>document.fonts.ready.then(()=>setTimeout(()=>{window.print();},300));</script></body></html>`);
      w.document.close();
    } catch { w.close(); toast.error('تعذر تجهيز النماذج للطباعة'); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">نموذج بيان موظف للتصاريح المؤقتة</CardTitle>
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
          <Button onClick={downloadPdf} disabled={!selected || busy} className="gap-2">
            <Download className="w-4 h-4" /> تحميل PDF
          </Button>
          <Button variant="outline" onClick={() => selected && printForms([selected])} disabled={!selected || busy} className="gap-2">
            <Printer className="w-4 h-4" /> طباعة
          </Button>
          <Button variant="secondary" onClick={() => printForms(airportEmployees)} disabled={busy} className="gap-2">
            <Printer className="w-4 h-4" /> طباعة الجميع (مطارات - استخراج: {airportEmployees.length})
          </Button>
        </div>
        {preview && (
          <div className="overflow-auto border rounded-md bg-muted p-4">
            <div ref={holder} style={{ width: 794, margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
