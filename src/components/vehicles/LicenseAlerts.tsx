import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, AlertOctagon, Clock, Search, Download, Building2, Car, CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StationCombobox, StationOption } from './StationCombobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface Vehicle {
  id: string;
  vehicle_code: string;
  brand: string;
  model: string;
  plate_number: string;
  station_id: string | null;
  license_end_date: string | null;
  curtains_license_end: string | null;
  transport_license_end: string | null;
}

type Severity = 'expired' | 'urgent' | 'reminder';

interface AlertRow {
  vehicle: Vehicle;
  licenseAr: string;
  licenseEn: string;
  date: string;
  days: number;
  severity: Severity;
}

const URGENT_DAYS = 14;
const REMINDER_DAYS = 60;

const LICENSES: { key: keyof Vehicle; ar: string; en: string }[] = [
  { key: 'license_end_date', ar: 'الترخيص الرئيسي', en: 'Main License' },
  { key: 'curtains_license_end', ar: 'ترخيص الستائر', en: 'Curtains License' },
  { key: 'transport_license_end', ar: 'ترخيص النقل البري', en: 'Transport License' },
];

export const LicenseAlerts = () => {
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all');
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  const applyPreset = (days: number | 'all') => {
    if (days === 'all') { setFromDate(undefined); setToDate(undefined); return; }
    const f = new Date(today);
    const t = new Date(today); t.setDate(t.getDate() + days);
    setFromDate(f); setToDate(t);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: v }, { data: s }] = await Promise.all([
        supabase
          .from('vehicles')
          .select('id, vehicle_code, brand, model, plate_number, station_id, license_end_date, curtains_license_end, transport_license_end')
          .order('vehicle_code'),
        supabase.from('stations').select('id, name_ar, name_en, code').eq('is_active', true).order('name_ar'),
      ]);
      if (v) setVehicles(v as unknown as Vehicle[]);
      if (s) setStations(s as StationOption[]);
      setLoading(false);
    })();
  }, []);

  const stationMap = useMemo(() => Object.fromEntries(stations.map((s) => [s.id, s])), [stations]);

  const allAlerts: AlertRow[] = useMemo(() => {
    const arr: AlertRow[] = [];
    vehicles.forEach((v) => {
      LICENSES.forEach((l) => {
        const date = (v as any)[l.key] as string | null;
        if (!date) return;
        const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
        let severity: Severity | null = null;
        if (days < 0) severity = 'expired';
        else if (days <= URGENT_DAYS) severity = 'urgent';
        else if (days <= REMINDER_DAYS) severity = 'reminder';
        if (!severity) return;
        arr.push({ vehicle: v, licenseAr: l.ar, licenseEn: l.en, date, days, severity });
      });
    });
    return arr.sort((a, b) => a.days - b.days);
  }, [vehicles]);

  const counts = useMemo(() => ({
    expired: allAlerts.filter((a) => a.severity === 'expired').length,
    urgent: allAlerts.filter((a) => a.severity === 'urgent').length,
    reminder: allAlerts.filter((a) => a.severity === 'reminder').length,
  }), [allAlerts]);

  const filtered = useMemo(() => allAlerts.filter((a) => {
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (stationFilter && a.vehicle.station_id !== stationFilter) return false;
    const txt = search.trim().toLowerCase();
    if (txt) {
      const hay = [a.vehicle.vehicle_code, a.vehicle.brand, a.vehicle.model, a.vehicle.plate_number].join(' ').toLowerCase();
      if (!hay.includes(txt)) return false;
    }
    return true;
  }), [allAlerts, severityFilter, stationFilter, search]);

  const exportCsv = () => {
    const rows = [[
      isAr ? 'الكود' : 'Code', isAr ? 'الماركة' : 'Brand', isAr ? 'الموديل' : 'Model',
      isAr ? 'اللوحة' : 'Plate', isAr ? 'المحطة' : 'Station', isAr ? 'الترخيص' : 'License',
      isAr ? 'تاريخ الانتهاء' : 'End Date', isAr ? 'الأيام المتبقية' : 'Days Left',
      isAr ? 'الحالة' : 'Severity',
    ]];
    filtered.forEach((a) => {
      const st = a.vehicle.station_id ? stationMap[a.vehicle.station_id] : null;
      rows.push([
        a.vehicle.vehicle_code, a.vehicle.brand, a.vehicle.model, a.vehicle.plate_number,
        st ? (isAr ? st.name_ar : st.name_en) : '',
        isAr ? a.licenseAr : a.licenseEn, a.date, String(a.days),
        a.severity,
      ]);
    });
    const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `license_alerts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const severityBadge = (s: Severity, days: number) => {
    if (s === 'expired') return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 gap-1">
        <AlertOctagon className="w-3 h-3" />
        {isAr ? `منتهي منذ ${Math.abs(days)} يوم` : `Expired ${Math.abs(days)}d ago`}
      </Badge>
    );
    if (s === 'urgent') return (
      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 gap-1">
        <AlertTriangle className="w-3 h-3" />
        {isAr ? `عاجل: ${days} يوم` : `Urgent: ${days}d`}
      </Badge>
    );
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 gap-1">
        <Clock className="w-3 h-3" />
        {isAr ? `تذكير: ${days} يوم` : `Reminder: ${days}d`}
      </Badge>
    );
  };

  const StatCard = ({ icon: Icon, label, count, color, active, onClick }: any) => (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border bg-card text-start transition-all hover:shadow-md',
        active && 'ring-2 ring-primary border-primary'
      )}
    >
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </button>
  );

  return (
    <Card>
      <CardHeader className={cn('flex flex-row items-center justify-between flex-wrap gap-2', isRTL && 'flex-row-reverse')}>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          {isAr ? 'تنبيهات نهاية التراخيص' : 'License Expiry Alerts'}
          <Badge variant="outline" className="ms-2">{filtered.length}</Badge>
        </CardTitle>
        <div className={cn('flex items-center gap-2 flex-wrap', isRTL && 'flex-row-reverse')}>
          <div className="relative">
            <Search className="absolute top-2.5 start-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9 h-9 w-44" />
          </div>
          <StationCombobox
            stations={stations}
            value={stationFilter}
            onChange={setStationFilter}
            isAr={isAr}
            allowAll
            allLabel={isAr ? 'كل المحطات' : 'All stations'}
            className="w-44"
          />
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="w-4 h-4 me-1" />{isAr ? 'تصدير' : 'Export'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard
            icon={Car} label={isAr ? 'الإجمالي' : 'Total'} count={allAlerts.length}
            color="bg-primary/10 text-primary"
            active={severityFilter === 'all'}
            onClick={() => setSeverityFilter('all')}
          />
          <StatCard
            icon={AlertOctagon} label={isAr ? 'منتهية' : 'Expired'} count={counts.expired}
            color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            active={severityFilter === 'expired'}
            onClick={() => setSeverityFilter('expired')}
          />
          <StatCard
            icon={AlertTriangle} label={isAr ? `عاجل (≤${URGENT_DAYS} يوم)` : `Urgent (≤${URGENT_DAYS}d)`} count={counts.urgent}
            color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
            active={severityFilter === 'urgent'}
            onClick={() => setSeverityFilter('urgent')}
          />
          <StatCard
            icon={Clock} label={isAr ? `تذكير (≤${REMINDER_DAYS} يوم)` : `Reminder (≤${REMINDER_DAYS}d)`} count={counts.reminder}
            color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            active={severityFilter === 'reminder'}
            onClick={() => setSeverityFilter('reminder')}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{isAr ? 'لا توجد تنبيهات حالياً' : 'No alerts at the moment'}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{isAr ? 'السيارة' : 'Vehicle'}</TableHead>
                    <TableHead>{isAr ? 'اللوحة' : 'Plate'}</TableHead>
                    <TableHead>{isAr ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead>{isAr ? 'الترخيص' : 'License'}</TableHead>
                    <TableHead>{isAr ? 'تاريخ الانتهاء' : 'End Date'}</TableHead>
                    <TableHead>{isAr ? 'الحالة' : 'Severity'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a, i) => {
                    const st = a.vehicle.station_id ? stationMap[a.vehicle.station_id] : null;
                    return (
                      <TableRow key={`${a.vehicle.id}-${a.licenseEn}-${i}`}>
                        <TableCell className="font-mono text-xs">{a.vehicle.vehicle_code}</TableCell>
                        <TableCell>{a.vehicle.brand} {a.vehicle.model}</TableCell>
                        <TableCell className="font-mono">{a.vehicle.plate_number}</TableCell>
                        <TableCell>
                          {st ? (
                            <span className="inline-flex items-center gap-1 text-sm">
                              <Building2 className="w-3 h-3 text-primary" />
                              {isAr ? st.name_ar : st.name_en}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">{isAr ? 'غير مخصص' : 'Unassigned'}</span>}
                        </TableCell>
                        <TableCell>{isAr ? a.licenseAr : a.licenseEn}</TableCell>
                        <TableCell className="font-mono">{a.date}</TableCell>
                        <TableCell>{severityBadge(a.severity, a.days)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filtered.map((a, i) => {
                const st = a.vehicle.station_id ? stationMap[a.vehicle.station_id] : null;
                return (
                  <div key={`${a.vehicle.id}-${a.licenseEn}-${i}`} className="border rounded-lg p-3 bg-card">
                    <div className={cn('flex items-start justify-between gap-2', isRTL && 'flex-row-reverse')}>
                      <div className="min-w-0">
                        <div className="font-semibold">{a.vehicle.brand} {a.vehicle.model}</div>
                        <div className="text-xs text-muted-foreground font-mono">{a.vehicle.plate_number}</div>
                        {st && (
                          <div className="text-xs mt-1 inline-flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-primary" />
                            {isAr ? st.name_ar : st.name_en}
                          </div>
                        )}
                      </div>
                      {severityBadge(a.severity, a.days)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div><span className="text-muted-foreground">{isAr ? 'الترخيص:' : 'License:'}</span> {isAr ? a.licenseAr : a.licenseEn}</div>
                      <div><span className="text-muted-foreground">{isAr ? 'الانتهاء:' : 'End:'}</span> <span className="font-mono">{a.date}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
