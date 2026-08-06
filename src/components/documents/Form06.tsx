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
  email: string | null;
}

const PAGE = 1000;

const digits = (v: string | null | undefined, len: number) => {
  const d = (v || '').replace(/\D/g, '').slice(0, len);
  return Array.from({ length: len }, (_, i) => d[i] || '');
};

const boxes = (v: string | null | undefined, len: number) =>
  `<span class="boxes">${digits(v, len).map(d => `<span class="box">${d}</span>`).join('')}</span>`;

const boxesRev = (v: string | null | undefined, len: number) =>
  `<span class="boxes">${digits(v, len).reverse().map(d => `<span class="box">${d}</span>`).join('')}</span>`;

const esc = (s: string | null | undefined) => (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

const line = (v: string | null | undefined, w = 'auto') =>
  `<span class="fill" style="min-width:${w}">${esc(v) || '&nbsp;'}</span>`;

// Always-empty date boxes (no dates printed on this form)
const emptyDateBoxes = () =>
  `<span class="boxes">${[0, 1].map(() => `<span class="box"></span>`).join('')}</span>
    <span class="slash">/</span>
    <span class="boxes">${[0, 1].map(() => `<span class="box"></span>`).join('')}</span>
    <span class="slash">/</span>
    <span class="boxes">${[0, 1, 2, 3].map(() => `<span class="box"></span>`).join('')}</span>`;

const emptyAmountBoxes = () =>
  `<span class="boxes">${Array.from({ length: 6 }).map(() => `<span class="box"></span>`).join('')}</span>`;

export interface Form06Extra {
  office: string; buildingNo: string; area: string; village: string;
  facilityName: string; facilityNo: string;
  applicantName: string; applicantRole: string; applicantInsNo: string;
  applicantPhone: string; applicantNid: string; address: string;
}

const buildHtml = (e: Emp, logoUrl: string, x: Form06Extra) => `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title> </title>
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { font-family: "Arial", "Tahoma", sans-serif; direction: rtl; color: #000; margin: 0; font-size: 15px; line-height: 1.6; }
.sheet { width: 200mm; min-height: 297mm; margin: 0 auto; padding: 6mm 8mm; }
.hdr { display: flex; align-items: flex-start; gap: 8px; }
.hdr .side { flex: 1; }
.hdr img { height: 76px; max-width: 90px; width: auto; display: block; margin: 0 auto; }
.org { font-size: 16px; font-weight: bold; }
.formno { font-size: 16px; font-weight: bold; text-align: left; }
.office { font-size: 15px; font-weight: bold; }
.rule { border-top: 2px solid #000; margin: 6px 0 10px; }
h1 { font-size: 20px; font-weight: bold; text-align: center; margin: 4px 0 10px; text-decoration: underline; }
.row { display: flex; align-items: center; gap: 8px; margin: 9px 0; }
.cell { display: flex; align-items: center; gap: 5px; }
.cell.grow { flex: 1; }
.lbl { font-weight: bold; white-space: nowrap; }
.fill { flex: 1; border-bottom: 1px dotted #000; padding: 0 4px; min-height: 18px; font-weight: bold; }
.boxes { display: inline-flex; direction: ltr; }
.box { width: 23px; height: 25px; border: 1px solid #000; margin-inline-start: -1px; text-align: center; font-size: 14px; line-height: 24px; font-weight: bold; }
.slash { font-weight: bold; margin: 0 2px; }
.note { margin-top: 12px; font-size: 15px; font-weight: bold; }
.secwrap { display:flex; align-items:center; gap:0; margin:14px 0 10px; }
.secwrap:before,.secwrap:after { content:""; border-top:1.5px solid #000; flex:1; }
.sec { font-weight:bold; font-size:17px; text-align:center; border:1.5px solid #000; border-radius:9px; padding:4px 22px; }
.pagebreak { page-break-before: always; break-before: page; height: 0; }
.decl { margin-top: 10px; font-size: 15.5px; line-height: 2; text-align: justify; }
.page2 h1 { font-size: 20px; margin: 6px 0 10px; }
.guide { margin:0; padding-inline-start:20px; font-size:15.5px; line-height:2; text-align:justify; }
.guide li { margin-bottom:10px; }
.signs { display:flex; justify-content:space-around; margin-top:12px; font-weight:bold; text-align:center; }
.signline { margin-top:6px; font-weight:normal; }
.stamp { border:1px solid #000; border-radius:50%; padding:10px 24px; font-weight:bold; font-size:14px; display:inline-block; }
.dt { font-weight:bold; white-space:nowrap; }
.hr { border-top:1.5px solid #000; margin:14px 0 8px; }
</style></head><body>
<div class="sheet">
  <div class="hdr">
    <div class="side">
      <div class="org">الهيئة القومية للتأمين الاجتماعي</div>
      <div class="office">مكتب ${esc(x.office) ? ': ' + esc(x.office) : '.............................'}</div>
    </div>
    <img src="${logoUrl}" alt="" />
    <div class="side formno">نموذج رقم ( ٦ )</div>
  </div>
  <div class="rule"></div>
  <h1>إخطار بإنتهاء اشتراك مؤمن عليه</h1>

  <div class="secwrap"><div class="sec">بيانات مقدم الطلب</div></div>
  <div class="row">
    <span class="cell grow"><span class="lbl">مقدم الطلب :</span>${line(x.applicantName)}</span>
    <span class="cell grow"><span class="lbl">صفة مقدم الطلب :</span>${line(x.applicantRole)}</span>
  </div>
  <div class="row">
    <span class="cell"><span class="lbl">رقم تأمينى :</span>${boxes(x.applicantInsNo, 9)}</span>
    <span class="cell grow"><span class="lbl">رقم التليفون :</span>${line(x.applicantPhone)}</span>
  </div>
  <div class="row">
    <span class="cell"><span class="lbl">رقم القومى :</span>${boxes(x.applicantNid, 14)}</span>
  </div>

  <div class="secwrap"><div class="sec">بيانات المؤمن عليه</div></div>
  <div class="row">
    <span class="cell"><span class="lbl">الرقم التأمينى :</span>${boxes(e.social_insurance_no, 9)}</span>
    <span class="cell grow"><span class="lbl">الاســـــم :</span>${line(e.name_ar)}</span>
  </div>
  <div class="row">
    <span class="cell"><span class="lbl">الرقم القومى :</span>${boxes(e.national_id, 14)}</span>
  </div>
  <div class="row">
    <span class="cell"><span class="lbl">رقم المنشأة :</span>${boxes(x.facilityNo, 9)}</span>
    <span class="cell grow"><span class="lbl">اسم المنشأة :</span>${line(x.facilityName)}</span>
  </div>
  <div class="row">
    <span class="cell"><span class="lbl">تاريخ انتهاء الاشتراك :</span>${emptyDateBoxes()}</span>
    <span class="cell grow"><span class="lbl">سبب انتهاء الاشتراك :</span>${line('')}</span>
  </div>

  <div class="secwrap"><div class="sec">إقـرار المؤمن عليه والمدير المسئول</div></div>
  <div class="decl">أقـر أن البيانات بعاليه صحيحة وأن المؤمن عليه تسلم صورة من هذا الإخطار.</div>
  <div class="row">
    <span class="cell grow"><span class="lbl">توقيع المؤمن عليه</span>${line('')}<span class="dt">/ &nbsp; / ٢٠</span></span>
    <span class="cell grow"><span class="lbl">توقيع المدير المسئول</span>${line('')}<span class="dt">/ &nbsp; / ٢٠ .</span></span>
  </div>
  <div class="row"><span class="cell grow"><span class="lbl">تم مطابقة التوقيع بمعرفتي /</span>${line('')}</span></div>

  <div class="secwrap"><div class="sec">إقـرار المدير المسئول في حالة وجود نزاع</div></div>
  <div class="decl">أقـر أن البيانات بعاليه صحيحة وانني أرسلت صورة من هذا الإخطار إلى المؤمن عليه بخطاب موصى عليه بعلـم الوصول برقم ${line('', '60mm')} بتاريخ &nbsp; / &nbsp; / ٢٠ .</div>
  <div class="row" style="margin-top:14px">
    <span class="cell"><span class="stamp">خاتـم الجهـة</span></span>
    <span class="sp" style="flex:1"></span>
    <span class="cell grow" style="flex-direction:column; align-items:stretch">
      <div style="text-align:center; font-weight:bold">تم مطابقة التوقيع بمعرفتي</div>
      <div class="cell"><span class="lbl">توقيع المدير المسئول</span>${line('')}<span class="dt">/ &nbsp; / ٢٠</span></div>
    </span>
  </div>

  <div class="secwrap"><div class="sec">إقـرار المؤمن عليه في حالة وجود نزاع</div></div>
  <div class="decl">أقـر أن البيانات بعاليه صحيحة وان صاحب العمل امتنع عن ( توقيع / تقديم ) نموذج انتهاء الخدمه</div>
  <div class="row"><span class="cell grow"><span class="lbl">توقيع المؤمن عليه</span>${line('')}<span class="dt">/ &nbsp; / ٢٠</span></span></div>

  <div class="hr"></div>
  <div class="note"><u>ملحوظــة</u> : يلزم التأكد من توقيع كل من العامل أوصاحب العمل على الإقرار الموضح خلف النموذج.</div>
  <div class="row" style="margin-top:14px"><span class="cell grow"><span class="lbl">توقيع مقدم الطلب</span>${line('')}<span class="dt">/ &nbsp; / ٢٠</span></span></div>

  <div style="margin-top:16px; font-weight:bold">(انظـر خلفه)</div>
</div>

<div class="pagebreak"></div>

<div class="sheet page2">
  <h1>إرشـــــادات</h1>
  <ol class="guide">
    <li>يحرر هذا النموذج ويرسل للهيئة خلال أسبوع من تاريخ تحقق إحدى الوقائع الآتية:<br>أ- انتهاء خدمة المؤمن عليه.<br>ب- انتهاء مدة التلمذة الصناعية أو التدرج.<br>ج- انتهاء العمل بالمشروع الصيفي للطلبة.</li>
    <li>في حالة إخلال صاحب العمل بالإخطار في الموعد المشار إليه بالنسبة للمؤمن عليهم في البند (أ) من رقم (1) يلتزم بأداء مبلغ إضافي يقدر بنسبة (٢٠٪) من قيمة الاشتراك المستحق عن الشهر الأخير وذلك عن كل شهر تأخير عن المدة من تاريخ انتهاء الخدمة حتى تاريخ إرسال النموذج للهيئة وفي حساب مدة التأخير يحذف كسر الشهر.</li>
  </ol>

  <h1 style="margin-top:16px">إقـــــرار</h1>
  <div class="row">
    <span class="cell grow"><span class="lbl">اسم المنشأة :</span>${line(x.facilityName)}</span>
    <span class="cell"><span class="lbl">رقمها التأمينى :</span>${boxes(x.facilityNo, 10)}</span>
  </div>
  <div class="row"><span class="cell grow"><span class="lbl">العنــــــوان :</span>${line(x.address)}</span></div>
  <div class="row">
    <span class="cell grow"><span class="lbl">اسم المؤمن عليه :</span>${line(e.name_ar)}</span>
    <span class="cell"><span class="lbl">رقمه التأمينى :</span>${boxes(e.social_insurance_no, 10)}</span>
  </div>

  <div class="decl">٣- أقر أنا الموقع أدناه بأنني قد قمت بسحب البطاقة العلاجية من المؤمن عليه وتم تسليمها لفرع الهيئة المعنية بالتأمين الصحي وفي حالة ظهور ما يخالف ذلك أكون مسئولاً بالتضامن مع العامل في مواجهة الهيئة المعنية بالتأمين الصحي عن كافة مصاريف العلاج والرعاية الطبية تعويضاً عن الانتفاع بدون وجه حق بمزايا العلاج والرعاية الطبية بعد انتهاء الخدمة.</div>
  <div class="signs"><div>توقيع المؤمن عليه<div class="signline">(...............................)</div></div><div>توقيع صاحب العمل<div class="signline">(...............................)</div></div></div>

  <div class="decl">٤- أقر أنا الموقع أدناه بأن المؤمن عليه محل هذا النموذج قد رفض تسليم البطاقة العلاجية وقمت بإخطار الهيئة المعنية بالتأمين الصحي ببيانات المؤمن عليه لإيقاف التعامل معه.</div>
  <div class="signs"><div></div><div>توقيع صاحب العمل<div class="signline">(...............................)</div></div></div>
</div>

</body></html>`;


export const Form06 = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [emp, setEmp] = useState<Emp | null>(null);
  const [extra, setExtra] = useState<Form06Extra>({
    office: 'الزمالك', buildingNo: '', area: '', village: '',
    facilityName: 'لينك أيرو تريدنج أجنسي', facilityNo: '1307926',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all: Emp[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('employees')
          .select('id, employee_code, name_ar, social_insurance_no, national_id, education_ar, address, city, governorate, job_title_ar, nationality, phone, email')
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
    }, 500);
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
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'البريد الإلكتروني' : 'email'}</Label>
              <Input className="h-9" value={emp?.email || ''} onChange={ev => setEmpField('email', ev.target.value)} />
            </div>
          </div>
          <div className="mb-3 text-sm font-semibold">{isAr ? 'بيانات إضافية للاستمارة' : 'Additional form data'}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'مكتب التأمينات' : 'office'}</Label>
              <Input className="h-9" value={extra.office} onChange={e => setExtra(p => ({ ...p, office: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'عقار رقم' : 'buildingNo'}</Label>
              <Input className="h-9" value={extra.buildingNo} onChange={e => setExtra(p => ({ ...p, buildingNo: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'شياخة / قرية' : 'village'}</Label>
              <Input className="h-9" value={extra.village} onChange={e => setExtra(p => ({ ...p, village: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'اسم المنشأة' : 'facilityName'}</Label>
              <Input className="h-9" value={extra.facilityName} onChange={e => setExtra(p => ({ ...p, facilityName: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{isAr ? 'رقم المنشأة' : 'facilityNo'}</Label>
              <Input className="h-9" value={extra.facilityNo} onChange={e => setExtra(p => ({ ...p, facilityNo: e.target.value }))} />
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
            <iframe srcDoc={html} title="form-06" className="w-full h-full bg-white rounded-md border" />
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
