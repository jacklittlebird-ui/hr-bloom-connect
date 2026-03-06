import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { CalendarDays, TrendingUp } from 'lucide-react';

export const WelcomeBanner = () => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';

  const hour = new Date().getHours();
  let greeting: string;
  if (hour < 12) {
    greeting = ar ? 'صباح الخير' : 'Good Morning';
  } else if (hour < 17) {
    greeting = ar ? 'مساء الخير' : 'Good Afternoon';
  } else {
    greeting = ar ? 'مساء الخير' : 'Good Evening';
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
        "relative overflow-hidden rounded-2xl p-6 md:p-8 mb-8",
        "bg-gradient-to-br from-primary via-primary/90 to-primary/70",
        "shadow-lg",
        isRTL && "text-right"
      )}
    >
      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-foreground/10 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-primary-foreground/5 blur-xl" />

      <div className={cn("relative z-10 flex flex-col gap-2", isRTL && "items-end")}>
        <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground animate-fade-in">
          {greeting} 👋
        </h1>
        <p className="text-primary-foreground/80 text-sm md:text-base max-w-xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {subtitle}
        </p>
        <div className={cn(
          "flex items-center gap-2 mt-2 text-primary-foreground/70 text-xs md:text-sm",
          isRTL && "flex-row-reverse"
        )}>
          <CalendarDays className="w-4 h-4" />
          <span>{today}</span>
        </div>
      </div>
    </div>
  );
};
