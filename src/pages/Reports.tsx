import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { EmployeeReports } from '@/components/reports/EmployeeReports';
import { AttendanceReportsTab } from '@/components/reports/AttendanceReportsTab';
import { LeaveReports } from '@/components/reports/LeaveReports';
import { SalaryReports } from '@/components/reports/SalaryReports';
import { PerformanceReports } from '@/components/reports/PerformanceReports';
import { TrainingReports } from '@/components/reports/TrainingReports';
import { TrainingDebtReport } from '@/components/reports/TrainingDebtReport';
import { UniformReport } from '@/components/reports/UniformReport';
import { TrainingQualificationReport } from '@/components/reports/TrainingQualificationReport';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

const Reports = () => {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('employees');
  const [trainingSubTab, setTrainingSubTab] = useState('stats');
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    { id: 'employees', label: t('reports.tabs.employees') },
    { id: 'attendance', label: t('reports.tabs.attendance') },
    { id: 'leaves', label: t('reports.tabs.leaves') },
    { id: 'salaries', label: t('reports.tabs.salaries') },
    { id: 'performance', label: t('reports.tabs.performance') },
    { id: 'training', label: t('reports.tabs.training') },
    { id: 'trainingDebt', label: isRTL ? 'ديون التدريب' : 'Training Debts' },
    { id: 'uniforms', label: isRTL ? 'اليونيفورم' : 'Uniforms' },
  ];

  return (
    <DashboardLayout>
      <div className={cn("flex items-center justify-between mb-6", isRTL && "flex-row-reverse")}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('reports.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('reports.subtitle')}</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setRefreshKey(k => k + 1)}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

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

        <TabsContent value="employees"><EmployeeReports /></TabsContent>
        <TabsContent value="attendance"><AttendanceReportsTab /></TabsContent>
        <TabsContent value="leaves"><LeaveReports /></TabsContent>
        <TabsContent value="salaries"><SalaryReports /></TabsContent>
        <TabsContent value="performance"><PerformanceReports /></TabsContent>
        <TabsContent value="training">
          <Tabs value={trainingSubTab} onValueChange={setTrainingSubTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
            <TabsList className="mb-4 bg-muted/30">
              <TabsTrigger value="stats" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {isRTL ? 'إحصائيات التدريب' : 'Training Stats'}
              </TabsTrigger>
              <TabsTrigger value="records" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {isRTL ? 'سجلات التدريب' : 'Training Records'}
              </TabsTrigger>
              <TabsTrigger value="qualification" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {isRTL ? 'سجل التأهيل' : 'Qualification Record'}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="stats"><TrainingReports /></TabsContent>
            <TabsContent value="records">
              <TrainingRecordsReportLazy />
            </TabsContent>
            <TabsContent value="qualification"><TrainingQualificationReport /></TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="trainingDebt"><TrainingDebtReport /></TabsContent>
        <TabsContent value="uniforms"><UniformReport /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

// Lazy load the heavy training records report
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const TrainingRecordsReportComponent = lazy(() =>
  import('@/components/training/TrainingRecordsReport').then(m => ({ default: m.TrainingRecordsReport }))
);

const TrainingRecordsReportLazy = () => (
  <Suspense fallback={<div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>}>
    <TrainingRecordsReportComponent />
  </Suspense>
);

export default Reports;
