import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications, PortalFilter } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';
import { Bell, CheckCircle, AlertCircle, Info, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

const typeIcons: Record<string, any> = { success: CheckCircle, warning: AlertTriangle, info: Info, error: AlertCircle };
const typeColors: Record<string, string> = { success: 'text-green-500', warning: 'text-yellow-500', info: 'text-blue-500', error: 'text-red-500' };

interface NotificationDropdownProps {
  variant?: 'header' | 'portal';
  employeeId?: string;
  portalFilter?: PortalFilter;
}

export const NotificationDropdown = ({ variant = 'header', employeeId, portalFilter = 'admin' }: NotificationDropdownProps) => {
  const { language, isRTL } = useLanguage();
  const { getFilteredNotifications, markAsRead, markAllAsRead, clearAll } = useNotifications();

  const filteredNotifications = getFilteredNotifications(portalFilter, employeeId);
  const filteredUnreadCount = filteredNotifications.filter(n => !n.read).length;

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return language === 'ar' ? 'الآن' : 'Just now';
    if (mins < 60) return language === 'ar' ? `منذ ${mins} دقيقة` : `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return language === 'ar' ? `منذ ${hrs} ساعة` : `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return language === 'ar' ? `منذ ${days} يوم` : `${days}d ago`;
  };

  const isHeader = variant === 'header';

  return (
    <Popover>
      <PopoverTrigger asChild>
        {isHeader ? (
          <button className="relative p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <Bell className="w-5 h-5 text-primary-foreground" />
            {filteredUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center font-bold">
                {filteredUnreadCount > 9 ? '9+' : filteredUnreadCount}
              </span>
            )}
          </button>
        ) : (
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            {filteredUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center">
                {filteredUnreadCount > 9 ? '9+' : filteredUnreadCount}
              </span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align={isRTL ? 'start' : 'end'}>
        <div className={cn("flex items-center justify-between p-3 border-b", isRTL && "flex-row-reverse")}>
          <h3 className="font-semibold text-sm">{language === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
          <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
            {filteredUnreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllAsRead}>
                <Check className="w-3 h-3 mr-1" />
                {language === 'ar' ? 'قراءة الكل' : 'Read all'}
              </Button>
            )}
            {filteredNotifications.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={clearAll}>
                <Trash2 className="w-3 h-3 mr-1" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-[60vh]">
          {filteredNotifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
            </div>
          ) : (
            filteredNotifications.slice(0, 20).map(n => {
              const Icon = typeIcons[n.type] || Info;
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 p-3 border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors",
                    !n.read && "bg-primary/5",
                    isRTL && "flex-row-reverse"
                  )}
                  onClick={() => markAsRead(n.id)}
                >
                  <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", typeColors[n.type] || 'text-blue-500')} />
                  <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
                    <p className={cn("text-sm leading-tight", !n.read && "font-semibold")}>
                      {language === 'ar' ? n.titleAr : n.titleEn}
                    </p>
                    {(n.descAr || n.descEn) && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {language === 'ar' ? n.descAr : n.descEn}
                      </p>
                    )}
                    {n.senderName && (
                      <p className="text-[10px] text-primary/70 mt-0.5">{n.senderName}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{formatTime(n.timestamp)}</p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                </div>
              );
            })
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
