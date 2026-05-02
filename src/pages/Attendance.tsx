import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckInOut } from '@/components/attendance/CheckInOut';
import { AttendanceList } from '@/components/attendance/AttendanceList';
import { LateArrivals } from '@/components/attendance/LateArrivals';
import { AttendanceReports } from '@/components/attendance/AttendanceReports';
import { ShiftManagement } from '@/components/attendance/ShiftManagement';
import { AttendanceRules } from '@/components/attendance/AttendanceRules';
import { StationCheckinSettings } from '@/components/attendance/StationCheckinSettings';
import { EmployeeAssignment } from '@/components/attendance/EmployeeAssignment';
import { useAttendanceData } from '@/contexts/AttendanceDataContext';
import { WorkHoursByStation } from '@/components/attendance/WorkHoursByStation';
import { OfficialHolidays } from '@/components/attendance/OfficialHolidays';
import { Clock, List, AlertTriangle, BarChart3, Calendar, Settings2, Users, RefreshCw, Navigation, Timer, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getCairoDateString } from '@/lib/cairoDate';

// Re-exported for downstream consumers (CheckInOut etc.) that import the type from this module path.
export type { AttendanceEntry as AttendanceRecord } from '@/contexts/AttendanceDataContext';

const Attendance = () => {
  const { t, isRTL, language } = useLanguage();
  const { records, refresh: refreshAttendance, checkIn, checkOut } = useAttendanceData();
  const [activeTab, setActiveTab] = useState('checkin');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshAttendance(true);
      toast.success(language === 'ar' ? 'تم تحديث البيانات' : 'Data refreshed');
    } catch {
      toast.error(language === 'ar' ? 'تعذر التحديث' : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const today = getCairoDateString();
  const todayRecords = records.filter(r => r.date === today);
  const lateCount = todayRecords.filter(r => r.status === 'late').length;

  const tabs: { value: string; icon: typeof Clock; label: string; badge?: number }[] = [
    { value: 'checkin', icon: Clock, label: t('attendance.tabs.checkInOut') },
    { value: 'list', icon: List, label: t('attendance.tabs.records') },
    { value: 'late', icon: AlertTriangle, label: t('attendance.tabs.lateArrivals'), badge: lateCount },
    { value: 'reports', icon: BarChart3, label: t('attendance.tabs.reports') },
    { value: 'shifts', icon: Calendar, label: t('attendance.tabs.shifts') },
    { value: 'rules', icon: Settings2, label: t('attendance.tabs.rules') },
    { value: 'assignment', icon: Users, label: t('attendance.tabs.assignment') },
    { value: 'station-settings', icon: Navigation, label: language === 'ar' ? 'إعدادات المحطات' : 'Station Settings' },
    { value: 'hours-by-station', icon: Timer, label: language === 'ar' ? 'ساعات العمل الشهرية' : 'Monthly Hours' },
    { value: 'holidays', icon: CalendarDays, label: language === 'ar' ? 'الإجازات الرسمية' : 'Official Holidays' },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{t('attendance.title')}</h1>
            <p className="text-muted-foreground text-sm truncate">{t('attendance.subtitle')}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label={language === 'ar' ? 'تحديث البيانات' : 'Refresh data'}
            title={language === 'ar' ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Horizontally scrollable tab strip — works at any viewport with 10 tabs */}
          <div className="mb-6 -mx-4 sm:mx-0 overflow-x-auto scrollbar-thin">
            <TabsList
              className="inline-flex w-max min-w-full gap-1 p-1 bg-muted/50"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {tabs.map(({ value, icon: Icon, label, badge }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="relative flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">{label}</span>
                  {badge !== undefined && badge > 0 && (
                    <span
                      className={cn(
                        'absolute -top-1 bg-warning text-warning-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center',
                        isRTL ? '-left-1' : '-right-1'
                      )}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="checkin">
            <CheckInOut
              records={records}
              onCheckIn={checkIn}
              onCheckOut={checkOut}
              onRefresh={() => refreshAttendance(true)}
            />
          </TabsContent>

          <TabsContent value="list">
            <AttendanceList />
          </TabsContent>

          <TabsContent value="late">
            <LateArrivals />
          </TabsContent>

          <TabsContent value="reports">
            <AttendanceReports />
          </TabsContent>

          <TabsContent value="shifts">
            <ShiftManagement />
          </TabsContent>

          <TabsContent value="rules">
            <AttendanceRules />
          </TabsContent>

          <TabsContent value="assignment">
            <EmployeeAssignment />
          </TabsContent>

          <TabsContent value="station-settings">
            <StationCheckinSettings />
          </TabsContent>

          <TabsContent value="hours-by-station">
            <WorkHoursByStation />
          </TabsContent>

          <TabsContent value="holidays">
            <OfficialHolidays />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
