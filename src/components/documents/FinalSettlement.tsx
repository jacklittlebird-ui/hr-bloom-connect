import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmployeeRecord {
  id: string;
  employee_code: string;
  name_ar: string;
  national_id: string | null;
}

interface FormState {
  nationalId: string;
  documentDate: string;
}

const PAGE_SIZE = 1000;

const escapeHtml = (value: string | null | undefined) =>
  (value || '').replace(/[<>&]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[character] as string));

const formatDate = (value: string) => {
  if (!value) return '.................';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : escapeHtml(value);
};

const buildHtml = (employeeName: string, form: FormState) => `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>مخالصة نهائية</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: "Baloo Bhaijaan 2", Tahoma, sans-serif; direction: rtl; color: #000; background: #e5e7eb; }
    .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 48mm 23mm 24mm; background: #fff; overflow: hidden; }
    h1 { margin: 0 0 16mm; text-align: center; font-size: 23px; font-weight: 700; text-decoration: underline; }
    .identity { margin-bottom: 8mm; font-size: 16px; font-weight: 600; line-height: 2.1; }
    .identity p { margin: 0; }
    .body { margin: 0; font-size: 16px; line-height: 2.25; text-align: justify; }
    .closing { margin-top: 8mm; font-size: 16px; font-weight: 600; }
    .signature { width: 78mm; margin-top: 22mm; margin-right: auto; font-size: 16px; font-weight: 600; line-height: 2.8; }
    .signature-row { display: flex; gap: 6px; min-height: 12mm; }
    .signature-label { min-width: 22mm; }
    @media print { body { background: #fff; } .sheet { margin: 0; } }
  </style>
</head>
<body>
  <main class="sheet">
    <h1>مخالصة نهائية</h1>
    <section class="identity">
      <p>أقر أنا الموقع أدناه / <b>${escapeHtml(employeeName)}</b></p>
      <p>رقم قومي: <b>${escapeHtml(form.nationalId) || '.................'}</b></p>
    </section>
    <p class="body">
      بأنني استلمت جميع مستحقاتي المالية والعينية (من مستندات وغيرها) من شركة لينك أيرو تريدنج أجنسي منذ تعييني وحتى تاريخه. كما أقر بأنني قد استهلكت جميع إجازاتي السنوية والحكومية منذ تعييني وحتى تاريخه، ولا يحق لي المطالبة بأي مبالغ مالية من الشركة. وأقر بأنه ليس لي طرف الشركة أي متعلقات أو مستحقات حتى تاريخ استقالتي الموافق <b>${formatDate(form.resignationDate)}</b>.
      كما أقر بأنني سلمت لشركة لينك أيرو تريدنج أجنسي كافة المستندات والعهد التي بحوزتي، وأنني لم أحتفظ بأية مستندات أو عهد تخص الشركة، وأكون خائنًا ومبددًا للأمانة في حالة مخالفة ذلك. ويحق للشركة اتخاذ كافة الإجراءات القانونية التي تراها مناسبة في حالة مخالفتي لذلك. وهذا إقرار مني بذلك مع كامل علمي بأحكام القوانين المنظمة لخيانة الأمانة.
    </p>
    <p class="closing">وهذا إقرار ومخالصة مني بذلك،،،،</p>
    <section class="signature">
      <div class="signature-row"><span class="signature-label">الاسم:</span><span>${escapeHtml(employeeName)}</span></div>
      <div class="signature-row"><span class="signature-label">التوقيع:</span><span></span></div>
      <div class="signature-row"><span class="signature-label">التاريخ:</span><span>${formatDate(form.documentDate)}</span></div>
    </section>
  </main>
</body>
</html>`;

export const FinalSettlement = () => {
  const { language } = useLanguage();
  const isArabic = language === 'ar';
  const today = new Date().toISOString().split('T')[0];
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [form, setForm] = useState<FormState>({ nationalId: '', documentDate: today });

  useEffect(() => {
    let cancelled = false;
    const fetchEmployees = async () => {
      const records: EmployeeRecord[] = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
          .from('employees')
          .select('id, employee_code, name_ar, national_id')
          .order('employee_code')
          .range(from, from + PAGE_SIZE - 1);
        if (error || !data?.length) break;
        records.push(...(data as unknown as EmployeeRecord[]));
        if (data.length < PAGE_SIZE) break;
      }
      if (!cancelled) {
        setEmployees(records);
        setLoading(false);
      }
    };
    fetchEmployees();
    return () => { cancelled = true; };
  }, []);

  const selectedEmployee = useMemo(
    () => employees.find(employee => employee.id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId],
  );

  const selectEmployee = (employee: EmployeeRecord) => {
    setSelectedEmployeeId(employee.id);
    setEmployeePickerOpen(false);
    setForm({
      nationalId: employee.national_id || '',
      documentDate: today,
    });
  };

  const html = selectedEmployee ? buildHtml(selectedEmployee.name_ar, form) : '';

  const printDocument = () => {
    if (!html) return;
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const printDocument = iframe.contentWindow?.document;
    if (!printDocument) {
      iframe.remove();
      return;
    }
    printDocument.open();
    printDocument.write(html);
    printDocument.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    }, 600);
  };

  return (
    <div className="space-y-4" dir={isArabic ? 'rtl' : 'ltr'}>
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label className="text-xs">{isArabic ? 'اسم الموظف' : 'Employee'}</Label>
            <Popover open={employeePickerOpen} onOpenChange={setEmployeePickerOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" role="combobox" className="h-9 w-[320px] justify-between font-normal" disabled={loading}>
                  <span className="truncate">
                    {loading
                      ? (isArabic ? 'جاري التحميل...' : 'Loading...')
                      : selectedEmployee
                        ? `${selectedEmployee.employee_code} — ${selectedEmployee.name_ar}`
                        : (isArabic ? 'ابحث بالاسم أو الكود...' : 'Search by name or code...')}
                  </span>
                  <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={isArabic ? 'بحث عن موظف...' : 'Search employee...'} />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>{isArabic ? 'لا توجد نتائج' : 'No results'}</CommandEmpty>
                    <CommandGroup>
                      {employees.map(employee => (
                        <CommandItem
                          key={employee.id}
                          value={`${employee.name_ar} ${employee.employee_code}`}
                          onSelect={() => selectEmployee(employee)}
                        >
                          <Check className={cn('me-2 h-4 w-4', selectedEmployeeId === employee.id ? 'opacity-100' : 'opacity-0')} />
                          <span className="whitespace-pre-wrap break-words">{employee.employee_code} — {employee.name_ar}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isArabic ? 'الرقم القومي' : 'National ID'}</Label>
            <Input className="h-9 w-[210px]" value={form.nationalId} onChange={event => setForm(current => ({ ...current, nationalId: event.target.value }))} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isArabic ? 'تاريخ المخالصة' : 'Settlement date'}</Label>
            <Input type="date" className="h-9 w-[170px]" value={form.documentDate} onChange={event => setForm(current => ({ ...current, documentDate: event.target.value }))} />
          </div>

          <Button onClick={printDocument} disabled={!selectedEmployee} className="gap-2">
            <Printer className="h-4 w-4" />
            {isArabic ? 'طباعة / PDF' : 'Print / PDF'}
          </Button>
        </CardContent>
      </Card>

      {selectedEmployee && (
        <Card>
          <CardContent className="p-0">
            <iframe title="final-settlement-preview" className="h-[80vh] w-full rounded-md bg-background" srcDoc={html} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};