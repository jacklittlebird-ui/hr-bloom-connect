import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { cn } from '@/lib/utils';
import { CalendarDays, Clock } from 'lucide-react';

export const PortalWelcomeBanner = () => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { user } = useAuth();
  const { getEmployeeById } = useEmployeeData();

  const employeeId = user?.employeeId || '';
  const employee = getEmployeeById(employeeId);
  const displayName = ar
    ? (employee?.nameAr || user?.nameAr || '')
    : (employee?.nameEn || user?.name || '');

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hour = now.getHours();
  let greeting: string;
  let emoji: string;
  if (hour < 12) {
    greeting = ar ? 'صباح الخير' : 'Good Morning';
    emoji = '🌅';
  } else if (hour < 17) {
    greeting = ar ? 'مساء الخير' : 'Good Afternoon';
    emoji = '☀️';
  } else {
    greeting = ar ? 'مساء الخير' : 'Good Evening';
    emoji = '🌙';
  }

  const today = now.toLocaleDateString(ar ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl mb-6",
        "bg-gradient-to-br from-primary via-primary/85 to-primary/60",
        "shadow-xl shadow-primary/20"
      )}
    >
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary-foreground/8 blur-3xl animate-pulse" />
      <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-primary-foreground/5 blur-2xl" />

      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: '24px 24px'
      }} />

      <div className="relative z-10 p-5 md:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <span className="text-2xl md:text-3xl">{emoji}</span>
            <h2 className="text-xl md:text-2xl font-bold text-primary-foreground">
              {greeting}{displayName ? `, ${displayName}` : ''}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-primary-foreground/60 text-xs md:text-sm">
            <CalendarDays className="w-4 h-4" />
            <span>{today}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-4 py-2 border border-primary-foreground/10">
          <Clock className="w-4 h-4 text-primary-foreground/70" />
          <div className="flex flex-col">
            <span className="text-[10px] text-primary-foreground/50 leading-tight">{ar ? 'الوقت الآن' : 'Current Time'}</span>
            <span className="text-sm font-semibold text-primary-foreground leading-tight">
              {now.toLocaleTimeString(ar ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
