import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Car } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
};

export const VehicleRegistry = () => {
  const { language, isRTL } = useLanguage();
  const isAr = language === 'ar';
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('vehicles').select('*').order('vehicle_code');
    if (!error && data) setVehicles(data as unknown as Vehicle[]);
    setLoading(false);
  };

  useEffect(() => { fetchVehicles(); }, []);

  const handleSave = async () => {
    if (!form.vehicle_code || !form.brand || !form.model || !form.plate_number) {
      toast.error(isAr ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }
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
    fetchVehicles();
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
      notes: v.notes || '', status: v.status,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(isAr ? 'تم حذف السيارة' : 'Vehicle deleted');
    fetchVehicles();
  };

  const filtered = vehicles.filter(v =>
    [v.vehicle_code, v.brand, v.model, v.plate_number, v.insured_driver_name]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { active: 'bg-green-100 text-green-800', inactive: 'bg-red-100 text-red-800', maintenance: 'bg-yellow-100 text-yellow-800' };
    const labels: Record<string, string> = { active: isAr ? 'نشط' : 'Active', inactive: isAr ? 'غير نشط' : 'Inactive', maintenance: isAr ? 'صيانة' : 'Maintenance' };
    return <Badge className={map[s] || 'bg-muted'}>{labels[s] || s}</Badge>;
  };

  const Field = ({ label, name, type = 'text', required = false }: { label: string; name: keyof typeof form; type?: string; required?: boolean }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label} {required && <span className="text-destructive">*</span>}</Label>
      <Input type={type} value={form[name]} onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))} className="h-9" />
    </div>
  );

  return (
    <Card>
      <CardHeader className={cn("flex flex-row items-center justify-between flex-wrap gap-2", isRTL && "flex-row-reverse")}>
        <CardTitle className="flex items-center gap-2">
          <Car className="w-5 h-5" />
          {isAr ? 'سجل السيارات' : 'Vehicle Registry'}
        </CardTitle>
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <div className="relative">
            <Search className="absolute top-2.5 start-3 w-4 h-4 text-muted-foreground" />
            <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="ps-9 h-9 w-48" />
          </div>
          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyForm); } }}>
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
                <Field label={isAr ? 'اسم السائق المؤمن عليه' : 'Insured Driver'} name="insured_driver_name" />
                <Field label={isAr ? 'الرقم التأميني' : 'Insurance Number'} name="insurance_number" />
                <Field label={isAr ? 'بداية الترخيص' : 'License Start'} name="license_start_date" type="date" />
                <Field label={isAr ? 'نهاية الترخيص' : 'License End'} name="license_end_date" type="date" />
                <Field label={isAr ? 'بداية ترخيص الستائر' : 'Curtains License Start'} name="curtains_license_start" type="date" />
                <Field label={isAr ? 'نهاية ترخيص الستائر' : 'Curtains License End'} name="curtains_license_end" type="date" />
                <Field label={isAr ? 'بداية ترخيص النقل البري' : 'Transport License Start'} name="transport_license_start" type="date" />
                <Field label={isAr ? 'نهاية ترخيص النقل البري' : 'Transport License End'} name="transport_license_end" type="date" />
              </div>
              <div className="mt-3">
                <Label className="text-xs">{isAr ? 'ملاحظات' : 'Notes'}</Label>
                <Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
                <Button onClick={handleSave}>{isAr ? 'حفظ' : 'Save'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد سيارات' : 'No vehicles found'}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isAr ? 'الكود' : 'Code'}</TableHead>
                  <TableHead>{isAr ? 'الماركة' : 'Brand'}</TableHead>
                  <TableHead>{isAr ? 'الموديل' : 'Model'}</TableHead>
                  <TableHead>{isAr ? 'اللوحة' : 'Plate'}</TableHead>
                  <TableHead>{isAr ? 'اللون' : 'Color'}</TableHead>
                  <TableHead>{isAr ? 'نهاية الترخيص' : 'License End'}</TableHead>
                  <TableHead>{isAr ? 'السائق' : 'Driver'}</TableHead>
                  <TableHead>{isAr ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead>{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.vehicle_code}</TableCell>
                    <TableCell>{v.brand}</TableCell>
                    <TableCell>{v.model} ({v.year})</TableCell>
                    <TableCell className="font-mono">{v.plate_number}</TableCell>
                    <TableCell>{v.color || '-'}</TableCell>
                    <TableCell>{v.license_end_date || '-'}</TableCell>
                    <TableCell>{v.insured_driver_name || '-'}</TableCell>
                    <TableCell>{statusBadge(v.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(v)}><Edit className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(v.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
