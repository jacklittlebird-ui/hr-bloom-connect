import { useState, useRef, lazy, Suspense } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { EmployeeReports } from '@/components/reports/EmployeeReports';
import { AttendanceReportsTab } from '@/components/reports/AttendanceReportsTab';
import { StationAttendanceReport } from '@/components/reports/StationAttendanceReport';
import { DailyAttendanceReport } from '@/components/reports/DailyAttendanceReport';
import { LeaveReports } from '@/components/reports/LeaveReports';
import { SalaryReports } from '@/components/reports/SalaryReports';
import { PerformanceReports } from '@/components/reports/PerformanceReports';
import { TrainingReports } from '@/components/reports/TrainingReports';
import { TrainingDebtReport } from '@/components/reports/TrainingDebtReport';
import { UniformReport } from '@/components/reports/UniformReport';
import { TrainingQualificationReport } from '@/components/reports/TrainingQualificationReport';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const TrainingRecordsReportComponent = lazy(() =>
  import('@/components/training/TrainingRecordsReport').then(m => ({ default: m.TrainingRecordsReport }))
);

const TrainingRecordsReportLazy = () => (
  <Suspense fallback={<div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>}>
    <TrainingRecordsReportComponent />
  </Suspense>
);

const Reports = () => {
  const { t, isRTL, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('employees');
  const [trainingSubTab, setTrainingSubTab] = useState('stats');
  const [attendanceSubTab, setAttendanceSubTab] = useState('stations');
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  const ar = language === 'ar';

  const handleRefresh = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      // Force remount of all tab contents via refreshKey; allow paint cycle
      setRefreshKey(k => k + 1);
      await new Promise(r => setTimeout(r, 400));
      toast.success(ar ? 'تم تحديث التقارير' : 'Reports refreshed');
    } catch (e) {
      console.error(e);
      toast.error(ar ? 'فشل التحديث' : 'Refresh failed');
    } finally {
      setRefreshing(false);
      refreshingRef.current = false;
    }
  };

  const tabs = [
    { id: 'employees', label: t('reports.tabs.employees') },
    { id: 'attendance', label: t('reports.tabs.attendance') },
    { id: 'leaves', label: t('reports.tabs.leaves') },
    { id: 'salaries', label: t('reports.tabs.salaries') },
    { id: 'performance', label: t('reports.tabs.performance') },
    { id: 'training', label: t('reports.tabs.training') },
    { id: 'trainingDebt', label: ar ? 'ديون التدريب' : 'Training Debts' },
    { id: 'uniforms', label: ar ? 'اليونيفورم' : 'Uniforms' },
  ];

  return (
    <DashboardLayout>
      <div className={cn("flex items-center justify-between mb-6", isRTL && "flex-row-reverse")}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('reports.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('reports.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label={ar ? 'تحديث' : 'Refresh'}
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      {refreshing && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{ar ? 'جاري تحديث جميع التقارير...' : 'Refreshing all reports...'}</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        <TabsList className="w-full justify-start mb-6 flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="employees"><EmployeeReports key={`emp-${refreshKey}`} /></TabsContent>
        <TabsContent value="attendance">
          <Tabs value={attendanceSubTab} onValueChange={setAttendanceSubTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
            <TabsList className="mb-4 bg-muted/30">
              <TabsTrigger value="stations" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {ar ? 'تقرير المحطات الشهري' : 'Monthly Stations Report'}
              </TabsTrigger>
              <TabsTrigger value="daily" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {ar ? 'تقرير تفصيلي يومي' : 'Daily Detailed Report'}
              </TabsTrigger>
              <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {ar ? 'نظرة عامة' : 'Overview'}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="stations"><StationAttendanceReport key={`st-${refreshKey}`} /></TabsContent>
            <TabsContent value="daily"><DailyAttendanceReport key={`da-${refreshKey}`} /></TabsContent>
            <TabsContent value="overview"><AttendanceReportsTab key={`ao-${refreshKey}`} /></TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="leaves"><LeaveReports key={`lv-${refreshKey}`} /></TabsContent>
        <TabsContent value="salaries"><SalaryReports key={`sl-${refreshKey}`} /></TabsContent>
        <TabsContent value="performance"><PerformanceReports key={`pf-${refreshKey}`} /></TabsContent>
        <TabsContent value="training">
          <Tabs value={trainingSubTab} onValueChange={setTrainingSubTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
            <TabsList className="mb-4 bg-muted/30">
              <TabsTrigger value="stats" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {ar ? 'إحصائيات التدريب' : 'Training Stats'}
              </TabsTrigger>
              <TabsTrigger value="records" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {ar ? 'سجلات التدريب' : 'Training Records'}
              </TabsTrigger>
              <TabsTrigger value="qualification" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {ar ? 'سجل التأهيل' : 'Qualification Record'}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="stats"><TrainingReports key={`tr-${refreshKey}`} /></TabsContent>
            <TabsContent value="records"><TrainingRecordsReportLazy key={`trr-${refreshKey}`} /></TabsContent>
            <TabsContent value="qualification"><TrainingQualificationReport key={`tq-${refreshKey}`} /></TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="trainingDebt"><TrainingDebtReport key={`td-${refreshKey}`} /></TabsContent>
        <TabsContent value="uniforms"><UniformReport key={`un-${refreshKey}`} /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Reports;
