import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Building2, Car, AlertTriangle, CheckCircle, Wrench, ChevronDown, Search, Download, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Station { id: string; name_ar: string; name_en: string; code: string | null; }
interface Vehicle {
  id: string; vehicle_code: string; brand: string; model: string; year: number;
  plate_number: string; status: string; station_id: string | null;
  license_end_date: string | null; curtains_license_end: string | null; transport_license_end: string | null;
  insured_driver_name: string | null;
}
interface MaintRow { vehicle_id: string; cost: number | null; next_maintenance_date: string | null; maintenance_date: string; }

const daysLeft = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;

export const FleetByStation = () => {
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';
  const [stations, setStations] = useState<Station[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maint, setMaint] = useState<MaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAll = async (showLoader = true) => {
      if (showLoader) setLoading(true);
      const [{ data: s }, { data: v }, { data: m }] = await Promise.all([
        supabase.from('stations').select('id, name_ar, name_en, code').eq('is_active', true).order('name_ar'),
        supabase.from('vehicles').select('id, vehicle_code, brand, model, year, plate_number, status, station_id, license_end_date, curtains_license_end, transport_license_end, insured_driver_name'),
        supabase.from('vehicle_maintenance').select('vehicle_id, cost, next_maintenance_date, maintenance_date'),
      ]);
      if (s) setStations(s as Station[]);
      if (v) setVehicles(v as unknown as Vehicle[]);
      if (m) setMaint(m as unknown as MaintRow[]);
      if (showLoader) setLoading(false);
    };
    fetchAll(true);
    const REFRESH_MS = 3 * 60 * 60 * 1000;
    const interval = setInterval(() => fetchAll(false), REFRESH_MS);
    const onVis = () => { if (document.visibilityState === 'visible') fetchAll(false); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const grouped = useMemo(() => {
    const filterText = search.trim().toLowerCase();
    const map = new Map<string | 'unassigned', Vehicle[]>();
    vehicles.forEach((v) => {
      if (filterText) {
        const hay = `${v.vehicle_code} ${v.brand} ${v.model} ${v.plate_number} ${v.insured_driver_name || ''}`.toLowerCase();
        if (!hay.includes(filterText)) return;
      }
      const k = v.station_id || 'unassigned';
      const arr = map.get(k) || [];
      arr.push(v);
      map.set(k, arr);
    });
    return map;
  }, [vehicles, search]);

  const stationStats = (stationId: string | 'unassigned') => {
    const list = grouped.get(stationId) || [];
    let expired = 0, soon = 0, valid = 0, maintCost = 0, upcomingMaint = 0;
    list.forEach((v) => {
      [v.license_end_date, v.curtains_license_end, v.transport_license_end].forEach((d) => {
        const dl = daysLeft(d);
        if (dl === null) return;
        if (dl < 0) expired++;
        else if (dl <= 30) soon++;
        else valid++;
      });
    });
    maint.forEach((m) => {
      if (!list.some((v) => v.id === m.vehicle_id)) return;
      maintCost += Number(m.cost) || 0;
      const nd = daysLeft(m.next_maintenance_date);
      if (nd !== null && nd >= 0 && nd <= 30) upcomingMaint++;
    });
    return { count: list.length, expired, soon, valid, maintCost, upcomingMaint };
  };

  // Global summary
  const totals = useMemo(() => {
    let totalVehicles = vehicles.length;
    let totalExpired = 0, totalSoon = 0, totalUpcomingMaint = 0, totalCost = 0;
    vehicles.forEach((v) => {
      [v.license_end_date, v.curtains_license_end, v.transport_license_end].forEach((d) => {
        const dl = daysLeft(d);
        if (dl === null) return;
        if (dl < 0) totalExpired++;
        else if (dl <= 30) totalSoon++;
      });
    });
    maint.forEach((m) => {
      totalCost += Number(m.cost) || 0;
      const nd = daysLeft(m.next_maintenance_date);
      if (nd !== null && nd >= 0 && nd <= 30) totalUpcomingMaint++;
    });
    return { totalVehicles, totalExpired, totalSoon, totalUpcomingMaint, totalCost, totalStations: stations.length };
  }, [vehicles, maint, stations]);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const expandAll = () => setOpenIds(new Set([...stations.map((s) => s.id), 'unassigned']));
  const collapseAll = () => setOpenIds(new Set());

  const exportCsv = () => {
    const rows = [
      [isAr ? 'المحطة' : 'Station', isAr ? 'كود السيارة' : 'Code', isAr ? 'الماركة' : 'Brand', isAr ? 'الموديل' : 'Model', isAr ? 'اللوحة' : 'Plate', isAr ? 'سنة' : 'Year', isAr ? 'الحالة' : 'Status', isAr ? 'نهاية الترخيص' : 'License End'],
    ];
    [...stations, { id: 'unassigned', name_ar: 'غير مخصص', name_en: 'Unassigned', code: '' } as Station].forEach((s) => {
      const list = grouped.get(s.id) || [];
      list.forEach((v) => {
        rows.push([
          isAr ? s.name_ar : s.name_en,
          v.vehicle_code, v.brand, v.model, v.plate_number, String(v.year), v.status, v.license_end_date || '',
        ]);
      });
    });
    const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fleet_by_station_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const stationsToShow: Array<Station & { _key: string }> = [
    ...stations.map((s) => ({ ...s, _key: s.id })),
    ...(grouped.has('unassigned') ? [{ id: 'unassigned', _key: 'unassigned', name_ar: 'غير مخصص', name_en: 'Unassigned', code: null }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Global summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">{isAr ? 'المحطات' : 'Stations'}</span></div>
            <p className="text-2xl font-bold mt-1">{totals.totalStations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2"><Car className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">{isAr ? 'إجمالي السيارات' : 'Total Vehicles'}</span></div>
            <p className="text-2xl font-bold mt-1">{totals.totalVehicles}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-xs text-muted-foreground">{isAr ? 'تراخيص منتهية' : 'Expired'}</span></div>
            <p className="text-2xl font-bold mt-1 text-red-700">{totals.totalExpired}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-600" /><span className="text-xs text-muted-foreground">{isAr ? 'تنتهي خلال 30 يوم' : 'Expiring 30d'}</span></div>
            <p className="text-2xl font-bold mt-1 text-yellow-700">{totals.totalSoon}</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2"><Wrench className="w-4 h-4 text-orange-600" /><span className="text-xs text-muted-foreground">{isAr ? 'صيانة قادمة' : 'Upcoming Maint.'}</span></div>
            <p className="text-2xl font-bold mt-1 text-orange-700">{totals.totalUpcomingMaint}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2"><Wrench className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">{isAr ? 'تكلفة الصيانة' : 'Maint. Cost'}</span></div>
            <p className="text-lg font-bold mt-1">{totals.totalCost.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader className={cn('flex flex-row items-center justify-between flex-wrap gap-2', isRTL && 'flex-row-reverse')}>
          <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5" />{isAr ? 'سيارات لكل محطة' : 'Vehicles per Station'}</CardTitle>
          <div className={cn('flex items-center gap-2 flex-wrap', isRTL && 'flex-row-reverse')}>
            <div className="relative">
              <Search className="absolute top-2.5 start-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder={isAr ? 'بحث في السيارات...' : 'Search vehicles...'} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 h-9 w-56" />
            </div>
            <Button variant="outline" size="sm" onClick={expandAll}>{isAr ? 'فتح الكل' : 'Expand All'}</Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>{isAr ? 'طي الكل' : 'Collapse All'}</Button>
            <Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-4 h-4 me-1" />{isAr ? 'تصدير' : 'Export'}</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {stationsToShow.map((s) => {
            const stats = stationStats(s._key as any);
            const list = grouped.get(s._key as any) || [];
            if (search && list.length === 0) return null;
            const isOpen = openIds.has(s._key);
            return (
              <Collapsible key={s._key} open={isOpen} onOpenChange={() => toggle(s._key)}>
                <CollapsibleTrigger asChild>
                  <button className={cn(
                    'w-full flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition',
                    isRTL && 'flex-row-reverse',
                    stats.expired > 0 && 'border-red-300/60',
                  )}>
                    <div className={cn('flex items-center gap-3', isRTL && 'flex-row-reverse')}>
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        s._key === 'unassigned' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
                      )}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className={cn('text-start', isRTL && 'text-end')}>
                        <div className="font-semibold">{isAr ? s.name_ar : s.name_en}</div>
                        <div className="text-xs text-muted-foreground">
                          {stats.count} {isAr ? 'سيارة' : 'vehicles'}
                          {s.code && <span className="ms-2 font-mono">· {s.code}</span>}
                        </div>
                      </div>
                    </div>
                    <div className={cn('flex items-center gap-2 flex-wrap', isRTL && 'flex-row-reverse')}>
                      {stats.expired > 0 && <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300"><AlertTriangle className="w-3 h-3 me-1" />{stats.expired} {isAr ? 'منتهي' : 'expired'}</Badge>}
                      {stats.soon > 0 && <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300">{stats.soon} {isAr ? 'قريب' : 'soon'}</Badge>}
                      {stats.upcomingMaint > 0 && <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300"><Wrench className="w-3 h-3 me-1" />{stats.upcomingMaint}</Badge>}
                      {stats.valid > 0 && <Badge variant="outline" className="text-green-700 border-green-300 dark:text-green-400"><CheckCircle className="w-3 h-3 me-1" />{stats.valid} {isAr ? 'ساري' : 'valid'}</Badge>}
                      <ChevronDown className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">{isAr ? 'لا توجد سيارات في هذه المحطة' : 'No vehicles in this station'}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ps-2 pe-2">
                      {list.map((v) => {
                        const dl = daysLeft(v.license_end_date);
                        const lic = dl === null ? null : dl < 0 ? 'expired' : dl <= 30 ? 'soon' : 'valid';
                        return (
                          <div key={v.id} className="border rounded-lg p-3 bg-background hover:shadow-sm transition">
                            <div className={cn('flex items-start justify-between gap-2', isRTL && 'flex-row-reverse')}>
                              <div className="min-w-0">
                                <div className="font-semibold truncate">{v.brand} {v.model}</div>
                                <div className="text-xs text-muted-foreground font-mono">{v.plate_number} · {v.year}</div>
                              </div>
                              <Badge variant="outline" className="text-xs shrink-0">{v.vehicle_code}</Badge>
                            </div>
                            {v.insured_driver_name && (
                              <div className="text-xs text-muted-foreground mt-2 truncate">{isAr ? 'السائق:' : 'Driver:'} {v.insured_driver_name}</div>
                            )}
                            <div className="mt-2 flex items-center gap-1 flex-wrap">
                              {lic === 'expired' && <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-xs">{isAr ? 'ترخيص منتهي' : 'License expired'}</Badge>}
                              {lic === 'soon' && <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 text-xs">{dl} {isAr ? 'يوم' : 'd'}</Badge>}
                              {lic === 'valid' && <Badge variant="outline" className="text-green-700 border-green-300 text-xs">{isAr ? 'ترخيص ساري' : 'Valid'}</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          {stationsToShow.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد محطات' : 'No stations'}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
