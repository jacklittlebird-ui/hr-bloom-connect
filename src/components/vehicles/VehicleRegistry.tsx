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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Car, Building2, Download, AlertTriangle, Crosshair, X, Loader2, FilterX } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StationCombobox, StationOption } from './StationCombobox';

interface Vehicle {
  id: string;
  vehicle_code: string;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  engine_number: string | null;
  chassis_number: string | null;
  plate_number: string;
  license_start_date: string | null;
  license_end_date: string | null;
  curtains_license_start: string | null;
  curtains_license_end: string | null;
  transport_license_start: string | null;
  transport_license_end: string | null;
  insured_driver_name: string | null;
  insurance_number: string | null;
  station_id: string | null;
  status: string;
  notes: string | null;
}

const emptyForm = {
  vehicle_code: '', brand: '', model: '', year: new Date().getFullYear(),
  color: '', engine_number: '', chassis_number: '', plate_number: '',
  license_start_date: '', license_end_date: '',
  curtains_license_start: '', curtains_license_end: '',
  transport_license_start: '', transport_license_end: '',
  insured_driver_name: '', insurance_number: '', notes: '', status: 'active',
  station_id: null as string | null,
};

export const VehicleRegistry = () => {
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stationFilter, setStationFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [alertFilter, setAlertFilter] = useState<'all' | 'expired' | 'soon'>('all');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtersActive =
    !!search || !!stationFilter || statusFilter !== 'all' || alertFilter !== 'all' || !!focusedId;

  const resetFilters = () => {
    setSearch('');
    setStationFilter(null);
    setStatusFilter('all');
    setAlertFilter('all');
    setFocusedId(null);
    toast.success(isAr ? 'تم إعادة ضبط الفلاتر' : 'Filters reset');
  };

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: v }, { data: s }] = await Promise.all([
      supabase.from('vehicles').select('*').order('vehicle_code'),
      supabase.from('stations').select('id, name_ar, name_en, code').eq('is_active', true).order('name_ar'),
    ]);
    if (v) setVehicles(v as unknown as Vehicle[]);
    if (s) setStations(s as StationOption[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const stationMap = useMemo(() => Object.fromEntries(stations.map((s) => [s.id, s])), [stations]);

  const handleSave = async () => {
    if (!form.vehicle_code || !form.brand || !form.model || !form.plate_number) {
      toast.error(isAr ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }
    if (!form.year || Number(form.year) < 1900 || Number(form.year) > new Date().getFullYear() + 1) {
      toast.error(isAr ? 'سنة الصنع غير صحيحة' : 'Invalid year');
      return;
    }
    if (form.license_start_date && form.license_end_date && form.license_end_date < form.license_start_date) {
      toast.error(isAr ? 'تاريخ نهاية الترخيص قبل البداية' : 'License end before start');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        year: Number(form.year),
        color: form.color || null,
        engine_number: form.engine_number || null,
        chassis_number: form.chassis_number || null,
        license_start_date: form.license_start_date || null,
        license_end_date: form.license_end_date || null,
        curtains_license_start: form.curtains_license_start || null,
        curtains_license_end: form.curtains_license_end || null,
        transport_license_start: form.transport_license_start || null,
        transport_license_end: form.transport_license_end || null,
        insured_driver_name: form.insured_driver_name || null,
        insurance_number: form.insurance_number || null,
        notes: form.notes || null,
        station_id: form.station_id || null,
      };

      if (editingId) {
        const { error } = await supabase.from('vehicles').update(payload as any).eq('id', editingId);
        if (error) { toast.error(error.message); return; }
        toast.success(isAr ? 'تم تحديث السيارة' : 'Vehicle updated');
      } else {
        const { error } = await supabase.from('vehicles').insert(payload as any);
        if (error) { toast.error(error.message); return; }
        toast.success(isAr ? 'تم إضافة السيارة' : 'Vehicle added');
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchAll();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setForm({
      vehicle_code: v.vehicle_code, brand: v.brand, model: v.model, year: v.year,
      color: v.color || '', engine_number: v.engine_number || '',
      chassis_number: v.chassis_number || '', plate_number: v.plate_number,
      license_start_date: v.license_start_date || '', license_end_date: v.license_end_date || '',
      curtains_license_start: v.curtains_license_start || '', curtains_license_end: v.curtains_license_end || '',
      transport_license_start: v.transport_license_start || '', transport_license_end: v.transport_license_end || '',
      insured_driver_name: v.insured_driver_name || '', insurance_number: v.insurance_number || '',
      notes: v.notes || '', status: v.status, station_id: v.station_id,
    });
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', deleteTarget.id);
      if (error) { toast.error(error.message); return; }
      toast.success(isAr ? 'تم حذف السيارة' : 'Vehicle deleted');
      setDeleteTarget(null);
      fetchAll();
    } finally {
      setDeleting(false);
    }
  };

  const daysLeft = (d: string | null): number | null => {
    if (!d) return null;
    const ms = new Date(d).getTime() - Date.now();
    return Math.ceil(ms / 86400000);
  };

  const licenseFields: { key: keyof Vehicle; labelAr: string; labelEn: string }[] = [
    { key: 'license_end_date', labelAr: 'الترخيص الرئيسي', labelEn: 'Main License' },
    { key: 'curtains_license_end', labelAr: 'ترخيص الستائر', labelEn: 'Curtains License' },
    { key: 'transport_license_end', labelAr: 'ترخيص النقل البري', labelEn: 'Transport License' },
  ];

  const alerts = useMemo(() => {
    const arr: { vehicle: Vehicle; type: 'expired' | 'soon'; license: string; date: string; days: number }[] = [];
    vehicles.forEach((v) => {
      licenseFields.forEach((f) => {
        const date = (v as any)[f.key] as string | null;
        const dl = daysLeft(date);
        if (dl === null) return;
        if (dl < 0) arr.push({ vehicle: v, type: 'expired', license: isAr ? f.labelAr : f.labelEn, date: date!, days: dl });
        else if (dl <= 30) arr.push({ vehicle: v, type: 'soon', license: isAr ? f.labelAr : f.labelEn, date: date!, days: dl });
      });
    });
    return arr.sort((a, b) => a.days - b.days);
  }, [vehicles, isAr]);

  const expiredCount = alerts.filter((a) => a.type === 'expired').length;
  const soonCount = alerts.filter((a) => a.type === 'soon').length;

  const focusVehicle = (id: string) => {
    setFocusedId(id);
    setSearch('');
    setStationFilter(null);
    setStatusFilter('all');
    setTimeout(() => {
      const el = document.getElementById(`vehicle-row-${id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const expiredIds = useMemo(() => new Set(alerts.filter((a) => a.type === 'expired').map((a) => a.vehicle.id)), [alerts]);
  const soonIds = useMemo(() => new Set(alerts.filter((a) => a.type === 'soon').map((a) => a.vehicle.id)), [alerts]);

  const filtered = useMemo(() => vehicles.filter((v) => {
    if (focusedId) return v.id === focusedId;
    const txt = search.trim().toLowerCase();
    const txtMatch = !txt || [v.vehicle_code, v.brand, v.model, v.plate_number, v.insured_driver_name]
      .some((f) => f?.toLowerCase().includes(txt));
    const stMatch = !stationFilter || v.station_id === stationFilter;
    const stsMatch = statusFilter === 'all' || v.status === statusFilter;
    const alertMatch =
      alertFilter === 'all' ? true :
      alertFilter === 'expired' ? expiredIds.has(v.id) :
      alertFilter === 'soon' ? (soonIds.has(v.id) && !expiredIds.has(v.id)) : true;
    return txtMatch && stMatch && stsMatch && alertMatch;
  }), [vehicles, search, stationFilter, statusFilter, focusedId, alertFilter, expiredIds, soonIds]);

  const exportCsv = () => {
    const rows = [[
      isAr ? 'الكود' : 'Code', isAr ? 'الماركة' : 'Brand', isAr ? 'الموديل' : 'Model',
      isAr ? 'سنة' : 'Year', isAr ? 'اللوحة' : 'Plate', isAr ? 'اللون' : 'Color',
      isAr ? 'المحطة' : 'Station', isAr ? 'السائق' : 'Driver',
      isAr ? 'نهاية الترخيص' : 'License End', isAr ? 'الحالة' : 'Status',
    ]];
    filtered.forEach((v) => {
      const st = v.station_id ? stationMap[v.station_id] : null;
      rows.push([
        v.vehicle_code, v.brand, v.model, String(v.year), v.plate_number, v.color || '',
        st ? (isAr ? st.name_ar : st.name_en) : (isAr ? 'غير مخصص' : 'Unassigned'),
        v.insured_driver_name || '', v.license_end_date || '', v.status,
      ]);
    });
    const csv = '\uFEFF' + rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vehicles_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      inactive: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
      maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    };
    const labels: Record<string, string> = {
      active: isAr ? 'نشط' : 'Active',
      inactive: isAr ? 'غير نشط' : 'Inactive',
      maintenance: isAr ? 'صيانة' : 'Maintenance',
    };
    return <Badge className={map[s] || 'bg-muted'}>{labels[s] || s}</Badge>;
  };

  const stationName = (id: string | null) => {
    if (!id) return <span className="text-xs text-muted-foreground">{isAr ? 'غير مخصص' : 'Unassigned'}</span>;
    const st = stationMap[id];
    return st ? (
      <span className="inline-flex items-center gap-1 text-sm">
        <Building2 className="w-3 h-3 text-primary" />
        {isAr ? st.name_ar : st.name_en}
      </span>
    ) : '-';
  };

  const Field = ({ label, name, type = 'text', required = false }: { label: string; name: keyof typeof emptyForm; type?: string; required?: boolean }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label} {required && <span className="text-destructive">*</span>}</Label>
      <Input type={type} value={(form as any)[name] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [name]: e.target.value }))} className="h-9" />
    </div>
  );

  return (
    <Card>
      <CardHeader className={cn('flex flex-row items-center justify-between flex-wrap gap-2', isRTL && 'flex-row-reverse')}>
        <CardTitle className="flex items-center gap-2">
          <Car className="w-5 h-5" />
          {isAr ? 'سجل السيارات' : 'Vehicle Registry'}
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'كل الحالات' : 'All statuses'}</SelectItem>
              <SelectItem value="active">{isAr ? 'نشط' : 'Active'}</SelectItem>
              <SelectItem value="maintenance">{isAr ? 'صيانة' : 'Maintenance'}</SelectItem>
              <SelectItem value="inactive">{isAr ? 'غير نشط' : 'Inactive'}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={alertFilter} onValueChange={(v) => setAlertFilter(v as any)}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isAr ? 'كل التنبيهات' : 'All alerts'}</SelectItem>
              <SelectItem value="expired">{isAr ? `منتهية (${expiredCount})` : `Expired (${expiredCount})`}</SelectItem>
              <SelectItem value="soon">{isAr ? `خلال 30 يوم (${soonCount})` : `Within 30d (${soonCount})`}</SelectItem>
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button size="sm" variant="ghost" onClick={resetFilters} aria-label={isAr ? 'إعادة ضبط الفلاتر' : 'Reset filters'}>
              <FilterX className="w-4 h-4 me-1" />{isAr ? 'إعادة ضبط' : 'Reset'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={exportCsv} aria-label={isAr ? 'تصدير CSV' : 'Export CSV'}><Download className="w-4 h-4 me-1" />{isAr ? 'تصدير' : 'Export'}</Button>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 me-1" />{isAr ? 'إضافة سيارة' : 'Add Vehicle'}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
              <DialogHeader>
                <DialogTitle>{editingId ? (isAr ? 'تعديل سيارة' : 'Edit Vehicle') : (isAr ? 'إضافة سيارة جديدة' : 'Add New Vehicle')}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                <Field label={isAr ? 'كود السيارة' : 'Vehicle Code'} name="vehicle_code" required />
                <Field label={isAr ? 'الماركة' : 'Brand'} name="brand" required />
                <Field label={isAr ? 'الموديل' : 'Model'} name="model" required />
                <Field label={isAr ? 'سنة الصنع' : 'Year'} name="year" type="number" required />
                <Field label={isAr ? 'اللون' : 'Color'} name="color" />
                <Field label={isAr ? 'رقم اللوحة' : 'Plate Number'} name="plate_number" required />
                <Field label={isAr ? 'رقم الموتور' : 'Engine Number'} name="engine_number" />
                <Field label={isAr ? 'رقم الشاسيه' : 'Chassis Number'} name="chassis_number" />
                <div className="space-y-1">
                  <Label className="text-xs">{isAr ? 'المحطة' : 'Station'}</Label>
                  <StationCombobox
                    stations={stations}
                    value={form.station_id}
                    onChange={(id) => setForm((p) => ({ ...p, station_id: id }))}
                    isAr={isAr}
                    allowAll
                    allLabel={isAr ? 'غير مخصص' : 'Unassigned'}
                    className="w-full"
                  />
                </div>
                <Field label={isAr ? 'اسم السائق المؤمن عليه' : 'Insured Driver'} name="insured_driver_name" />
                <Field label={isAr ? 'الرقم التأميني' : 'Insurance Number'} name="insurance_number" />
                <div className="space-y-1">
                  <Label className="text-xs">{isAr ? 'الحالة' : 'Status'}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{isAr ? 'نشط' : 'Active'}</SelectItem>
                      <SelectItem value="maintenance">{isAr ? 'صيانة' : 'Maintenance'}</SelectItem>
                      <SelectItem value="inactive">{isAr ? 'غير نشط' : 'Inactive'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field label={isAr ? 'بداية الترخيص' : 'License Start'} name="license_start_date" type="date" />
                <Field label={isAr ? 'نهاية الترخيص' : 'License End'} name="license_end_date" type="date" />
                <Field label={isAr ? 'بداية ترخيص الستائر' : 'Curtains License Start'} name="curtains_license_start" type="date" />
                <Field label={isAr ? 'نهاية ترخيص الستائر' : 'Curtains License End'} name="curtains_license_end" type="date" />
                <Field label={isAr ? 'بداية ترخيص النقل البري' : 'Transport License Start'} name="transport_license_start" type="date" />
                <Field label={isAr ? 'نهاية ترخيص النقل البري' : 'Transport License End'} name="transport_license_end" type="date" />
              </div>
              <div className="mt-3">
                <Label className="text-xs">{isAr ? 'ملاحظات' : 'Notes'}</Label>
                <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
                <Button onClick={handleSave} disabled={saving} aria-busy={saving}>
                  {saving && <Loader2 className="w-4 h-4 me-1 animate-spin" />}
                  {isAr ? 'حفظ' : 'Save'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length > 0 && (
          <div className="mb-4 border rounded-lg overflow-hidden">
            <div className={cn('px-3 py-2 bg-muted/50 flex items-center justify-between gap-2 flex-wrap', isRTL && 'flex-row-reverse')}>
              <div className={cn('flex items-center gap-2 text-sm font-semibold', isRTL && 'flex-row-reverse')}>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{isAr ? 'تنبيهات التراخيص' : 'License Alerts'}</span>
                {expiredCount > 0 && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                    {isAr ? `منتهية: ${expiredCount}` : `Expired: ${expiredCount}`}
                  </Badge>
                )}
                {soonCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    {isAr ? `خلال 30 يوم: ${soonCount}` : `Within 30 days: ${soonCount}`}
                  </Badge>
                )}
              </div>
              {focusedId && (
                <Button size="sm" variant="ghost" onClick={() => setFocusedId(null)}>
                  <X className="w-3 h-3 me-1" />{isAr ? 'إلغاء التركيز' : 'Clear focus'}
                </Button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto divide-y">
              {alerts.slice(0, 50).map((a, i) => (
                <div key={`${a.vehicle.id}-${a.license}-${i}`} className={cn('px-3 py-2 text-xs flex items-center justify-between gap-2 flex-wrap', isRTL && 'flex-row-reverse')}>
                  <div className={cn('flex items-center gap-2 min-w-0 flex-wrap', isRTL && 'flex-row-reverse')}>
                    <Badge variant="outline" className={cn('shrink-0', a.type === 'expired' ? 'border-red-400 text-red-700 dark:text-red-300' : 'border-amber-400 text-amber-700 dark:text-amber-300')}>
                      {a.type === 'expired'
                        ? (isAr ? `منذ ${Math.abs(a.days)} يوم` : `${Math.abs(a.days)}d ago`)
                        : (isAr ? `خلال ${a.days} يوم` : `in ${a.days}d`)}
                    </Badge>
                    <span className="font-mono shrink-0">{a.vehicle.vehicle_code}</span>
                    <span className="font-mono text-muted-foreground shrink-0">{a.vehicle.plate_number}</span>
                    <span className="text-muted-foreground">{a.license}</span>
                    <span className="text-muted-foreground">· {a.date}</span>
                  </div>
                  <Button size="sm" variant="outline" className="h-7" onClick={() => focusVehicle(a.vehicle.id)}>
                    <Crosshair className="w-3 h-3 me-1" />{isAr ? 'تركيز' : 'Focus'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{isAr ? 'لا توجد سيارات' : 'No vehicles found'}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{isAr ? 'الماركة' : 'Brand'}</TableHead>
                    <TableHead>{isAr ? 'الموديل' : 'Model'}</TableHead>
                    <TableHead>{isAr ? 'اللوحة' : 'Plate'}</TableHead>
                    <TableHead>{isAr ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead>{isAr ? 'نهاية الترخيص' : 'License End'}</TableHead>
                    <TableHead>{isAr ? 'السائق' : 'Driver'}</TableHead>
                    <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => (
                    <TableRow key={v.id} id={`vehicle-row-${v.id}`} className={cn(focusedId === v.id && 'bg-primary/10 ring-2 ring-primary')}>
                      <TableCell className="font-mono text-xs">{v.vehicle_code}</TableCell>
                      <TableCell>{v.brand}</TableCell>
                      <TableCell>{v.model} ({v.year})</TableCell>
                      <TableCell className="font-mono">{v.plate_number}</TableCell>
                      <TableCell>{stationName(v.station_id)}</TableCell>
                      <TableCell>{v.license_end_date || '-'}</TableCell>
                      <TableCell className="whitespace-pre-wrap break-words max-w-[160px]">{v.insured_driver_name || '-'}</TableCell>
                      <TableCell>{statusBadge(v.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" onClick={() => handleEdit(v)} aria-label={isAr ? 'تعديل' : 'Edit'}><Edit className="w-4 h-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>{isAr ? 'تعديل' : 'Edit'}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(v)} aria-label={isAr ? 'حذف' : 'Delete'}><Trash2 className="w-4 h-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>{isAr ? 'حذف' : 'Delete'}</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filtered.map((v) => (
                <div key={v.id} id={`vehicle-row-${v.id}`} className={cn('border rounded-lg p-3 bg-card', focusedId === v.id && 'ring-2 ring-primary bg-primary/5')}>
                  <div className={cn('flex items-start justify-between gap-2', isRTL && 'flex-row-reverse')}>
                    <div className="min-w-0">
                      <div className="font-semibold">{v.brand} {v.model}</div>
                      <div className="text-xs text-muted-foreground font-mono">{v.plate_number} · {v.year}</div>
                      <div className="text-xs mt-1">{stationName(v.station_id)}</div>
                    </div>
                    {statusBadge(v.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div><span className="text-muted-foreground">{isAr ? 'الكود:' : 'Code:'}</span> <span className="font-mono">{v.vehicle_code}</span></div>
                    <div><span className="text-muted-foreground">{isAr ? 'ترخيص:' : 'Lic.:'}</span> {v.license_end_date || '-'}</div>
                    {v.insured_driver_name && <div className="col-span-2 whitespace-pre-wrap break-words"><span className="text-muted-foreground">{isAr ? 'السائق:' : 'Driver:'}</span> {v.insured_driver_name}</div>}
                  </div>
                  <div className={cn('flex gap-1 mt-2 justify-end', isRTL && 'justify-start')}>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(v)}><Edit className="w-4 h-4 me-1" />{isAr ? 'تعديل' : 'Edit'}</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(v.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
