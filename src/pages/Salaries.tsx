import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { PayrollProcessing } from '@/components/salaries/PayrollProcessing';
import { SalarySlips } from '@/components/salaries/SalarySlips';
import { AllowancesDeductions } from '@/components/salaries/AllowancesDeductions';
import { SalaryStructure } from '@/components/salaries/SalaryStructure';
import { PayrollHistory } from '@/components/salaries/PayrollHistory';
import { MobileBills } from '@/components/salaries/MobileBills';
import { SalaryTransfer } from '@/components/salaries/SalaryTransfer';
import { EidBonuses } from '@/components/salaries/EidBonuses';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

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

        <TabsContent value="payroll">
          <PayrollProcessing />
        </TabsContent>
        <TabsContent value="slips">
          <SalarySlips />
        </TabsContent>
        <TabsContent value="allowances">
          <AllowancesDeductions />
        </TabsContent>
        <TabsContent value="structure">
          <SalaryStructure />
        </TabsContent>
        <TabsContent value="history">
          <PayrollHistory />
        </TabsContent>
        <TabsContent value="mobile-bills">
          <MobileBills />
        </TabsContent>
        <TabsContent value="transfer">
          <SalaryTransfer />
        </TabsContent>
        <TabsContent value="eid-bonuses">
          <EidBonuses />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Salaries;
