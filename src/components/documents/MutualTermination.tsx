import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import ministryLogo from '@/assets/ministry-labour-logo-v2.png.asset.json';

const ASSET_ORIGIN = 'https://hr-bloom-connect.lovable.app';
const LOGO_URL = new URL(ministryLogo.url, ASSET_ORIGIN).href;

interface MutualTerminationProps {
  employee: Employee;
}

interface Emp {
  id: string;
  employee_code: string;
  name_ar: string;
  national_id: string | null;
  address: string | null;
  phone: string | null;
  hire_date: string | null;
  resignation_date: string | null;
  job_title_ar: string | null;
  contract_type: string | null;
}

const esc = (s: string | null | undefined) =>
  (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

const dots = (n = 40) => '.'.repeat(n);

const fmt = (iso: string | null | undefined, n = 24) => {
  if (!iso) return dots(n);
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return esc(iso);
  return `${d}/${m}/${y}`;
};

const AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const dayName = (iso: string | null | undefined) => {
  if (!iso) return dots(14);
  const dt = new Date(`${iso}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? dots(14) : AR_DAYS[dt.getDay()];
};

const line = (v: string | null | undefined, n = 40) => `<span class="fill">${esc(v) || dots(n)}</span>`;

const toInternalEmp = (employee: Employee): Emp => ({
  id: employee.id,
  employee_code: employee.employeeId,
  name_ar: employee.nameAr,
  national_id: employee.nationalId || null,
  address: employee.address || null,
  phone: employee.phone || null,
  hire_date: employee.hireDate || null,
  resignation_date: employee.resignationDate || null,
  job_title_ar: employee.jobTitleAr || null,
  contract_type: employee.contractType || null,
});

interface FormState {
  agreementDate: string;
  lastWorkDate: string;
  jobTitle: string;
  contractType: string;
  hireDate: string;
  nationalId: string;
  address: string;
  phone: string;
  copies: string;
  employerRepName: string;
  employerRepTitle: string;
  companyName: string;
  companyAddress: string;
}

const signatures = (e: Emp, f: FormState) => `
  <div class="sig">
    <div class="sig-col">
      <div class="sig-head">مقدمه لسيادتكم :</div>
      <div>الاسم: ${line(e.name_ar, 28)}</div>
      <div>الوظيفة: ${line(f.jobTitle, 26)}</div>
      <div>الرقم القومي: ${line(f.nationalId, 22)}</div>
      <div>العنوان: ${line(f.address, 26)}</div>
      <div>رقم التليفون: ${line(f.phone, 22)}</div>
      <div>(التوقيع) ${dots(24)}</div>
    </div>
    <div class="sig-col">
      <div class="sig-head">ممثل جهة الإدارة :</div>
      <div>الاسم: ${line(f.employerRepName, 28)}</div>
      <div>الوظيفة: ${line(f.employerRepTitle, 26)}</div>
      <div>اسم الشركة: ${line(f.companyName, 22)}</div>
      <div>مقر الشركة: ${line(f.companyAddress, 22)}</div>
      <div>(التوقيع) ${dots(24)}</div>
      <div>خاتم جهة العمل : ${dots(16)}</div>
    </div>
  </div>`;

const buildHtml = (e: Emp, f: FormState) => `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title> </title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin:0; padding:0; }
body { font-family:"Baloo Bhaijaan 2","Tahoma",sans-serif; direction:rtl; color:#000; background:#fff; font-size:15.5px; }
.page { width:210mm; height:297mm; margin:0 auto; padding:7mm 13mm 5mm; background:#fff; overflow:hidden; display:flex; flex-direction:column; }
.logo-bar { text-align:right; }
.logo-bar img { width:22mm; height:22mm; object-fit:contain; }
h1 { text-align:center; font-size:21px; font-weight:700; margin:1mm 0 0.8mm; }
h2 { text-align:center; font-size:19px; font-weight:700; margin:0 0 2.5mm; text-decoration:underline; }
p { margin:1.2mm 0; line-height:1.48; font-size:15.5px; text-align:justify; }
.clause { font-weight:700; text-align:center; margin:2mm 0 0.8mm; font-size:17px; }
.fill { font-weight:700; }
.content { flex:1; }
.sig { display:flex; justify-content:space-between; gap:8mm; margin-top:3mm; font-size:14.5px; line-height:1.65; border-top:1px solid #000; padding-top:2mm; }
.sig-col { width:48%; }
.sig-head { font-weight:700; margin-bottom:0.8mm; }
.pno { text-align:center; font-size:13px; margin-top:1mm; }
@media screen { body { background:#eee; } .page { margin:8px auto; box-shadow:0 1px 5px #aaa; } }
@media print { .page { margin:0; box-shadow:none; page-break-after:always; } .page:last-child { page-break-after:auto; } }
</style></head><body>

<div class="page">
  <div class="logo-bar"><img src="${LOGO_URL}" alt=""></div>
  <div class="content">
    <h1>نموذج</h1>
    <h2>إنهاء علاقة العمل بالتوافق بين الطرفين</h2>
    <p>إنه في يوم ${line(dayName(f.agreementDate), 14)} الموافق ${line(fmt(f.agreementDate), 20)}</p>
    <p><b>حرر هذا الاتفاق بين كل من:</b></p>
    <p><b>الطرف الأول:</b> السيد / ${line(f.employerRepName, 30)} بصفته الممثل القانوني لصاحب العمل بشركة ${line(f.companyName, 30)}</p>
    <p><b>الطرف الثاني:</b> السيد / ${line(e.name_ar, 30)} والذي يعمل لدى الطرف الأول بوظيفة ${line(f.jobTitle, 26)}</p>
    <p>وبعد أن أقر الطرفان بأهليتهما القانونية الكاملة للتصرف والتعاقد اتفقا على ما يلي:</p>

    <div class="clause">(تمهيد)</div>
    <p>يعمل الطرف الثاني لدى الطرف الأول بوظيفة ${line(f.jobTitle, 26)} بعقد عمل ${line(f.contractType, 20)} (محدد المدة / غير محدد المدة) منذ تاريخ ${line(fmt(f.hireDate), 20)}، ويرغب في التحلل من عقد العمل بالتراضي والتوافق مع صاحب العمل، وقد تلاقت إرادة الطرفين على ذلك.</p>

    <div class="clause">(البند الأول)</div>
    <p>يعتبر التمهيد السابق جزء لا يتجزأ من هذا الاتفاق، وتسري عليه جميع أحكامه.</p>

    <div class="clause">(البند الثاني)</div>
    <p>يقر الطرف الثاني (العامل) أن هذا الاتفاق تم بالتوافق بينه وبين الطرف الأول (صاحب العمل) بناءً على طلب كتابي قدمه لجهة عمله وبإرادته الحرة دون تهديد أو إكراه.</p>

    <div class="clause">(البند الثالث)</div>
    <p>يقر الطرفان أن آخر يوم عمل تم الاتفاق عليه هو يوم ${line(dayName(f.lastWorkDate), 12)} الموافق ${line(fmt(f.lastWorkDate), 20)}.</p>

    <div class="clause">(البند الرابع)</div>
    <p>يقر صاحب العمل بأنه يلتزم - قبل توقيع هذا الاتفاق - بتسوية كافة حقوق العامل المالية، وعلى الخصوص أجره عن فترة عمله حتى آخر يوم عمل، والمقابل النقدي لرصيد أجازاته السنوية التي لم يقم بها، وأية مزايا أخرى مقررة في عقد العمل الفردي أو الجماعي أو لائحة تنظيم العمل بالمنشأة أو بمقتضى العرف.</p>

    <div class="clause">(البند الخامس)</div>
    <p>يقر الطرف الثاني العامل بأن توقيعه على هذا الاتفاق يعتبر مخالصة وإبراء ذمة صاحب العمل من أية مستحقات مالية.</p>
  </div>
  ${signatures(e, f)}
  <div class="pno">1</div>
</div>

<div class="page">
  <div class="logo-bar"><img src="${LOGO_URL}" alt=""></div>
  <div class="content">
    <div class="clause">(البند السادس)</div>
    <p>يقر الطرف الأول (صاحب العمل) أو من يمثله بالتزامه بمنح العامل شهادة تتضمن تاريخ التحاقه بالعمل، وتاريخ انتهائه، ونوع العمل الذي كان يؤديه، والمزايا التي كان يحصل عليها، وذلك خلال خمسة عشر يوماً من تاريخ طلب ذلك.</p>
    <p>ويجوز بناءً على طلب العامل، أن تتضمن تلك الشهادة مقدار الأجر الذي كان يتقاضاه، وسبب انتهاء علاقة العمل.</p>
    <p>كما يقر بالتزامه بأن يرد للعامل عند إنهاء علاقة العمل ما يكون قد أودعه لديه من أوراق، أو شهادات، أو أدوات، وما يفيد إخلاء طرفه، فور طلبها.</p>

    <div class="clause">(البند السابع)</div>
    <p>يعمل بأحكام هذا الاتفاق كمستند لإثبات إنهاء علاقة العمل بإرادة الطرفين ودون منازعة، وحرر من عدد ${line(f.copies, 8)} نسخ بيد كل طرف منهما نسخة للعمل بها عند اللزوم.</p>
  </div>
  ${signatures(e, f)}
  <div class="pno">2</div>
</div>
</body></html>`;

export const MutualTermination = ({ employee }: MutualTerminationProps) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const emp = useMemo(() => toInternalEmp(employee), [employee]);
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<FormState>({
    agreementDate: today,
    lastWorkDate: emp.resignation_date || today,
    jobTitle: emp.job_title_ar || '',
    contractType: emp.contract_type || '',
    hireDate: emp.hire_date || '',
    nationalId: emp.national_id || '',
    address: emp.address || '',
    phone: emp.phone || '',
    copies: '2',
    employerRepName: 'جاك إسحق عبد المسيح',
    employerRepTitle: 'مدير الموارد البشرية',
    companyName: 'لينك آيرو تريدنج إجنسي',
    companyAddress: '10 ش الجزيرة الوسطى – الزمالك – القاهرة',
  });

  const html = useMemo(() => buildHtml(emp, form), [emp, form]);

  const print = () => {
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
    }, 800);
  };

  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      <Card>
        <CardContent className={cn('p-4 flex flex-wrap items-end gap-3', isAr ? 'flex-row' : 'flex-row-reverse')}>
          <div className="space-y-1">
            <Label className="text-xs font-bold">{isAr ? 'الموظف' : 'Employee'}</Label>
            <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm min-w-[280px]">
              {emp.employee_code} — {emp.name_ar}
            </div>
          </div>

          <div className="space-y-1"><Label className="text-xs">{isAr ? 'تاريخ الاتفاق' : 'Agreement date'}</Label><Input type="date" className="h-9 w-[170px]" value={form.agreementDate} onChange={e => set('agreementDate', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'آخر يوم عمل' : 'Last working day'}</Label><Input type="date" className="h-9 w-[170px]" value={form.lastWorkDate} onChange={e => set('lastWorkDate', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'المسمى الوظيفي' : 'Job title'}</Label><Input className="h-9 w-[200px]" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'نوع العقد' : 'Contract type'}</Label><Input className="h-9 w-[180px]" value={form.contractType} onChange={e => set('contractType', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'تاريخ التعيين' : 'Hire date'}</Label><Input type="date" className="h-9 w-[170px]" value={form.hireDate} onChange={e => set('hireDate', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'الرقم القومي' : 'National ID'}</Label><Input className="h-9 w-[160px]" value={form.nationalId} onChange={e => set('nationalId', e.target.value.replace(/\D/g, '').slice(0, 14))} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'العنوان' : 'Address'}</Label><Input className="h-9 w-[240px]" value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'الهاتف' : 'Phone'}</Label><Input className="h-9 w-[150px]" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'عدد النسخ' : 'Copies'}</Label><Input className="h-9 w-[90px]" value={form.copies} onChange={e => set('copies', e.target.value)} /></div>

          <Button onClick={print} className="gap-2">
            <Printer className="h-4 w-4" />{isAr ? 'طباعة / PDF' : 'Print / PDF'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <iframe title="mutual-preview" className="w-full h-[80vh] rounded-md bg-white" srcDoc={html} />
        </CardContent>
      </Card>
    </div>
  );
};
