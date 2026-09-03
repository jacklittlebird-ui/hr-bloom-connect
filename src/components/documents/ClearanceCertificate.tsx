import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronsUpDown, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Emp {
  id: string;
  employee_code: string;
  name_ar: string;
  gender: string | null;
  hire_date: string | null;
  job_title_ar: string | null;
  resignation_date: string | null;
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

type Gender = 'male' | 'female';

interface FormState {
  gender: Gender;
  hireDate: string;
  endDate: string;
  jobTitle: string;
  clearanceDate: string;
  docDate: string;
}

const buildHtml = (name: string, f: FormState) => {
  const male = f.gender === 'male';
  const body = male
    ? `تشـهد شركة لينك آيرو تريدنج إجنـسي بأن السـيد / <b>${esc(name)}</b>، كان يعمل لدينا في الفترة من <b>${fmt(f.hireDate)}</b> وحتى <b>${fmt(f.endDate)}</b>، وعند تقديمه اسـتقالته كان يشغل وظيفة <b>${esc(f.jobTitle) || '.................'}</b>، وقد أصبح طرفه خاليًا من الشركة إعتبارًا من <b>${fmt(f.clearanceDate)}</b>، وليس له أو عليه أي مستحقات مـــالية أو عينية لدى الشـركة، وقد أعطيت له هذه الشهادة بناءًا على طلبه ودون أدنى إلتزام أو مسؤولية مادية أو قانونية على الشركة.`
    : `تشـهد شركة لينك آيرو تريدنج إجنـسي بأن السـيدة / <b>${esc(name)}</b>، كانت تعمل لدينا في الفترة من <b>${fmt(f.hireDate)}</b> وحتى <b>${fmt(f.endDate)}</b>، وعند تقديمها اسـتقالتها كانت تشغل وظيفة <b>${esc(f.jobTitle) || '.................'}</b>، وقد أصبح طرفها خاليًا من الشركة إعتبارًا من <b>${fmt(f.clearanceDate)}</b>، وليس لها أو عليها أي مستحقات مـــالية أو عينية لدى الشـركة، وقد أعطيت لها هذه الشهادة بناءًا على طلبها ودون أدنى إلتزام أو مسؤولية مادية أو قانونية على الشركة.`;

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
.sheet { position:relative; width:210mm; height:297mm; margin:0 auto; padding:42mm 22mm 24mm; background:#fff; overflow:hidden; }
.date { text-align:left; font-size:14px; font-weight:bold; margin-bottom:12mm; }
h1 { text-align:center; font-size:22px; font-weight:bold; margin:0 0 14mm; text-decoration:underline; }
p.body { font-size:15.5px; line-height:2.3; text-align:justify; margin:0; }
.sign { margin-top:24mm; margin-left:25mm; text-align:left; font-size:15px; font-weight:bold; line-height:3.4; }
@media print { body { background:#fff; } .sheet { margin:0; } }
</style></head><body>
<div class="sheet">
  <div class="date">${fmt(f.docDate)}</div>
  <h1>إخلاء طرف</h1>
  <p class="body">${body}</p>
  <div class="sign">
    <div>مدير القطاع المالي</div>
    <div>فارس أبو شادي</div>
  </div>
</div>
</body></html>`;
};

export const ClearanceCertificate = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const today = new Date().toISOString().split('T')[0];

  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<FormState>({
    gender: 'male', hireDate: '', endDate: '', jobTitle: '', clearanceDate: '', docDate: today,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all: Emp[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('employees')
          .select('id, employee_code, name_ar, gender, hire_date, job_title_ar, resignation_date')
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
    setForm({
      gender: (e.gender || '').includes('أنث') || (e.gender || '').toLowerCase() === 'female' ? 'female' : 'male',
      hireDate: e.hire_date || '',
      endDate: e.resignation_date || '',
      jobTitle: e.job_title_ar || '',
      clearanceDate: e.resignation_date || '',
      docDate: today,
    });
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

  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v as never }));

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
            <Label className="text-xs">{isAr ? 'النوع' : 'Gender'}</Label>
            <Select value={form.gender} onValueChange={v => set('gender', v)}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{isAr ? 'ذكر' : 'Male'}</SelectItem>
                <SelectItem value="female">{isAr ? 'أنثى' : 'Female'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isAr ? 'تاريخ الالتحاق' : 'Hire date'}</Label>
            <Input type="date" className="h-9 w-[170px]" value={form.hireDate} onChange={e => set('hireDate', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isAr ? 'حتى تاريخ' : 'Until date'}</Label>
            <Input type="date" className="h-9 w-[170px]" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isAr ? 'الوظيفة' : 'Job title'}</Label>
            <Input className="h-9 w-[220px]" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isAr ? 'إخلاء الطرف اعتبارًا من' : 'Clearance from'}</Label>
            <Input type="date" className="h-9 w-[170px]" value={form.clearanceDate} onChange={e => set('clearanceDate', e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isAr ? 'تاريخ الشهادة' : 'Document date'}</Label>
            <Input type="date" className="h-9 w-[170px]" value={form.docDate} onChange={e => set('docDate', e.target.value)} />
          </div>

          <Button onClick={print} disabled={!selected} className="gap-2">
            <Printer className="h-4 w-4" />{isAr ? 'طباعة / PDF' : 'Print / PDF'}
          </Button>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardContent className="p-0">
            <iframe title="clearance-preview" className="w-full h-[80vh] rounded-md bg-white" srcDoc={html} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
