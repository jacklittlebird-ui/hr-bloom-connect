import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Clock, Search, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Vehicle {
  id: string;
  vehicle_code: string;
  brand: string;
  model: string;
  plate_number: string;
  license_start_date: string | null;
  license_end_date: string | null;
  curtains_license_start: string | null;
  curtains_license_end: string | null;
  transport_license_start: string | null;
  transport_license_end: string | null;
  status: string;
}

type LicenseType = 'all' | 'vehicle' | 'curtains' | 'transport';

const getDaysRemaining = (dateStr: string | null) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getStatusInfo = (days: number | null, isAr: boolean) => {
  if (days === null) return { label: isAr ? 'غير محدد' : 'N/A', color: 'bg-muted text-muted-foreground', icon: Clock };
  if (days < 0) return { label: isAr ? 'منتهي' : 'Expired', color: 'bg-red-100 text-red-800', icon: AlertTriangle };
  if (days <= 30) return { label: isAr ? 'قريب الانتهاء' : 'Expiring Soon', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
  if (days <= 90) return { label: isAr ? 'تنبيه' : 'Warning', color: 'bg-orange-100 text-orange-800', icon: Clock };
  return { label: isAr ? 'ساري' : 'Valid', color: 'bg-green-100 text-green-800', icon: CheckCircle };
};

export const VehicleLicenseTracking = () => {
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LicenseType>('all');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('vehicles').select('id, vehicle_code, brand, model, plate_number, license_start_date, license_end_date, curtains_license_start, curtains_license_end, transport_license_start, transport_license_end, status').order('vehicle_code');
      if (data) setVehicles(data as unknown as Vehicle[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = vehicles.filter(v =>
    [v.vehicle_code, v.brand, v.model, v.plate_number].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const expiredCount = vehicles.filter(v => {
    const d = getDaysRemaining(v.license_end_date);
    return d !== null && d < 0;
  }).length;

  const soonCount = vehicles.filter(v => {
    const d = getDaysRemaining(v.license_end_date);
    return d !== null && d >= 0 && d <= 30;
  }).length;

  const LicenseCell = ({ start, end, label }: { start: string | null; end: string | null; label: string }) => {
    const days = getDaysRemaining(end);
    const info = getStatusInfo(days, isAr);
    const Icon = info.icon;
    return (
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="flex items-center gap-1.5">
          <Badge className={cn("text-xs", info.color)}>
            <Icon className="w-3 h-3 me-1" />
            {days !== null ? `${days} ${isAr ? 'يوم' : 'days'}` : info.label}
          </Badge>
        </div>
        {end && <div className="text-xs text-muted-foreground">{end}</div>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-700">{expiredCount}</p>
              <p className="text-sm text-red-600">{isAr ? 'تراخيص منتهية' : 'Expired Licenses'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold text-yellow-700">{soonCount}</p>
              <p className="text-sm text-yellow-600">{isAr ? 'قريبة الانتهاء (30 يوم)' : 'Expiring Soon (30 days)'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">{vehicles.length - expiredCount - soonCount}</p>
              <p className="text-sm text-green-600">{isAr ? 'تراخيص سارية' : 'Valid Licenses'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className={cn("flex flex-row items-center justify-between flex-wrap gap-2", isRTL && "flex-row-reverse")}>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isAr ? 'متابعة التراخيص' : 'License Tracking'}
          </CardTitle>
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <div className="relative">
              <Search className="absolute top-2.5 start-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="ps-9 h-9 w-48" />
            </div>
            <Select value={filter} onValueChange={v => setFilter(v as LicenseType)}>
              <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? 'جميع التراخيص' : 'All Licenses'}</SelectItem>
                <SelectItem value="vehicle">{isAr ? 'ترخيص السيارة' : 'Vehicle License'}</SelectItem>
                <SelectItem value="curtains">{isAr ? 'ترخيص الستائر' : 'Curtains License'}</SelectItem>
                <SelectItem value="transport">{isAr ? 'النقل البري' : 'Transport License'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? 'السيارة' : 'Vehicle'}</TableHead>
                    <TableHead>{isAr ? 'اللوحة' : 'Plate'}</TableHead>
                    {(filter === 'all' || filter === 'vehicle') && <TableHead>{isAr ? 'ترخيص السيارة' : 'Vehicle License'}</TableHead>}
                    {(filter === 'all' || filter === 'curtains') && <TableHead>{isAr ? 'ترخيص الستائر' : 'Curtains License'}</TableHead>}
                    {(filter === 'all' || filter === 'transport') && <TableHead>{isAr ? 'النقل البري' : 'Transport License'}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(v => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="font-medium">{v.brand} {v.model}</div>
                        <div className="text-xs text-muted-foreground">{v.vehicle_code}</div>
                      </TableCell>
                      <TableCell className="font-mono">{v.plate_number}</TableCell>
                      {(filter === 'all' || filter === 'vehicle') && (
                        <TableCell><LicenseCell start={v.license_start_date} end={v.license_end_date} label={isAr ? 'ترخيص السيارة' : 'Vehicle'} /></TableCell>
                      )}
                      {(filter === 'all' || filter === 'curtains') && (
                        <TableCell><LicenseCell start={v.curtains_license_start} end={v.curtains_license_end} label={isAr ? 'الستائر' : 'Curtains'} /></TableCell>
                      )}
                      {(filter === 'all' || filter === 'transport') && (
                        <TableCell><LicenseCell start={v.transport_license_start} end={v.transport_license_end} label={isAr ? 'النقل البري' : 'Transport'} /></TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
