import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertCircle, Info, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

const typeIcons: Record<string, any> = { success: CheckCircle, warning: AlertTriangle, info: Info, error: AlertCircle };
const typeColors: Record<string, string> = { success: 'text-green-500', warning: 'text-yellow-500', info: 'text-blue-500', error: 'text-red-500' };

export const PortalNotifications = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language } = useLanguage();
  const { getFilteredNotifications, markAsRead, markAllAsRead, clearAll, refreshNotifications } = useNotifications();

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const notifications = getFilteredNotifications('employee', PORTAL_EMPLOYEE_ID);
  const unreadCount = notifications.filter(n => !n.read).length;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {language === 'ar' ? 'الإشعارات' : 'Notifications'}
          {unreadCount > 0 && <Badge className="ms-2 bg-primary">{unreadCount}</Badge>}
        </h1>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 me-1" />
              {language === 'ar' ? 'قراءة الكل' : 'Mark all read'}
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAll} className="text-destructive">
              <Trash2 className="w-4 h-4 me-1" />
              {language === 'ar' ? 'مسح الكل' : 'Clear all'}
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          {language === 'ar' ? 'لا توجد إشعارات' : 'No notifications'}
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {notifications.map(n => {
            const Icon = typeIcons[n.type] || Info;
            return (
              <Card
                key={n.id}
                className={cn("cursor-pointer hover:shadow-md transition-shadow", !n.read && "border-primary/30 bg-primary/5")}
                onClick={() => markAsRead(n.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", typeColors[n.type] || 'text-blue-500')} />
                    <div className="flex-1">
                      <p className={cn("font-medium", !n.read && "font-semibold")}>
                        {language === 'ar' ? n.titleAr : n.titleEn}
                      </p>
                      {(n.descAr || n.descEn) && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {language === 'ar' ? n.descAr : n.descEn}
                        </p>
                      )}
                      {n.senderName && (
                        <p className="text-xs text-primary/70 mt-1">{n.senderName}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{formatTime(n.timestamp)}</p>
                    </div>
                    {!n.read && <Badge className="bg-primary text-primary-foreground text-[10px]">{language === 'ar' ? 'جديد' : 'New'}</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
