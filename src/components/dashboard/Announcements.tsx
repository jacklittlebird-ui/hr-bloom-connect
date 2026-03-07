import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import { Megaphone, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

export const Announcements = () => {
  const { language, isRTL } = useLanguage();
  const { notifications } = useNotifications();
  const ar = language === 'ar';

  // Show latest 5 notifications as announcements
  const recent = notifications.slice(0, 5);

  const typeConfig = {
    success: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card shadow-sm overflow-hidden">
      <div className={cn("flex items-center gap-2 p-4 border-b border-border/50", isRTL && "flex-row-reverse")}>
        <Megaphone className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">{ar ? 'الإعلانات' : 'Announcements'}</h3>
      </div>
      <div className="divide-y divide-border/30">
        {recent.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground text-sm">{ar ? 'لا توجد إعلانات' : 'No announcements'}</p>
        ) : recent.map(n => {
          const cfg = typeConfig[n.type] || typeConfig.info;
          const Icon = cfg.icon;
          const timeAgo = (() => {
            const diff = Date.now() - new Date(n.timestamp).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 60) return ar ? `منذ ${mins} د` : `${mins}m`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return ar ? `منذ ${hrs} س` : `${hrs}h`;
            return ar ? `منذ ${Math.floor(hrs / 24)} ي` : `${Math.floor(hrs / 24)}d`;
          })();

          return (
            <div key={n.id} className={cn(
              "flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors",
              !n.read && "bg-primary/5",
              isRTL && "flex-row-reverse"
            )}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                <Icon className={cn("w-4 h-4", cfg.color)} />
              </div>
              <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
                <p className={cn("text-sm leading-tight", !n.read && "font-semibold")}>{ar ? n.titleAr : n.titleEn}</p>
                {(n.descAr || n.descEn) && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{ar ? n.descAr : n.descEn}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
