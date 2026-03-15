import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrainingRecords } from '@/components/training/TrainingRecords';
import { Trainers } from '@/components/training/Trainers';
import { CoursesSyllabus } from '@/components/training/CoursesSyllabus';
import { CoursesList } from '@/components/training/CoursesList';
import { TrainingPlan } from '@/components/training/TrainingPlan';
import { TrainingRecordsReport } from '@/components/training/TrainingRecordsReport';
import { TrainingStatsCards } from '@/components/training/TrainingStatsCards';
import { EmployeeIdCards } from '@/components/training/EmployeeIdCards';
import { BulkTrainingImport } from '@/components/training/BulkTrainingImport';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

const Training = () => {
  const { t, language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [refreshKey, setRefreshKey] = useState(0);

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

        <Tabs defaultValue="records" className="w-full">
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

          <TabsContent value="trainers" className="mt-6">
            <Trainers />
          </TabsContent>

          <TabsContent value="syllabus" className="mt-6">
            <CoursesSyllabus />
          </TabsContent>

          <TabsContent value="courses" className="mt-6">
            <CoursesList />
          </TabsContent>

          <TabsContent value="plan" className="mt-6">
            <TrainingPlan />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <TrainingRecordsReport />
          </TabsContent>

          <TabsContent value="id-cards" className="mt-6">
            <EmployeeIdCards />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Training;
