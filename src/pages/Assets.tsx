import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AssetRegistry } from '@/components/assets/AssetRegistry';
import { AssetAssignment } from '@/components/assets/AssetAssignment';
import { AssetMaintenance } from '@/components/assets/AssetMaintenance';
import { AssetReports } from '@/components/assets/AssetReports';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Assets = () => {
  const { t, language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [activeTab, setActiveTab] = useState('registry');
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  const handleRefresh = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      setRefreshKey(k => k + 1);
      await new Promise(r => setTimeout(r, 350));
      toast({
        title: ar ? 'تم التحديث' : 'Refreshed',
        description: ar ? 'تم تحديث جميع تبويبات الأصول' : 'All asset tabs refreshed',
      });
    } catch (e: any) {
      toast({
        title: ar ? 'تعذر التحديث' : 'Refresh failed',
        description: e?.message,
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
      refreshingRef.current = false;
    }
  };

  const tabs = [
    { id: 'registry', label: t('assets.tabs.registry') },
    { id: 'assignment', label: t('assets.tabs.assignment') },
    { id: 'maintenance', label: t('assets.tabs.maintenance') },
    { id: 'reports', label: t('assets.tabs.reports') },
  ];

  return (
    <DashboardLayout>
      <div className={cn("flex items-center justify-between mb-6", isRTL && "flex-row-reverse")}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('assets.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('assets.subtitle')}</p>
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
          className="mb-4 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{ar ? 'جاري تحديث جميع تبويبات الأصول...' : 'Refreshing all asset tabs...'}</span>
        </div>
      )}

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

        <TabsContent value="registry"><AssetRegistry key={`registry-${refreshKey}`} /></TabsContent>
        {activeTab === 'assignment' && (
          <TabsContent value="assignment"><AssetAssignment key={`assignment-${refreshKey}`} /></TabsContent>
        )}
        {activeTab === 'maintenance' && (
          <TabsContent value="maintenance"><AssetMaintenance key={`maintenance-${refreshKey}`} /></TabsContent>
        )}
        {activeTab === 'reports' && (
          <TabsContent value="reports"><AssetReports key={`reports-${refreshKey}`} /></TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
};

export default Assets;
