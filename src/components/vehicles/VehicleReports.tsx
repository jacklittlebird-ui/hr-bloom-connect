import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BarChart3, Wrench, AlertTriangle, ShieldAlert, CalendarRange, FileSpreadsheet, Car, CheckCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { exportToXLSX } from '@/lib/leavesExport';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  vehicle_code: string;
  brand: string;
  model: string;
  plate_number: string;
  status: string;
  station_id?: string | null;
  license_end_date: string | null;
  curtains_license_end: string | null;
  transport_license_end: string | null;
  license_alert_days_before: number | null;
  maintenance_km_interval: number | null;
  maintenance_month_interval: number | null;
  current_odometer: number | null;
}
interface MaintRow {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  maintenance_date: string;
  next_maintenance_date: string | null;
  odometer_reading: number | null;
  cost: number | null;
  status: string;
}

const daysLeft = (d: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null);
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthsAgoISO = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
};

export const VehicleReports = ({ allowedStationIds }: { allowedStationIds?: string[] | null } = {}) => {
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';
  const scopeIds = allowedStationIds && allowedStationIds.length ? allowedStationIds : null;

  const [fromDate, setFromDate] = useState(monthsAgoISO(6));
  const [toDate, setToDate] = useState(todayISO());
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maint, setMaint] = useState<MaintRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let vq = supabase.from('vehicles').select('id, vehicle_code, brand, model, plate_number, status, station_id, license_end_date, curtains_license_end, transport_license_end, license_alert_days_before, maintenance_km_interval, maintenance_month_interval, current_odometer');
      if (scopeIds) vq = vq.in('station_id', scopeIds);
      const [{ data: v }, { data: m }] = await Promise.all([
        vq,
        supabase.from('vehicle_maintenance')
          .select('id, vehicle_id, maintenance_type, maintenance_date, next_maintenance_date, odometer_reading, cost, status')
          .gte('maintenance_date', fromDate)
          .lte('maintenance_date', toDate)
          .order('maintenance_date', { ascending: false }),
      ]);
      if (cancelled) return;
      const vList = (v as any[]) || [];
      const allowedVehicleIds = new Set(vList.map((x) => x.id));
      setVehicles(vList as Vehicle[]);
      setMaint(((m as MaintRow[]) || []).filter((r) => allowedVehicleIds.has(r.vehicle_id)));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fromDate, toDate, scopeIds?.join(',')]);

  const summary = useMemo(() => {
    let expired = 0, soon = 0, valid = 0, missing = 0;
    vehicles.forEach((v) => {
      [v.license_end_date, v.curtains_license_end, v.transport_license_end].forEach((d) => {
        const dl = daysLeft(d);
        if (dl === null) { missing++; return; }
        const threshold = v.license_alert_days_before ?? 30;
        if (dl < 0) expired++;
        else if (dl <= threshold) soon++;
        else valid++;
      });
    });
    const totalCost = maint.reduce((s, r) => s + (Number(r.cost) || 0), 0);
    const completed = maint.filter((m) => m.status === 'completed').length;
    const pending = maint.filter((m) => m.status !== 'completed').length;
    const overdueMaintenance = vehicles.filter((v) => {
      const latest = maint.filter((m) => m.vehicle_id === v.id).sort((a, b) => b.maintenance_date.localeCompare(a.maintenance_date))[0];
      if (!latest) return false;
      const interval = v.maintenance_month_interval ?? 6;
      const last = new Date(latest.maintenance_date);
      const due = new Date(last);
      due.setMonth(due.getMonth() + interval);
      return due.getTime() < Date.now();
    }).length;
    return { expired, soon, valid, missing, totalCost, completed, pending, overdueMaintenance };
  }, [vehicles, maint]);

  // Maintenance by type
  const typeData = useMemo(() => {
    const map = new Map<string, { name: string; count: number; cost: number }>();
    maint.forEach((m) => {
      const key = m.maintenance_type || (isAr ? 'غير محدد' : 'Unknown');
      const e = map.get(key) || { name: key, count: 0, cost: 0 };
      e.count++;
      e.cost += Number(m.cost) || 0;
      map.set(key, e);
    });
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost).slice(0, 8);
  }, [maint, isAr]);

  // Monthly maintenance cost
  const monthlyData = useMemo(() => {
    const map = new Map<string, { month: string; cost: number; count: number }>();
    maint.forEach((m) => {
      const k = m.maintenance_date.slice(0, 7);
      const e = map.get(k) || { month: k, cost: 0, count: 0 };
      e.count++;
      e.cost += Number(m.cost) || 0;
      map.set(k, e);
    });
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [maint]);

  // Status pie data
  const licenseStatusData = useMemo(() => [
    { name: isAr ? 'ساري' : 'Valid', value: summary.valid, fill: 'hsl(142, 76%, 36%)' },
    { name: isAr ? 'قريب الانتهاء' : 'Expiring Soon', value: summary.soon, fill: 'hsl(38, 92%, 50%)' },
    { name: isAr ? 'منتهي' : 'Expired', value: summary.expired, fill: 'hsl(0, 84%, 60%)' },
  ].filter((d) => d.value > 0), [summary, isAr]);

  const exportReport = () => {
    if (maint.length === 0) { toast.error(isAr ? 'لا توجد بيانات' : 'No data'); return; }
    const vmap = new Map(vehicles.map((v) => [v.id, v]));
    const columns = [
      { header: isAr ? 'التاريخ' : 'Date', accessor: (m: MaintRow) => m.maintenance_date },
      { header: isAr ? 'السيارة' : 'Vehicle', accessor: (m: MaintRow) => {
        const v = vmap.get(m.vehicle_id);
        return v ? `${v.vehicle_code} - ${v.brand} ${v.model} (${v.plate_number})` : '';
      }},
      { header: isAr ? 'النوع' : 'Type', accessor: (m: MaintRow) => m.maintenance_type },
      { header: isAr ? 'العداد' : 'Odometer', accessor: (m: MaintRow) => m.odometer_reading ?? '' },
      { header: isAr ? 'التكلفة' : 'Cost', accessor: (m: MaintRow) => Number(m.cost) || 0 },
      { header: isAr ? 'الصيانة التالية' : 'Next Date', accessor: (m: MaintRow) => m.next_maintenance_date || '' },
      { header: isAr ? 'الحالة' : 'Status', accessor: (m: MaintRow) => m.status },
    ];
    exportToXLSX(maint, columns as any, 'vehicle_reports', isAr ? 'تقرير الصيانة' : 'Maintenance Report', {
      title: isAr ? `تقرير صيانة السيارات (${fromDate} - ${toDate})` : `Vehicle Maintenance Report (${fromDate} - ${toDate})`,
      isRTL: true,
    });
    toast.success(isAr ? 'تم التصدير' : 'Exported');
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Filters */}
      <Card>
        <CardHeader className={cn('flex flex-row items-center justify-between flex-wrap gap-3', isRTL && 'flex-row-reverse')}>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            {isAr ? 'تقارير السيارات' : 'Vehicle Reports'}
          </CardTitle>
          <div className={cn('flex items-end gap-2 flex-wrap', isRTL && 'flex-row-reverse')}>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><CalendarRange className="w-3 h-3" />{isAr ? 'من' : 'From'}</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><CalendarRange className="w-3 h-3" />{isAr ? 'إلى' : 'To'}</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-40" />
            </div>
            <Button variant="outline" size="sm" onClick={() => { setFromDate(monthsAgoISO(1)); setToDate(todayISO()); }}>{isAr ? 'الشهر' : '1 Month'}</Button>
            <Button variant="outline" size="sm" onClick={() => { setFromDate(monthsAgoISO(3)); setToDate(todayISO()); }}>{isAr ? '3 أشهر' : '3 Months'}</Button>
            <Button variant="outline" size="sm" onClick={() => { setFromDate(monthsAgoISO(12)); setToDate(todayISO()); }}>{isAr ? 'سنة' : '1 Year'}</Button>
            <Button onClick={exportReport} className="border-green-700 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30" variant="outline" size="sm">
              <FileSpreadsheet className="w-4 h-4 me-1" />Excel
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <SummaryCard icon={Car} color="primary" label={isAr ? 'إجمالي السيارات' : 'Total Vehicles'} value={vehicles.length} />
        <SummaryCard icon={CheckCircle} color="emerald" label={isAr ? 'تراخيص سارية' : 'Valid Licenses'} value={summary.valid} />
        <SummaryCard icon={Clock} color="amber" label={isAr ? 'تنتهي قريبًا' : 'Expiring Soon'} value={summary.soon} />
        <SummaryCard icon={AlertTriangle} color="red" label={isAr ? 'تراخيص منتهية' : 'Expired'} value={summary.expired} />
        <SummaryCard icon={Wrench} color="orange" label={isAr ? 'سجلات صيانة' : 'Maint. Records'} value={maint.length} />
        <SummaryCard icon={ShieldAlert} color="rose" label={isAr ? 'صيانة متأخرة' : 'Overdue Maint.'} value={summary.overdueMaintenance} />
        <SummaryCard icon={CheckCircle} color="emerald" label={isAr ? 'مكتملة' : 'Completed'} value={summary.completed} />
        <SummaryCard icon={Wrench} color="primary" label={isAr ? 'إجمالي التكلفة' : 'Total Cost'} value={`${summary.totalCost.toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}`} small />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Wrench className="w-4 h-4" />{isAr ? 'تكلفة الصيانة شهريًا' : 'Maintenance Cost (Monthly)'}</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">{isAr ? 'لا توجد بيانات' : 'No data'}</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ direction: isRTL ? 'rtl' : 'ltr' }} />
                  <Bar dataKey="cost" name={isAr ? 'التكلفة (ج.م)' : 'Cost (EGP)'} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="w-4 h-4" />{isAr ? 'حالة التراخيص' : 'License Status'}</CardTitle>
          </CardHeader>
          <CardContent>
            {licenseStatusData.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">{isAr ? 'لا توجد بيانات' : 'No data'}</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={licenseStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => `${e.value}`}>
                    {licenseStatusData.map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                  </Pie>
                  <Tooltip contentStyle={{ direction: isRTL ? 'rtl' : 'ltr' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Wrench className="w-4 h-4" />{isAr ? 'الصيانة حسب النوع' : 'Maintenance by Type'}</CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">{isAr ? 'لا توجد بيانات' : 'No data'}</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ direction: isRTL ? 'rtl' : 'ltr' }} />
                  <Legend />
                  <Bar dataKey="count" name={isAr ? 'العدد' : 'Count'} fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="cost" name={isAr ? 'التكلفة (ج.م)' : 'Cost (EGP)'} fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest maintenance table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Wrench className="w-4 h-4" />{isAr ? 'أحدث سجلات الصيانة' : 'Recent Maintenance'}</CardTitle>
        </CardHeader>
        <CardContent>
          {maint.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">{isAr ? 'لا توجد سجلات في الفترة' : 'No records in period'}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-start p-2">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="text-start p-2">{isAr ? 'السيارة' : 'Vehicle'}</th>
                    <th className="text-start p-2">{isAr ? 'النوع' : 'Type'}</th>
                    <th className="text-start p-2">{isAr ? 'العداد' : 'Odometer'}</th>
                    <th className="text-start p-2">{isAr ? 'التكلفة' : 'Cost'}</th>
                    <th className="text-start p-2">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {maint.slice(0, 30).map((m) => {
                    const v = vehicles.find((x) => x.id === m.vehicle_id);
                    return (
                      <tr key={m.id} className="border-b hover:bg-muted/30">
                        <td className="p-2 whitespace-nowrap">{m.maintenance_date}</td>
                        <td className="p-2">{v ? `${v.vehicle_code} - ${v.brand} ${v.model}` : '—'}</td>
                        <td className="p-2">{m.maintenance_type}</td>
                        <td className="p-2">{m.odometer_reading?.toLocaleString() || '—'}</td>
                        <td className="p-2 font-semibold">{Number(m.cost || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                        <td className="p-2"><Badge variant={m.status === 'completed' ? 'default' : 'secondary'}>{m.status}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-primary/5', text: 'text-primary', border: 'border-primary/20' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-900/40' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-900/40' },
  red: { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-900/40' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-900/40' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-900/40' },
};

const SummaryCard = ({ icon: Icon, color, label, value, small = false }: { icon: any; color: string; label: string; value: string | number; small?: boolean }) => {
  const c = colorMap[color] || colorMap.primary;
  return (
    <Card className={cn(c.bg, c.border)}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Icon className={cn('w-4 h-4', c.text)} />
          <span className="text-xs text-muted-foreground truncate">{label}</span>
        </div>
        <p className={cn('font-bold mt-1', small ? 'text-base' : 'text-2xl', c.text)}>{value}</p>
      </CardContent>
    </Card>
  );
};
