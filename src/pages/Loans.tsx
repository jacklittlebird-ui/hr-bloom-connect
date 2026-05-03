import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoansList } from '@/components/loans/LoansList';
import { AdvancesList } from '@/components/loans/AdvancesList';
import { InstallmentsList } from '@/components/loans/InstallmentsList';
import { LoanReports } from '@/components/loans/LoanReports';
import { LoanSettings } from '@/components/loans/LoanSettings';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLoanData } from '@/contexts/LoanDataContext';
import { toast } from '@/hooks/use-toast';

const Loans = () => {
  const { t, isRTL } = useLanguage();
  const { refreshData } = useLoanData();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshData();
      setRefreshKey(k => k + 1);
      // Single unified success toast — covers all 5 tabs
      toast({ title: isRTL ? 'تم التحديث' : 'Refreshed', description: isRTL ? 'تم تحديث جميع تبويبات القروض' : 'All loan tabs refreshed' });
    } catch (e: any) {
      toast({ title: isRTL ? 'تعذر التحديث' : 'Refresh failed', description: e?.message, variant: 'destructive' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('loans.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('loans.subtitle')}</p>
          </div>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing} aria-label={isRTL ? 'تحديث' : 'Refresh'}>
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        <Tabs defaultValue="loans" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6" dir="rtl">
            <TabsTrigger value="loans">{t('loans.tabs.loans')}</TabsTrigger>
            <TabsTrigger value="advances">{t('loans.tabs.advances')}</TabsTrigger>
            <TabsTrigger value="installments">{t('loans.tabs.installments')}</TabsTrigger>
            <TabsTrigger value="reports">{t('loans.tabs.reports')}</TabsTrigger>
            <TabsTrigger value="settings">{t('loans.tabs.settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="loans"><LoansList refreshKey={refreshKey} /></TabsContent>
          <TabsContent value="advances"><AdvancesList refreshKey={refreshKey} /></TabsContent>
          <TabsContent value="installments"><InstallmentsList refreshKey={refreshKey} /></TabsContent>
          <TabsContent value="reports"><LoanReports /></TabsContent>
          <TabsContent value="settings"><LoanSettings /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Loans;
