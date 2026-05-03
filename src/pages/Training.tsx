import { useState, useRef, lazy, Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrainingRecords } from '@/components/training/TrainingRecords';
import { TrainingStatsCards } from '@/components/training/TrainingStatsCards';
import { BulkTrainingImport } from '@/components/training/BulkTrainingImport';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

const TrainingReports = lazy(() => import('@/components/reports/TrainingReports').then(m => ({ default: m.TrainingReports })));
const TrainingQualificationReport = lazy(() => import('@/components/reports/TrainingQualificationReport').then(m => ({ default: m.TrainingQualificationReport })));

const Trainers = lazy(() => import('@/components/training/Trainers').then(m => ({ default: m.Trainers })));
const CoursesSyllabus = lazy(() => import('@/components/training/CoursesSyllabus').then(m => ({ default: m.CoursesSyllabus })));
const CoursesList = lazy(() => import('@/components/training/CoursesList').then(m => ({ default: m.CoursesList })));
const TrainingPlan = lazy(() => import('@/components/training/TrainingPlan').then(m => ({ default: m.TrainingPlan })));
const TrainingRecordsReport = lazy(() => import('@/components/training/TrainingRecordsReport').then(m => ({ default: m.TrainingRecordsReport })));
const EmployeeIdCards = lazy(() => import('@/components/training/EmployeeIdCards').then(m => ({ default: m.EmployeeIdCards })));

const TabFallback = () => <div className="space-y-4 mt-6"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;

const Training = () => {
  const { t, language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false); // synchronous guard against rapid clicks
  const [activeTab, setActiveTab] = useState('records');

  const handleRefresh = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      // Force remount of all tab contents (including lazy ones) via key bump.
      setRefreshKey(k => k + 1);
      // Give children a tick to start their fetch effects before clearing the banner.
      await new Promise(r => setTimeout(r, 350));
      toast({
        title: ar ? 'تم التحديث' : 'Refreshed',
        description: ar ? 'تم تحديث جميع تبويبات التدريب' : 'All training tabs refreshed',
      });
    } catch (e: any) {
      toast({ title: ar ? 'تعذر التحديث' : 'Refresh failed', description: e?.message, variant: 'destructive' });
    } finally {
      setRefreshing(false);
      refreshingRef.current = false;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('training.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('training.subtitle')}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label={ar ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        {refreshing && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{ar ? 'جاري تحديث جميع تبويبات التدريب...' : 'Refreshing all training tabs...'}</span>
          </div>
        )}

        <BulkTrainingImport />
        <TrainingStatsCards key={`stats-${refreshKey}`} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7" dir="rtl">
            <TabsTrigger value="records">{t('training.tabs.records')}</TabsTrigger>
            <TabsTrigger value="trainers">{t('training.tabs.trainers')}</TabsTrigger>
            <TabsTrigger value="syllabus">{t('training.tabs.syllabus')}</TabsTrigger>
            <TabsTrigger value="courses">{t('training.tabs.courses')}</TabsTrigger>
            <TabsTrigger value="plan">{t('training.tabs.plan')}</TabsTrigger>
            <TabsTrigger value="reports">{ar ? 'التقارير' : 'Reports'}</TabsTrigger>
            <TabsTrigger value="id-cards">{ar ? 'بطاقة الشركة' : 'Company Card'}</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="mt-6">
            <TrainingRecords key={`records-${refreshKey}`} activeTab={activeTab} />
          </TabsContent>

          {activeTab === 'trainers' && (
            <TabsContent value="trainers" className="mt-6">
              <Suspense fallback={<TabFallback />}><Trainers key={`trainers-${refreshKey}`} /></Suspense>
            </TabsContent>
          )}

          {activeTab === 'syllabus' && (
            <TabsContent value="syllabus" className="mt-6">
              <Suspense fallback={<TabFallback />}><CoursesSyllabus key={`syllabus-${refreshKey}`} /></Suspense>
            </TabsContent>
          )}

          {activeTab === 'courses' && (
            <TabsContent value="courses" className="mt-6">
              <Suspense fallback={<TabFallback />}><CoursesList key={`courses-${refreshKey}`} /></Suspense>
            </TabsContent>
          )}

          {activeTab === 'plan' && (
            <TabsContent value="plan" className="mt-6">
              <Suspense fallback={<TabFallback />}><TrainingPlan key={`plan-${refreshKey}`} /></Suspense>
            </TabsContent>
          )}

          {activeTab === 'reports' && (
            <TabsContent value="reports" className="mt-6">
              <Suspense fallback={<TabFallback />}>
                <TrainingReportsTabs key={`reports-${refreshKey}`} ar={ar} isRTL={isRTL} />
              </Suspense>
            </TabsContent>
          )}

          {activeTab === 'id-cards' && (
            <TabsContent value="id-cards" className="mt-6">
              <Suspense fallback={<TabFallback />}><EmployeeIdCards key={`idcards-${refreshKey}`} /></Suspense>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};
