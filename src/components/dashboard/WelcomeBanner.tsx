import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { CalendarDays, Activity, Users, Clock } from 'lucide-react';

export const WelcomeBanner = () => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';

  const hour = new Date().getHours();
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

  const today = new Date().toLocaleDateString(ar ? 'ar-EG' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subtitle = ar
    ? 'مرحباً بك في لوحة التحكم — إليك نظرة عامة على النظام اليوم'
    : 'Welcome to your dashboard — here\'s an overview of today';

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl mb-8",
        "bg-gradient-to-br from-primary via-primary/85 to-primary/60",
        "shadow-xl shadow-primary/20",
        isRTL && "text-right"
      )}
    >
      {/* Animated decorative elements */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary-foreground/8 blur-3xl animate-pulse" />
      <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-primary-foreground/5 blur-2xl" />
      <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-primary-foreground/5 blur-xl" />
      
      {/* Geometric pattern overlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
        backgroundSize: '24px 24px'
      }} />

      <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl md:text-4xl">{emoji}</span>
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground animate-fade-in">
              {greeting}
            </h1>
          </div>
          <p className="text-primary-foreground/75 text-sm md:text-base max-w-xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {subtitle}
          </p>
          <div className="flex items-center gap-2 mt-1 text-primary-foreground/60 text-xs md:text-sm">
            <CalendarDays className="w-4 h-4" />
            <span>{today}</span>
          </div>
        </div>

        {/* Quick stats pills */}
        <div className="flex flex-wrap gap-2 md:gap-3">
          {[
            { icon: Clock, label: ar ? 'الوقت الآن' : 'Current Time', value: new Date().toLocaleTimeString(ar ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) },
          ].map((pill, i) => (
            <div key={i} className="flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm rounded-full px-4 py-2 border border-primary-foreground/10">
              <pill.icon className="w-4 h-4 text-primary-foreground/70" />
              <div className="flex flex-col">
                <span className="text-[10px] text-primary-foreground/50 leading-tight">{pill.label}</span>
                <span className="text-sm font-semibold text-primary-foreground leading-tight">{pill.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
