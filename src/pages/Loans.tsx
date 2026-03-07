import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoansList } from '@/components/loans/LoansList';
import { AdvancesList } from '@/components/loans/AdvancesList';
import { InstallmentsList } from '@/components/loans/InstallmentsList';
import { LoanReports } from '@/components/loans/LoanReports';
import { LoanSettings } from '@/components/loans/LoanSettings';

const Loans = () => {
  const { t } = useLanguage();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('loans.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('loans.subtitle')}</p>
        </div>

        <Tabs defaultValue="loans" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6" dir="rtl">
            <TabsTrigger value="loans">{t('loans.tabs.loans')}</TabsTrigger>
            <TabsTrigger value="advances">{t('loans.tabs.advances')}</TabsTrigger>
            <TabsTrigger value="installments">{t('loans.tabs.installments')}</TabsTrigger>
            <TabsTrigger value="reports">{t('loans.tabs.reports')}</TabsTrigger>
            <TabsTrigger value="settings">{t('loans.tabs.settings')}</TabsTrigger>
          </TabsList>

          <TabsContent value="loans">
            <LoansList />
          </TabsContent>

          <TabsContent value="advances">
            <AdvancesList />
          </TabsContent>

          <TabsContent value="installments">
            <InstallmentsList />
          </TabsContent>

          <TabsContent value="reports">
            <LoanReports />
          </TabsContent>

          <TabsContent value="settings">
            <LoanSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Loans;
