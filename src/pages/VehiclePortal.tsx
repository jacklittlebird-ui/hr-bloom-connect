import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { RefreshCw, Loader2, LogOut, Globe, Car, Clock, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { FleetByStation } from '@/components/vehicles/FleetByStation';
import { LicenseAlerts } from '@/components/vehicles/LicenseAlerts';
import { VehicleRegistry } from '@/components/vehicles/VehicleRegistry';
import { VehicleLicenseTracking } from '@/components/vehicles/VehicleLicenseTracking';
import { VehicleMaintenance } from '@/components/vehicles/VehicleMaintenance';
import { VehicleReports } from '@/components/vehicles/VehicleReports';
import { usePreventPullToRefresh } from '@/hooks/usePreventPullToRefresh';

const VehiclePortal = () => {
  const { user, logout } = useAuth();
  const { language, isRTL, setLanguage } = useLanguage();
  const isAr = language === 'ar';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('by-station');
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const [now, setNow] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  usePreventPullToRefresh(containerRef);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      setRefreshKey((k) => k + 1);
      await new Promise((r) => setTimeout(r, 350));
      toast.success(isAr ? 'تم تحديث بيانات السيارات' : 'Vehicle data refreshed');
    } finally {
      setRefreshing(false);
      refreshingRef.current = false;
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const tabs = [
    { id: 'by-station', label: isAr ? 'سيارات المحطة' : 'Station Vehicles' },
    { id: 'reports', label: isAr ? 'التقارير' : 'Reports' },
    { id: 'alerts', label: isAr ? 'تنبيهات التراخيص' : 'License Alerts' },
    { id: 'registry', label: isAr ? 'سجل السيارات' : 'Vehicle Registry' },
    { id: 'licenses', label: isAr ? 'متابعة التراخيص' : 'License Tracking' },
    { id: 'maintenance', label: isAr ? 'الصيانة' : 'Maintenance' },
  ];

  const greeting = (() => {
    const h = now.getHours();
    if (h < 12) return isAr ? 'صباح الخير' : 'Good Morning';
    if (h < 17) return isAr ? 'مساء الخير' : 'Good Afternoon';
    return isAr ? 'مساء الخير' : 'Good Evening';
  })();

  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const displayName = isAr ? (user?.nameAr || '') : (user?.name || '');

  return (
    <div ref={containerRef} className="min-h-dvh bg-background pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Car className="w-5 h-5" />
            </div>
            <div className={cn(isRTL && 'text-end')}>
              <h1 className="text-base sm:text-lg font-bold leading-tight">
                {isAr ? 'بوابة سيارات المحطة' : 'Station Vehicles Portal'}
              </h1>
              <p className="text-xs text-muted-foreground">{displayName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLanguage(isAr ? 'en' : 'ar')} aria-label="Language">
              <Globe className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing} aria-label="Refresh" aria-busy={refreshing}>
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 me-1" />
              <span className="hidden sm:inline">{isAr ? 'خروج' : 'Logout'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Welcome banner */}
      <div className="container mx-auto px-4 pt-4">
        <Card className="p-4 sm:p-5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <div className={cn('flex items-center justify-between gap-3 flex-wrap', isRTL && 'flex-row-reverse')}>
            <div className={cn(isRTL && 'text-end')}>
              <p className="text-sm text-muted-foreground">{greeting} 👋</p>
              <h2 className="text-lg sm:text-xl font-bold">{displayName}</h2>
            </div>
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Clock className="w-4 h-4" />
              <span className="tabular-nums text-lg" dir="ltr">{timeStr}</span>
            </div>
          </div>
        </Card>
      </div>

      {refreshing && (
        <div className="container mx-auto px-4 mt-3">
          <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{isAr ? 'جاري تحديث بيانات السيارات...' : 'Refreshing vehicle data...'}</span>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
          <TabsList className="w-full justify-start mb-6 flex-wrap h-auto gap-1 bg-muted/50 p-1">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="by-station"><FleetByStation key={`fbs-${refreshKey}`} /></TabsContent>
          <TabsContent value="reports"><VehicleReports key={`vrep-${refreshKey}`} /></TabsContent>
          <TabsContent value="alerts"><LicenseAlerts key={`la-${refreshKey}`} /></TabsContent>
          <TabsContent value="registry"><VehicleRegistry key={`vr-${refreshKey}`} /></TabsContent>
          <TabsContent value="licenses"><VehicleLicenseTracking key={`vl-${refreshKey}`} /></TabsContent>
          <TabsContent value="maintenance"><VehicleMaintenance key={`vm-${refreshKey}`} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default VehiclePortal;
