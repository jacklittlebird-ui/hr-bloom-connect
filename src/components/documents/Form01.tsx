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
@page { size: A4; margin: 10mm; }
body { font-family: "Arial", "Tahoma", sans-serif; direction: rtl; color: #000; margin: 0; }
.sheet { width: 190mm; margin: 0 auto; border: 2px solid #000; padding: 6mm; box-sizing: border-box; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 2px solid #000; padding-bottom: 4px; }
.head img { height: 70px; }
.head .c { text-align: center; flex: 1; }
.head .t1 { font-size: 15px; font-weight: bold; }
.head .t2 { font-size: 13px; margin-top: 4px; }
h1 { font-size: 16px; text-align: center; margin: 8px 0; text-decoration: underline; }
.row { display: flex; align-items: center; gap: 6px; margin: 5px 0; font-size: 12.5px; }
.lbl { font-weight: bold; white-space: nowrap; }
.val { border-bottom: 1px dotted #000; flex: 1; min-height: 18px; padding: 0 4px; font-weight: bold; }
.boxes { display: inline-flex; direction: ltr; }
.box { width: 17px; height: 21px; border: 1px solid #000; margin-inline-start: -1px; text-align: center; font-size: 12px; line-height: 21px; font-weight: bold; }
.sec { border: 1px solid #000; padding: 5px 7px; margin-top: 7px; }
.sec-title { font-weight: bold; font-size: 12.5px; margin-bottom: 4px; }
.chk { display: inline-block; width: 13px; height: 13px; border: 1px solid #000; margin-inline-end: 4px; text-align: center; line-height: 13px; font-size: 11px; vertical-align: middle; }
.grid2 { display: flex; gap: 14px; }
.grid2 > * { flex: 1; }
.sign { display: flex; justify-content: space-between; margin-top: 18px; font-size: 12.5px; font-weight: bold; }
.note { margin-top: 12px; font-size: 11px; font-weight: bold; border-top: 1px solid #000; padding-top: 5px; }
</style></head><body>
<div class="sheet">
  <div class="head">
    <img src="${logoUrl}" alt="" />
    <div class="c">
      <div class="t1">الهيئة القومية للتأمين الاجتماعى</div>
      <div class="t2">مكتب : ${esc(x.office)}</div>
    </div>
    <div style="font-size:13px;font-weight:bold;border:1px solid #000;padding:4px 8px;">نموذج رقم ( 1 )</div>
  </div>

  <h1>طلــــب اشتراك مــؤمــن عليــه</h1>

  <div class="sec">
    <div class="sec-title">الفئة</div>
    <div class="row">
      <span><span class="chk">√</span>عاملين لدى الغير</span>
      <span><span class="chk"></span>أصحاب أعمال لهم منشآت</span>
      <span><span class="chk"></span>العاملين بالمخابز</span>
    </div>
  </div>

  <div class="sec">
    <div class="grid2">
      <div class="row"><span class="lbl">مقدم الطلب :</span><span class="val">${esc(x.applicant)}</span></div>
      <div class="row"><span class="lbl">صفة مقدم الطلب :</span><span class="val">${esc(x.applicantRole)}</span></div>
    </div>
  </div>

  <div class="sec">
    <div class="row"><span class="lbl">اسم المؤمن عليه :</span><span class="val">${esc(e.name_ar)}</span></div>
    <div class="row"><span class="lbl">الرقم التأمينى :</span>${boxes(e.social_insurance_no, 9)}<span style="flex:1"></span><span class="lbl">رقم التليفون :</span><span class="val">${esc(e.phone)}</span></div>
    <div class="row"><span class="lbl">الرقم القومى :</span>${boxes(e.national_id, 14)}</div>
    <div class="grid2">
      <div class="row"><span class="lbl">الجنسية :</span><span class="val">${esc(e.nationality) || 'مصري'}</span></div>
      <div class="row"><span class="lbl">المؤهل :</span><span class="val">${esc(e.education_ar)}</span></div>
      <div class="row"><span class="lbl">المهـنة :</span><span class="val">${esc(e.job_title_ar)}</span></div>
    </div>
    <div class="grid2">
      <div class="row"><span class="lbl">تاريــخ بــدء الإشــتراك :</span><span class="val">${e.social_insurance_start_date ? new Date(e.social_insurance_start_date).toLocaleDateString('en-GB') : ''}</span></div>
      <div class="row"><span class="lbl">القطــاع :</span><span class="val">${esc(x.sector)}</span></div>
      <div class="row"><span class="lbl">كـود الاشــتراك :</span><span class="val">${esc(x.subCode)}</span></div>
    </div>
    <div class="grid2">
      <div class="row"><span class="lbl">نوع المــدة :</span><span class="val">${esc(x.periodType)}</span></div>
      <div class="row"><span class="lbl">أجر / دخل الإشتراك :</span><span class="val">${esc(x.wage)}</span><span>جنيــه</span></div>
      <div class="row"><span class="lbl">الأجر الشامل :</span><span class="val">${esc(x.totalWage)}</span></div>
    </div>
    <div class="grid2">
      <div class="row"><span class="lbl">بيانات العجز إن وجدت : تاريخ بداية العجز :</span><span class="val"></span></div>
      <div class="row"><span class="lbl">نسبة العجز :</span><span class="val"></span><span>%</span></div>
    </div>
    <div class="row"><span class="lbl">استيفاء الكشف الطبي الإبتدائى :</span><span><span class="chk"></span>نعم</span><span><span class="chk"></span>لا</span></div>
  </div>

  <div class="sec">
    <div class="row">
      <span class="lbl">نوع المنشأة :</span>
      <span><span class="chk">√</span>نمطى</span>
      <span><span class="chk"></span>سيارة</span>
      <span><span class="chk"></span>مركب صيد</span>
      <span><span class="chk"></span>مخابز بلدية</span>
    </div>
    <div class="grid2">
      <div class="row"><span class="lbl">اسم المنشأة :</span><span class="val">لينك أيرو تريدنج أجنسي</span></div>
      <div class="row"><span class="lbl">رقم المنشأة :</span><span class="val">1307926</span></div>
    </div>
    <div class="grid2">
      <div class="row"><span class="lbl">عقار رقم :</span><span class="val">${esc(x.buildingNo)}</span></div>
      <div class="row"><span class="lbl">شارع :</span><span class="val">${esc(e.address)}</span></div>
      <div class="row"><span class="lbl">قرية :</span><span class="val">${esc(x.village)}</span></div>
    </div>
    <div class="grid2">
      <div class="row"><span class="lbl">قسم / مركز :</span><span class="val">${esc(e.city)}</span></div>
      <div class="row"><span class="lbl">محافظة :</span><span class="val">${esc(e.governorate)}</span></div>
      <div class="row"><span class="lbl">رقم التليفــون :</span><span class="val">${esc(e.phone)}</span></div>
    </div>
  </div>

  <div class="sign">
    <span>توقيع المؤمن عليه : ..........................</span>
    <span>توقيع صاحب العمل / المدير المسئول : ..........................</span>
  </div>
  <div class="row" style="margin-top:14px;"><span class="lbl">تحـريراً في :</span><span class="val" style="max-width:120px">${esc(x.writtenAt)}</span>
    <span style="flex:1"></span>
    <span class="lbl">توقيع الموظف المختص بالمطابقة :</span><span class="val" style="max-width:150px"></span>
    <span class="lbl">تاريخ المطابقة :</span><span class="val" style="max-width:120px">/        /</span>
  </div>
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
  const html = selected ? buildHtml(selected, nosiLogo.url, extra) : '';

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
          <Button onClick={print} disabled={!selected} className="gap-2">
            <Printer className="h-4 w-4" />{isAr ? 'طباعة / PDF' : 'Print / PDF'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
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
          ) : selected ? (
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
