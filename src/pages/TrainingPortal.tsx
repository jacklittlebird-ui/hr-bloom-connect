import { useState, lazy, Suspense, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePreventPullToRefresh } from '@/hooks/usePreventPullToRefresh';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrainingRecords } from '@/components/training/TrainingRecords';
import { Trainers } from '@/components/training/Trainers';
import { CoursesSyllabus } from '@/components/training/CoursesSyllabus';
import { CoursesList } from '@/components/training/CoursesList';
import { TrainingPlan } from '@/components/training/TrainingPlan';
import { TrainingStatsCards } from '@/components/training/TrainingStatsCards';
import { EmployeeIdCards } from '@/components/training/EmployeeIdCards';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { GraduationCap, LogOut, BookOpen, Users, FileText, Calendar, BarChart3, Library, RefreshCw, CreditCard, Globe } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalWelcomeBanner } from '@/components/portal/PortalWelcomeBanner';

const TrainingReports = lazy(() => import('@/components/reports/TrainingReports').then(m => ({ default: m.TrainingReports })));
const TrainingQualificationReport = lazy(() => import('@/components/reports/TrainingQualificationReport').then(m => ({ default: m.TrainingQualificationReport })));
const TrainingRecordsReport = lazy(() => import('@/components/training/TrainingRecordsReport').then(m => ({ default: m.TrainingRecordsReport })));
const MissingCourseRecords = lazy(() => import('@/components/reports/MissingCourseRecords').then(m => ({ default: m.MissingCourseRecords })));

const TabFallback = () => <div className="space-y-4 mt-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;

const TrainingPortal = () => {
  const { language, setLanguage } = useLanguage();
  const { logout, user } = useAuth();
  const isMobile = useIsMobile();
  const ar = language === 'ar';
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('records');
  const mainRef = useRef<HTMLElement>(null);

  usePreventPullToRefresh(mainRef, isMobile);
  useScrollRestoration(mainRef);

  return (
    <div dir="rtl" className="h-dvh min-h-screen flex flex-col bg-background font-arabic overflow-hidden">
      <header className="shrink-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex items-center justify-between px-4 md:px-6 h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">{ar ? 'بوابة التدريب' : 'Training Portal'}</h1>
              <p className="text-xs text-muted-foreground">{user?.name || user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setRefreshKey(k => k + 1)}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="gap-1.5"
            >
              <Globe className="w-4 h-4" />
              <span className="text-xs">{ar ? 'EN' : 'عربي'}</span>
            </Button>
            <NotificationDropdown variant="portal" portalFilter="training" />
            <Button variant="ghost" size="sm" onClick={logout} className="gap-2 text-destructive hover:text-destructive">
              <LogOut className="w-4 h-4" />
              {ar ? 'خروج' : 'Logout'}
            </Button>
          </div>
        </div>
      </header>

      <main
        ref={mainRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
        style={{
          overscrollBehavior: 'none',
          overscrollBehaviorY: 'none',
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch' as any,
        }}
      >
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
          <PortalWelcomeBanner />
          <TrainingStatsCards />
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full overflow-x-auto h-auto gap-1 justify-start" dir="rtl">
              <TabsTrigger value="records" className="gap-1.5 text-xs md:text-sm">
                <BookOpen className="w-4 h-4" />
                {ar ? 'السجلات' : 'Records'}
              </TabsTrigger>
              <TabsTrigger value="trainers" className="gap-1.5 text-xs md:text-sm">
                <Users className="w-4 h-4" />
                {ar ? 'المدربين' : 'Trainers'}
              </TabsTrigger>
              <TabsTrigger value="syllabus" className="gap-1.5 text-xs md:text-sm">
                <FileText className="w-4 h-4" />
                {ar ? 'المناهج' : 'Syllabus'}
              </TabsTrigger>
              <TabsTrigger value="courses" className="gap-1.5 text-xs md:text-sm">
                <Library className="w-4 h-4" />
                {ar ? 'الدورات' : 'Courses'}
              </TabsTrigger>
              <TabsTrigger value="plan" className="gap-1.5 text-xs md:text-sm">
                <Calendar className="w-4 h-4" />
                {ar ? 'الخطة' : 'Plan'}
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-1.5 text-xs md:text-sm">
                <BarChart3 className="w-4 h-4" />
                {ar ? 'التقارير' : 'Reports'}
              </TabsTrigger>
              <TabsTrigger value="id-cards" className="gap-1.5 text-xs md:text-sm">
                <CreditCard className="w-4 h-4" />
                {ar ? 'بطاقة الشركة' : 'Company Card'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="records" forceMount className="mt-6 data-[state=inactive]:hidden"><TrainingRecords key={refreshKey} /></TabsContent>
            <TabsContent value="trainers" forceMount className="mt-6 data-[state=inactive]:hidden"><Trainers key={refreshKey} /></TabsContent>
            <TabsContent value="syllabus" forceMount className="mt-6 data-[state=inactive]:hidden"><CoursesSyllabus key={refreshKey} /></TabsContent>
            <TabsContent value="courses" forceMount className="mt-6 data-[state=inactive]:hidden"><CoursesList key={refreshKey} /></TabsContent>
            <TabsContent value="plan" forceMount className="mt-6 data-[state=inactive]:hidden"><TrainingPlan key={refreshKey} /></TabsContent>
            <TabsContent value="reports" forceMount className="mt-6 data-[state=inactive]:hidden">
              <PortalReportsTabs ar={ar} />
            </TabsContent>
            <TabsContent value="id-cards" forceMount className="mt-6 data-[state=inactive]:hidden"><EmployeeIdCards key={refreshKey} /></TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

const PortalReportsTabs = ({ ar }: { ar: boolean }) => {
  const [subTab, setSubTab] = useState('stats');
  return (
    <Tabs value={subTab} onValueChange={setSubTab} className="w-full" dir="rtl">
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
        <TabsTrigger value="missing" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          {ar ? 'دورات بدون اسم' : 'Missing Courses'}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="stats">
        <Suspense fallback={<TabFallback />}><TrainingReports /></Suspense>
      </TabsContent>
      <TabsContent value="records">
        <Suspense fallback={<TabFallback />}><TrainingRecordsReport /></Suspense>
      </TabsContent>
      <TabsContent value="qualification">
        <Suspense fallback={<TabFallback />}><TrainingQualificationReport /></Suspense>
      </TabsContent>
      {subTab === 'missing' && (
        <TabsContent value="missing">
          <Suspense fallback={<TabFallback />}><MissingCourseRecords /></Suspense>
        </TabsContent>
      )}
    </Tabs>
  );
};

export default TrainingPortal;
