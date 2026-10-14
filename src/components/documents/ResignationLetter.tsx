import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface ResignationLetterProps {
  employee: Employee;
}

interface Emp {
  id: string;
  employee_code: string;
  name_ar: string;
}

const esc = (s: string | null | undefined) =>
  (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

const toInternalEmp = (employee: Employee): Emp => ({
  id: employee.id,
  employee_code: employee.employeeId,
  name_ar: employee.nameAr,
});

const buildHtml = (e: Emp) => `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title> </title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin:0; padding:0; }
body { font-family: "Baloo Bhaijaan 2","Tahoma",sans-serif; direction:rtl; color:#000; background:#fff; }
.page { width:210mm; height:297mm; margin:0 auto; padding:25mm 27mm 20mm; background:#fff; overflow:hidden; }
h1 { margin:0 0 16mm; text-align:center; font-size:24px; line-height:1.2; font-weight:700; text-decoration:underline; }
.body-copy { font-size:17px; line-height:2.2; }
.body-copy p { margin:0 0 5mm; }
.addressee { font-weight:700; }
.greeting { font-weight:700; }
.signature-block { width:95mm; margin:14mm 0 0 auto; font-size:17px; line-height:2.6; font-weight:700; text-align:right; }
.signature-line { display:inline-block; width:53mm; border-bottom:1px dotted #000; transform:translateY(-2px); }
@media screen { body { background:#eee; } .page { margin:8px auto; box-shadow:0 1px 5px #aaa; } }
@media print { .page { margin:0; box-shadow:none; } }
</style></head><body>
<div class="page">
  <h1>استقالة</h1>
  <div class="body-copy">
    <p class="addressee">السيد مدير شركة / لينك إيرو تريدنج أجنسي</p>
    <p class="greeting">تحية طيبة وبعد،</p>
    <p>مقدمه لسيادتكم / (${esc(e.name_ar)})</p>
    <p>برجاء التكرم بالموافقة على قبول استقالي وهي استقالة غير مسببة.</p>
    <p class="greeting">وتفضلوا بقبول فائق الاحترام،</p>
  </div>
  <div class="signature-block">
    <div>الاسم: <span class="signature-line"></span></div>
    <div>التوقيع: <span class="signature-line"></span></div>
    <div>التاريخ: <span class="signature-line"></span></div>
  </div>
</div>
</body></html>`;

export const ResignationLetter = ({ employee }: ResignationLetterProps) => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const emp = useMemo(() => toInternalEmp(employee), [employee]);
  const html = useMemo(() => buildHtml(emp), [emp]);

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
          <Button onClick={print} className="gap-2">
            <Printer className="h-4 w-4" />{isAr ? 'طباعة / PDF' : 'Print / PDF'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <iframe title="resignation-preview" className="w-full h-[80vh] rounded-md bg-white" srcDoc={html} />
        </CardContent>
      </Card>
    </div>
  );
};
