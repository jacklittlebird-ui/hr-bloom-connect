import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Printer, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Emp {
  id: string;
  employee_code: string;
  name_ar: string;
  name_en?: string | null;
  gender: string | null;
  hire_date: string | null;
  job_title_ar: string | null;
  department?: string | null;
  national_id?: string | null;
  social_insurance_no?: string | null;
  resignation_date?: string | null;
  address?: string | null;
  phone?: string | null;
}

const PAGE = 1000;

const esc = (s: string | null | undefined) =>
  (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

const fmt = (iso: string) => {
  if (!iso) return '.................';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return esc(iso);
  return `${d}/${m}/${y}`;
};

interface FormState {
  agreementDate: string;
  terminationDate: string;
  reason: string;
  firstPartyName: string;
  firstPartyTitle: string;
  firstPartyCompany: string;
  secondPartyJob: string;
  secondPartyDepartment: string;
  secondPartyInsuranceNo: string;
  secondPartyNationalId: string;
  secondPartyAddress: string;
  secondPartyPhone: string;
}

const buildHtml = (employeeName: string, f: FormState) => {
  const dotted = (v: string) => v ? esc(v) : '......................................................';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title> </title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin:0; padding:0; }
body { font-family: "Baloo Bhaijaan 2","Tahoma",sans-serif; direction:rtl; color:#000; background:#e5e7eb; }
.sheet { position:relative; width:210mm; min-height:297mm; margin:0 auto; padding:22mm 22mm 24mm; background:#fff; overflow:hidden; }
h1 { text-align:center; font-size:20px; font-weight:bold; margin:0 0 4mm; }
h2 { text-align:center; font-size:16px; font-weight:bold; margin:0 0 14mm; border:1px solid #000; padding:3mm; display:inline-block; width:100%; }
.section-title { font-weight:bold; text-decoration:underline; margin:6mm 0 3mm; font-size:15px; }
.field-row { display:flex; align-items:baseline; gap:2mm; margin-bottom:2.5mm; font-size:14px; line-height:1.6; flex-wrap:wrap; }
.field-row .label { white-space:nowrap; font-weight:600; }
.field-row .value { flex:1; border-bottom:1px dotted #000; min-width:40mm; padding:0 2mm; text-align:center; }
.clause { font-size:14px; line-height:2; text-align:justify; margin:0 0 4mm; }
.clause-title { font-weight:bold; display:block; margin-bottom:1mm; text-align:center; }
.sign-grid { display:grid; grid-template-columns:1fr 1fr; gap:10mm; margin-top:16mm; }
.sign-box { border:1px solid #000; padding:4mm; min-height:30mm; }
.sign-box-title { font-weight:bold; text-align:center; margin-bottom:8mm; font-size:14px; }
.sign-line { margin-bottom:6mm; font-size:13px; }
.footer-note { font-size:12px; text-align:center; margin-top:8mm; color:#333; }
@media print { body { background:#fff; } .sheet { margin:0; } }
</style></head><body>
<div class="sheet">
  <h1>نموذج</h1>
  <h2>إنهاء علاقة العمل بالتوافق بين الطرفين</h2>

  <p class="clause" style="text-align:center; font-weight:bold;">
    إنه في يوم ${fmt(f.agreementDate)} الموافق ${fmt(f.agreementDate)}<br>
    تم الاتفاق بين كل من:
  </p>

  <div class="section-title">أولاً: الطرف الأول (صاحب العمل / ممثله القانوني)</div>
  <div class="field-row"><span class="label">الاسم:</span><span class="value">${dotted(f.firstPartyName)}</span></div>
  <div class="field-row"><span class="label">الصفة:</span><span class="value">${dotted(f.firstPartyTitle)}</span></div>
  <div class="field-row"><span class="label">الشركة:</span><span class="value">${dotted(f.firstPartyCompany)}</span></div>

  <div class="section-title">ثانياً: الطرف الثاني (العامل)</div>
  <div class="field-row"><span class="label">الاسم:</span><span class="value">${dotted(employeeName)}</span></div>
  <div class="field-row"><span class="label">الوظيفة:</span><span class="value">${dotted(f.secondPartyJob)}</span></div>
  <div class="field-row"><span class="label">الإدارة / القسم:</span><span class="value">${dotted(f.secondPartyDepartment)}</span></div>
  <div class="field-row"><span class="label">الرقم التأميني:</span><span class="value">${dotted(f.secondPartyInsuranceNo)}</span></div>
  <div class="field-row"><span class="label">الرقم القومي:</span><span class="value">${dotted(f.secondPartyNationalId)}</span></div>
  <div class="field-row"><span class="label">العنوان:</span><span class="value">${dotted(f.secondPartyAddress)}</span></div>
  <div class="field-row"><span class="label">رقم التليفون:</span><span class="value">${dotted(f.secondPartyPhone)}</span></div>

  <div class="section-title">ثالثاً: موضوع الاتفاق</div>
  <p class="clause">
    بتاريخ ${fmt(f.terminationDate)} تم الاتفاق بين الطرفين على إنهاء علاقة العمل بينهما بالتراضي، دون أي إكراه أو ضغط، وبناءً على رغبة الطرفين المشتركة، وذلك اعتباراً من ${fmt(f.terminationDate)}.
  </p>
  <div class="field-row"><span class="label">سبب إنهاء العلاقة:</span><span class="value">${dotted(f.reason)}</span></div>

  <div class="section-title">رابعاً: البنود</div>
  <p class="clause">
    <span class="clause-title">البند الأول (التزامات العامل)</span>
    يقر الطرف الثاني (العامل) بأنه تسلم كافة مستحقاته المالية وعينية، وأنه لا يوجد لديه أي مستحقات مالية أو عينية أخرى على الشركة حتى تاريخ ${fmt(f.terminationDate)}، وأنه قام بتسليم كافة الأصول والممتلكات والمستندات والأدوات والمعدات التابعة للشركة.
  </p>
  <p class="clause">
    <span class="clause-title">البند الثاني (التزامات صاحب العمل)</span>
    يقر الطرف الأول (صاحب العمل) بأنه قام بتصفية كافة حقوق العامل المالية المستحقة له حتى تاريخ ${fmt(f.terminationDate)}، وعلى الأخص راتبه وأجره وبدلاته ومكافآته ومستحقات نهاية الخدمة القانونية.
  </p>
  <p class="clause">
    <span class="clause-title">البند الثالث (إبراء الذمة المتبادل)</span>
    بمجرد توقيع هذا الاتفاق، يعتبر الطرفان قد أبرآ ذمتيهما متبادلين من أي التزامات أو مطالبات قد تنشأ عن عقد العمل أو إنهائه، باستثناء ما نص عليه صراحةً في هذا الاتفاق.
  </p>
  <p class="clause">
    <span class="clause-title">البند الرابع (سرية المعلومات)</span>
    يلتزم الطرف الثاني بموجب هذا الاتفاق بالحفاظ على سرية المعلومات والبيانات الخاصة بالشركة وعملائها، وألا يفصح عنها لأي طرف ثالث.
  </p>
  <p class="clause">
    <span class="clause-title">البند الخامس (القانون الواجب التطبيق)</span>
    يخضع هذا الاتفاق لأحكام قانون العمل المصري رقم 12 لسنة 2003 وتعديلاته، ويعتبر هذا الاتفاق نافذاً من تاريخ توقيعه.
  </p>

  <div class="section-title">خامساً: التوقيعات</div>
  <div class="sign-grid">
    <div class="sign-box">
      <div class="sign-box-title">الطرف الأول<br>صاحب العمل / ممثله القانوني</div>
      <div class="sign-line">الاسم: ${dotted(f.firstPartyName)}</div>
      <div class="sign-line">التوقيع: ...............................</div>
      <div class="sign-line">التاريخ: ${fmt(f.agreementDate)}</div>
    </div>
    <div class="sign-box">
      <div class="sign-box-title">الطرف الثاني<br>العامل</div>
      <div class="sign-line">الاسم: ${dotted(employeeName)}</div>
      <div class="sign-line">التوقيع: ...............................</div>
      <div class="sign-line">التاريخ: ${fmt(f.agreementDate)}</div>
    </div>
  </div>

  <div class="footer-note">
    هذا الاتفاق أُعد بموجب قانون العمل المصري ويُعتبر وثيقة رسمية لإنهاء علاقة العمل بالتراضي.
  </div>
</div>
</body></html>`;
};

export const MutualTermination = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const today = new Date().toISOString().split('T')[0];

  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<FormState>({
    agreementDate: today,
    terminationDate: today,
    reason: '',
    firstPartyName: 'جاك اسحق عبد المسيح',
    firstPartyTitle: 'مدير قطاع الموارد البشرية',
    firstPartyCompany: 'لينك آيرو تريدنج إجنيسي',
    secondPartyJob: '',
    secondPartyDepartment: '',
    secondPartyInsuranceNo: '',
    secondPartyNationalId: '',
    secondPartyAddress: '',
    secondPartyPhone: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all: Emp[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('employees')
          .select('id, employee_code, name_ar, name_en, gender, hire_date, job_title_ar, national_id, social_insurance_no, resignation_date, address, phone, departments:department_id(name_ar)')
          .order('employee_code')
          .range(from, from + PAGE - 1);
        if (error || !data?.length) break;
        all.push(...(data as unknown as Emp[]));
        if (data.length < PAGE) break;
      }
      if (!cancelled) { setEmployees(all); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(() => employees.find(e => e.id === selectedId) || null, [employees, selectedId]);

  const pick = (e: Emp) => {
    setSelectedId(e.id);
    setOpen(false);
    setForm(f => ({
      ...f,
      agreementDate: today,
      terminationDate: e.resignation_date || today,
      secondPartyJob: e.job_title_ar || '',
      secondPartyDepartment: (e as any).departments?.name_ar || '',
      secondPartyInsuranceNo: e.social_insurance_no || '',
      secondPartyNationalId: e.national_id || '',
      secondPartyAddress: e.address || '',
      secondPartyPhone: e.phone || '',
    }));
  };

  const html = selected ? buildHtml(selected.name_ar, form) : '';

  const print = () => {
    if (!html) return;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 600);
  };

  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{isAr ? 'اسم الموظف' : 'Employee'}</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" className="h-9 w-[320px] justify-between font-normal" disabled={loading}>
                  <span className="truncate">
                    {loading ? (isAr ? 'جاري التحميل...' : 'Loading...') : selected ? `${selected.employee_code} — ${selected.name_ar}` : (isAr ? 'ابحث بالاسم أو الكود...' : 'Search by name or code...')}
                  </span>
                  <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={isAr ? 'بحث عن موظف...' : 'Search employee...'} />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>{isAr ? 'لا توجد نتائج' : 'No results'}</CommandEmpty>
                    <CommandGroup>
                      {employees.map(e => (
                        <CommandItem key={e.id} value={`${e.name_ar} ${e.employee_code}`} onSelect={() => pick(e)}>
                          <Check className={cn('me-2 h-4 w-4', selectedId === e.id ? 'opacity-100' : 'opacity-0')} />
                          <span className="truncate">{e.employee_code} — {e.name_ar}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isAr ? 'تاريخ الاتفاق' : 'Agreement date'}</Label>
            <Input type="date" className="h-9 w-[170px]" value={form.agreementDate} onChange={e => set('agreementDate', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isAr ? 'تاريخ إنهاء العلاقة' : 'Termination date'}</Label>
            <Input type="date" className="h-9 w-[170px]" value={form.terminationDate} onChange={e => set('terminationDate', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isAr ? 'سبب الإنهاء' : 'Reason'}</Label>
            <Input className="h-9 w-[260px]" value={form.reason} onChange={e => set('reason', e.target.value)} placeholder={isAr ? 'اختياري' : 'Optional'} />
          </div>

          <Button onClick={print} disabled={!selected} className="gap-2">
            <Printer className="h-4 w-4" />{isAr ? 'طباعة / PDF' : 'Print / PDF'}
          </Button>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardContent className="p-0">
            <iframe title="mutual-termination-preview" className="w-full h-[80vh] rounded-md bg-white" srcDoc={html} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
