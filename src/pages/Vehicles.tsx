import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { VehicleRegistry } from '@/components/vehicles/VehicleRegistry';
import { VehicleLicenseTracking } from '@/components/vehicles/VehicleLicenseTracking';
import { VehicleMaintenance } from '@/components/vehicles/VehicleMaintenance';
import { FleetByStation } from '@/components/vehicles/FleetByStation';
import { LicenseAlerts } from '@/components/vehicles/LicenseAlerts';

const Vehicles = () => {
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';
  const [activeTab, setActiveTab] = useState('by-station');

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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
        <TabsList className="w-full justify-start mb-6 flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="by-station"><FleetByStation /></TabsContent>
        <TabsContent value="registry"><VehicleRegistry /></TabsContent>
        <TabsContent value="licenses"><VehicleLicenseTracking /></TabsContent>
        <TabsContent value="maintenance"><VehicleMaintenance /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Vehicles;
