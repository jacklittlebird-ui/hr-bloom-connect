import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceDashboard } from '@/components/performance/PerformanceDashboard';
import { PerformanceReviewForm } from '@/components/performance/PerformanceReviewForm';
import { PerformanceList } from '@/components/performance/PerformanceList';
import { QuarterlyReports } from '@/components/performance/QuarterlyReports';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { usePerformanceData } from '@/contexts/PerformanceDataContext';

const Performance = () => {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const { ensureLoaded } = usePerformanceData();

  useEffect(() => { ensureLoaded(); }, [ensureLoaded]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">
              {t('performance.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('performance.subtitle')}
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir={isRTL ? 'rtl' : 'ltr'}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard">{t('performance.tabs.dashboard')}</TabsTrigger>
            <TabsTrigger value="reviews">{t('performance.tabs.reviews')}</TabsTrigger>
            <TabsTrigger value="newReview">{t('performance.tabs.newReview')}</TabsTrigger>
            <TabsTrigger value="reports">{t('performance.tabs.reports')}</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-6">
            <PerformanceDashboard />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <PerformanceList />
          </TabsContent>

          <TabsContent value="newReview" className="mt-6">
            <PerformanceReviewForm />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <QuarterlyReports />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Performance;
