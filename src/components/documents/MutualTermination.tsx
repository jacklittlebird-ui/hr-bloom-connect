import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  social_insurance_start_date: string | null;
  resignation_date: string | null;
  job_title_ar: string | null;
  contract_type: string | null;
}

const esc = (s: string | null | undefined) =>
  (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

const fmt = (iso: string) => {
  if (!iso) return '......./......./.................';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return esc(iso);
  return `${d}/${m}/${y}`;
};

const dots = (n = 60) => '.'.repeat(n);

const line = (v: string | null | undefined, n = 60) => `<span class="fill">${esc(v) || dots(n)}</span>`;

const nidBoxes = (v: string | null | undefined) => {
  const d = (v || '').replace(/\D/g, '').slice(0, 14);
  const cells = Array.from({ length: 14 }, (_, i) => d[i] || '');
  return `<span class="boxes">${cells.map(c => `<span class="box">${c}</span>`).join('')}</span>`;
};

const toInternalEmp = (employee: Employee): Emp => ({
  id: employee.id,
  employee_code: employee.employeeId,
  name_ar: employee.nameAr,
  national_id: employee.nationalId || null,
  address: employee.address || null,
  phone: employee.phone || null,
  hire_date: employee.hireDate || null,
  social_insurance_start_date: employee.socialInsuranceStartDate || null,
  resignation_date: employee.resignationDate || null,
  job_title_ar: employee.jobTitleAr || null,
  contract_type: employee.contractType || null,
});

interface FormState {
  lastWorkDate: string;
  terminationDate: string;
  jobTitle: string;
  address: string;
  phone: string;
  nationalId: string;
  hireDate: string;
  socialInsuranceStartDate: string;
  entitlements: string;
  copies: string;
}

const buildHtml = (e: Emp, f: FormState, today: string) => `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title> </title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin:0; padding:0; }
body { font-family: "Baloo Bhaijaan 2","Tahoma",sans-serif; direction:rtl; color:#000; background:#fff; }
.page { width:210mm; min-height:297mm; margin:0 auto; padding:20mm 16mm 18mm; position:relative; background:#fff; }
.header { display:flex; align-items:flex-start; justify-content:space-between; }
.logo { width:64px; height:auto; }
h1 { flex:1; text-align:center; font-size:16px; font-weight:bold; line-height:1.8; }
h2 { text-align:center; font-size:15px; font-weight:bold; margin:14px 0 10px; text-decoration:underline; }
p { margin:5px 0; line-height:1.8; font-size:13.5px; text-align:justify; }
.section { margin:10px 0; }
.section-title { font-weight:bold; text-align:center; margin:10px 0; font-size:14px; }
.boxes { display:inline-flex; direction:ltr; margin:4px 0; }
.box { width:18px; height:22px; border:1px solid #000; margin-inline-start:-1px; text-align:center; line-height:21px; font-size:12px; }
.fill { font-weight:bold; }
.two-col { display:flex; justify-content:space-between; gap:16px; margin:8px 0; }
.two-col > div { width:48%; }
.signatures { margin-top:28px; display:flex; justify-content:space-between; font-weight:bold; }
.signatures > div { width:45%; }
.line { margin-top:14px; }
</style></head><body>
<div class="page">
  <div class="header">
    <div style="text-align:center; flex:1;">
      <div style="font-weight:bold; font-size:15px;">شركة لينك آيرو تريدنج إجنسي</div>
      <div style="font-size:11px;">10 ش الجزيرة الوسطى – الزمالك – القاهرة</div>
    </div>
  </div>

  <h2>إنهاء علاقة عمل بالتراضي</h2>

  <div class="section">
    <p><b>الطرف الأول:</b> شركة لينك آيرو تريدنج إجنسي، ويمثلها في هذا العقد السيد/ جاك إسحق عبد المسيح، بصفته المدير المسؤول عن الموارد البشرية بالشركة.</p>
    <p><b>الطرف الثاني:</b> السيد/ ${line(e.name_ar)}</p>
    <p>الرقم القومي: ${nidBoxes(f.nationalId)}</p>
    <p>العنوان: ${line(f.address)}</p>
    <p>رقم الهاتف: ${line(f.phone)}</p>
  </div>

  <div class="section">
    <div class="section-title">البند الأول: تمهيد</div>
    <p>حيث سبق وانعقدت علاقة عمل بين الطرفين بتاريخ ${fmt(f.hireDate)} بموجب ععمل ${line(e.contract_type)}، حيث كان الطرف الثاني يعمل لدى الطرف الأول في وظيفة ${line(f.jobTitle)}.</p>
  </div>

  <div class="section">
    <div class="section-title">البند الثاني: إرادة حرة</div>
    <p>اتفق الطرفان بالتراضي على إنهاء علاقة العمل بينهما دون إكراه أو ضغط من أي طرف، ويُعد هذا التوقيع استقالة نهائية من الطرف الثاني وموافقة صريحة من الطرف الأول.</p>
  </div>

  <div class="section">
    <div class="section-title">البند الثالث: آخر يوم عمل</div>
    <p>يُعتبر يوم ${fmt(f.lastWorkDate)} هو آخر يوم عمل فعلي للطرف الثاني لدى الطرف الأول، ويتعهد الطرف الثاني بتسليم كافة العهدة والممتلكات والمستندات والبريد الإلكتروني الخاص بالشركة.</p>
  </div>

  <div class="section">
    <div class="section-title">البند الرابع: تسوية الحقوق</div>
    <p>اتفق الطرفان على أنه قد تم تسوية كافة حقوق الطرف الثاني المالية والقانونية المستحقة عن فترة عمله حتى تاريخ ${fmt(f.terminationDate)}، بما فيها الأجر والإجازات والمكافآت والتعويضات المستحقة، وأن الطرف الثاني لا يملك أي مطالبة مالية أو قانونية أخرى مستقبلية على الطرف الأول.</p>
    <p>ملاحظات إضافية: ${line(f.entitlements, 100)}</p>
  </div>

  <div class="section">
    <div class="section-title">البند الخامس: مخالصة</div>
    <p>بموجب هذا العقد، يُبرئ الطرف الثاني الطرف الأول من أي مسؤولية أو مطالبة قانونية أو مالية ناشئة عن فترة عمله، ويؤكد الطرف الثاني بأنه استلم جميع مستحقاته كاملة.</p>
  </div>

  <div class="section">
    <div class="section-title">البند السادس: شهادة إنهاء وختم</div>
    <p>يعطي الطرف الأول للطرف الثاني شهادة إنهاء خدماته حسب النماذج المعتمدة لدى الجهات المختصة، وذلك اعتبارًا من ${fmt(f.terminationDate)}.</p>
  </div>

  <div class="section">
    <div class="section-title">البند السابع: عدد النسخ</div>
    <p>تحرر هذا العقد من ${line(f.copies || '4')} نسخ أصلية بما لها من حجية قانونية.</p>
  </div>

  <div class="signatures">
    <div>
      <div>توقيع ممثل صاحب العمل</div>
      <div class="line">جاك إسحق عبد المسيح</div>
      <div>التاريخ: ${fmt(today)}</div>
    </div>
    <div>
      <div>توقيع العامل</div>
      <div class="line">${line(e.name_ar, 30)}</div>
      <div>التاريخ: ${fmt(today)}</div>
    </div>
  </div>
</div>
</body></html>`;

export const MutualTermination = ({ employee }: MutualTerminationProps) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const emp = useMemo(() => toInternalEmp(employee), [employee]);
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<FormState>({
    lastWorkDate: emp.resignation_date || today,
    terminationDate: emp.resignation_date || today,
    jobTitle: emp.job_title_ar || '',
    address: emp.address || '',
    phone: emp.phone || '',
    nationalId: emp.national_id || '',
    hireDate: emp.hire_date || '',
    socialInsuranceStartDate: emp.social_insurance_start_date || '',
    entitlements: '',
    copies: '4',
  });

  const html = useMemo(() => buildHtml(emp, form, today), [emp, form, today]);

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
    }, 600);
  };

  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      <Card>
        <CardContent className={cn("p-4 flex flex-wrap items-end gap-3", isAr ? 'flex-row' : 'flex-row-reverse')}>
          <div className="space-y-1">
            <Label className="text-xs font-bold">{isAr ? 'الموظف' : 'Employee'}</Label>
            <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm min-w-[280px]">
              {emp.employee_code} — {emp.name_ar}
            </div>
          </div>

          <div className="space-y-1"><Label className="text-xs">{isAr ? 'آخر يوم عمل' : 'Last working day'}</Label><Input type="date" className="h-9 w-[170px]" value={form.lastWorkDate} onChange={e => set('lastWorkDate', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'تاريخ الإنهاء' : 'Termination date'}</Label><Input type="date" className="h-9 w-[170px]" value={form.terminationDate} onChange={e => set('terminationDate', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'المسمى الوظيفي' : 'Job title'}</Label><Input className="h-9 w-[220px]" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'العنوان' : 'Address'}</Label><Input className="h-9 w-[240px]" value={form.address} onChange={e => set('address', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'الهاتف' : 'Phone'}</Label><Input className="h-9 w-[160px]" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'الرقم القومي' : 'National ID'}</Label><Input className="h-9 w-[160px]" value={form.nationalId} onChange={e => set('nationalId', e.target.value.replace(/\D/g, '').slice(0, 14))} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'تاريخ التعيين' : 'Hire date'}</Label><Input type="date" className="h-9 w-[170px]" value={form.hireDate} onChange={e => set('hireDate', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'بداية التأمين' : 'Insurance start'}</Label><Input type="date" className="h-9 w-[170px]" value={form.socialInsuranceStartDate} onChange={e => set('socialInsuranceStartDate', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'عدد النسخ' : 'Copies'}</Label><Input className="h-9 w-[100px]" value={form.copies} onChange={e => set('copies', e.target.value)} /></div>
          <div className="space-y-1 flex-1 min-w-[300px]"><Label className="text-xs">{isAr ? 'ملاحظات الحقوق' : 'Rights notes'}</Label><Input className="h-9" value={form.entitlements} onChange={e => set('entitlements', e.target.value)} /></div>

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
