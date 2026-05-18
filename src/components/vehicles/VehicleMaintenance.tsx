import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Wrench, Trash2, Building2, AlertCircle, Calendar, Download, FileDown, FileType2, Loader2, FilterX, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StationCombobox, StationOption } from './StationCombobox';
import { exportVehiclePdf } from '@/lib/vehiclePdfExport';
import { exportVehicleWord } from '@/lib/vehicleWordExport';
import { usePersistedState } from '@/hooks/usePersistedState';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  description: string | null;
  cost: number;
  maintenance_date: string;
  next_maintenance_date: string | null;
  next_maintenance_odometer: number | null;
  odometer_reading: number | null;
  provider: string | null;
  status: string;
  notes: string | null;
}

// Threshold in km - "upcoming" when remaining distance to next maintenance is <= this
const UPCOMING_KM_THRESHOLD = 1000;

interface VehicleOption {
  id: string; vehicle_code: string; brand: string; model: string; plate_number: string; station_id: string | null;
}

const TYPES = [
  { value: 'oil_change', ar: 'تغيير زيت', en: 'Oil Change' },
  { value: 'tires', ar: 'إطارات', en: 'Tires' },
  { value: 'brakes', ar: 'فرامل', en: 'Brakes' },
  { value: 'engine', ar: 'موتور', en: 'Engine' },
  { value: 'electrical', ar: 'كهرباء', en: 'Electrical' },
  { value: 'body', ar: 'سمكرة ودهان', en: 'Body Work' },
  { value: 'ac', ar: 'تكييف', en: 'AC' },
  { value: 'periodic', ar: 'صيانة دورية', en: 'Periodic' },
  { value: 'other', ar: 'أخرى', en: 'Other' },
];

const daysLeft = (d: string | null) => d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null;

export const VehicleMaintenance = ({ allowedStationIds }: { allowedStationIds?: string[] | null } = {}) => {
  const { language, isRTL } = useLanguage();
  const scopeIds = allowedStationIds && allowedStationIds.length ? new Set(allowedStationIds) : null;
  const isAr = language === 'ar';
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = usePersistedState<string>('hr_vehicles_maint_search', '');
  const [stationFilter, setStationFilter] = usePersistedState<string | null>('hr_vehicles_maint_station', null);
  const [typeFilter, setTypeFilter] = usePersistedState<string>('hr_vehicles_maint_type', 'all');
  const [fromDate, setFromDate] = usePersistedState<string>('hr_vehicles_maint_from', '');
  const [toDate, setToDate] = usePersistedState<string>('hr_vehicles_maint_to', '');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkVehicleId, setBulkVehicleId] = useState<string>('');
  const [bulkSaving, setBulkSaving] = useState(false);
  type BulkRow = {
    maintenance_type: string;
    maintenance_date: string;
    next_maintenance_odometer: string;
    cost: number;
    provider: string;
    status: string;
    description: string;
  };
  const newBulkRow = (): BulkRow => ({
    maintenance_type: 'periodic',
    maintenance_date: new Date().toISOString().split('T')[0],
    next_maintenance_odometer: '',
    cost: 0,
    provider: '',
    status: 'completed',
    description: '',
  });
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([newBulkRow()]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: '', maintenance_type: 'periodic', description: '',
    cost: 0, maintenance_date: new Date().toISOString().split('T')[0],
    next_maintenance_odometer: '', odometer_reading: '', provider: '', notes: '',
  });

  const filtersActive = !!search || !!stationFilter || typeFilter !== 'all' || !!fromDate || !!toDate;
  const resetFilters = () => {
    setSearch(''); setStationFilter(null); setTypeFilter('all'); setFromDate(''); setToDate('');
    toast.success(isAr ? 'تم إعادة ضبط الفلاتر' : 'Filters reset');
  };

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    const [{ data: mData }, { data: vData }, { data: sData }] = await Promise.all([
      supabase.from('vehicle_maintenance').select('*').order('maintenance_date', { ascending: false }),
      supabase.from('vehicles').select('id, vehicle_code, brand, model, plate_number, station_id').order('vehicle_code'),
      supabase.from('stations').select('id, name_ar, name_en, code').eq('is_active', true).order('name_ar'),
    ]);
    const filteredVehicles = scopeIds ? (vData as any[] || []).filter((x) => x.station_id && scopeIds.has(x.station_id)) : (vData || []);
    const allowedVehicleIds = scopeIds ? new Set(filteredVehicles.map((v: any) => v.id)) : null;
    if (mData) setRecords((allowedVehicleIds ? (mData as any[]).filter((r) => allowedVehicleIds.has(r.vehicle_id)) : mData) as unknown as MaintenanceRecord[]);
    setVehicles(filteredVehicles as unknown as VehicleOption[]);
    if (sData) setStations((scopeIds ? (sData as StationOption[]).filter((x) => scopeIds.has(x.id)) : (sData as StationOption[])));
    if (showLoader) setLoading(false);
  };

  useEffect(() => {
    fetchData(true);
    const REFRESH_MS = 3 * 60 * 60 * 1000;
    const interval = setInterval(() => fetchData(false), REFRESH_MS);
    const onVis = () => { if (document.visibilityState === 'visible') fetchData(false); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const vehicleMap = useMemo(() => Object.fromEntries(vehicles.map((v) => [v.id, v])), [vehicles]);
  const stationMap = useMemo(() => Object.fromEntries(stations.map((s) => [s.id, s])), [stations]);

  const handleSave = async () => {
    if (!form.vehicle_id || !form.maintenance_type) {
      toast.error(isAr ? 'يرجى اختيار السيارة ونوع الصيانة' : 'Please select vehicle and type');
      return;
    }
    if (Number(form.cost) < 0) {
      toast.error(isAr ? 'التكلفة لا يمكن أن تكون سالبة' : 'Cost cannot be negative');
      return;
    }
    const nextOdo = form.next_maintenance_odometer ? Number(form.next_maintenance_odometer) : null;
    const curOdo = form.odometer_reading ? Number(form.odometer_reading) : null;
    if (nextOdo !== null && curOdo !== null && nextOdo < curOdo) {
      toast.error(isAr ? 'قراءة العداد القادمة يجب أن تكون أكبر من القراءة الحالية' : 'Next odometer must be greater than current odometer');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        vehicle_id: form.vehicle_id,
        maintenance_type: form.maintenance_type,
        description: form.description || null,
        cost: Number(form.cost) || 0,
        maintenance_date: form.maintenance_date,
        next_maintenance_date: null,
        next_maintenance_odometer: nextOdo,
        odometer_reading: curOdo,
        provider: form.provider || null,
        notes: form.notes || null,
        status: 'completed',
      };
      const { error } = await supabase.from('vehicle_maintenance').insert(payload as any);
      if (error) { toast.error(error.message); return; }
      toast.success(isAr ? 'تم إضافة سجل الصيانة' : 'Maintenance record added');
      setDialogOpen(false);
      setForm({ vehicle_id: '', maintenance_type: 'periodic', description: '', cost: 0, maintenance_date: new Date().toISOString().split('T')[0], next_maintenance_odometer: '', odometer_reading: '', provider: '', notes: '' });
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('vehicle_maintenance').delete().eq('id', deleteTarget.id);
      if (error) { toast.error(error.message); return; }
      toast.success(isAr ? 'تم الحذف' : 'Deleted');
      setDeleteTarget(null);
      fetchData();
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkSave = async () => {
    if (!bulkVehicleId) {
      toast.error(isAr ? 'يرجى اختيار سيارة' : 'Please select a vehicle');
      return;
    }
    if (bulkRows.length === 0) {
      toast.error(isAr ? 'أضف نوع صيانة واحد على الأقل' : 'Add at least one maintenance entry');
      return;
    }
    for (const [i, row] of bulkRows.entries()) {
      if (!row.maintenance_type || !row.maintenance_date) {
        toast.error(isAr ? `الصف ${i + 1}: النوع والتاريخ مطلوبان` : `Row ${i + 1}: type and date required`);
        return;
      }
      if (row.next_maintenance_odometer && Number.isNaN(Number(row.next_maintenance_odometer))) {
        toast.error(isAr ? `الصف ${i + 1}: قراءة العداد القادمة غير صحيحة` : `Row ${i + 1}: invalid next odometer`);
        return;
      }
    }
    setBulkSaving(true);
    try {
      const payload = bulkRows.map((row) => ({
        vehicle_id: bulkVehicleId,
        maintenance_type: row.maintenance_type,
        description: row.description || null,
        cost: Number(row.cost) || 0,
        maintenance_date: row.maintenance_date,
        next_maintenance_date: null,
        next_maintenance_odometer: row.next_maintenance_odometer ? Number(row.next_maintenance_odometer) : null,
        provider: row.provider || null,
        status: row.status,
        notes: null,
      }));
      const { error } = await supabase.from('vehicle_maintenance').insert(payload as any);
      if (error) { toast.error(error.message); return; }
      toast.success(isAr ? `تم إنشاء ${payload.length} سجل صيانة` : `Created ${payload.length} records`);
      setBulkOpen(false);
      setBulkVehicleId('');
      setBulkRows([newBulkRow()]);
      fetchData();
    } finally {
      setBulkSaving(false);
    }
  };

  const typeLabel = (t: string) => {
    const found = TYPES.find((x) => x.value === t);
    return found ? (isAr ? found.ar : found.en) : t;
  };

  const filtered = useMemo(() => records.filter((r) => {
    const v = vehicleMap[r.vehicle_id];
    const txt = search.trim().toLowerCase();
    const txtMatch = !txt || [v?.vehicle_code, v?.brand, v?.plate_number, r.maintenance_type, r.provider]
      .some((f) => f?.toLowerCase().includes(txt));
    const stMatch = !stationFilter || v?.station_id === stationFilter;
    const typeMatch = typeFilter === 'all' || r.maintenance_type === typeFilter;
    let dateMatch = true;
    if (fromDate && r.maintenance_date < fromDate) dateMatch = false;
    if (toDate && r.maintenance_date > toDate) dateMatch = false;
    return txtMatch && stMatch && typeMatch && dateMatch;
  }), [records, vehicleMap, search, stationFilter, typeFilter, fromDate, toDate]);

  const filteredVehiclesForStation = useMemo(() => {
    if (!stationFilter) return vehicles;
    return vehicles.filter((v) => v.station_id === stationFilter);
  }, [vehicles, stationFilter]);

  // Latest odometer reading per vehicle (max across all maintenance records)
  const latestOdoByVehicle = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach((r) => {
      if (r.odometer_reading != null) {
        const cur = map[r.vehicle_id] ?? -Infinity;
        if (r.odometer_reading > cur) map[r.vehicle_id] = r.odometer_reading;
      }
    });
    return map;
  }, [records]);

  // Upcoming maintenance based on odometer: remaining km <= threshold
  const upcoming = useMemo(() => {
    return records
      .map((r) => {
        const latest = latestOdoByVehicle[r.vehicle_id];
        const next = r.next_maintenance_odometer;
        const remaining = (next != null && latest != null) ? (next - latest) : null;
        return { r, remaining, latest };
      })
      .filter(({ remaining, r }) => {
        const v = vehicleMap[r.vehicle_id];
        if (stationFilter && v?.station_id !== stationFilter) return false;
        return remaining !== null && remaining <= UPCOMING_KM_THRESHOLD;
      })
      .sort((a, b) => (a.remaining! - b.remaining!));
  }, [records, vehicleMap, stationFilter, latestOdoByVehicle]);

  const totalCost = filtered.reduce((s, r) => s + (r.cost || 0), 0);
  const stationCountInScope = stationFilter ? filteredVehiclesForStation.length : vehicles.length;

  const stationName = (id: string | null | undefined) => {
    if (!id) return isAr ? 'غير مخصص' : 'Unassigned';
    const st = stationMap[id];
    return st ? (isAr ? st.name_ar : st.name_en) : '-';
  };

  const exportCsv = () => {
    const rows = [[
      isAr ? 'الكود' : 'Code', isAr ? 'السيارة' : 'Vehicle', isAr ? 'اللوحة' : 'Plate',
      isAr ? 'المحطة' : 'Station', isAr ? 'النوع' : 'Type', isAr ? 'التاريخ' : 'Date',
      isAr ? 'التكلفة' : 'Cost', isAr ? 'العداد' : 'Odometer',
      isAr ? 'مقدم الخدمة' : 'Provider', isAr ? 'الصيانة القادمة' : 'Next Date',
      isAr ? 'الوصف' : 'Description',
    ]];
    filtered.forEach((r) => {
      const v = vehicleMap[r.vehicle_id];
      rows.push([
        v?.vehicle_code || '', v ? `${v.brand} ${v.model}` : '', v?.plate_number || '',
        stationName(v?.station_id), typeLabel(r.maintenance_type),
        r.maintenance_date, String(r.cost || 0),
        r.odometer_reading != null ? String(r.odometer_reading) : '',
        r.provider || '', r.next_maintenance_date || '', r.description || '',
      ]);
    });
    const csv = '\uFEFF' + rows.map((row) => row.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vehicle_maintenance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const buildMaintenancePayload = () => {
    const stationLabel = stationFilter
      ? (isAr ? stationMap[stationFilter]?.name_ar : stationMap[stationFilter]?.name_en) || '-'
      : 'كل المحطات';
    const typeLbl = typeFilter === 'all'
      ? 'كل الأنواع'
      : (TYPES.find((t) => t.value === typeFilter)?.ar || typeFilter);
    return {
      titleAr: 'تقرير صيانة السيارات',
      subtitleAr: 'كشف تفصيلي بأعمال الصيانة وفقاً للفلاتر النشطة',
      meta: [
        { label: 'المحطة', value: String(stationLabel) },
        { label: 'نوع الصيانة', value: typeLbl },
        { label: 'من تاريخ', value: fromDate || '—' },
        { label: 'إلى تاريخ', value: toDate || '—' },
        { label: 'إجمالي التكلفة', value: `${totalCost.toLocaleString()} ج.م` },
      ],
      columns: [
        { header: 'م', key: 'idx' },
        { header: 'الكود', key: 'code' },
        { header: 'السيارة', key: 'vehicle' },
        { header: 'اللوحة', key: 'plate' },
        { header: 'المحطة', key: 'station' },
        { header: 'نوع الصيانة', key: 'type' },
        { header: 'التاريخ', key: 'date' },
        { header: 'العداد', key: 'odo' },
        { header: 'مقدم الخدمة', key: 'provider' },
        { header: 'التكلفة (ج.م)', key: 'cost' },
        { header: 'الصيانة القادمة', key: 'next' },
      ],
      rows: filtered.map((r, i) => {
        const v = vehicleMap[r.vehicle_id];
        return {
          idx: i + 1,
          code: v?.vehicle_code || '—',
          vehicle: v ? `${v.brand} ${v.model}` : '—',
          plate: v?.plate_number || '—',
          station: stationName(v?.station_id) as string,
          type: typeLabel(r.maintenance_type),
          date: r.maintenance_date,
          odo: r.odometer_reading != null ? r.odometer_reading.toLocaleString() : '—',
          provider: r.provider || '—',
          cost: (r.cost || 0).toLocaleString(),
          next: r.next_maintenance_date || '—',
        };
      }),
      signatureLabels: ['مسؤول الصيانة', 'مدير الأسطول', 'الإدارة المالية'],
      orientation: 'landscape' as const,
    };
  };

  const exportPdf = async () => {
    if (filtered.length === 0) {
      toast.error(isAr ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }
    try {
      await exportVehiclePdf({
        ...buildMaintenancePayload(),
        fileName: `vehicle_maintenance_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
      toast.success(isAr ? 'تم تصدير PDF بنجاح' : 'PDF exported successfully');
    } catch (e: any) {
      toast.error(e?.message || (isAr ? 'فشل التصدير' : 'Export failed'));
    }
  };

  const exportWord = async (paged = false) => {
    if (filtered.length === 0) {
      toast.error(isAr ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }
    try {
      await exportVehicleWord({
        ...buildMaintenancePayload(),
        rowsPerPage: paged ? 20 : undefined,
        fileName: `vehicle_maintenance${paged ? '_paged' : ''}_${new Date().toISOString().slice(0, 10)}.docx`,
      });
      toast.success(isAr ? 'تم تصدير Word بنجاح' : 'Word exported successfully');
    } catch (e: any) {
      toast.error(e?.message || (isAr ? 'فشل التصدير' : 'Export failed'));
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Wrench className="w-7 h-7 text-primary" />
            <div>
              <p className="text-xl font-bold">{filtered.length}</p>
              <p className="text-xs text-muted-foreground">{isAr ? 'سجلات الصيانة' : 'Records'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xl font-bold">{totalCost.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</p>
            <p className="text-xs text-muted-foreground">{isAr ? 'إجمالي التكاليف' : 'Total Costs'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="w-7 h-7 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold">{stationCountInScope}</p>
              <p className="text-xs text-muted-foreground">{isAr ? 'سيارات في النطاق' : 'Vehicles in scope'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={cn('border-orange-200 bg-orange-50/50 dark:bg-orange-950/20', upcoming.length === 0 && 'opacity-70')}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-7 h-7 text-orange-600" />
            <div>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-400">{upcoming.length}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400">{isAr ? `صيانة قادمة (${UPCOMING_KM_THRESHOLD} كم)` : `Upcoming (${UPCOMING_KM_THRESHOLD} km)`}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming maintenance alerts */}
      {upcoming.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertCircle className="w-4 h-4" />
              {isAr ? 'تنبيهات الصيانة القادمة' : 'Upcoming Maintenance Alerts'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {upcoming.slice(0, 9).map(({ r, remaining, latest }) => {
                const v = vehicleMap[r.vehicle_id];
                const overdue = (remaining ?? 0) <= 0;
                const close = (remaining ?? 0) <= 200;
                return (
                  <div key={r.id} className="border rounded p-2 bg-background">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium truncate">{v ? `${v.brand} ${v.model}` : '-'}</div>
                      <Badge className={cn('text-xs', overdue || close ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300')}>
                        {overdue ? (isAr ? 'مستحقة الآن' : 'due now') : `${remaining!.toLocaleString()} ${isAr ? 'كم' : 'km'}`}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {typeLabel(r.maintenance_type)} · {stationName(v?.station_id)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Wrench className="w-3 h-3" />
                      {isAr ? 'العداد:' : 'Odo:'} {latest?.toLocaleString() ?? '—'} → {r.next_maintenance_odometer?.toLocaleString()} {isAr ? 'كم' : 'km'}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className={cn('flex flex-row items-center justify-between flex-wrap gap-2', isRTL && 'flex-row-reverse')}>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            {isAr ? 'سجلات الصيانة' : 'Maintenance Records'}
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isAr ? 'كل الأنواع' : 'All Types'}</SelectItem>
                {TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{isAr ? t.ar : t.en}</SelectItem>))}
              </SelectContent>
            </Select>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 w-36" title={isAr ? 'من تاريخ' : 'From date'} />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 w-36" title={isAr ? 'إلى تاريخ' : 'To date'} />
            {filtersActive && (
              <Button size="sm" variant="ghost" onClick={resetFilters} aria-label={isAr ? 'إعادة ضبط الفلاتر' : 'Reset filters'}>
                <FilterX className="w-4 h-4 me-1" />{isAr ? 'إعادة ضبط' : 'Reset'}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="w-4 h-4 me-1" />CSV ({filtered.length})
            </Button>
            <Button size="sm" onClick={exportPdf} disabled={filtered.length === 0} className="bg-primary text-primary-foreground">
              <FileDown className="w-4 h-4 me-1" />PDF ({filtered.length})
            </Button>
            <Button size="sm" onClick={() => exportWord(false)} disabled={filtered.length === 0} className="bg-blue-700 hover:bg-blue-800 text-white">
              <FileType2 className="w-4 h-4 me-1" />Word ({filtered.length})
            </Button>
            <Button size="sm" onClick={() => exportWord(true)} disabled={filtered.length === 0} variant="outline" className="border-blue-700 text-blue-700 hover:bg-blue-50">
              <FileType2 className="w-4 h-4 me-1" />{isAr ? 'Word (صفحات)' : 'Word (paged)'}
            </Button>
            <Dialog open={bulkOpen} onOpenChange={(o) => { setBulkOpen(o); if (!o) { setBulkVehicleId(''); setBulkRows([newBulkRow()]); } }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10">
                  <Layers className="w-4 h-4 me-1" />{isAr ? 'صيانة مجمّعة' : 'Bulk Maintenance'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
                <DialogHeader>
                  <DialogTitle>{isAr ? 'إضافة عدة أنواع صيانة لسيارة واحدة' : 'Add Multiple Maintenance Types for One Vehicle'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <Label className="text-xs">{isAr ? 'السيارة' : 'Vehicle'} <span className="text-destructive">*</span></Label>
                    <Select value={bulkVehicleId} onValueChange={setBulkVehicleId}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={isAr ? 'اختر سيارة' : 'Select vehicle'} /></SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.brand} {v.model} · {v.plate_number} · {v.vehicle_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
                      <Label className="text-xs">{isAr ? 'أنواع الصيانة' : 'Maintenance entries'} <Badge variant="outline" className="ms-1">{bulkRows.length}</Badge></Label>
                      <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setBulkRows((rs) => [...rs, newBulkRow()])}>
                        <Plus className="w-3.5 h-3.5 me-1" />{isAr ? 'إضافة نوع' : 'Add entry'}
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {bulkRows.map((row, idx) => {
                        const update = (patch: Partial<BulkRow>) => setBulkRows((rs) => rs.map((r, i) => i === idx ? { ...r, ...patch } : r));
                        return (
                          <div key={idx} className="border rounded-md p-3 bg-muted/20 space-y-2 relative">
                            <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
                              <Badge variant="secondary" className="text-xs">#{idx + 1}</Badge>
                              {bulkRows.length > 1 && (
                                <Button type="button" size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive"
                                  onClick={() => setBulkRows((rs) => rs.filter((_, i) => i !== idx))}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">{isAr ? 'نوع الصيانة' : 'Type'} <span className="text-destructive">*</span></Label>
                                <Select value={row.maintenance_type} onValueChange={(v) => update({ maintenance_type: v })}>
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{isAr ? t.ar : t.en}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">{isAr ? 'الحالة' : 'Status'}</Label>
                                <Select value={row.status} onValueChange={(v) => update({ status: v })}>
                                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">{isAr ? 'قيد الانتظار' : 'Pending'}</SelectItem>
                                    <SelectItem value="in_progress">{isAr ? 'قيد التنفيذ' : 'In Progress'}</SelectItem>
                                    <SelectItem value="completed">{isAr ? 'مكتمل' : 'Completed'}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">{isAr ? 'التاريخ' : 'Date'}</Label>
                                <Input type="date" value={row.maintenance_date} onChange={(e) => update({ maintenance_date: e.target.value })} className="h-9" />
                              </div>
                              <div>
                                <Label className="text-xs">{isAr ? 'قراءة العداد القادمة (كم)' : 'Next odometer (km)'}</Label>
                                <Input type="number" min={0} placeholder={isAr ? 'مثال: 50000' : 'e.g. 50000'} value={row.next_maintenance_odometer} onChange={(e) => update({ next_maintenance_odometer: e.target.value })} className="h-9" />
                              </div>
                              <div>
                                <Label className="text-xs">{isAr ? 'التكلفة' : 'Cost'}</Label>
                                <Input type="number" value={row.cost} onChange={(e) => update({ cost: Number(e.target.value) })} className="h-9" />
                              </div>
                              <div>
                                <Label className="text-xs">{isAr ? 'مقدم الخدمة' : 'Provider'}</Label>
                                <Input value={row.provider} onChange={(e) => update({ provider: e.target.value })} className="h-9" />
                              </div>
                              <div className="md:col-span-2">
                                <Label className="text-xs">{isAr ? 'الوصف' : 'Description'}</Label>
                                <Input value={row.description} onChange={(e) => update({ description: e.target.value })} className="h-9" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                    {isAr ? 'سيتم إنشاء سجل منفصل لكل نوع صيانة مضاف لنفس السيارة.' : 'A separate record will be created for each entry on the same vehicle.'}
                  </div>
                  <div className={cn('flex justify-end gap-2', isRTL && 'flex-row-reverse')}>
                    <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkSaving}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={handleBulkSave} disabled={bulkSaving || !bulkVehicleId || bulkRows.length === 0} aria-busy={bulkSaving}>
                      {bulkSaving && <Loader2 className="w-4 h-4 me-1 animate-spin" />}
                      {isAr ? `حفظ (${bulkRows.length})` : `Save (${bulkRows.length})`}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 me-1" />{isAr ? 'إضافة صيانة' : 'Add Maintenance'}</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
                <DialogHeader>
                  <DialogTitle>{isAr ? 'إضافة سجل صيانة' : 'Add Maintenance Record'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-4">
                  <div>
                    <Label className="text-xs">{isAr ? 'السيارة' : 'Vehicle'} <span className="text-destructive">*</span></Label>
                    <Select value={form.vehicle_id} onValueChange={(v) => setForm((p) => ({ ...p, vehicle_id: v }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={isAr ? 'اختر سيارة' : 'Select vehicle'} /></SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.brand} {v.model} - {v.plate_number}
                            {v.station_id && ` · ${stationName(v.station_id)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{isAr ? 'نوع الصيانة' : 'Type'} <span className="text-destructive">*</span></Label>
                    <Select value={form.maintenance_type} onValueChange={(v) => setForm((p) => ({ ...p, maintenance_type: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{isAr ? t.ar : t.en}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{isAr ? 'التاريخ' : 'Date'}</Label>
                      <Input type="date" value={form.maintenance_date} onChange={(e) => setForm((p) => ({ ...p, maintenance_date: e.target.value }))} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">{isAr ? 'التكلفة' : 'Cost'}</Label>
                      <Input type="number" value={form.cost} onChange={(e) => setForm((p) => ({ ...p, cost: Number(e.target.value) }))} className="h-9" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{isAr ? 'قراءة العداد' : 'Odometer'}</Label>
                      <Input type="number" value={form.odometer_reading} onChange={(e) => setForm((p) => ({ ...p, odometer_reading: e.target.value }))} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">{isAr ? 'مقدم الخدمة' : 'Provider'}</Label>
                      <Input value={form.provider} onChange={(e) => setForm((p) => ({ ...p, provider: e.target.value }))} className="h-9" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{isAr ? 'قراءة العداد للصيانة القادمة (كم)' : 'Next Maintenance Odometer (km)'}</Label>
                    <Input type="number" min={0} placeholder={isAr ? 'مثال: 50000' : 'e.g. 50000'} value={form.next_maintenance_odometer} onChange={(e) => setForm((p) => ({ ...p, next_maintenance_odometer: e.target.value }))} className="h-9" />
                    <p className="text-[10px] text-muted-foreground mt-1">{isAr ? 'سيظهر تنبيه عندما تقترب قراءة العداد من هذه القيمة' : 'Alert will trigger when odometer approaches this reading'}</p>
                  </div>
                  <div>
                    <Label className="text-xs">{isAr ? 'الوصف' : 'Description'}</Label>
                    <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="h-9" />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={handleSave} disabled={saving} aria-busy={saving}>
                      {saving && <Loader2 className="w-4 h-4 me-1 animate-spin" />}
                      {isAr ? 'حفظ' : 'Save'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد سجلات' : 'No records'}</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isAr ? 'السيارة' : 'Vehicle'}</TableHead>
                      <TableHead>{isAr ? 'المحطة' : 'Station'}</TableHead>
                      <TableHead>{isAr ? 'النوع' : 'Type'}</TableHead>
                      <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                      <TableHead>{isAr ? 'التكلفة' : 'Cost'}</TableHead>
                      <TableHead>{isAr ? 'العداد' : 'Odometer'}</TableHead>
                      <TableHead>{isAr ? 'مقدم الخدمة' : 'Provider'}</TableHead>
                      <TableHead>{isAr ? 'العداد القادم' : 'Next Odo'}</TableHead>
                      <TableHead>{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => {
                      const v = vehicleMap[r.vehicle_id];
                      const dl = daysLeft(r.next_maintenance_date);
                      return (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="font-medium">{v ? `${v.brand} ${v.model}` : '-'}</div>
                            <div className="text-xs text-muted-foreground">{v?.plate_number}</div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-xs">
                              <Building2 className="w-3 h-3 text-primary" />{stationName(v?.station_id)}
                            </span>
                          </TableCell>
                          <TableCell><Badge variant="outline">{typeLabel(r.maintenance_type)}</Badge></TableCell>
                          <TableCell>{r.maintenance_date}</TableCell>
                          <TableCell>{r.cost?.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</TableCell>
                          <TableCell>{r.odometer_reading?.toLocaleString() || '-'}</TableCell>
                          <TableCell>{r.provider || '-'}</TableCell>
                          <TableCell>
                            {r.next_maintenance_date ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs">{r.next_maintenance_date}</span>
                                {dl !== null && dl >= 0 && dl <= 30 && (
                                  <Badge className={cn('text-xs', dl <= 7 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300')}>{dl}{isAr ? 'ي' : 'd'}</Badge>
                                )}
                                {dl !== null && dl < 0 && <Badge className="text-xs bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">{isAr ? 'متأخر' : 'overdue'}</Badge>}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(r)} aria-label={isAr ? 'حذف' : 'Delete'}><Trash2 className="w-4 h-4" /></Button>
                              </TooltipTrigger>
                              <TooltipContent>{isAr ? 'حذف' : 'Delete'}</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {filtered.map((r) => {
                  const v = vehicleMap[r.vehicle_id];
                  const dl = daysLeft(r.next_maintenance_date);
                  return (
                    <div key={r.id} className="border rounded-lg p-3 bg-card">
                      <div className={cn('flex items-start justify-between gap-2', isRTL && 'flex-row-reverse')}>
                        <div className="min-w-0">
                          <div className="font-semibold">{v ? `${v.brand} ${v.model}` : '-'}</div>
                          <div className="text-xs text-muted-foreground font-mono">{v?.plate_number}</div>
                          <div className="text-xs mt-1 inline-flex items-center gap-1"><Building2 className="w-3 h-3 text-primary" />{stationName(v?.station_id)}</div>
                        </div>
                        <Badge variant="outline">{typeLabel(r.maintenance_type)}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div><span className="text-muted-foreground">{isAr ? 'التاريخ:' : 'Date:'}</span> {r.maintenance_date}</div>
                        <div><span className="text-muted-foreground">{isAr ? 'التكلفة:' : 'Cost:'}</span> {r.cost?.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</div>
                        {r.provider && <div className="col-span-2"><span className="text-muted-foreground">{isAr ? 'مقدم:' : 'Provider:'}</span> {r.provider}</div>}
                        {r.next_maintenance_date && (
                          <div className="col-span-2 flex items-center gap-1">
                            <span className="text-muted-foreground">{isAr ? 'القادمة:' : 'Next:'}</span> {r.next_maintenance_date}
                            {dl !== null && dl >= 0 && dl <= 30 && (
                              <Badge className={cn('text-xs', dl <= 7 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800')}>{dl}{isAr ? 'ي' : 'd'}</Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className={cn('flex justify-end mt-2', isRTL && 'justify-start')}>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(r)} aria-label={isAr ? 'حذف' : 'Delete'}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{isAr ? 'تأكيد حذف سجل الصيانة' : 'Confirm maintenance deletion'}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>{isAr ? 'سيتم حذف هذا السجل نهائياً ولا يمكن التراجع.' : 'This record will be permanently deleted.'}</p>
                {deleteTarget && (() => {
                  const v = vehicleMap[deleteTarget.vehicle_id];
                  return (
                    <div className="rounded-md border bg-muted/40 p-3 space-y-1">
                      <div><span className="text-muted-foreground">{isAr ? 'السيارة:' : 'Vehicle:'}</span> {v ? `${v.brand} ${v.model} (${v.plate_number})` : '-'}</div>
                      <div><span className="text-muted-foreground">{isAr ? 'النوع:' : 'Type:'}</span> {typeLabel(deleteTarget.maintenance_type)}</div>
                      <div><span className="text-muted-foreground">{isAr ? 'التاريخ:' : 'Date:'}</span> {deleteTarget.maintenance_date}</div>
                      <div><span className="text-muted-foreground">{isAr ? 'التكلفة:' : 'Cost:'}</span> {deleteTarget.cost?.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</div>
                    </div>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{isAr ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              aria-busy={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="w-4 h-4 me-1 animate-spin" />}
              {isAr ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
