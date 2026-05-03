import { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const DEMO_TABS = [
  { ar: 'الإجازات', en: 'Leaves' },
  { ar: 'الحضور — نظرة عامة', en: 'Attendance — Overview' },
  { ar: 'الأداء', en: 'Performance' },
  { ar: 'التدريب — إحصائيات', en: 'Training — Stats' },
];

const LIVE_TABS = [
  { ar: 'الموظفين', en: 'Employees' },
  { ar: 'الحضور — تقرير المحطات الشهري', en: 'Attendance — Monthly Stations' },
  { ar: 'الحضور — تقرير تفصيلي يومي', en: 'Attendance — Daily Detailed' },
  { ar: 'الرواتب', en: 'Salaries' },
  { ar: 'التدريب — السجلات والتأهيل', en: 'Training — Records & Qualification' },
  { ar: 'ديون التدريب', en: 'Training Debts' },
  { ar: 'اليونيفورم', en: 'Uniforms' },
];

/**
 * Visible banner indicating that the current report tab uses placeholder/demo data.
 * Includes an expandable section listing which tabs are still on demo data and
 * which are wired to live Supabase data.
 */
export const DemoDataBanner = () => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [open, setOpen] = useState(false);

  return (
    <div
      role="note"
      aria-live="polite"
      className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground"
    >
      <div className="flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-warning" aria-hidden="true" />
        <div className="flex-1 leading-relaxed">
          {ar
            ? 'هذا التبويب يعرض بيانات توضيحية ثابتة للمعاينة فقط، ولم يتم ربطه بعد بمصادر البيانات الحية. الفلاتر والتصدير يعملان على نفس البيانات التوضيحية.'
            : 'This tab shows static demo data for preview only; live data sources are not yet connected. Filters and exports operate on the same demo data.'}
        </div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls="demo-banner-details"
          className="inline-flex items-center gap-1 text-xs font-medium text-warning hover:underline whitespace-nowrap"
        >
          {ar ? (open ? 'إخفاء التفاصيل' : 'عرض التفاصيل') : (open ? 'Hide details' : 'Show details')}
          {open ? <ChevronUp className="w-3 h-3" aria-hidden /> : <ChevronDown className="w-3 h-3" aria-hidden />}
        </button>
      </div>

      {open && (
        <div
          id="demo-banner-details"
          className={cn('mt-3 grid gap-3 sm:grid-cols-2 text-xs')}
        >
          <div className="rounded-md border border-warning/30 bg-background/50 p-2">
            <div className="font-semibold text-warning mb-1">
              {ar ? 'تبويبات تستخدم بيانات تجريبية:' : 'Tabs using demo data:'}
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-foreground/80">
              {DEMO_TABS.map(t => (
                <li key={t.en}>{ar ? t.ar : t.en}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-md border border-success/30 bg-background/50 p-2">
            <div className="font-semibold text-success mb-1">
              {ar ? 'تبويبات مرتبطة بالبيانات الحية:' : 'Tabs wired to live data:'}
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-foreground/80">
              {LIVE_TABS.map(t => (
                <li key={t.en}>{ar ? t.ar : t.en}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
