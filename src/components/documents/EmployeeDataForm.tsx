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

interface Emp {
  id: string;
  employee_code: string;
  name_ar: string;
  name_en?: string | null;
  gender: string | null;
  birth_date?: string | null;
  nationality?: string | null;
  birth_place?: string | null;
  birth_governorate?: string | null;
  national_id?: string | null;
  governorate?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  job_title_ar?: string | null;
  job_title_en?: string | null;
}

const PAGE = 1000;

const esc = (s: string | null | undefined) =>
  (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

const fmt = (iso: string) => {
  if (!iso) return '................';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return esc(iso);
  return `${d}/${m}/${y}`;
};

interface FormState {
  nameAr: string;
  nameEn: string;
  gender: string;
  birthDate: string;
  nationalityAr: string;
  nationalityEn: string;
  birthPlace: string;
  birthGovernorate: string;
  nationalId: string;
  residenceGovernorate: string;
  departmentCenter: string;
  residencePlace: string;
  companyNameAr: string;
  companyNameEn: string;
  jobTitleAr: string;
  jobTitleEn: string;
  phone: string;
}

const buildHtml = (f: FormState) => {
  const val = (v: string) => `<span class="v">${esc(v) || '......................................................'}</span>`;

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
.sheet { position:relative; width:210mm; min-height:297mm; margin:0 auto; padding:18mm 15mm 20mm; background:#fff; overflow:hidden; }
h1 { text-align:center; font-size:22px; font-weight:bold; margin:0 0 14mm; text-decoration:underline; }
.form-grid { display:grid; grid-template-columns:1fr 38mm; gap:4mm 5mm; }
.fields-col { grid-column:1; display:flex; flex-direction:column; gap:4.5mm; }
.photo-col { grid-column:2; grid-row:1 / span 7; border:1px solid #000; display:flex; align-items:center; justify-content:center; text-align:center; padding:4mm; font-size:13px; line-height:1.6; font-weight:600; }
.field-row { display:flex; align-items:center; gap:3mm; }
.field-row.two .field { flex:1; }
.field { display:flex; align-items:center; gap:2mm; flex:1; }
.field .lbl { font-size:13.5px; font-weight:700; white-space:nowrap; }
.field .v { border-bottom:1px solid #000; flex:1; min-height:7.5mm; padding:1mm 2mm; font-size:13.5px; text-align:right; line-height:1.4; }
.section-title { text-align:center; font-size:16px; font-weight:bold; margin:6mm 0 2mm; text-decoration:underline; }
.bottom { display:flex; align-items:flex-end; justify-content:space-between; margin-top:12mm; padding:0 8mm; }
.approval { font-size:15px; font-weight:bold; }
.stamp { width:32mm; height:32mm; border:1px solid #000; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; }
@media print { body { background:#fff; } .sheet { margin:0; } }
</style></head><body>
<div class="sheet">
  <h1>نموذج بيان موظف</h1>
  <div class="form-grid">
    <div class="photo-col">صورة شخصية<br>٤ × ٦</div>
    <div class="fields-col">
      <div class="field-row"><div class="field"><span class="lbl">الاسم بالعربية</span>${val(f.nameAr)}</div></div>
      <div class="field-row"><div class="field"><span class="lbl">الاسم بالإنجليزية</span>${val(f.nameEn)}</div></div>
      <div class="field-row two">
        <div class="field"><span class="lbl">النوع</span>${val(f.gender)}</div>
        <div class="field"><span class="lbl">تاريخ الميلاد</span><span class="v">${fmt(f.birthDate)}</span></div>
      </div>
      <div class="field-row two">
        <div class="field"><span class="lbl">الجنسية بالعربية</span>${val(f.nationalityAr)}</div>
        <div class="field"><span class="lbl">الجنسية بالإنجليزية</span>${val(f.nationalityEn)}</div>
      </div>
      <div class="field-row two">
        <div class="field"><span class="lbl">محل الميلاد</span>${val(f.birthPlace)}</div>
        <div class="field"><span class="lbl">محافظة الميلاد</span>${val(f.birthGovernorate)}</div>
      </div>
      <div class="field-row"><div class="field"><span class="lbl">الرقم القومي</span>${val(f.nationalId)}</div></div>
      <div class="field-row two">
        <div class="field"><span class="lbl">محافظة الإقامة</span>${val(f.residenceGovernorate)}</div>
        <div class="field"><span class="lbl">قسم / مركز</span>${val(f.departmentCenter)}</div>
      </div>
      <div class="field-row"><div class="field"><span class="lbl">محل الإقامة</span>${val(f.residencePlace)}</div></div>
    </div>
  </div>

  <div class="section-title">البيانات الوظيفية</div>
  <div class="fields-col" style="grid-column:1 / -1; margin-top:2mm;">
    <div class="field-row"><div class="field"><span class="lbl">اسم الشركة بالعربية</span>${val(f.companyNameAr)}</div></div>
    <div class="field-row"><div class="field"><span class="lbl">اسم الشركة بالإنجليزية</span>${val(f.companyNameEn)}</div></div>
    <div class="field-row"><div class="field"><span class="lbl">المهنة بالعربية</span>${val(f.jobTitleAr)}</div></div>
    <div class="field-row"><div class="field"><span class="lbl">المهنة بالإنجليزية</span>${val(f.jobTitleEn)}</div></div>
    <div class="field-row"><div class="field"><span class="lbl">رقم الهاتف</span>${val(f.phone)}</div></div>
  </div>

  <div class="bottom">
    <div class="approval">يعتمد /</div>
    <div class="stamp">ختم الشركة</div>
  </div>
</div>
</body></html>`;
};

export const EmployeeDataForm = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<FormState>({
    nameAr: '', nameEn: '', gender: '', birthDate: '', nationalityAr: '', nationalityEn: '',
    birthPlace: '', birthGovernorate: '', nationalId: '', residenceGovernorate: '',
    departmentCenter: '', residencePlace: '', companyNameAr: 'لينك أيرو تريدنج أجنسي',
    companyNameEn: 'Link Aero Trading Agency', jobTitleAr: '', jobTitleEn: '', phone: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all: Emp[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('employees')
          .select('id, employee_code, name_ar, name_en, gender, birth_date, nationality, birth_place, birth_governorate, national_id, governorate, city, address, phone, job_title_ar, job_title_en')
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
      nameAr: e.name_ar || '',
      nameEn: e.name_en || '',
      gender: e.gender || '',
      birthDate: e.birth_date || '',
      nationalityAr: e.nationality || '',
      nationalityEn: '',
      birthPlace: e.birth_place || '',
      birthGovernorate: e.birth_governorate || '',
      nationalId: e.national_id || '',
      residenceGovernorate: e.governorate || '',
      departmentCenter: e.city || '',
      residencePlace: e.address || '',
      phone: e.phone || '',
      jobTitleAr: e.job_title_ar || '',
      jobTitleEn: e.job_title_en || '',
    }));
  };

  const html = selected ? buildHtml(form) : '';

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

  const field = (label: string, key: keyof FormState, type: 'text' | 'date' = 'text', width = 'w-[220px]') => (
    <div className="space-y-1" key={key}>
      <Label className="text-xs">{label}</Label>
      <Input type={type} className={cn("h-9", width)} value={form[key]} onChange={e => set(key, e.target.value)} />
    </div>
  );

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

          {field(isAr ? 'الاسم بالعربية' : 'Name Arabic', 'nameAr', 'text', 'w-[260px]')}
          {field(isAr ? 'الاسم بالإنجليزية' : 'Name English', 'nameEn', 'text', 'w-[260px]')}
          {field(isAr ? 'النوع' : 'Gender', 'gender', 'text', 'w-[140px]')}
          {field(isAr ? 'تاريخ الميلاد' : 'Birth date', 'birthDate', 'date', 'w-[170px]')}
          {field(isAr ? 'الجنسية بالعربية' : 'Nationality Arabic', 'nationalityAr', 'text', 'w-[180px]')}
          {field(isAr ? 'الجنسية بالإنجليزية' : 'Nationality English', 'nationalityEn', 'text', 'w-[180px]')}
          {field(isAr ? 'محل الميلاد' : 'Birth place', 'birthPlace', 'text', 'w-[180px]')}
          {field(isAr ? 'محافظة الميلاد' : 'Birth governorate', 'birthGovernorate', 'text', 'w-[180px]')}
          {field(isAr ? 'الرقم القومي' : 'National ID', 'nationalId', 'text', 'w-[200px]')}
          {field(isAr ? 'محافظة الإقامة' : 'Residence governorate', 'residenceGovernorate', 'text', 'w-[180px]')}
          {field(isAr ? 'قسم / مركز' : 'Department / Center', 'departmentCenter', 'text', 'w-[180px]')}
          {field(isAr ? 'محل الإقامة' : 'Residence place', 'residencePlace', 'text', 'w-[260px]')}
          {field(isAr ? 'اسم الشركة بالعربية' : 'Company name Arabic', 'companyNameAr', 'text', 'w-[260px]')}
          {field(isAr ? 'اسم الشركة بالإنجليزية' : 'Company name English', 'companyNameEn', 'text', 'w-[260px]')}
          {field(isAr ? 'المهنة بالعربية' : 'Job title Arabic', 'jobTitleAr', 'text', 'w-[260px]')}
          {field(isAr ? 'المهنة بالإنجليزية' : 'Job title English', 'jobTitleEn', 'text', 'w-[260px]')}
          {field(isAr ? 'رقم الهاتف' : 'Phone', 'phone', 'text', 'w-[180px]')}

          <Button onClick={print} disabled={!selected} className="gap-2">
            <Printer className="h-4 w-4" />{isAr ? 'طباعة / PDF' : 'Print / PDF'}
          </Button>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardContent className="p-0">
            <iframe title="employee-data-form-preview" className="w-full h-[80vh] rounded-md bg-white" srcDoc={html} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
