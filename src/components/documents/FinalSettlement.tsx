import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer } from 'lucide-react';

interface FinalSettlementProps {
  employee: Employee;
}

interface Emp {
  id: string;
  employee_code: string;
  name_ar: string;
  national_id: string | null;
  hire_date: string | null;
  resignation_date: string | null;
  job_title_ar: string | null;
  basic_salary: number | null;
}

const esc = (s: string | null | undefined) =>
  (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

const fmt = (iso: string) => {
  if (!iso) return '......./......./.................';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return esc(iso);
  return `${d}/${m}/${y}`;
};

const dots = (n = 40) => '.'.repeat(n);
const line = (v: string | null | undefined, n = 40) => `<span class="fill">${esc(v) || dots(n)}</span>`;
const money = (n: number) => n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toInternalEmp = (employee: Employee): Emp => ({
  id: employee.id,
  employee_code: employee.employeeId,
  name_ar: employee.nameAr,
  national_id: employee.nationalId || null,
  hire_date: employee.hireDate || null,
  resignation_date: employee.resignationDate || null,
  job_title_ar: employee.jobTitleAr || null,
  basic_salary: employee.basicSalary ?? null,
});

interface FormState {
  hireDate: string;
  lastWorkDate: string;
  jobTitle: string;
  basicSalary: string;
  leaveBalance: string;
  bonus: string;
  deductions: string;
  other: string;
  notes: string;
}

const buildHtml = (e: Emp, f: FormState, today: string) => {
  const basic = parseFloat(f.basicSalary) || 0;
  const bonus = parseFloat(f.bonus) || 0;
  const deductions = parseFloat(f.deductions) || 0;
  const other = parseFloat(f.other) || 0;
  const leaveBalance = parseFloat(f.leaveBalance) || 0;
  const leaveValue = basic > 0 ? (basic / 30) * leaveBalance : 0;
  const net = basic + bonus + other + leaveValue - deductions;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title> </title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin:0; padding:0; }
body { font-family: "Baloo Bhaijaan 2","Tahoma",sans-serif; direction:rtl; color:#000; background:#fff; }
.page { width:210mm; min-height:297mm; margin:0 auto; padding:22mm 18mm 18mm; }
header { text-align:center; margin-bottom:16px; }
header h1 { font-size:18px; margin:0 0 4px; }
header p { font-size:12px; margin:0; }
h2 { text-align:center; font-size:16px; font-weight:bold; margin:14px 0 10px; text-decoration:underline; }
.row { display:flex; justify-content:space-between; margin:6px 0; font-size:13.5px; }
.row b { width:140px; flex-shrink:0; }
.row span { flex:1; }
.fill { font-weight:bold; }
hr { border:0; border-top:1px dashed #000; margin:12px 0; }
.totals { font-size:14px; font-weight:bold; margin-top:16px; }
.signatures { display:flex; justify-content:space-between; margin-top:40px; font-weight:bold; font-size:13px; }
.signatures > div { width:45%; }
</style></head><body>
<div class="page">
  <header>
    <h1>شركة لينك آيرو تريدنج إجنسي</h1>
    <p>10 ش الجزيرة الوسطى – الزمالك – القاهرة</p>
  </header>
  <h2>مخالصة نهائية</h2>
  <div class="row"><b>الموظف:</b><span class="fill">${esc(e.name_ar)}</span></div>
  <div class="row"><b>الرقم القومي:</b><span class="fill">${line(e.national_id)}</span></div>
  <div class="row"><b>الوظيفة:</b><span class="fill">${line(f.jobTitle)}</span></div>
  <div class="row"><b>تاريخ التعيين:</b><span class="fill">${fmt(f.hireDate)}</span></div>
  <div class="row"><b>تاريخ آخر يوم عمل:</b><span class="fill">${fmt(f.lastWorkDate)}</span></div>
  <hr/>
  <div class="row"><b>الأجر الأساسي:</b><span class="fill">${money(basic)} ج.م</span></div>
  <div class="row"><b>رصيد الإجازات:</b><span class="fill">${leaveBalance} يوم × ${basic > 0 ? money(basic / 30) : '0.00'} = ${money(leaveValue)} ج.م</span></div>
  <div class="row"><b>المكافآت:</b><span class="fill">${money(bonus)} ج.م</span></div>
  <div class="row"><b>أخرى:</b><span class="fill">${money(other)} ج.م</span></div>
  <div class="row"><b>الخصومات:</b><span class="fill">${money(deductions)} ج.م</span></div>
  <hr/>
  <div class="totals"><div class="row"><b>صافي المستحق:</b><span class="fill">${money(net)} ج.م</span></div></div>
  <p style="margin-top:18px; font-size:13px;"><b>ملاحظات:</b> ${line(f.notes, 100)}</p>
  <p style="margin-top:12px; font-size:13px; text-align:justify;">أقر أنا الموظف المذكور أعلاه بأنني استلمت كافة مستحقاتي المالية لدى الشركة حتى تاريخ ${fmt(f.lastWorkDate)}، وأن هذه المخالصة نهائية وأبرئ شركة لينك آيرو تريدنج إجنسي من أي مطالبة قانونية أو مالية مستقبلية.</p>
  <div class="signatures">
    <div>توقيع الموظف<br/>التاريخ: ${fmt(today)}</div>
    <div>توقيع الموارد البشرية<br/>التاريخ: ${fmt(today)}</div>
  </div>
</div>
</body></html>`;
};

export const FinalSettlement = ({ employee }: FinalSettlementProps) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const emp = useMemo(() => toInternalEmp(employee), [employee]);
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<FormState>({
    hireDate: emp.hire_date || '',
    lastWorkDate: emp.resignation_date || today,
    jobTitle: emp.job_title_ar || '',
    basicSalary: emp.basic_salary?.toString() || '',
    leaveBalance: '',
    bonus: '',
    deductions: '',
    other: '',
    notes: '',
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
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-bold">{isAr ? 'الموظف' : 'Employee'}</Label>
            <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm min-w-[280px]">
              {emp.employee_code} — {emp.name_ar}
            </div>
          </div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'تاريخ التعيين' : 'Hire date'}</Label><Input type="date" className="h-9 w-[170px]" value={form.hireDate} onChange={e => set('hireDate', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'آخر يوم عمل' : 'Last working day'}</Label><Input type="date" className="h-9 w-[170px]" value={form.lastWorkDate} onChange={e => set('lastWorkDate', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'الوظيفة' : 'Job title'}</Label><Input className="h-9 w-[220px]" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'الأجر الأساسي' : 'Basic salary'}</Label><Input className="h-9 w-[140px]" value={form.basicSalary} onChange={e => set('basicSalary', e.target.value.replace(/[^0-9.]/g, ''))} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'رصيد إجازات (أيام)' : 'Leave balance (days)'}</Label><Input className="h-9 w-[140px]" value={form.leaveBalance} onChange={e => set('leaveBalance', e.target.value.replace(/[^0-9.]/g, ''))} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'مكافآت' : 'Bonuses'}</Label><Input className="h-9 w-[140px]" value={form.bonus} onChange={e => set('bonus', e.target.value.replace(/[^0-9.]/g, ''))} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'خصومات' : 'Deductions'}</Label><Input className="h-9 w-[140px]" value={form.deductions} onChange={e => set('deductions', e.target.value.replace(/[^0-9.]/g, ''))} /></div>
          <div className="space-y-1"><Label className="text-xs">{isAr ? 'أخرى' : 'Other'}</Label><Input className="h-9 w-[140px]" value={form.other} onChange={e => set('other', e.target.value.replace(/[^0-9.]/g, ''))} /></div>
          <div className="space-y-1 flex-1 min-w-[280px]"><Label className="text-xs">{isAr ? 'ملاحظات' : 'Notes'}</Label><Input className="h-9" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>

          <Button onClick={print} className="gap-2">
            <Printer className="h-4 w-4" />{isAr ? 'طباعة / PDF' : 'Print / PDF'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <iframe title="settlement-preview" className="w-full h-[80vh] rounded-md bg-white" srcDoc={html} />
        </CardContent>
      </Card>
    </div>
  );
};
