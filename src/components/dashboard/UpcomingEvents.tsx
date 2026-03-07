import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, GraduationCap, FileText, Banknote } from 'lucide-react';

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  type: 'training' | 'leave' | 'loan' | 'review';
}

export const UpcomingEvents = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [events, setEvents] = useState<UpcomingEvent[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      const result: UpcomingEvent[] = [];

      const [trainRes, leaveRes, loanRes] = await Promise.all([
        supabase.from('planned_courses').select('id, course_name, planned_date').gte('planned_date', today).lte('planned_date', nextMonth).order('planned_date').limit(5),
        supabase.from('leave_requests').select('id, leave_type, start_date').eq('status', 'approved').gte('start_date', today).order('start_date').limit(5),
        supabase.from('loan_installments').select('id, due_date, amount').eq('status', 'pending').gte('due_date', today).lte('due_date', nextMonth).order('due_date').limit(5),
      ]);

      trainRes.data?.forEach(r => result.push({ id: r.id, title: r.course_name, date: r.planned_date || '', type: 'training' }));
      leaveRes.data?.forEach(r => result.push({ id: r.id, title: ar ? `إجازة ${r.leave_type}` : `${r.leave_type} leave`, date: r.start_date, type: 'leave' }));
      loanRes.data?.forEach(r => result.push({ id: r.id, title: ar ? `قسط ${r.amount}` : `Installment ${r.amount}`, date: r.due_date, type: 'loan' }));

      result.sort((a, b) => a.date.localeCompare(b.date));
      setEvents(result.slice(0, 8));
    };
    fetchEvents();
  }, [ar]);

  const typeConfig = {
    training: { icon: GraduationCap, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    leave: { icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    loan: { icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    review: { icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className={cn("flex items-center gap-2 p-4 border-b border-border/50", isRTL && "flex-row-reverse")}>
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">{ar ? 'الأحداث القادمة' : 'Upcoming Events'}</h3>
      </div>
      <div className="divide-y divide-border/30">
        {events.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground text-sm">{ar ? 'لا توجد أحداث قادمة' : 'No upcoming events'}</p>
        ) : events.map(ev => {
          const cfg = typeConfig[ev.type];
          const Icon = cfg.icon;
          return (
            <div key={ev.id} className={cn("flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors", isRTL && "flex-row-reverse")}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                <Icon className={cn("w-4 h-4", cfg.color)} />
              </div>
              <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
                <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(ev.date).toLocaleDateString(ar ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
