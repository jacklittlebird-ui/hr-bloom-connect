import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { VehicleRegistry } from '@/components/vehicles/VehicleRegistry';
import { VehicleLicenseTracking } from '@/components/vehicles/VehicleLicenseTracking';
import { VehicleMaintenance } from '@/components/vehicles/VehicleMaintenance';
import { FleetByStation } from '@/components/vehicles/FleetByStation';
import { LicenseAlerts } from '@/components/vehicles/LicenseAlerts';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Vehicles = () => {
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState('by-station');
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  const handleRefresh = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      setRefreshKey((k) => k + 1);
      await new Promise((r) => setTimeout(r, 350));
      toast.success(isAr ? 'تم تحديث جميع تبويبات السيارات' : 'All vehicle tabs refreshed');
    } finally {
      setRefreshing(false);
      refreshingRef.current = false;
    }
  };

  const tabs = [
    { id: 'by-station', label: isAr ? 'سيارات لكل محطة' : 'Vehicles per Station' },
    { id: 'alerts', label: isAr ? 'تنبيهات التراخيص' : 'License Alerts' },
    { id: 'registry', label: isAr ? 'سجل السيارات' : 'Vehicle Registry' },
    { id: 'licenses', label: isAr ? 'متابعة التراخيص' : 'License Tracking' },
    { id: 'maintenance', label: isAr ? 'الصيانة' : 'Maintenance' },
  ];

  return (
    <DashboardLayout>
      <div className={cn('flex items-center justify-between mb-6', isRTL && 'flex-row-reverse')}>
        <div className={cn(isRTL && 'text-end')}>
          <h1 className="text-2xl font-bold text-foreground">{isAr ? 'إدارة السيارات' : 'Fleet Management'}</h1>
          <p className="text-muted-foreground mt-1">
            {isAr ? 'متابعة شاملة لأسطول السيارات حسب المحطة، التراخيص، والصيانة' : 'Comprehensive fleet tracking by station, licenses and maintenance'}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label={isAr ? 'تحديث' : 'Refresh'}
          aria-busy={refreshing}
        >
          <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
        </Button>
      </div>

      {refreshing && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{isAr ? 'جاري تحديث جميع تبويبات السيارات...' : 'Refreshing all vehicle tabs...'}</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        <TabsList className="w-full justify-start mb-6 flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="by-station"><FleetByStation key={`fbs-${refreshKey}`} /></TabsContent>
        <TabsContent value="alerts"><LicenseAlerts key={`la-${refreshKey}`} /></TabsContent>
        <TabsContent value="registry"><VehicleRegistry key={`vr-${refreshKey}`} /></TabsContent>
        <TabsContent value="licenses"><VehicleLicenseTracking key={`vl-${refreshKey}`} /></TabsContent>
        <TabsContent value="maintenance"><VehicleMaintenance key={`vm-${refreshKey}`} /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Vehicles;
