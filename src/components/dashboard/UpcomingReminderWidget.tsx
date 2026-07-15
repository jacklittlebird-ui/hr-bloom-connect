import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePersistedState } from '@/hooks/usePersistedState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BellRing, ArrowRight, ArrowLeft } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { daysUntil, Reminder } from '@/components/documents/GeneralReminders';

export const UpcomingReminderWidget = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [reminders] = usePersistedState<Reminder[]>('hr_general_reminders', []);

  const next = useMemo(() => {
    const active = reminders.filter(r => !r.completed);
    active.sort((a, b) => a.date.localeCompare(b.date));
    return active[0];
  }, [reminders]);

  const label = (dateStr: string) => {
    const n = daysUntil(dateStr);
    if (n === 0) return ar ? 'اليوم' : 'Today';
    if (n === 1) return ar ? 'غداً' : 'Tomorrow';
    if (n > 1) return ar ? `متبقي ${n} يوم` : `${n} days left`;
    return ar ? `متأخر ${Math.abs(n)} يوم` : `Overdue by ${Math.abs(n)} days`;
  };

  const tone = (dateStr: string) => {
    const n = daysUntil(dateStr);
    if (n < 0 || n === 0) return 'bg-red-500/10 border-red-500/40 text-red-600';
    if (n <= 7) return 'bg-amber-500/10 border-amber-500/40 text-amber-600';
    return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600';
  };

  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={cn("text-base flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <BellRing className="w-4 h-4 text-primary" />
          {ar ? 'التذكير القادم' : 'Upcoming Reminder'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {next ? (
          <div className={cn("rounded-xl border p-4 space-y-3", tone(next.date))} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-foreground">{next.title}</p>
              <Badge variant="outline" className="shrink-0">{label(next.date)}</Badge>
            </div>
            {next.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{next.description}</p>}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{formatDate(next.date)}{next.time ? ` · ${next.time}` : ''}</span>
              <Link to="/documents">
                <Button size="sm" variant="ghost" className="h-7 gap-1">
                  {ar ? 'عرض الكل' : 'View all'}
                  <Arrow className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 space-y-2" dir={isRTL ? 'rtl' : 'ltr'}>
            <p className="text-sm text-muted-foreground">
              {ar ? 'لا توجد تذكيرات نشطة' : 'No active reminders'}
            </p>
            <Link to="/documents">
              <Button size="sm" variant="outline" className="gap-1">
                {ar ? 'إضافة تذكير' : 'Add a reminder'}
                <Arrow className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
