import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Printer, Loader2, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import nosiLogo from '@/assets/nosi-logo.png.asset.json';

interface Emp {
  id: string;
  employee_code: string;
  name_ar: string;
  social_insurance_no: string | null;
  national_id: string | null;
  education_ar: string | null;
  address: string | null;
  city: string | null;
  governorate: string | null;
  job_title_ar: string | null;
  nationality: string | null;
  phone: string | null;
  social_insurance_start_date: string | null;
}

const PAGE = 1000;

const digits = (v: string | null | undefined, len: number) => {
  const d = (v || '').replace(/\D/g, '').slice(0, len);
  return Array.from({ length: len }, (_, i) => d[i] || '');
};

const boxes = (v: string | null | undefined, len: number) =>
  `<span class="boxes">${digits(v, len).map(d => `<span class="box">${d}</span>`).join('')}</span>`;

const esc = (s: string | null | undefined) => (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

export interface Form01Extra {
  office: string; applicant: string; applicantRole: string; sector: string;
  subCode: string; periodType: string; wage: string; totalWage: string;
  buildingNo: string; village: string; writtenAt: string;
}

const buildHtml = (e: Emp, logoUrl: string, x: Form01Extra) => `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>نموذج رقم 1 - ${esc(e.name_ar)}</title>
<style>
@page { size: A4; margin: 8mm; }
* { box-sizing: border-box; }
body { font-family: "Arial", "Tahoma", sans-serif; direction: rtl; color: #000; margin: 0; font-size: 12px; }
.sheet { width: 194mm; margin: 0 auto; border: 2px solid #000; padding: 4mm; }
table { width: 100%; border-collapse: collapse; }
.head td { vertical-align: middle; padding: 2px 4px; }
.head img { height: 68px; }
.t1 { font-size: 15px; font-weight: bold; text-align: center; }
.t2 { font-size: 12.5px; text-align: center; margin-top: 3px; }
.formno { border: 1.5px solid #000; padding: 4px 8px; font-weight: bold; font-size: 13px; white-space: nowrap; }
h1 { font-size: 15px; text-align: center; margin: 6px 0; text-decoration: underline; }
.grid { border: 1.5px solid #000; }
.grid td { border: 1px solid #000; padding: 3px 5px; vertical-align: middle; height: 22px; }
.lbl { font-weight: bold; white-space: nowrap; background: #f2f2f2; width: 1%; }
.val { font-weight: bold; }
.band { background: #e6e6e6; font-weight: bold; text-align: center; }
.boxes { display: inline-flex; direction: ltr; }
.box { width: 16px; height: 20px; border: 1px solid #000; margin-inline-start: -1px; text-align: center; font-size: 12px; line-height: 20px; font-weight: bold; }
.chk { display: inline-block; width: 12px; height: 12px; border: 1px solid #000; margin-inline-end: 3px; text-align: center; line-height: 12px; font-size: 10px; vertical-align: middle; }
.opt { margin-inline-end: 14px; white-space: nowrap; }
.sign td { padding: 16px 6px 4px; font-weight: bold; font-size: 12px; }
.note { margin-top: 8px; font-size: 10.5px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; }
</style></head><body>
<div class="sheet">
  <table class="head"><tr>
    <td style="width:80px"><img src="${logoUrl}" alt="" /></td>
    <td>
      <div class="t1">الهيئة القومية للتأمين الاجتماعى</div>
      <div class="t2">مكتب : ${esc(x.office)}</div>
    </td>
    <td style="width:110px;text-align:left"><span class="formno">نموذج رقم ( 1 )</span></td>
  </tr></table>

  <h1>طلــــب اشتراك مــؤمــن عليــه</h1>

  <table class="grid">
    <tr><td class="band" colspan="4">الفئـــة</td></tr>
    <tr><td colspan="4">
      <span class="opt"><span class="chk">√</span>عاملين لدى الغير</span>
      <span class="opt"><span class="chk"></span>أصحاب أعمال لهم منشآت</span>
      <span class="opt"><span class="chk"></span>العاملين بالمخابز</span>
    </td></tr>
    <tr>
      <td class="lbl">مقدم الطلب</td><td class="val">${esc(x.applicant)}</td>
      <td class="lbl">صفة مقدم الطلب</td><td class="val">${esc(x.applicantRole)}</td>
    </tr>

    <tr><td class="band" colspan="4">أولاً : بيانات المؤمن عليه</td></tr>
    <tr>
      <td class="lbl">اسم المؤمن عليه</td><td class="val" colspan="3">${esc(e.name_ar)}</td>
    </tr>
    <tr>
      <td class="lbl">الرقم التأمينى</td><td>${boxes(e.social_insurance_no, 9)}</td>
      <td class="lbl">الرقم القومى</td><td>${boxes(e.national_id, 14)}</td>
    </tr>
    <tr>
      <td class="lbl">الجنسية</td><td class="val">${esc(e.nationality) || 'مصري'}</td>
      <td class="lbl">المؤهل</td><td class="val">${esc(e.education_ar)}</td>
    </tr>
    <tr>
      <td class="lbl">المهنة</td><td class="val">${esc(e.job_title_ar)}</td>
      <td class="lbl">رقم التليفون</td><td class="val">${esc(e.phone)}</td>
    </tr>
    <tr>
      <td class="lbl">تاريخ بدء الاشتراك</td><td class="val">${e.social_insurance_start_date ? new Date(e.social_insurance_start_date).toLocaleDateString('en-GB') : ''}</td>
      <td class="lbl">القطاع</td><td class="val">${esc(x.sector)}</td>
    </tr>
    <tr>
      <td class="lbl">كود الاشتراك</td><td class="val">${esc(x.subCode)}</td>
      <td class="lbl">نوع المدة</td><td class="val">${esc(x.periodType)}</td>
    </tr>
    <tr>
      <td class="lbl">أجر / دخل الاشتراك</td><td class="val">${esc(x.wage)} جنيه</td>
      <td class="lbl">الأجر الشامل</td><td class="val">${esc(x.totalWage)} جنيه</td>
    </tr>
    <tr>
      <td class="lbl">تاريخ بداية العجز</td><td class="val"></td>
      <td class="lbl">نسبة العجز</td><td class="val">%</td>
    </tr>
    <tr>
      <td class="lbl">استيفاء الكشف الطبى الابتدائى</td>
      <td colspan="3"><span class="opt"><span class="chk"></span>نعم</span><span class="opt"><span class="chk"></span>لا</span></td>
    </tr>

    <tr><td class="band" colspan="4">ثانياً : بيانات المنشأة</td></tr>
    <tr><td colspan="4">
      <span class="opt"><span class="chk">√</span>نمطى</span>
      <span class="opt"><span class="chk"></span>سيارة</span>
      <span class="opt"><span class="chk"></span>مركب صيد</span>
      <span class="opt"><span class="chk"></span>مخابز بلدية</span>
    </td></tr>
    <tr>
      <td class="lbl">اسم المنشأة</td><td class="val">لينك أيرو تريدنج أجنسي</td>
      <td class="lbl">رقم المنشأة</td><td class="val">1307926</td>
    </tr>
    <tr>
      <td class="lbl">عقار رقم</td><td class="val">${esc(x.buildingNo)}</td>
      <td class="lbl">شارع</td><td class="val">${esc(e.address)}</td>
    </tr>
    <tr>
      <td class="lbl">قرية</td><td class="val">${esc(x.village)}</td>
      <td class="lbl">قسم / مركز</td><td class="val">${esc(e.city)}</td>
    </tr>
    <tr>
      <td class="lbl">محافظة</td><td class="val">${esc(e.governorate)}</td>
      <td class="lbl">رقم تليفون المنشأة</td><td class="val">${esc(e.phone)}</td>
    </tr>
  </table>

  <table class="sign">
    <tr>
      <td style="width:50%">توقيع المؤمن عليه : ..............................</td>
      <td style="width:50%">توقيع صاحب العمل / المدير المسئول : ..............................</td>
    </tr>
    <tr>
      <td>تحريراً في : ${esc(x.writtenAt)}</td>
      <td>توقيع الموظف المختص بالمطابقة : .................. تاريخ المطابقة : &nbsp;&nbsp;/&nbsp;&nbsp;/</td>
    </tr>
  </table>

  <div class="note">ملحوظة: على صاحب العمل والعامل الإطلاع على التوجيهات الموضحة خلف النموذج مع التوقيع على الإقرار. (انظر خلفه)</div>
</div>
</body></html>`;


export const Form01 = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [emp, setEmp] = useState<Emp | null>(null);
  const [extra, setExtra] = useState<Form01Extra>({
    office: 'الزمالك', applicant: 'محمود احمد سلامة', applicantRole: 'مندوب',
    sector: 'خاص', subCode: '', periodType: 'مدة اشتراك أساسية', wage: '', totalWage: '',
    buildingNo: '', village: '', writtenAt: new Date().toLocaleDateString('en-GB'),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all: Emp[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('employees')
          .select('id, employee_code, name_ar, social_insurance_no, national_id, education_ar, address, city, governorate, job_title_ar, nationality, phone, social_insurance_start_date')
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

  useEffect(() => { setEmp(selected ? { ...selected } : null); }, [selected]);

  const setEmpField = (k: keyof Emp, v: string) => setEmp(p => (p ? { ...p, [k]: v } : p));
  const html = emp ? buildHtml(emp, nosiLogo.url, extra) : '';

  // Auto-fill wages from the latest salary record
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('salary_records')
        .select('basic_salary, transport_allowance, incentives, living_allowance, station_allowance, mobile_allowance, year')
        .eq('employee_id', selectedId)
        .order('year', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      const n = (v: unknown) => Number(v || 0);
      const gross = n(data.basic_salary) + n(data.transport_allowance) + n(data.incentives) + n(data.living_allowance) + n(data.station_allowance) + n(data.mobile_allowance);
      setExtra(p => ({
        ...p,
        wage: n(data.basic_salary) ? String(Math.round(n(data.basic_salary))) : p.wage,
        totalWage: gross ? String(Math.round(gross)) : p.totalWage,
      }));
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  const print = () => {
    if (!html) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1 min-w-[280px]">
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
                        <CommandItem
                          key={e.id}
                          value={`${e.name_ar} ${e.employee_code}`}
                          onSelect={() => { setSelectedId(e.id); setOpen(false); }}
                        >
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
          <Button onClick={print} disabled={!emp} className="gap-2">
            <Printer className="h-4 w-4" />{isAr ? 'طباعة / PDF' : 'Print / PDF'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 text-sm font-semibold">{isAr ? 'بيانات الموظف (قابلة للتعديل قبل الطباعة)' : 'Employee data (editable)'}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'اسم المؤمن عليه' : 'name_ar'}</Label>
              <Input className="h-9" value={emp?.name_ar || ''} onChange={ev => setEmpField('name_ar', ev.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'الرقم التأمينى' : 'social_insurance_no'}</Label>
              <Input className="h-9" value={emp?.social_insurance_no || ''} onChange={ev => setEmpField('social_insurance_no', ev.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'الرقم القومى' : 'national_id'}</Label>
              <Input className="h-9" value={emp?.national_id || ''} onChange={ev => setEmpField('national_id', ev.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'الجنسية' : 'nationality'}</Label>
              <Input className="h-9" value={emp?.nationality || ''} onChange={ev => setEmpField('nationality', ev.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'المؤهل' : 'education_ar'}</Label>
              <Input className="h-9" value={emp?.education_ar || ''} onChange={ev => setEmpField('education_ar', ev.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'المهنة' : 'job_title_ar'}</Label>
              <Input className="h-9" value={emp?.job_title_ar || ''} onChange={ev => setEmpField('job_title_ar', ev.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'تاريخ بدء الاشتراك' : 'social_insurance_start_date'}</Label>
              <Input className="h-9" value={emp?.social_insurance_start_date || ''} onChange={ev => setEmpField('social_insurance_start_date', ev.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'شارع' : 'address'}</Label>
              <Input className="h-9" value={emp?.address || ''} onChange={ev => setEmpField('address', ev.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'قسم / مركز' : 'city'}</Label>
              <Input className="h-9" value={emp?.city || ''} onChange={ev => setEmpField('city', ev.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'محافظة' : 'governorate'}</Label>
              <Input className="h-9" value={emp?.governorate || ''} onChange={ev => setEmpField('governorate', ev.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'رقم التليفون' : 'phone'}</Label>
              <Input className="h-9" value={emp?.phone || ''} onChange={ev => setEmpField('phone', ev.target.value)} />
            </div>
          </div>
          <div className="mb-3 text-sm font-semibold">{isAr ? 'بيانات إضافية للاستمارة' : 'Additional form data'}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'مكتب التأمينات' : 'office'}</Label>
              <Input className="h-9" value={extra.office} onChange={e => setExtra(p => ({ ...p, office: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'مقدم الطلب' : 'applicant'}</Label>
              <Input className="h-9" value={extra.applicant} onChange={e => setExtra(p => ({ ...p, applicant: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'صفة مقدم الطلب' : 'applicantRole'}</Label>
              <Input className="h-9" value={extra.applicantRole} onChange={e => setExtra(p => ({ ...p, applicantRole: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'القطاع' : 'sector'}</Label>
              <Input className="h-9" value={extra.sector} onChange={e => setExtra(p => ({ ...p, sector: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'كود الاشتراك' : 'subCode'}</Label>
              <Input className="h-9" value={extra.subCode} onChange={e => setExtra(p => ({ ...p, subCode: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'نوع المدة' : 'periodType'}</Label>
              <Input className="h-9" value={extra.periodType} onChange={e => setExtra(p => ({ ...p, periodType: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'أجر / دخل الاشتراك' : 'wage'}</Label>
              <Input className="h-9" value={extra.wage} onChange={e => setExtra(p => ({ ...p, wage: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'الأجر الشامل' : 'totalWage'}</Label>
              <Input className="h-9" value={extra.totalWage} onChange={e => setExtra(p => ({ ...p, totalWage: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'عقار رقم' : 'buildingNo'}</Label>
              <Input className="h-9" value={extra.buildingNo} onChange={e => setExtra(p => ({ ...p, buildingNo: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'قرية' : 'village'}</Label>
              <Input className="h-9" value={extra.village} onChange={e => setExtra(p => ({ ...p, village: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'تحريراً في' : 'writtenAt'}</Label>
              <Input className="h-9" value={extra.writtenAt} onChange={e => setExtra(p => ({ ...p, writtenAt: e.target.value }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 h-[75vh]">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />{isAr ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : emp ? (
            <iframe srcDoc={html} title="form-01" className="w-full h-full bg-white rounded-md border" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <FileSpreadsheet className="h-8 w-8" />
              {isAr ? 'اختر اسم الموظف لعرض الاستمارة' : 'Select an employee to view the form'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
