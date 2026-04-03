import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Wrench, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

interface VehicleOption { id: string; vehicle_code: string; brand: string; model: string; plate_number: string; }

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

export const VehicleMaintenance = () => {
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: '', maintenance_type: 'periodic', description: '',
    cost: 0, maintenance_date: new Date().toISOString().split('T')[0],
    next_maintenance_date: '', odometer_reading: '', provider: '', notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    const [{ data: mData }, { data: vData }] = await Promise.all([
      supabase.from('vehicle_maintenance').select('*').order('maintenance_date', { ascending: false }),
      supabase.from('vehicles').select('id, vehicle_code, brand, model, plate_number').order('vehicle_code'),
    ]);
    if (mData) setRecords(mData as unknown as MaintenanceRecord[]);
    if (vData) setVehicles(vData as unknown as VehicleOption[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const vehicleMap = Object.fromEntries(vehicles.map(v => [v.id, v]));

  const handleSave = async () => {
    if (!form.vehicle_id || !form.maintenance_type) {
      toast.error(isAr ? 'يرجى اختيار السيارة ونوع الصيانة' : 'Please select vehicle and type');
      return;
    }
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
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('vehicle_maintenance').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(isAr ? 'تم الحذف' : 'Deleted');
    fetchData();
  };

  const typeLabel = (t: string) => {
    const found = TYPES.find(x => x.value === t);
    return found ? (isAr ? found.ar : found.en) : t;
  };

  const filtered = records.filter(r => {
    const v = vehicleMap[r.vehicle_id];
    return [v?.vehicle_code, v?.brand, v?.plate_number, r.maintenance_type, r.provider]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
  });

  const totalCost = records.reduce((s, r) => s + (r.cost || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Wrench className="w-8 h-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{records.length}</p>
              <p className="text-sm text-muted-foreground">{isAr ? 'إجمالي سجلات الصيانة' : 'Total Records'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{totalCost.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</p>
            <p className="text-sm text-muted-foreground">{isAr ? 'إجمالي تكاليف الصيانة' : 'Total Costs'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{vehicles.length}</p>
            <p className="text-sm text-muted-foreground">{isAr ? 'عدد السيارات' : 'Total Vehicles'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className={cn("flex flex-row items-center justify-between flex-wrap gap-2", isRTL && "flex-row-reverse")}>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            {isAr ? 'سجلات الصيانة' : 'Maintenance Records'}
          </CardTitle>
          <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <div className="relative">
              <Search className="absolute top-2.5 start-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="ps-9 h-9 w-48" />
            </div>
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
                    <Select value={form.vehicle_id} onValueChange={v => setForm(p => ({ ...p, vehicle_id: v }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder={isAr ? 'اختر سيارة' : 'Select vehicle'} /></SelectTrigger>
                      <SelectContent>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} - {v.plate_number}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{isAr ? 'نوع الصيانة' : 'Type'} <span className="text-destructive">*</span></Label>
                    <Select value={form.maintenance_type} onValueChange={v => setForm(p => ({ ...p, maintenance_type: v }))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TYPES.map(t => (<SelectItem key={t.value} value={t.value}>{isAr ? t.ar : t.en}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{isAr ? 'التاريخ' : 'Date'}</Label>
                      <Input type="date" value={form.maintenance_date} onChange={e => setForm(p => ({ ...p, maintenance_date: e.target.value }))} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">{isAr ? 'التكلفة' : 'Cost'}</Label>
                      <Input type="number" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: Number(e.target.value) }))} className="h-9" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{isAr ? 'قراءة العداد' : 'Odometer'}</Label>
                      <Input type="number" value={form.odometer_reading} onChange={e => setForm(p => ({ ...p, odometer_reading: e.target.value }))} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">{isAr ? 'مقدم الخدمة' : 'Provider'}</Label>
                      <Input value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} className="h-9" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{isAr ? 'الصيانة القادمة' : 'Next Maintenance'}</Label>
                    <Input type="date" value={form.next_maintenance_date} onChange={e => setForm(p => ({ ...p, next_maintenance_date: e.target.value }))} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">{isAr ? 'الوصف' : 'Description'}</Label>
                    <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="h-9" />
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isAr ? 'السيارة' : 'Vehicle'}</TableHead>
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
                  {filtered.map(r => {
                    const v = vehicleMap[r.vehicle_id];
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{v ? `${v.brand} ${v.model}` : '-'}</div>
                          <div className="text-xs text-muted-foreground">{v?.plate_number}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{typeLabel(r.maintenance_type)}</Badge></TableCell>
                        <TableCell>{r.maintenance_date}</TableCell>
                        <TableCell>{r.cost?.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</TableCell>
                        <TableCell>{r.odometer_reading?.toLocaleString() || '-'}</TableCell>
                        <TableCell>{r.provider || '-'}</TableCell>
                        <TableCell>{r.next_maintenance_date || '-'}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
