import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { QrCode, Navigation, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Station {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  checkin_method: string;
}

const methodConfig = {
  qr: { icon: QrCode, labelAr: 'مسح QR فقط', labelEn: 'QR Only', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40', badge: 'bg-blue-100 text-blue-700 border-blue-300' },
  gps: { icon: Navigation, labelAr: 'GPS فقط', labelEn: 'GPS Only', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', badge: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  both: { icon: Layers, labelAr: 'QR + GPS معاً', labelEn: 'QR + GPS', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40', badge: 'bg-purple-100 text-purple-700 border-purple-300' },
};

export const StationCheckinSettings = () => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStations = async () => {
    const { data } = await supabase
      .from('stations')
      .select('id, code, name_ar, name_en, is_active, checkin_method')
      .eq('is_active', true)
      .order('name_ar');
    if (data) setStations(data as Station[]);
    setLoading(false);
  };

  useEffect(() => { fetchStations(); }, []);

  const updateMethod = async (stationId: string, method: string) => {
    const { error } = await supabase
      .from('stations')
      .update({ checkin_method: method } as any)
      .eq('id', stationId);
    if (error) {
      toast.error(ar ? 'حدث خطأ' : 'Error updating');
    } else {
      setStations(prev => prev.map(s => s.id === stationId ? { ...s, checkin_method: method } : s));
      toast.success(ar ? 'تم تحديث طريقة التسجيل' : 'Check-in method updated');
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{ar ? 'إعدادات تسجيل الحضور للمحطات' : 'Station Check-in Settings'}</h2>
        <p className="text-sm text-muted-foreground">{ar ? 'حدد طريقة تسجيل الحضور لكل محطة' : 'Set check-in method for each station'}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stations.map(station => {
          const method = (station.checkin_method || 'qr') as keyof typeof methodConfig;
          const config = methodConfig[method] || methodConfig.qr;
          const Icon = config.icon;
          return (
            <Card key={station.id} className={cn("border shadow-sm", config.bg)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-5 h-5", config.color)} />
                    <div>
                      <p className="font-semibold text-sm">{ar ? station.name_ar : station.name_en}</p>
                      <p className="text-xs text-muted-foreground">{station.code}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={config.badge}>
                    {ar ? config.labelAr : config.labelEn}
                  </Badge>
                </div>
                <Select value={method} onValueChange={(v) => updateMethod(station.id, v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qr">
                      <span className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-blue-600" />
                        {ar ? '📱 مسح QR فقط' : '📱 QR Only'}
                      </span>
                    </SelectItem>
                    <SelectItem value="gps">
                      <span className="flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-emerald-600" />
                        {ar ? '📍 GPS فقط' : '📍 GPS Only'}
                      </span>
                    </SelectItem>
                    <SelectItem value="both">
                      <span className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-600" />
                        {ar ? '🔄 QR + GPS معاً' : '🔄 QR + GPS'}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
