import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeaveRequest } from '@/types/leaves';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface LeaveCalendarProps {
  requests: LeaveRequest[];
}

export const LeaveCalendar = ({ requests }: LeaveCalendarProps) => {
  const { t, isRTL, language } = useLanguage();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);

  const locale = language === 'ar' ? ar : enUS;

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getLeaveForDay = (day: Date) => {
    return requests.filter(request => {
      const startDate = parseISO(request.startDate);
      const endDate = parseISO(request.endDate);
      return isWithinInterval(day, { start: startDate, end: endDate });
    });
  };

  const getLeaveTypeColor = (type: LeaveRequest['leaveType']) => {
    const colors: Record<string, string> = {
      annual: 'bg-blue-500',
      sick: 'bg-red-500',
      casual: 'bg-green-500',
      unpaid: 'bg-gray-500',
    };
    return colors[type] || 'bg-primary';
  };

  const weekDays = language === 'ar' 
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get the day of the week for the first day of the month (0 = Sunday)
  const firstDayOfMonth = startOfMonth(currentMonth).getDay();

  return (
    <Card>
      <CardHeader>
        <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            {t('leaves.calendar.title')}
          </CardTitle>
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            >
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            <span className="font-semibold min-w-[150px] text-center">
              {format(currentMonth, 'MMMM yyyy', { locale })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            >
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className={cn("flex flex-wrap gap-4 mb-6", isRTL && "flex-row-reverse")}>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-sm">{t('leaves.types.annual')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-sm">{t('leaves.types.sick')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-sm">{t('leaves.types.casual')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-500"></div>
            <span className="text-sm">{t('leaves.types.unpaid')}</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden">
          {/* Week days header */}
          <div className="grid grid-cols-7 bg-muted">
            {weekDays.map((day, index) => (
              <div
                key={index}
                className="p-2 text-center text-sm font-medium text-muted-foreground border-b"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {/* Empty cells for days before the first day of month */}
            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`empty-${index}`} className="min-h-[100px] p-2 bg-muted/30 border-b border-r" />
            ))}
            
            {daysInMonth.map((day, index) => {
              const leavesForDay = getLeaveForDay(day);
              const isToday = isSameDay(day, new Date());
              
              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[100px] p-2 border-b border-r transition-colors",
                    isToday && "bg-primary/5",
                    !isSameMonth(day, currentMonth) && "bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    isToday && "text-primary font-bold"
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {leavesForDay.slice(0, 2).map((leave, leaveIndex) => (
                      <div
                        key={leaveIndex}
                        className={cn(
                          "text-xs p-1 rounded text-white truncate",
                          getLeaveTypeColor(leave.leaveType)
                        )}
                        title={`${language === 'ar' ? leave.employeeNameAr : leave.employeeName} - ${t(`leaves.types.${leave.leaveType}`)}`}
                      >
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {language === 'ar' ? leave.employeeNameAr : leave.employeeName}
                        </span>
                      </div>
                    ))}
                    {leavesForDay.length > 2 && (
                      <button
                        onClick={() => setExpandedDay(day)}
                        className="w-full text-start"
                      >
                        <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                          +{leavesForDay.length - 2} {t('leaves.calendar.more')}
                        </Badge>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expanded day popup */}
        {expandedDay && (() => {
          const allLeaves = getLeaveForDay(expandedDay);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setExpandedDay(null)}>
              <div className="bg-card rounded-xl shadow-lg p-4 min-w-[300px] max-w-[400px] max-h-[60vh] overflow-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-foreground">
                    {format(expandedDay, 'dd MMMM yyyy', { locale })}
                  </h4>
                  <button onClick={() => setExpandedDay(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {allLeaves.map((leave, i) => {
                    const cfg = { icon: User, color: getLeaveTypeColor(leave.leaveType) };
                    return (
                      <div key={i} className={cn("text-sm p-2 rounded text-white", cfg.color)}>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {language === 'ar' ? leave.employeeNameAr : leave.employeeName} — {t(`leaves.types.${leave.leaveType}`)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
};
