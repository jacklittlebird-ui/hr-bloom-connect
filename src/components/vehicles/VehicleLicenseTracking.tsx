import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle, Clock, Search, FileText, Building2, Download, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StationCombobox, StationOption } from './StationCombobox';
import { exportVehiclePdf } from '@/lib/vehiclePdfExport';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  vehicle_code: string;
  brand: string;
  model: string;
  plate_number: string;
  station_id: string | null;
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
  if (days < 0) return { label: isAr ? 'منتهي' : 'Expired', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300', icon: AlertTriangle };
  if (days <= 30) return { label: isAr ? 'قريب الانتهاء' : 'Expiring Soon', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300', icon: AlertTriangle };
  if (days <= 90) return { label: isAr ? 'تنبيه' : 'Warning', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', icon: Clock };
  return { label: isAr ? 'ساري' : 'Valid', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300', icon: CheckCircle };
};

export const VehicleLicenseTracking = () => {
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LicenseType>('all');
  const [stationFilter, setStationFilter] = useState<string | null>(null);
  const [statusBucket, setStatusBucket] = useState<'all' | 'expired' | 'soon' | 'valid'>('all');

  useEffect(() => {
    const fetchAll = async (showLoader = true) => {
      if (showLoader) setLoading(true);
      const [{ data: v }, { data: s }] = await Promise.all([
        supabase.from('vehicles').select('id, vehicle_code, brand, model, plate_number, station_id, license_start_date, license_end_date, curtains_license_start, curtains_license_end, transport_license_start, transport_license_end, status').order('vehicle_code'),
        supabase.from('stations').select('id, name_ar, name_en, code').eq('is_active', true).order('name_ar'),
      ]);
      if (v) setVehicles(v as unknown as Vehicle[]);
      if (s) setStations(s as StationOption[]);
      if (showLoader) setLoading(false);
    };
    fetchAll(true);
    const REFRESH_MS = 3 * 60 * 60 * 1000;
    const interval = setInterval(() => fetchAll(false), REFRESH_MS);
    const onVis = () => { if (document.visibilityState === 'visible') fetchAll(false); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const stationMap = useMemo(() => Object.fromEntries(stations.map((s) => [s.id, s])), [stations]);

  const filtered = useMemo(() => vehicles.filter((v) => {
    const txt = search.trim().toLowerCase();
    const txtMatch = !txt || [v.vehicle_code, v.brand, v.model, v.plate_number].some((f) => f?.toLowerCase().includes(txt));
    const stMatch = !stationFilter || v.station_id === stationFilter;
    if (!txtMatch || !stMatch) return false;
    if (statusBucket === 'all') return true;
    const dl = getDaysRemaining(v.license_end_date);
    if (dl === null) return false;
    if (statusBucket === 'expired') return dl < 0;
    if (statusBucket === 'soon') return dl >= 0 && dl <= 30;
    if (statusBucket === 'valid') return dl > 30;
    return true;
  }), [vehicles, search, stationFilter, statusBucket]);

  const scope = stationFilter ? vehicles.filter((v) => v.station_id === stationFilter) : vehicles;
  const expiredCount = scope.filter((v) => { const d = getDaysRemaining(v.license_end_date); return d !== null && d < 0; }).length;
  const soonCount = scope.filter((v) => { const d = getDaysRemaining(v.license_end_date); return d !== null && d >= 0 && d <= 30; }).length;
  const validCount = scope.filter((v) => { const d = getDaysRemaining(v.license_end_date); return d !== null && d > 30; }).length;

  // Aggregate KPIs across ALL 3 license types per vehicle (worst-status wins)
  const kpi = useMemo(() => {
    let expired = 0, soon = 0, valid = 0, missing = 0;
    scope.forEach((v) => {
      const dates = [v.license_end_date, v.curtains_license_end, v.transport_license_end];
      const days = dates.map(getDaysRemaining);
      if (days.every((d) => d === null)) { missing++; return; }
      const validDays = days.filter((d): d is number => d !== null);
      const min = Math.min(...validDays);
      if (min < 0) expired++;
      else if (min <= 30) soon++;
      else valid++;
    });
    const total = scope.length;
    const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;
    return { total, expired, soon, valid, missing, pctExpired: pct(expired), pctSoon: pct(soon), pctValid: pct(valid), pctMissing: pct(missing) };
  }, [scope]);

  const exportCsv = () => {
    const rows = [[
      isAr ? 'الكود' : 'Code', isAr ? 'الماركة' : 'Brand', isAr ? 'الموديل' : 'Model',
      isAr ? 'اللوحة' : 'Plate', isAr ? 'المحطة' : 'Station',
      isAr ? 'بداية الترخيص' : 'License Start', isAr ? 'نهاية الترخيص' : 'License End',
      isAr ? 'بداية الستائر' : 'Curtains Start', isAr ? 'نهاية الستائر' : 'Curtains End',
      isAr ? 'بداية النقل' : 'Transport Start', isAr ? 'نهاية النقل' : 'Transport End',
    ]];
    filtered.forEach((v) => {
      const st = v.station_id ? stationMap[v.station_id] : null;
      rows.push([
        v.vehicle_code, v.brand, v.model, v.plate_number,
        st ? (isAr ? st.name_ar : st.name_en) : '',
        v.license_start_date || '', v.license_end_date || '',
        v.curtains_license_start || '', v.curtains_license_end || '',
        v.transport_license_start || '', v.transport_license_end || '',
      ]);
    });
    const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `license_tracking_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const LicenseCell = ({ start, end, label }: { start: string | null; end: string | null; label: string }) => {
    const days = getDaysRemaining(end);
    const info = getStatusInfo(days, isAr);
    const Icon = info.icon;
    return (
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="flex items-center gap-1.5">
          <Badge className={cn('text-xs', info.color)}>
            <Icon className="w-3 h-3 me-1" />
            {days !== null ? `${days} ${isAr ? 'يوم' : 'days'}` : info.label}
          </Badge>
        </div>
        {end && <div className="text-xs text-muted-foreground">{end}</div>}
      </div>
    );
  };

  const stationName = (id: string | null) => {
    if (!id) return <span className="text-xs text-muted-foreground">{isAr ? 'غير مخصص' : 'Unassigned'}</span>;
    const st = stationMap[id];
    return st ? (
      <span className="inline-flex items-center gap-1 text-xs">
        <Building2 className="w-3 h-3 text-primary" />{isAr ? st.name_ar : st.name_en}
      </span>
    ) : '-';
  };

  return (
    <div className="space-y-4">
      {/* KPI Panel — aggregate of all 3 license types per vehicle */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {isAr ? 'ملخص حالة التراخيص' : 'Licenses Status Summary'}
            </span>
            <Badge variant="outline" className="font-normal">
              {isAr ? 'إجمالي السيارات:' : 'Total vehicles:'} <span className="font-bold ms-1">{kpi.total}</span>
              {stationFilter && <span className="ms-2 text-xs text-muted-foreground">({isAr ? 'محطة محددة' : 'filtered station'})</span>}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* KPI numbers grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-red-700 dark:text-red-400 font-medium">{isAr ? 'منتهية' : 'Expired'}</span>
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex items-end justify-between mt-1">
                <span className="text-2xl font-bold text-red-700 dark:text-red-400">{kpi.expired}</span>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">{kpi.pctExpired}%</span>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">{isAr ? 'قريبة (30 يوم)' : 'Soon (30d)'}</span>
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex items-end justify-between mt-1">
                <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{kpi.soon}</span>
                <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{kpi.pctSoon}%</span>
              </div>
            </div>
            <div className="p-3 rounded-lg border border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-green-700 dark:text-green-400 font-medium">{isAr ? 'سارية' : 'Valid'}</span>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex items-end justify-between mt-1">
                <span className="text-2xl font-bold text-green-700 dark:text-green-400">{kpi.valid}</span>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">{kpi.pctValid}%</span>
              </div>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-medium">{isAr ? 'بدون بيانات' : 'No data'}</span>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-end justify-between mt-1">
                <span className="text-2xl font-bold">{kpi.missing}</span>
                <span className="text-sm font-semibold text-muted-foreground">{kpi.pctMissing}%</span>
              </div>
            </div>
          </div>

          {/* Stacked progress bar */}
          {kpi.total > 0 && (
            <div>
              <div className="flex h-3 w-full overflow-hidden rounded-full border bg-muted/30">
                <div className="bg-red-500" style={{ width: `${kpi.pctExpired}%` }} title={`${isAr ? 'منتهية' : 'Expired'}: ${kpi.pctExpired}%`} />
                <div className="bg-yellow-500" style={{ width: `${kpi.pctSoon}%` }} title={`${isAr ? 'قريبة' : 'Soon'}: ${kpi.pctSoon}%`} />
                <div className="bg-green-500" style={{ width: `${kpi.pctValid}%` }} title={`${isAr ? 'سارية' : 'Valid'}: ${kpi.pctValid}%`} />
                <div className="bg-muted-foreground/40" style={{ width: `${kpi.pctMissing}%` }} title={`${isAr ? 'بدون بيانات' : 'No data'}: ${kpi.pctMissing}%`} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {isAr
                  ? 'يتم احتساب الحالة بناءً على أسوأ ترخيص (السيارة، الستائر، النقل) لكل سيارة.'
                  : 'Status is computed using the worst of all 3 licenses (vehicle, curtains, transport) per vehicle.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary cards (clickable filters — Vehicle License only) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => setStatusBucket(statusBucket === 'expired' ? 'all' : 'expired')} className="text-start">
          <Card className={cn('border-red-200 bg-red-50/50 dark:bg-red-950/20 hover:shadow-md transition cursor-pointer', statusBucket === 'expired' && 'ring-2 ring-red-400')}>
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{expiredCount}</p>
                <p className="text-sm text-red-600 dark:text-red-400">{isAr ? 'تراخيص منتهية' : 'Expired Licenses'}</p>
              </div>
            </CardContent>
          </Card>
        </button>
        <button onClick={() => setStatusBucket(statusBucket === 'soon' ? 'all' : 'soon')} className="text-start">
          <Card className={cn('border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 hover:shadow-md transition cursor-pointer', statusBucket === 'soon' && 'ring-2 ring-yellow-400')}>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{soonCount}</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">{isAr ? 'قريبة الانتهاء (30 يوم)' : 'Expiring Soon (30 days)'}</p>
              </div>
            </CardContent>
          </Card>
        </button>
        <button onClick={() => setStatusBucket(statusBucket === 'valid' ? 'all' : 'valid')} className="text-start">
          <Card className={cn('border-green-200 bg-green-50/50 dark:bg-green-950/20 hover:shadow-md transition cursor-pointer', statusBucket === 'valid' && 'ring-2 ring-green-400')}>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{validCount}</p>
                <p className="text-sm text-green-600 dark:text-green-400">{isAr ? 'تراخيص سارية' : 'Valid Licenses'}</p>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      <Card>
        <CardHeader className={cn('flex flex-row items-center justify-between flex-wrap gap-2', isRTL && 'flex-row-reverse')}>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isAr ? 'متابعة التراخيص' : 'License Tracking'}
            <Badge variant="outline" className="ms-2">{filtered.length}</Badge>
          </CardTitle>
          <div className={cn('flex items-center gap-2 flex-wrap', isRTL && 'flex-row-reverse')}>
            <div className="relative">
              <Search className="absolute top-2.5 start-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 h-9 w-44" />
            </div>
            <StationCombobox
              stations={stations} value={stationFilter} onChange={setStationFilter} isAr={isAr}
              allowAll allLabel={isAr ? 'كل المحطات' : 'All stations'} className="w-44"
            />
            <Select value={filter} onValueChange={(v) => setFilter(v as LicenseType)}>
              <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? 'جميع التراخيص' : 'All Licenses'}</SelectItem>
                <SelectItem value="vehicle">{isAr ? 'ترخيص السيارة' : 'Vehicle License'}</SelectItem>
                <SelectItem value="curtains">{isAr ? 'ترخيص الستائر' : 'Curtains License'}</SelectItem>
                <SelectItem value="transport">{isAr ? 'النقل البري' : 'Transport License'}</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="w-4 h-4 me-1" />{isAr ? 'تصدير' : 'Export'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد نتائج' : 'No results'}</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAr ? 'السيارة' : 'Vehicle'}</TableHead>
                      <TableHead>{isAr ? 'اللوحة' : 'Plate'}</TableHead>
                      <TableHead>{isAr ? 'المحطة' : 'Station'}</TableHead>
                      {(filter === 'all' || filter === 'vehicle') && <TableHead>{isAr ? 'ترخيص السيارة' : 'Vehicle License'}</TableHead>}
                      {(filter === 'all' || filter === 'curtains') && <TableHead>{isAr ? 'ترخيص الستائر' : 'Curtains License'}</TableHead>}
                      {(filter === 'all' || filter === 'transport') && <TableHead>{isAr ? 'النقل البري' : 'Transport License'}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <div className="font-medium">{v.brand} {v.model}</div>
                          <div className="text-xs text-muted-foreground">{v.vehicle_code}</div>
                        </TableCell>
                        <TableCell className="font-mono">{v.plate_number}</TableCell>
                        <TableCell>{stationName(v.station_id)}</TableCell>
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

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {filtered.map((v) => (
                  <div key={v.id} className="border rounded-lg p-3 bg-card">
                    <div className={cn('flex items-start justify-between gap-2', isRTL && 'flex-row-reverse')}>
                      <div className="min-w-0">
                        <div className="font-semibold">{v.brand} {v.model}</div>
                        <div className="text-xs text-muted-foreground font-mono">{v.plate_number}</div>
                        <div className="text-xs mt-1">{stationName(v.station_id)}</div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{v.vehicle_code}</Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {(filter === 'all' || filter === 'vehicle') && (
                        <LicenseCell start={v.license_start_date} end={v.license_end_date} label={isAr ? 'ترخيص السيارة' : 'Vehicle'} />
                      )}
                      {(filter === 'all' || filter === 'curtains') && (
                        <LicenseCell start={v.curtains_license_start} end={v.curtains_license_end} label={isAr ? 'الستائر' : 'Curtains'} />
                      )}
                      {(filter === 'all' || filter === 'transport') && (
                        <LicenseCell start={v.transport_license_start} end={v.transport_license_end} label={isAr ? 'النقل البري' : 'Transport'} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
