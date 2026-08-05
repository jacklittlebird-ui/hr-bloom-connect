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
  facilityName: string; facilityNo: string;
}

const line = (v: string | null | undefined, w = '100%') =>
  `<span class="fill" style="min-width:${w}">${esc(v) || '&nbsp;'}</span>`;

const buildHtml = (e: Emp, logoUrl: string, x: Form01Extra) => `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>نموذج رقم 1 - ${esc(e.name_ar)}</title>
<style>
@page { size: A4; margin: 10mm; }
* { box-sizing: border-box; }
body { font-family: "Arial", "Tahoma", sans-serif; direction: rtl; color: #000; margin: 0; font-size: 13px; line-height: 1.9; }
.sheet { width: 190mm; margin: 0 auto; }
.hdr { display: flex; align-items: flex-start; gap: 10px; }
.hdr img { height: 70px; }
.hdr .mid { flex: 1; text-align: center; }
.org { font-size: 17px; font-weight: bold; }
.formno { border: 1px solid #000; padding: 2px 10px; font-weight: bold; font-size: 13px; white-space: nowrap; }
h1 { font-size: 17px; font-weight: bold; text-align: center; margin: 10px 0 14px; text-decoration: underline; }
.row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 9px; flex-wrap: nowrap; }
.row > .grow { flex: 1; display: flex; align-items: baseline; gap: 6px; }
.lbl { font-weight: bold; white-space: nowrap; }
.fill { flex: 1; border-bottom: 1px dotted #000; padding: 0 4px; min-height: 18px; font-weight: bold; }
.boxes { display: inline-flex; direction: ltr; }
.box { width: 19px; height: 22px; border: 1px solid #000; margin-inline-start: -1px; text-align: center; font-size: 13px; line-height: 21px; font-weight: bold; }
.opt { display: inline-flex; align-items: center; gap: 4px; margin-inline-end: 18px; white-space: nowrap; }
.chk { display: inline-block; width: 14px; height: 14px; border: 1px solid #000; text-align: center; line-height: 13px; font-size: 11px; }
.num { font-weight: bold; margin-inline-end: 2px; }
.sep { border: 0; border-top: 1px solid #000; margin: 12px 0; }
.note { margin-top: 10px; font-size: 11px; font-weight: bold; }
</style></head><body>
<div class="sheet">
  <div class="hdr">
    <img src="${logoUrl}" alt="" />
    <div class="mid"><div class="org">الهيئة القومية للتأمين الاجتماعى</div></div>
    <div class="formno">نموذج رقم ( 1 )</div>
  </div>

  <div class="row" style="margin-top:6px">
    <span class="lbl">مكتب :</span>${line(x.office, '60mm')}
    <span style="flex:1"></span>
  </div>

  <h1>طلــــــب اشتراك مــؤمــــن عليـــــــه</h1>

  <div class="row">
    <span class="lbl">الفئة :</span>
    <span class="opt"><span class="num">1</span><span class="chk">√</span>عاملين لدى الغير</span>
    <span class="opt"><span class="num">2</span><span class="chk"></span>أصحاب أعمال لهم منشآت</span>
    <span class="opt"><span class="num">3</span><span class="chk"></span>العاملين بالمخابز</span>
  </div>

  <div class="row">
    <span class="grow"><span class="lbl">مقدم الطلب :</span>${line(x.applicant)}</span>
    <span class="grow"><span class="lbl">صفة مقدم الطلب :</span>${line(x.applicantRole)}</span>
  </div>

  <hr class="sep" />

  <div class="row">
    <span class="lbl">الرقم التأمينى :</span>${boxes(e.social_insurance_no, 9)}
    <span class="grow" style="margin-inline-start:16px"><span class="lbl">رقم التليفون :</span>${line(e.phone)}</span>
  </div>

  <div class="row">
    <span class="lbl">الرقم القومى :</span>${boxes(e.national_id, 14)}
  </div>

  <div class="row">
    <span class="grow"><span class="lbl">اسم المؤمن عليه :</span>${line(e.name_ar)}</span>
    <span class="lbl" style="margin-inline-start:16px">الجنسية :</span>${line(e.nationality || 'مصري', '30mm')}
  </div>

  <div class="row">
    <span class="grow"><span class="lbl">المؤهل :</span>${line(e.education_ar)}</span>
    <span class="grow" style="margin-inline-start:16px"><span class="lbl">المهـنة :</span>${line(e.job_title_ar)}</span>
  </div>

  <div class="row">
    <span class="grow"><span class="lbl">تاريــخ بــدء الإشــتراك :</span>${line(e.social_insurance_start_date ? new Date(e.social_insurance_start_date).toLocaleDateString('en-GB') : '')}</span>
    <span class="grow" style="margin-inline-start:16px"><span class="lbl">القطــاع :</span>${line(x.sector)}</span>
  </div>

  <div class="row">
    <span class="grow"><span class="lbl">كـود الاشــتراك :</span>${line(x.subCode)}</span>
    <span class="grow" style="margin-inline-start:16px"><span class="lbl">نوع المــدة :</span>${line(x.periodType)}</span>
  </div>

  <div class="row">
    <span class="grow"><span class="lbl">أجر / دخل الإشتراك :</span>${line(x.wage)}<span class="lbl">جنيــه</span></span>
    <span class="grow" style="margin-inline-start:16px"><span class="lbl">الأجر الشامل :</span>${line(x.totalWage)}<span class="lbl">جنيــه</span></span>
  </div>

  <div class="row">
    <span class="grow"><span class="lbl">بيانات العجز إن وجدت : تاريخ بداية العجز :</span>${line('')}</span>
    <span class="grow" style="margin-inline-start:16px"><span class="lbl">نسبة العجز :</span>${line('')}<span class="lbl">%</span></span>
  </div>

  <div class="row">
    <span class="lbl">استيفاء الكشف الطبي الإبتدائى :</span>
    <span class="opt">نعم<span class="chk">√</span></span>
    <span class="opt">لا<span class="chk"></span></span>
  </div>

  <hr class="sep" />

  <div class="row">
    <span class="lbl">نوع المنشأة :</span>
    <span class="opt">نمطى<span class="chk">√</span></span>
    <span class="opt">سيارة<span class="chk"></span></span>
    <span class="opt">مركب صيد<span class="chk"></span></span>
    <span class="opt">مخابز بلدية<span class="chk"></span></span>
  </div>

  <div class="row">
    <span class="grow"><span class="lbl">اسم المنشأة :</span>${line(x.facilityName)}</span>
    <span class="lbl" style="margin-inline-start:16px">رقم المنشأة :</span>${boxes(x.facilityNo, 9)}
  </div>

  <div class="row">
    <span class="lbl">عقار رقم :</span>${line(x.buildingNo, '25mm')}
    <span class="grow"><span class="lbl">شارع :</span>${line(e.address)}</span>
    <span class="grow"><span class="lbl">قرية :</span>${line(x.village)}</span>
  </div>

  <div class="row">
    <span class="grow"><span class="lbl">قسم / مركز :</span>${line(e.city)}</span>
    <span class="grow" style="margin-inline-start:16px"><span class="lbl">محافظة :</span>${line(e.governorate)}</span>
  </div>

  <hr class="sep" />

  <div class="row" style="margin-top:16px">
    <span class="grow"><span class="lbl">توقيع المؤمن عليه :</span>${line('')}</span>
    <span class="grow" style="margin-inline-start:16px"><span class="lbl">توقيع صاحب العمل / المدير المسئول :</span>${line('')}</span>
  </div>

  <div class="row">
    <span class="grow"><span class="lbl">رقم التليفــون :</span>${line(e.phone)}</span>
    <span class="grow" style="margin-inline-start:16px"><span class="lbl">تحـــريراً في :</span>${line(x.writtenAt)}</span>
  </div>

  <div class="row" style="margin-top:14px">
    <span class="grow"><span class="lbl">توقيع الموظف المختص بالمطابقة :</span>${line('')}</span>
    <span class="grow" style="margin-inline-start:16px"><span class="lbl">تاريخ المطابقة :</span>${line('&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;/')}</span>
  </div>

  <div class="note">ملحوظة: على صاحب العمل والعامل الإطلاع على التوجيهات الموضحة خلف النموذج مع التوقيع على الإقرار.&nbsp;&nbsp;&nbsp; (انظر خلفه)</div>
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
    facilityName: 'لينك أيرو تريدنج أجنسي', facilityNo: '6297031',

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
