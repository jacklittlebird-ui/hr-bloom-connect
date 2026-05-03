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
import { Plus, Search, Wrench, Trash2, Building2, AlertCircle, Calendar, Download, FileDown, FileType2, Loader2, FilterX } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StationCombobox, StationOption } from './StationCombobox';
import { exportVehiclePdf } from '@/lib/vehiclePdfExport';
import { exportVehicleWord } from '@/lib/vehicleWordExport';

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  description: string | null;
  cost: number;
  maintenance_date: string;
  next_maintenance_date: string | null;
  odometer_reading: number | null;
  provider: string | null;
  status: string;
  notes: string | null;
}

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

export const VehicleMaintenance = () => {
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: '', maintenance_type: 'periodic', description: '',
    cost: 0, maintenance_date: new Date().toISOString().split('T')[0],
    next_maintenance_date: '', odometer_reading: '', provider: '', notes: '',
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
    if (mData) setRecords(mData as unknown as MaintenanceRecord[]);
    if (vData) setVehicles(vData as unknown as VehicleOption[]);
    if (sData) setStations(sData as StationOption[]);
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
    if (form.next_maintenance_date && form.next_maintenance_date < form.maintenance_date) {
      toast.error(isAr ? 'تاريخ الصيانة القادمة قبل تاريخ الصيانة' : 'Next date is before maintenance date');
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
        next_maintenance_date: form.next_maintenance_date || null,
        odometer_reading: form.odometer_reading ? Number(form.odometer_reading) : null,
        provider: form.provider || null,
        notes: form.notes || null,
        status: 'completed',
      };
      const { error } = await supabase.from('vehicle_maintenance').insert(payload as any);
      if (error) { toast.error(error.message); return; }
      toast.success(isAr ? 'تم إضافة سجل الصيانة' : 'Maintenance record added');
      setDialogOpen(false);
      setForm({ vehicle_id: '', maintenance_type: 'periodic', description: '', cost: 0, maintenance_date: new Date().toISOString().split('T')[0], next_maintenance_date: '', odometer_reading: '', provider: '', notes: '' });
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

  // Upcoming maintenance (≤30 days, not negative)
  const upcoming = useMemo(() => {
    return records
      .map((r) => ({ r, dl: daysLeft(r.next_maintenance_date) }))
      .filter(({ dl, r }) => {
        const v = vehicleMap[r.vehicle_id];
        if (stationFilter && v?.station_id !== stationFilter) return false;
        return dl !== null && dl >= 0 && dl <= 30;
      })
      .sort((a, b) => (a.dl! - b.dl!));
  }, [records, vehicleMap, stationFilter]);

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
              <p className="text-xs text-orange-600 dark:text-orange-400">{isAr ? 'صيانة قادمة (30 يوم)' : 'Upcoming (30d)'}</p>
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
              {upcoming.slice(0, 9).map(({ r, dl }) => {
                const v = vehicleMap[r.vehicle_id];
                return (
                  <div key={r.id} className="border rounded p-2 bg-background">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium truncate">{v ? `${v.brand} ${v.model}` : '-'}</div>
                      <Badge className={cn('text-xs', dl! <= 7 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300')}>
                        {dl} {isAr ? 'يوم' : 'd'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {typeLabel(r.maintenance_type)} · {stationName(v?.station_id)}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />{r.next_maintenance_date}
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
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="w-4 h-4 me-1" />{isAr ? 'CSV' : 'CSV'}
            </Button>
            <Button size="sm" onClick={exportPdf} className="bg-primary text-primary-foreground">
              <FileDown className="w-4 h-4 me-1" />{isAr ? 'تصدير PDF' : 'PDF'}
            </Button>
            <Button size="sm" onClick={() => exportWord(false)} className="bg-blue-700 hover:bg-blue-800 text-white">
              <FileType2 className="w-4 h-4 me-1" />{isAr ? 'تصدير Word' : 'Word'}
            </Button>
            <Button size="sm" onClick={() => exportWord(true)} variant="outline" className="border-blue-700 text-blue-700 hover:bg-blue-50">
              <FileType2 className="w-4 h-4 me-1" />{isAr ? 'Word (صفحات)' : 'Word (paged)'}
            </Button>
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
                    <Label className="text-xs">{isAr ? 'الصيانة القادمة' : 'Next Maintenance'}</Label>
                    <Input type="date" value={form.next_maintenance_date} onChange={(e) => setForm((p) => ({ ...p, next_maintenance_date: e.target.value }))} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">{isAr ? 'الوصف' : 'Description'}</Label>
                    <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="h-9" />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
                    <Button onClick={handleSave}>{isAr ? 'حفظ' : 'Save'}</Button>
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
                      <TableHead>{isAr ? 'الصيانة القادمة' : 'Next'}</TableHead>
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
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4" /></Button>
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
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
