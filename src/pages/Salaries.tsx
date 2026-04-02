import { useState, lazy, Suspense } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { PayrollProcessing } from '@/components/salaries/PayrollProcessing';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const SalarySlips = lazy(() => import('@/components/salaries/SalarySlips').then(m => ({ default: m.SalarySlips })));
const AllowancesDeductions = lazy(() => import('@/components/salaries/AllowancesDeductions').then(m => ({ default: m.AllowancesDeductions })));
const SalaryStructure = lazy(() => import('@/components/salaries/SalaryStructure').then(m => ({ default: m.SalaryStructure })));
const PayrollHistory = lazy(() => import('@/components/salaries/PayrollHistory').then(m => ({ default: m.PayrollHistory })));
const MobileBills = lazy(() => import('@/components/salaries/MobileBills').then(m => ({ default: m.MobileBills })));
const SalaryTransfer = lazy(() => import('@/components/salaries/SalaryTransfer').then(m => ({ default: m.SalaryTransfer })));
const EidBonuses = lazy(() => import('@/components/salaries/EidBonuses').then(m => ({ default: m.EidBonuses })));
const BonusManagement = lazy(() => import('@/components/salaries/BonusManagement').then(m => ({ default: m.BonusManagement })));

const TabFallback = () => <div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;

const Salaries = () => {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('payroll');
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs = [
    { id: 'payroll', label: t('salaries.tabs.payroll') },
    { id: 'slips', label: t('salaries.tabs.slips') },
    { id: 'allowances', label: t('salaries.tabs.allowances') },
    { id: 'structure', label: t('salaries.tabs.structure') },
    { id: 'history', label: t('salaries.tabs.history') },
    { id: 'mobile-bills', label: isRTL ? 'فواتير الموبايل' : 'Mobile Bills' },
    { id: 'transfer', label: isRTL ? 'تحويل الرواتب' : 'Salary Transfer' },
    { id: 'eid-bonuses', label: isRTL ? 'العيديات' : 'Eid Bonuses' },
    { id: 'bonus', label: isRTL ? 'المكافأة' : 'Bonus' },
  ];

  return (
    <DashboardLayout>
      <div className={cn("flex items-center justify-between mb-6", isRTL && "flex-row-reverse")}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('salaries.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('salaries.subtitle')}</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => setRefreshKey(k => k + 1)}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        <TabsList className="w-full justify-start mb-6 flex-wrap h-auto gap-1 bg-muted/50 p-1 overflow-x-auto">
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

        <TabsContent value="payroll">
          <PayrollProcessing />
        </TabsContent>

        {activeTab === 'slips' && (
          <TabsContent value="slips"><Suspense fallback={<TabFallback />}><SalarySlips /></Suspense></TabsContent>
        )}
        {activeTab === 'allowances' && (
          <TabsContent value="allowances"><Suspense fallback={<TabFallback />}><AllowancesDeductions /></Suspense></TabsContent>
        )}
        {activeTab === 'structure' && (
          <TabsContent value="structure"><Suspense fallback={<TabFallback />}><SalaryStructure /></Suspense></TabsContent>
        )}
        {activeTab === 'history' && (
          <TabsContent value="history"><Suspense fallback={<TabFallback />}><PayrollHistory /></Suspense></TabsContent>
        )}
        {activeTab === 'mobile-bills' && (
          <TabsContent value="mobile-bills"><Suspense fallback={<TabFallback />}><MobileBills /></Suspense></TabsContent>
        )}
        {activeTab === 'transfer' && (
          <TabsContent value="transfer"><Suspense fallback={<TabFallback />}><SalaryTransfer /></Suspense></TabsContent>
        )}
        {activeTab === 'eid-bonuses' && (
          <TabsContent value="eid-bonuses"><Suspense fallback={<TabFallback />}><EidBonuses /></Suspense></TabsContent>
        )}
        {activeTab === 'bonus' && (
          <TabsContent value="bonus"><Suspense fallback={<TabFallback />}><BonusManagement /></Suspense></TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
};

export default Salaries;
