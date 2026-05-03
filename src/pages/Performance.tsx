import { useState, useEffect, useRef } from 'react';
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
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Performance = () => {
  const { t, isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const { ensureLoaded } = usePerformanceData();

  useEffect(() => { ensureLoaded(); }, [ensureLoaded]);

  const handleRefresh = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      setRefreshKey(k => k + 1);
      await new Promise(r => setTimeout(r, 350));
      toast.success(ar ? 'تم تحديث بيانات تقييم الأداء' : 'Performance data refreshed');
    } finally {
      setRefreshing(false);
      refreshingRef.current = false;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" aria-busy={refreshing}>
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  aria-label={ar ? 'تحديث البيانات' : 'Refresh data'}
                >
                  <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{ar ? 'تحديث' : 'Refresh'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
            <PerformanceDashboard key={`dash-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <PerformanceList key={`list-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="newReview" className="mt-6">
            <PerformanceReviewForm key={`form-${refreshKey}`} />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <QuarterlyReports key={`reports-${refreshKey}`} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Performance;
