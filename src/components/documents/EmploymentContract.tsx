import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronsUpDown, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoAsset from '@/assets/link-aero-logo.png.asset.json';

interface Emp {
  id: string;
  employee_code: string;
  name_ar: string;
  national_id: string | null;
  social_insurance_no: string | null;
  education_ar: string | null;
  address: string | null;
  city: string | null;
  governorate: string | null;
  nationality: string | null;
}

const PAGE = 1000;

const esc = (s: string | null | undefined) =>
  (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

const dots = (n = 80) => '.'.repeat(n);

const line = (v: string | null | undefined, n = 80) =>
  `<span class="fill">${esc(v) || dots(n)}</span>`;

const nidBoxes = (v: string | null | undefined) => {
  const d = (v || '').replace(/\D/g, '').slice(0, 14);
  const cells = Array.from({ length: 14 }, (_, i) => d[i] || '');
  return `<span class="boxes">${cells.map(c => `<span class="box">${c}</span>`).join('')}</span>`;
};

type Duration = 'six_months' | 'year';

const buildHtml = (e: Emp, duration: Duration, logoUrl: string) => {
  const durationText =
    duration === 'year' ? 'لمدة سنة ميلادية' : 'لمدة ستة أشهر';
  const residence = [e.address, e.city, e.governorate].filter(Boolean).join(' - ');

  const raw = `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><title> </title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 18mm 18mm 20mm; }
* { box-sizing: border-box; }
body { font-family: "Baloo Bhaijaan 2","Tahoma",sans-serif; direction: rtl; color:#000; margin:0; padding:0 4mm; font-size:13px; line-height:1.85; text-align: justify; }
.frame { position: fixed; inset: 0; border:1px solid #000; pointer-events:none; }
.foot { position: fixed; left:0; right:0; bottom:1mm; display:flex; justify-content:space-around; font-size:11px; letter-spacing:1px; }
.hdr { display:flex; flex-direction:row-reverse; align-items:center; gap:14px; margin-bottom:12px; }
.hdr img { width:78px; height:auto; }
h1 { flex:1; font-size:16px; text-align:center; font-weight:bold; margin:0; line-height:1.8; }
.bnd { font-weight:bold; text-align:center; margin:14px 0 6px; font-size:14.5px; }
.bnd span { display:block; }
p { margin:6px 0; }
.fill { font-weight:bold; }
.boxes { display:inline-flex; direction:ltr; margin:4px 0; }
.box { width:20px; height:24px; border:1px solid #000; margin-inline-start:-1px; text-align:center; font-size:13px; line-height:23px; font-weight:bold; }
.data p { margin:6px 0; }
.party { font-weight:bold; text-align:left; margin:2px 0 8px; }
.sign { display:flex; justify-content:space-between; margin-top:26px; font-weight:bold; }
.sign > div { width:45%; }
.sign .l { margin-top:14px; font-weight:normal; }
</style></head><body>
<div class="frame"></div>
<div class="foot"><span>${dots(24)}</span><span>${dots(24)}</span></div>

<div class="hdr">
  <img src="${logoUrl}" alt="Link Aero" />
  <h1>عقد عمل فردى محدد المدة<br/>وفقاً لأحكام قانون العمـــل<br/>رقم 14 لسنــــة 2025</h1>
</div>


<p>إنه فى يوم ${dots(40)} الموافق ${dots(12)} / ${dots(12)} / ${dots(20)}</p>
<p>بعد أن تم الاتفاق والتراضى بين الطرفين تحرر هذا العقد فيما بين كل من:</p>

<p><b>أولاً:</b> شركة لينــك أيــرو تريــدنج أجنســي الكائن مقرها 10 ش الجزيرة الوسطى – الزمالك – القاهرة، ويمثلها فى هذا العقد السيد/ جاك إسحق عبد المسيح، المصرى الجنسية ـ بصفته المدير المسؤول عن الموارد البشرية بالشركة.</p>
<div class="party">(طرف أول ـ صاحب عمل)</div>

<div class="data">
<p><b>ثانيًا:</b> السيد/ ${line(e.name_ar)} وبياناته كالآتى:</p>
<p>أ- الجنسية: ${line(e.nationality || 'مصرى')}</p>
<p>ب- محل الإقامة: ${line(residence)}</p>
<p>جـ- بطاقة تحقيق شخصية رقم</p>
<p>${nidBoxes(e.national_id)}</p>
<p>د- المؤهل: ${line(e.education_ar, 40)} &nbsp;&nbsp; هـ- الرقم التأمينى: ${line(e.social_insurance_no, 20)}</p>
<div class="party">(طرف ثان ـ عامل)</div>
</div>

<p>وبعد أن أقر الطرفين بأهليتهما الكاملة للتعاقد فقد تلاقت إرادتهما على إبرام هذا العقد وفقاً للأحكام والشروط الآتية:</p>

<div class="bnd">تمهيـــــد</div>
<p>حيث إن الطرف الأول شركة لينك أيرو تريدنج أجنسي تعمل في نشاط توكيلات الطيران.</p>
<p>ولما كان لديها من الوظائف الشاغرة ما جعلها تعلن عن رغبتها فى تعيين عدد من العاملين بتلك الوظائف وإذ كان الطرف الثاني قد أبدى رغبته في الالتحاق بالعمل لدى الطرف الأول فى وظيفة ${dots(40)} ومن ثم فقد انعقدت إرادة الطرفين على إبرام هذا العقد وفقاً للأحكام والشروط الآتية:</p>

<div class="bnd">البنــد الأول ـ محتوى العقد</div>
<p>يعتبر التمهيد السابق جزء لا يتجزأ من هذا العقد ومكملاً ومفسراً له ولا يمكن أن ينفصل عنه بأى حال.</p>

<div class="bnd">البند الثانى ـ موضوع العقد</div>
<p>(2/1): بموجب هذا العقد اتفق الطرفان على أن يلتحق الطرف الثانى بالعمل لدى الطرف الأول وتحت إدارته وإشرافه اعتبارًا من ${dots(10)} / ${dots(10)} / ${dots(14)} فى وظيفة ${dots(40)}</p>
<p>(2/2): يحق للطرف الأول تكليف الطرف الثانى بأى عمل آخر إضافة إلى عمله الأصلى وتغيير وظيفته المسماة بالفقرة السابقة إلى وظيفة أخرى بما يتناسب مع مؤهلاته الدراسية والعملية مع التزامه بدرجة الطرف الثانى الوظيفية وأجره الأساسى.</p>
<p>(2/3): يحق للطرف الأول نقل الطرف الثانى إلى مقر عمل آخر داخل الشركة أو فروعها داخل جمهورية مصر العربية أو خارجها وبما لا يتعارض مع المسمى الوظيفى للطرف الثانى وفقاً لمتطلبات وحاجة العمل التى يقدرها بمعرفته الشخصية.</p>

<div class="bnd">البند الثالث ـ الأجــر</div>
<p>(3/1): تحدد الأجر الأساسى للطرف الثانى بمبلغ ${dots(14)} جم (فقط ${dots(40)} جنيهًا لا غير) والأجر المتغير بمبلغ ${dots(14)} جم (فقط ${dots(40)} جنيهًا لا غير) والبدلات بمبلغ ${dots(14)} جم (فقط ${dots(40)} جنيهًا لا غير) شهريًا من العملة المصرية تدفعه الشركة خلال السبعة أيام الأولى من الشهر التالي.</p>
<p>(3/2): يستقطع من الأجر المحدد بالفقرة السابقة – بما في ذلك أي علاوة إضافية أن وجدت – كافة المبالغ التي يوجب القانون خصمها من أجر الطرف الثاني ويشمل ذلك الضرائب والرسوم والاشتراكات أو غير ذلك من الالتزامات التي يفرضها القانون على الطرف الثاني ومن المفهوم أن الأجر المبين عاليه شامل لأعانة غلاء المعيشة وكافة العلاوات التي ينص عليها القانون. وغير شامل لبدل الإنتقال وبدل الملبس وبدل المأكل وبدل التمثيل وإيجار شقة والعهد الثابتة لإكراميات السائقين والعمال.. إلخ حسب ما تقره اللائحة الداخلية للشركة.</p>

<div class="bnd">البند الرابع ـ مدة العقد</div>
<p>(4/1): اتفق الطرفان على أن يكون هذا العقد محدد المدة ${durationText} تبدأ من ${dots(10)} / ${dots(10)} / ${dots(14)} وتنتهي فى ${dots(10)} / ${dots(10)} / ${dots(14)}</p>
<p>(4/2): ينتهي هذا العقد تلقائيًا بإنتهاء مدته دون الحاجة إلى إنذار مسبق للطرف الثانى أو صدور حكم قضائى بذلك أو فى حالة عدم حصول الطرف الثانى على الموافقات الأمنية من الجهات المختصة أو عدم تجديدها لأى سبب تراه الجهات الأمنية المختصة.</p>
<p>(4/3): يكون تعيين الطرف الثانى خلال الثلاثة شهور الأولى من مدة هذا العقد بمثابة فترة اختبار ويحق فيها للطرف الأول إنهاء هذا العقد بإرادته المنفردة دون أى أسباب ودون الحاجة إلى إنذار مسبق للطرف الثانى أو صدور حكم قضائى بذلك.</p>
<p>(4/4): لا يحق للطرف الثانى المطالبة بأى مكافآت أو تعويضات فى حالة إنهاء هذا العقد من جانب الطرف الأول خلال فترة الاختبار المبينة بالفقرة السابقة أيًا ما كانت أسباب ذلك الإنهاء ولا يستحق له سوى الأجر الأساسى والمتغير المتفق عليه بالبند الثالث من هذا العقد مستقطعًا منه كافة الضرائب والرسوم ومبلغ التأمينات الاجتماعية وكافة المبالغ الأخرى التى تستقطع بمقتضى القوانين واللوائح والنظم الداخلية المعمول بها لدى الطرف الأول.</p>
<p>(4/5): ينتهى هذا العقد بعجز الطرف الثانى عن تأدية عمله المنوط به عجزًا كليًا أيًا كان سبب هذا العجز.</p>
<p>(4/6): من المتفق عليه بين الطرفين أنه فى حالة رغبة الطرف الثاني فى إنهاء هذا العقد بإرادته المنفردة أثناء مدة سريانه يكون ملزماً بإخطار الطرف الأول بذلك بمدة لا تقل عن ثلاثة شهور وفى حالة مخالفة ذلك يلتزم بأن يؤدى للطرف الأول تعويض اتفاقي غير خاضع لرقابة القضاء قدره ما يعادل أجره لمدة ثلاثة شهور من آخر راتب شامل تقاضاه بمناسبة هذا العقد، ولا يخل ذلك بحق الطرف الأول فى المطالبة بالتعويض المنصوص عليه بالقانون 14 /2025 .</p>

<div class="bnd">البند الخامس ـ مسوغات التعيين</div>
<p>(5/1): يلتزم الطرف الثانى بتقديم كافة مسوغات التعيين وغيرها من المستندات التى تطلب منه للطرف الأول في خلال خمسة عشر يومًا من تاريخ التعيين، كما يقر بصحة البيانات الواردة بها كما يلتزم بإخطاره كتابة بأى تغيير يطرأ على أياً منها خلال ثلاثة أيام من تاريخ ذلك التغيير.</p>

<div class="bnd">البند السادس ـ ساعات العمل والراحات والإجازات</div>
<p>(6/1): يلتزم الطرف الثانى بقضاء مدة لا تقل عن ثمانى ساعات كاملة يومياً فى أداء مهام عمله دون أن يدخل فى حسابها الفترات المخصصة لتناول الطعام والراحة والتى لا يجوز أن تزيد فى مجموعها عن ساعة واحدة ويستثنى من ذلك العمال المخصصين لأعمال الحراسة والنظافة، ويحق للطرف الأول إجراء أى تعديل فى عدد ساعات العمل وفقاً لمقتضيات وحاجة العمل بالمنشأة بما لا يتعارض مع قانون العمل المعمول به، كما يحق له أيضًا تكليف الطرف الثانى بقضاء فترات معينة بعيدًا عن محل عمله سواء فى مصر أو فى الخارج كجزء من مهام وظيفته.</p>
<p>(6/2): يكون للطرف الثانى راحة أسبوعية لمدة يوم واحد (أربع وعشرين ساعة) وتحدد لائحة تنظيم العمل والجزاءات قواعد الحصول على تلك الراحات الأسبوعية.</p>
<p>(6/3): يحق للطرف الثانى الحصول على إجازة سنوية بأجر كامل للمدة المقرره قانوناً وفقاً لمدة خدمته بالمنشأة على أن يحدد الطرف الأول مواعيد تلك الإجازة حسب مقتضيات العمل وظروفه ولا يجوز للطرف الثانى الجمع بين إجازته السنوية وأي إجازة أخرى بإضافة أياً منهما للآخر.</p>
<p>(6/4): لا يجوز للطرف الثانى العمل لدى صاحب عمل آخر خلال مدة الراحة الاسبوعية أو الإجازة السنوية وإذا ثبت ذلك يحق للطرف الأول إنهاء هذا العقد فوراً دون الحاجة إلى إنذار الطرف الثانى مسبقاً أو صدور حكم قضائى بذلك كما يحق له حرمانه من أجره عن مدة تلك الراحة أو الإجازة.</p>
<p>(6/5): يمنح الطرف الثانى أجازة دورية وفقاً للقوانين المعمول بها عن كل أثنى عشر شهراً تقضى فى الخدمة ولا يحق الإنتفاع بها أو بجزء منها قبل مضى ستة أشهر من تاريخ هذا العقد ويحدد الطرف الأول مواعيد هذه الأجازة حسب ما تسمح به ظروف العمل وطبقا لما نصت عليه اللائحة الداخلية للشركة.</p>
<p>(6/6): يُمنح العامل أجازته السنوية خلال شهري يوليو وأغسطس من كل عام ويلتزم العامل بالقيام بالأجازة في هذا التاريخ وإذا رفض العامل كتابة القيام بالأجازة سقط حقه في اقتضاء مقابلها وذلك طبقًا للمادة 124 من القانون 14 /2025 .</p>
<p>(6/7): في حالة عدم قيام العامل بالتقدم على أجازة خلال السنة يعتبر هذا تنازلاً منه على هذه الأجازة ولا يحق له مطالبة الطرف الأول بمقابل رصيد إجازات خلال أو بعد إنتهاء علاقة العمل.</p>

<div class="bnd">البند السابع ـ التزامات وواجبات الطرف الثانى</div>
<p>(7/1): يلتزم الطرف الثانى ـ العامل والموظف ـ بأداء العمل المسند إليه بنفسه بمنتهى الدقة والأمانة وفقاً لقواعد وأحكام لائحة نظام العمل الداخلى للمنشأة وأن يبذل فى سبيل ذلك العناية الفائقة مراعيًا تنفيذ التعليمات والأوامر الصادرة له من رئيسه المباشرة أو أى رئيس له حق الإشراف عليه، كما يلتزم بتنفيذ كافة تعليمات السلامة والصحة المهنية المقررة بالمنشأة.</p>
<p>(7/2): يلتزم الطرف الثانى بان يراعى وينفذ كافة الأوامر والتعليمات التى تصدر اليه من الطرف الأول أو من من يفوضه بذلك ويقر الطرف الثانى بإطلاعه على لائحة النظام الأساسى والداخلى للشركة ولائحة الجزاءات والقرارات الداخلية الملحقة بها والتي تعتبر مكمله لهذا العقد، ويقر بقبوله بمضمونهم ويتعهد بخضوعه لكافة ما ورد فيهم وبجميع قرارات تنظيم العمل الداخلى للشركة، وقد أقر الطرف الثانى بموجب أحكام هذا العقد بأنه على دراية كاملة بطبيعة عمله وعلى علم تام بالمخاطر المهنية وطرق الوقاية من هذه المخاطر.</p>
<p>(7/3): يجب على الطرف الثانى الظهور بمظهر لائق يتفق وطبيعة عمل الوظيفة التى يؤديها على أن يرتدى الزى المخصص لها ـ إن وجد ـ طبقاً لما تحدده لائحة نظام العمل الداخلى للمنشأة.</p>
<p>(7/4): لا يجوز للطرف الثانى استغلال وظيفته أو اسم الطرف الأول لتحقيق مصلحة شخصية له أو غيره من أقاربه أو أصدقائه، كما لا يجوز له قبول أموال أو هدايا نقدية أو عينية أو عمولات أو أشياء أخرى بمناسبة قيامة بأعمال وظيفته.</p>
<p>(7/5): يلتزم الطرف الثانى بالمحافظة على أموال وممتلكات الطرف الأول وكذا جميع الأدوات والمعدات والأوراق الخاصة بالشركة والأشياء الأخرى المسلمة إليه بسبب وظيفته، كما يلتزم أيضاً بالمحافظة على العهد المالية وغيرها المسلمة إليه على سبيل الوديعة ويلتزم بتسليم تلك الأموال الى ما يحدده الطرف الأول على سبيل الوكالة وايضا يقر الطرف الثانى المحافظة على سرية نظام العمل بالمنشأة والمعلومات الخاصة بالطرف الأول وجميع عملائه سواء أثناء سريان هذا العقد أو بعد انتهائه لأى سبب ما ، وفى حالة إفشاء أياً منها ونتج عن ذلك إلحاق أضرار بالمنشأة ، يحق للطرف الأول ـ فى هذه الحالة ـ مطالبته بالتعويض المناسب الجابر لذلك الضرر.</p>
<p>(7/6): يلتزم الطرف الثانى بتسليم الطرف الأول جميع ما لديه من مستندات وأموال أو أدوات أو أى أشياء أخرى كانت قد سُلمت له بسبب تأدية أعمال وظيفته فور انتهاء هذا العقد وإنهاء علاقة العمل لأى سبب من الأسباب ولا يحق له الاحتفاظ بأصل أو صورة أى مستند من المستندات الخاصة بالعمل.</p>
<p>(7/7): يلتزم الطرف الثاني بحضور الدورات التدريبية التي ينظمها الطرف الأول والتي يعتبر جزءًا لا يتجزأ من متطلبات طبيعة العمل.</p>
<p>(7/8): يلتزم الطرف الثاني عند انتهاء علاقة العمل لأى سبب من الأسباب بسداد أية مبالغ نقدية يكون الطرف الأول قد أنفقها عليه فى سبيل تدريبه على أداء عمله من دورات تدريبية أو رحلات عمل تعريفية أو غير ذلك، على أن يعفى من هذا الالتزام بعد مرور مدة خمس سنوات كاملة من تاريخ حصوله على الدورة التدريبية أو رحلة العمل أو غيرها.</p>
<p>(7/9): لا يجوز للطرف الثانى أداء أى عمل للغير من ذات نوع عمل الطرف الأول أو أى عمل آخر سواء كان ذلك العمل مقابل أجر أو بدون أجر حتى ولو كان ذلك فى غير أوقات عمله أو فى أوقات راحته أو أجازته وفى حالة ثبوت ذلك يحق للطرف الأول إنهاء العقد فورًا دون استحقاق الطرف الثانى لأية مكافآت أو تعويض عن هذا.</p>
<p>(7/10): يحظر نهائياً على الطرف الثانى مزاولة أى نشاط أو عمل منافس لعمل الطرف الأول أثناء سريان هذا العقد وبعد إنتهائه بسنة كاملة، يكون من شأنه التأثير على العمل سلبًا أو إلحاق أى ضرر أو خسائر بالطرف الأول، وفى حالة حدوث ذلك يحق للطرف الأول إنهاء هذا العقد فورًا بإرادته المنفردة دون سابق إنذار للطرف الثانى أو صدور حكم قضائى بذلك، كما يحق له مطالبة الطرف الثانى بالتعويض المناسب لجبر ذلك الضرر.</p>
<p>(7/11): يحظر على الطرف الثانى تنظيم أى اجتماعات أو توزيع منشورات أو جمع توقيعات داخل مكان أو مجال العمل كما يحظر عليه أيضاً جمع أى نقود أو تبرعات بدون موافقة الطرف الأول كتابة على ذلك.</p>
<p>(7/12): يحظر نهائيًا على الطرف الثانى المبيت بمكان العمل أو التواجد به فى غير أوقات العمل لأى سبب من الأسباب دون موافقة الطرف الأول كتاباً على ذلك.</p>
<p>(7/13): يحق للطرف الأول إنهاء هذا العقد وفصل الطرف الثانى من عمله إذا ارتكب خطأ جسيمًا وعلى وجه الخصوص ارتكابه أحد الأفعال الواردة بالمادة 148 من قانون العمل رقم 14 /2025، كما يحق له إصدار قرارًا بإيقافه عن عمله إذا نسب إليه ارتكابه جناية أو جنحة مخلة بالشرف أو الأمانة أو الآداب العامة أو أى جنحة داخل دائرة العمل.</p>

<div class="bnd">البند الثامن ـ عدم المنافسة وسرية المعلومات</div>
<p>يلتزم الطرف الثاني بعدم العمل مع أية شركة منافسة للطرف الأول – وهي التي تقوم بذات غرضها أو أي جزء منه - بعد تركه العمل أو إنهاء هذا العقد لأي سبب من الأسباب إلا بعد مرور مدة لا تقل عن عام ميلادي من تاريخ إنهاء أو ترك العمل، وبشرط إخطار صاحب العمل كتابياً بعد فوات تلك المدة فى حالة رغبته فى الإلتحاق بأي عمل لدى شركة منافسة بمدة لا تقل عن شهر وإلا حق للطرف الأول إقتضاء التعويضات الجابرة لجميع الأضرار.</p>

<div class="bnd">البند التاسع ـ المراسلات</div>
<p>من المتفق عليه بين الطرفين ان جميع المراسلات والإخطارات والإنذارات المتبادلة بينهما تتم على عنوان كل منهما الموضح قرين أسمه بصدر هذا العقد، وفى حالة قيام أى من الطرفين بتغيير ذلك العنوان يكون ملزمًا بإخطار الطرف الآخر كتابة بذلك بموجب خطاب مسجل مصحوب بعلم الوصول خلال 15 يوم من تاريخه، وإلا تعتبر جميع المراسلات التى تمت على العنوان المثبت بالعقد منتجة لكافة آثارها القانونية.</p>

<div class="bnd">البند العاشر ـ نسخ العقد</div>
<p>تحرر هذا العقد من أربع نسخ لكل طرف نسخة والثالثه لمكتب التأمينات الاجتماعية المختص لإرفاقها باستمارة الاشتراك عنه لدى هيئة التأمينات الاجتماعية من تاريخ هذا العقد والنسخة الرابعة تودع بالجهة الإدارية المختصة.</p>

<div class="bnd">البند الحادى عشر ـ القانون الواجب التطبيق والإختصاص القضائي</div>
<p>(11-1): تخضع علاقة الطرفين بخصوص هذا التعاقد لأحكام القانون رقم 14 لسنة 2025 والخاص بقانون العمل وأحكام القوانين رقم 79 لسنة 1975 والخاص بالتأمين الإجتماعي وكافة القوانين والقرارات المعدلة لهم، وتعتبر هذه القوانين والأحكام واللوائح والقرارات جزءًا لا يتجزأ من هذا العقد.</p>
<p>(11-2): اتفق الطرفين على اختصاص محكمة جنوب القاهرة العمالية بأي نزاع ينشأ ـ لا قدر الله ـ بينهما حول تنفيذ أى بند من بنود هذا العقد.</p>

<div class="bnd">البند الثانى عشر ـ التوقيعات</div>
<div class="sign">
  <div>الطرف الأول ـ بصفته
    <div class="l">الاسـم: ${dots(30)}</div>
    <div class="l">التوقيع: ${dots(30)}</div>
  </div>
  <div>الطرف الثانى
    <div class="l">الاسـم: <b>${esc(e.name_ar)}</b></div>
    <div class="l">التوقيع: ${dots(30)}</div>
  </div>
</div>

</body></html>`;

  return raw.replace(
    /<div class="bnd">([^<]*?) ـ ([^<]*?)<\/div>/g,
    '<div class="bnd"><span>$1</span><span>$2</span></div>'
  );
};

export const EmploymentContract = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [duration, setDuration] = useState<Duration>('year');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all: Emp[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
          .from('employees')
          .select('id, employee_code, name_ar, national_id, social_insurance_no, education_ar, address, city, governorate, nationality')
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
  const html = selected ? buildHtml(selected, duration, logoAsset.url) : '';

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
    const doPrint = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1000);
    };
    const fonts = (iframe.contentWindow as any)?.document?.fonts;
    if (fonts?.ready) {
      fonts.ready.then(() => setTimeout(doPrint, 300));
    } else {
      setTimeout(doPrint, 800);
    }
  };

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

          <div className="space-y-1">
            <Label className="text-xs">{isAr ? 'مدة العقد' : 'Contract duration'}</Label>
            <Select value={duration} onValueChange={(v) => setDuration(v as Duration)}>
              <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="six_months">{isAr ? 'ستة أشهر' : 'Six months'}</SelectItem>
                <SelectItem value="year">{isAr ? 'سنة' : 'One year'}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={print} disabled={!selected} className="gap-2">
            <Printer className="h-4 w-4" />{isAr ? 'طباعة / PDF' : 'Print / PDF'}
          </Button>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardContent className="p-0">
            <iframe title="contract-preview" className="w-full h-[80vh] rounded-md bg-white" srcDoc={html} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
