import { Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Visible banner indicating that the current report tab uses placeholder/demo data.
 * Used in tabs that have not yet been wired to live Supabase data sources.
 */
export const DemoDataBanner = () => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  return (
    <div
      role="note"
      aria-live="polite"
      className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground"
    >
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-warning" aria-hidden="true" />
      <span className="leading-relaxed">
        {ar
          ? 'هذا التبويب يعرض بيانات توضيحية ثابتة للمعاينة فقط، ولم يتم ربطه بعد بمصادر البيانات الحية. الفلاتر والتصدير يعملان على نفس البيانات التوضيحية.'
          : 'This tab shows static demo data for preview only; live data sources are not yet connected. Filters and exports operate on the same demo data.'}
      </span>
    </div>
  );
};
