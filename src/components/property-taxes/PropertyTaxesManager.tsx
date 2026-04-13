import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Search, AlertTriangle, Building2, CircleDollarSign, Clock, CheckCircle2, XCircle, Edit, Trash2, Bell } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';

interface PropertyTax {
  id: string;
  station_id: string | null;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  receipt_number: string | null;
  property_type: string | null;
  address: string | null;
  area_sqm: number | null;
  rental_value: number | null;
  tax_period: string;
  notes: string | null;
  created_at: string;
}

interface Station {
  id: string;
  name_ar: string;
  name_en: string;
}

const EMPTY_FORM = {
  station_id: '',
  amount: '',
  due_date: '',
  paid_date: '',
  status: 'pending',
  receipt_number: '',
  property_type: '',
  address: '',
  area_sqm: '',
  rental_value: '',
  tax_period: 'annual',
  notes: '',
};

export const PropertyTaxesManager = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [records, setRecords] = useState<PropertyTax[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [taxRes, stRes] = await Promise.all([
      supabase.from('property_taxes').select('*').order('due_date', { ascending: false }),
      supabase.from('stations').select('id, name_ar, name_en').order('name_ar'),
    ]);
    if (taxRes.data) setRecords(taxRes.data as any);
    if (stRes.data) setStations(stRes.data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stationName = (id: string | null) => {
    if (!id) return isAr ? 'غير محدد' : 'N/A';
    const s = stations.find(st => st.id === id);
    return s ? (isAr ? s.name_ar : s.name_en) : id;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{isAr ? 'مدفوع' : 'Paid'}</Badge>;
      case 'overdue': return <Badge className="bg-red-100 text-red-700 border-red-200">{isAr ? 'متأخر' : 'Overdue'}</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-700 border-amber-200">{isAr ? 'معلق' : 'Pending'}</Badge>;
    }
  };

  const periodLabel = (p: string) => {
    if (p === 'quarterly') return isAr ? 'ربع سنوي' : 'Quarterly';
    return isAr ? 'سنوي' : 'Annual';
  };

  // Alerts: records due within 30 days
  const alerts = records.filter(r => {
    if (r.status === 'paid') return false;
    const days = differenceInDays(new Date(r.due_date), new Date());
    return days >= 0 && days <= 30;
  });

  const overdueCount = records.filter(r => r.status !== 'paid' && differenceInDays(new Date(r.due_date), new Date()) < 0).length;
  const pendingTotal = records.filter(r => r.status !== 'paid').reduce((s, r) => s + r.amount, 0);
  const paidTotal = records.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);

  const filtered = records.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (stationFilter !== 'all' && r.station_id !== stationFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const sn = stationName(r.station_id).toLowerCase();
      return sn.includes(q) || (r.address || '').toLowerCase().includes(q) || (r.receipt_number || '').toLowerCase().includes(q);
    }
    return true;
  });

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (r: PropertyTax) => {
    setEditingId(r.id);
    setForm({
      station_id: r.station_id || '',
      amount: String(r.amount),
      due_date: r.due_date,
      paid_date: r.paid_date || '',
      status: r.status,
      receipt_number: r.receipt_number || '',
      property_type: r.property_type || '',
      address: r.address || '',
      area_sqm: r.area_sqm ? String(r.area_sqm) : '',
      rental_value: r.rental_value ? String(r.rental_value) : '',
      tax_period: r.tax_period,
      notes: r.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.due_date || !form.amount) {
      toast.error(isAr ? 'يرجى إدخال المبلغ وتاريخ الاستحقاق' : 'Please enter amount and due date');
      return;
    }
    const payload: any = {
      station_id: form.station_id || null,
      amount: Number(form.amount),
      due_date: form.due_date,
      paid_date: form.paid_date || null,
      status: form.status,
      receipt_number: form.receipt_number || null,
      property_type: form.property_type || null,
      address: form.address || null,
      area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
      rental_value: form.rental_value ? Number(form.rental_value) : null,
      tax_period: form.tax_period,
      notes: form.notes || null,
    };
    if (editingId) {
      const { error } = await supabase.from('property_taxes').update(payload).eq('id', editingId);
      if (error) { toast.error(error.message); return; }
      toast.success(isAr ? 'تم التحديث' : 'Updated');
    } else {
      const { error } = await supabase.from('property_taxes').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success(isAr ? 'تمت الإضافة' : 'Added');
    }
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('property_taxes').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(isAr ? 'تم الحذف' : 'Deleted');
    setDeleteConfirm(null);
    fetchData();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">{isAr ? 'الضرائب العقارية' : 'Real Estate Taxes'}</h1>
        <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" /> {isAr ? 'إضافة سجل' : 'Add Record'}</Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">{isAr ? 'معلق' : 'Pending'}</p><p className="text-lg font-bold">{pendingTotal.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">{isAr ? 'مدفوع' : 'Paid'}</p><p className="text-lg font-bold">{paidTotal.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-100"><XCircle className="w-5 h-5 text-red-600" /></div>
          <div><p className="text-xs text-muted-foreground">{isAr ? 'متأخر' : 'Overdue'}</p><p className="text-lg font-bold">{overdueCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100"><Bell className="w-5 h-5 text-blue-600" /></div>
          <div><p className="text-xs text-muted-foreground">{isAr ? 'تنبيهات (30 يوم)' : 'Alerts (30 days)'}</p><p className="text-lg font-bold">{alerts.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-amber-700"><AlertTriangle className="w-4 h-4" />{isAr ? 'تنبيهات استحقاق قريبة' : 'Upcoming Due Alerts'}</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {alerts.map(a => (
              <p key={a.id} className="text-sm text-amber-800">
                • {stationName(a.station_id)} - {a.amount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'} - {isAr ? 'مستحق' : 'due'} {format(new Date(a.due_date), 'yyyy/MM/dd')} ({differenceInDays(new Date(a.due_date), new Date())} {isAr ? 'يوم' : 'days'})
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</SelectItem>
            <SelectItem value="pending">{isAr ? 'معلق' : 'Pending'}</SelectItem>
            <SelectItem value="paid">{isAr ? 'مدفوع' : 'Paid'}</SelectItem>
            <SelectItem value="overdue">{isAr ? 'متأخر' : 'Overdue'}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stationFilter} onValueChange={setStationFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'كل المحطات' : 'All Stations'}</SelectItem>
            {stations.map(s => <SelectItem key={s.id} value={s.id}>{isAr ? s.name_ar : s.name_en}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">{isAr ? 'المحطة' : 'Station'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'نوع العقار' : 'Property Type'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'العنوان' : 'Address'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'الفترة' : 'Period'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'تاريخ الدفع' : 'Paid Date'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'رقم الإيصال' : 'Receipt #'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-right">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">{isAr ? 'لا توجد سجلات' : 'No records'}</TableCell></TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{stationName(r.station_id)}</TableCell>
                    <TableCell>{r.property_type || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.address || '-'}</TableCell>
                    <TableCell>{r.amount.toLocaleString()}</TableCell>
                    <TableCell>{periodLabel(r.tax_period)}</TableCell>
                    <TableCell>{format(new Date(r.due_date), 'yyyy/MM/dd')}</TableCell>
                    <TableCell>{r.paid_date ? format(new Date(r.paid_date), 'yyyy/MM/dd') : '-'}</TableCell>
                    <TableCell>{r.receipt_number || '-'}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editingId ? (isAr ? 'تعديل سجل' : 'Edit Record') : (isAr ? 'إضافة سجل جديد' : 'Add New Record')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{isAr ? 'المحطة' : 'Station'}</Label>
              <Select value={form.station_id} onValueChange={v => setForm(f => ({ ...f, station_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'اختر المحطة' : 'Select station'} /></SelectTrigger>
                <SelectContent>{stations.map(s => <SelectItem key={s.id} value={s.id}>{isAr ? s.name_ar : s.name_en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isAr ? 'المبلغ' : 'Amount'} *</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label>{isAr ? 'تاريخ الاستحقاق' : 'Due Date'} *</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <Label>{isAr ? 'تاريخ الدفع' : 'Paid Date'}</Label>
              <Input type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} />
            </div>
            <div>
              <Label>{isAr ? 'الحالة' : 'Status'}</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{isAr ? 'معلق' : 'Pending'}</SelectItem>
                  <SelectItem value="paid">{isAr ? 'مدفوع' : 'Paid'}</SelectItem>
                  <SelectItem value="overdue">{isAr ? 'متأخر' : 'Overdue'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{isAr ? 'رقم الإيصال' : 'Receipt Number'}</Label>
              <Input value={form.receipt_number} onChange={e => setForm(f => ({ ...f, receipt_number: e.target.value }))} />
            </div>
            <div>
              <Label>{isAr ? 'نوع العقار' : 'Property Type'}</Label>
              <Input value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))} placeholder={isAr ? 'مبنى إداري، مخزن...' : 'Office, warehouse...'} />
            </div>
            <div>
              <Label>{isAr ? 'المساحة (م²)' : 'Area (sqm)'}</Label>
              <Input type="number" value={form.area_sqm} onChange={e => setForm(f => ({ ...f, area_sqm: e.target.value }))} />
            </div>
            <div>
              <Label>{isAr ? 'القيمة الإيجارية' : 'Rental Value'}</Label>
              <Input type="number" value={form.rental_value} onChange={e => setForm(f => ({ ...f, rental_value: e.target.value }))} />
            </div>
            <div>
              <Label>{isAr ? 'الفترة الضريبية' : 'Tax Period'}</Label>
              <Select value={form.tax_period} onValueChange={v => setForm(f => ({ ...f, tax_period: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">{isAr ? 'سنوي' : 'Annual'}</SelectItem>
                  <SelectItem value="quarterly">{isAr ? 'ربع سنوي' : 'Quarterly'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>{isAr ? 'العنوان' : 'Address'}</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label>{isAr ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave}>{editingId ? (isAr ? 'تحديث' : 'Update') : (isAr ? 'إضافة' : 'Add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{isAr ? 'تأكيد الحذف' : 'Confirm Delete'}</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">{isAr ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?'}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>{isAr ? 'حذف' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
