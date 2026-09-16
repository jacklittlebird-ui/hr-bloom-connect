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
}

const esc = (s: string | null | undefined) =>
  (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

const toInternalEmp = (employee: Employee): Emp => ({
  id: employee.id,
  employee_code: employee.employeeId,
  name_ar: employee.nameAr,
  national_id: employee.nationalId || null,
});

const formatDate = (value: string) => {
  if (!value) return '(تاريخ يجب إدخاله)';
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
};

const buildHtml = (e: Emp, resignationDate: string) => `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title> </title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin:0; padding:0; }
body { font-family: "Baloo Bhaijaan 2","Tahoma",sans-serif; direction:rtl; color:#000; background:#fff; }
.page { width:210mm; height:297mm; margin:0 auto; padding:23mm 27mm 18mm; background:#fff; overflow:hidden; }
h1 { margin:0 0 14mm; text-align:center; font-size:23px; line-height:1.2; font-weight:500; text-decoration:underline; }
.body-copy { font-size:16px; line-height:2.05; text-align:justify; }
.body-copy p { margin:0 0 3mm; }
.identity { margin-bottom:4mm; }
.conclusion { margin-top:8mm; text-align:center; font-size:17px; font-weight:700; }
.signature-block { width:95mm; margin:12mm 0 0 auto; font-size:17px; line-height:2.4; font-weight:700; text-align:right; }
.signature-line { display:inline-block; width:53mm; border-bottom:1px dotted #000; transform:translateY(-2px); }
@media screen { body { background:#eee; } .page { margin:8px auto; box-shadow:0 1px 5px #aaa; } }
@media print { .page { margin:0; box-shadow:none; } }
</style></head><body>
<div class="page">
  <h1>مخالصة نهائية</h1>
  <div class="body-copy">
    <div class="identity">
      <p>أقر أنا الموقع أدناه (${esc(e.name_ar)})</p>
      <p>رقم قومي: (${esc(e.national_id)})</p>
    </div>
    <p>بأني استلمت جميع مستحقاتي المالية والعينية (من مستندات وغيرها) من شركة لينك أيرو تريدينج أجنسي منذ تعييني وحتى تاريخه. كما أقر بأنني قد استهلكت جميع أجازاتي السنوية والحكومية منذ تعييني وحتى تاريخه ولا يحق لي المطالبة بأي مبالغ مالية من الشركة. وأقر بأن ليس لي طرف الشركة أي متعلقات أو مستحقات حتى تاريخ استقالتي الموافق ${esc(formatDate(resignationDate))}</p>
    <p>كما أقر بأنني سلمت لشركة لينك أيرو تريدينج أجنسي كافة المستندات والعهد التي بحوزتي وأني لم أحتفظ بأية مستندات أو عهد تخص الشركة وأكون خائنًا ومبددًا للأمانة في حالة مخالفة ذلك. ويحق للشركة اتخاذ كافة الإجراءات القانونية التي تراها مناسبة في حالة مخالفتي لذلك. وهذا إقرار مني بذلك مع كامل علمي بأحكام القوانين المنظمة لخيانة الأمانة.</p>
    <div class="conclusion">،،،، وهذا إقرار ومخالصة مني بذلك</div>
  </div>
  <div class="signature-block">
    <div>الاسم: (${esc(e.name_ar)})</div>
    <div>التوقيع: <span class="signature-line"></span></div>
    <div>التاريخ: <span class="signature-line"></span></div>
  </div>
</div>
</body></html>`;

export const FinalSettlement = ({ employee }: FinalSettlementProps) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const emp = useMemo(() => toInternalEmp(employee), [employee]);
  const [resignationDate, setResignationDate] = useState('');
  const html = useMemo(() => buildHtml(emp, resignationDate), [emp, resignationDate]);

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

  return (
    <div className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 text-sm min-w-[280px]">
              {emp.employee_code} — {emp.name_ar}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="settlement-resignation-date" className="whitespace-nowrap">
              {isAr ? 'تاريخ الاستقالة' : 'Resignation date'}
            </Label>
            <Input
              id="settlement-resignation-date"
              type="date"
              required
              value={resignationDate}
              onChange={(event) => setResignationDate(event.target.value)}
              className="w-44"
            />
          </div>
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
