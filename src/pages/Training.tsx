import { useState, lazy, Suspense } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrainingRecords } from '@/components/training/TrainingRecords';
import { TrainingStatsCards } from '@/components/training/TrainingStatsCards';
import { BulkTrainingImport } from '@/components/training/BulkTrainingImport';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [activeTab, setActiveTab] = useState('records');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('training.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('training.subtitle')}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

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
            <TrainingRecords />
          </TabsContent>

          {activeTab === 'trainers' && (
            <TabsContent value="trainers" className="mt-6">
              <Suspense fallback={<TabFallback />}><Trainers /></Suspense>
            </TabsContent>
          )}

          {activeTab === 'syllabus' && (
            <TabsContent value="syllabus" className="mt-6">
              <Suspense fallback={<TabFallback />}><CoursesSyllabus /></Suspense>
            </TabsContent>
          )}

          {activeTab === 'courses' && (
            <TabsContent value="courses" className="mt-6">
              <Suspense fallback={<TabFallback />}><CoursesList /></Suspense>
            </TabsContent>
          )}

          {activeTab === 'plan' && (
            <TabsContent value="plan" className="mt-6">
              <Suspense fallback={<TabFallback />}><TrainingPlan /></Suspense>
            </TabsContent>
          )}

          {activeTab === 'reports' && (
            <TabsContent value="reports" className="mt-6">
              <Suspense fallback={<TabFallback />}><TrainingRecordsReport /></Suspense>
            </TabsContent>
          )}

          {activeTab === 'id-cards' && (
            <TabsContent value="id-cards" className="mt-6">
              <Suspense fallback={<TabFallback />}><EmployeeIdCards /></Suspense>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Training;
