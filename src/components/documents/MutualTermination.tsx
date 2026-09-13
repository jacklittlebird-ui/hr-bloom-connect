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
import ministryLogo from '@/assets/ministry-labour-seal.png.asset.json';

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
  social_insurance_start_date?: string | null;
  resignation_date?: string | null;
  address?: string | null;
  phone?: string | null;
  contract_type?: string | null;
  departments?: { name_ar?: string | null } | null;
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

const arabicDay = (iso: string) => {
  if (!iso) return '................';
  const date = new Date(`${iso}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? '................'
    : new Intl.DateTimeFormat('ar-EG', { weekday: 'long' }).format(date);
};

const contractLabel = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized.includes('indefinite') || normalized.includes('unlimited') || normalized.includes('غير محدد')) return 'غير محدد المدة';
  if (normalized.includes('year') || normalized.includes('month') || normalized.includes('fixed') || normalized.includes('محدد')) return 'محدد المدة';
  return type;
};

interface FormState {
  agreementDate: string;
  terminationDate: string;
  firstPartyName: string;
  firstPartyTitle: string;
  firstPartyCompany: string;
  companyAddress: string;
  secondPartyJob: string;
  secondPartyNationalId: string;
  secondPartyAddress: string;
  secondPartyPhone: string;
  hireDate: string;
  socialInsuranceStartDate: string;
  contractType: string;
}

const buildHtml = (employeeName: string, f: FormState) => {
  const value = (v: string) => v ? `<b>${esc(v)}</b>` : '......................................................';
  const logoUrl = esc(ministryLogo.url);

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title> </title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin:0; padding:0; }
body { font-family:"Baloo Bhaijaan 2","Tahoma",sans-serif; direction:rtl; color:#000; background:#e5e7eb; }
.sheet { position:relative; width:210mm; height:297mm; margin:0 auto 8mm; padding:22mm 17mm 12mm; background:#fff; overflow:hidden; page-break-after:always; }
.sheet:last-child { page-break-after:auto; }
.logo { position:absolute; top:7mm; right:15mm; width:25mm; height:25mm; object-fit:contain; }
h1 { text-align:center; font-size:20px; line-height:1.3; margin:0; }
h2 { text-align:center; font-size:18px; margin:0 0 5mm; background:#f2f2f2; line-height:1.6; }
.intro,.clause { font-size:14px; line-height:1.75; text-align:justify; margin:0 0 2mm; }
.center-title { text-align:center; font-size:15px; font-weight:700; margin:2mm 0 1mm; }
.party { font-size:14px; line-height:1.8; margin:0 0 1mm; }
.page-no { position:absolute; bottom:6mm; left:0; right:0; text-align:center; font:11px Arial,sans-serif; }
.sign-grid { display:grid; grid-template-columns:1fr 1fr; gap:13mm; margin-top:5mm; }
.sign-title { font-size:14px; font-weight:700; background:#dce6f1; display:inline-block; margin-bottom:2mm; }
.sign-line { font-size:12.5px; line-height:1.7; white-space:nowrap; }
@media print { body { background:#fff; } .sheet { margin:0; } }
</style></head><body>
<div class="sheet">
  <img class="logo" src="${logoUrl}" alt="وزارة العمل" />
  <h1>نموذج</h1>
  <h2>إنهاء علاقة العمل بالتوافق بين الطرفين</h2>
  <p class="intro">إنه في يوم ${arabicDay(f.agreementDate)} الموافق ${fmt(f.agreementDate)}</p>
  <p class="intro"><b>حرر هذا الاتفاق بين كل من:</b></p>
  <p class="party"><b>الطرف الأول:</b> السيد / ${value(f.firstPartyName)} بصفته الممثل القانوني لصاحب العمل بشركة ${value(f.firstPartyCompany)}</p>
  <p class="party"><b>الطرف الثاني:</b> السيد / ${value(employeeName)} والذي يعمل لدى الطرف الأول بوظيفة ${value(f.secondPartyJob)}</p>
  <p class="intro">وبعد أن أقر الطرفان بأهليتهما القانونية الكاملة للتصرف والتعاقد اتفقا على ما يلي:</p>
  <div class="center-title">( تمهيد )</div>
  <p class="clause">يعمل الطرف الثاني لدى الطرف الأول بوظيفة ${value(f.secondPartyJob)} بعقد عمل ${value(contractLabel(f.contractType))} منذ تاريخ ${fmt(f.socialInsuranceStartDate)} ويرغب في التحلل أو التقايل من عقد العمل بالتراضي والتوافق مع صاحب العمل، وقد تلاقت إرادة الطرفين على ذلك.</p>
  <div class="center-title">( البند الأول )</div>
  <p class="clause">يعتبر التمهيد السابق جزء لا يتجزأ من هذا الاتفاق، وتسري عليه جميع أحكامه.</p>
  <div class="center-title">(البند الثاني)</div>
  <p class="clause">يقر الطرف الثاني (العامل) أن هذا الاتفاق تم بالتوافق بينه وبين الطرف الأول (صاحب العمل) بناء على طلب كتابي قدمه لجهة عمله وبإرادته الحرة دون تهديد أو إكراه.</p>
  <div class="center-title">(البند الثالث)</div>
  <p class="clause">يقر الطرفان أن آخر يوم عمل تم الاتفاق عليه هو يوم ${arabicDay(f.terminationDate)} الموافق ${fmt(f.terminationDate)}</p>
  <div class="center-title">(البند الرابع)</div>
  <p class="clause">يقر صاحب العمل بأنه يلتزم - قبل توقيع هذا الاتفاق - بتسوية كافة حقوق العامل المالية، وعلى الأخص أجره عن فترة عمله حتى آخر يوم عمل، والمقابل النقدي لرصيد إجازاته السنوية التي لم يقم بها، وأية مزايا أخرى مقررة في عقد العمل الفردي أو الجماعي أو لائحة تنظيم العمل بالمنشأة أو بمقتضى العرف.</p>
  <div class="center-title">(البند الخامس)</div>
  <p class="clause">يقر الطرف الثاني العامل بأن توقيعه على هذا الاتفاق يعتبر مخالصة وإبراء لذمة صاحب العمل من أية مستحقات مالية.</p>
  <div class="center-title">(البند السادس)</div>
  <p class="clause">يقر الطرف الأول (صاحب العمل) أو من يمثله بالتزامه بمنح العامل شهادة تتضمن تاريخ التحاقه بالعمل، وتاريخ انتهائه، ونوع العمل الذي كان يؤديه، والمزايا التي كان يحصل عليها، وذلك خلال خمسة عشر يوماً من تاريخ طلب ذلك.</p>
  <p class="clause">ويجوز بناء على طلب العامل، أن تتضمن تلك الشهادة مقدار الأجر الذي كان يتقاضاه، وسبب انتهاء علاقة العمل.</p>
  <p class="clause">كما يقر بالتزامه بأن يرد للعامل عند انتهاء علاقة العمل ما يكون قد أودعه لديه من أوراق، أو شهادات، أو أدوات، وما يفيد إخلاء طرفه، فور طلبهم.</p>
  <div class="page-no">1</div>
</div>

<div class="sheet">
  <img class="logo" src="${logoUrl}" alt="وزارة العمل" />
  <div class="center-title">(البند السابع)</div>
  <p class="clause">يعمل بأحكام هذا الاتفاق كمستند لإثبات إنهاء علاقة العمل بإرادة الطرفين ودون منازعة، وحرر من عدد من النسخ بيد كل طرف منهما نسخة للعمل بها عند اللزوم.</p>
  <div class="sign-grid">
    <div>
      <div class="sign-title">ممثل صاحب العمل أو المنشأة:</div>
      <div class="sign-line">الاسم: ${value(f.firstPartyName)}</div>
      <div class="sign-line">الوظيفة: ${value(f.firstPartyTitle)}</div>
      <div class="sign-line">اسم الشركة: ${value(f.firstPartyCompany)}</div>
      <div class="sign-line">مقر الشركة: ${value(f.companyAddress)}</div>
      <div class="sign-line">التوقيع: (............................)</div>
      <div class="sign-line">خاتم جهة العمل:</div>
    </div>
    <div>
      <div class="sign-title">العامل أو ممثله القانوني:</div>
      <div class="sign-line">الاسم: ${value(employeeName)}</div>
      <div class="sign-line">الوظيفة: ${value(f.secondPartyJob)}</div>
      <div class="sign-line">الرقم القومي: ${value(f.secondPartyNationalId)}</div>
      <div class="sign-line">العنوان: ${value(f.secondPartyAddress)}</div>
      <div class="sign-line">رقم التليفون: ${value(f.secondPartyPhone)}</div>
      <div class="sign-line">التوقيع: (............................)</div>
    </div>
  </div>
  <div class="page-no">2</div>
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
    firstPartyName: 'جاك اسحق عبد المسيح',
    firstPartyTitle: 'مدير قطاع الموارد البشرية',
    firstPartyCompany: 'لينك أيرو تريدنج أجنسي',
    companyAddress: '',
    secondPartyJob: '',
    secondPartyNationalId: '',
    secondPartyAddress: '',
    secondPartyPhone: '',
    hireDate: '',
    socialInsuranceStartDate: '',
    contractType: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all: Emp[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('employees')
          .select('id, employee_code, name_ar, name_en, gender, hire_date, job_title_ar, national_id, social_insurance_no, social_insurance_start_date, resignation_date, address, phone, contract_type')
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
      secondPartyNationalId: e.national_id || '',
      secondPartyAddress: e.address || '',
      secondPartyPhone: e.phone || '',
      hireDate: e.hire_date || '',
      socialInsuranceStartDate: e.social_insurance_start_date || '',
      contractType: e.contract_type || '',
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
            <Label className="text-xs">{isAr ? 'نوع عقد العمل' : 'Contract type'}</Label>
            <Input className="h-9 w-[220px]" value={form.contractType} onChange={e => set('contractType', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isAr ? 'الوظيفة' : 'Job title'}</Label>
            <Input className="h-9 w-[260px]" value={form.secondPartyJob} onChange={e => set('secondPartyJob', e.target.value)} />
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
