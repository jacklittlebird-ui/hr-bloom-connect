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
import { Plus, Search, AlertTriangle, Clock, CheckCircle2, XCircle, Edit, Trash2, Bell, Landmark, CalendarDays, Receipt } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

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
      case 'paid': return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-medium px-3 py-1">{isAr ? 'مدفوع' : 'Paid'}</Badge>;
      case 'overdue': return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20 font-medium px-3 py-1">{isAr ? 'متأخر' : 'Overdue'}</Badge>;
      default: return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 font-medium px-3 py-1">{isAr ? 'معلق' : 'Pending'}</Badge>;
    }
  };

  const periodLabel = (p: string) => {
    if (p === 'quarterly') return isAr ? 'ربع سنوي' : 'Quarterly';
    return isAr ? 'سنوي' : 'Annual';
  };

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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Landmark className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isAr ? 'الضرائب العقارية' : 'Real Estate Taxes'}</h1>
            <p className="text-sm text-muted-foreground">{isAr ? 'متابعة وإدارة الضرائب العقارية لجميع المحطات' : 'Track and manage property taxes for all stations'}</p>
          </div>
        </div>
        <Button onClick={openAdd} size="lg" className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" /> {isAr ? 'إضافة سجل' : 'Add Record'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/20">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-700/70 dark:text-amber-400/70 uppercase tracking-wide">{isAr ? 'معلق' : 'Pending'}</p>
              <p className="text-xl font-bold text-amber-800 dark:text-amber-300 mt-0.5">{pendingTotal.toLocaleString()} <span className="text-sm font-normal">{isAr ? 'ج.م' : 'EGP'}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-emerald-700/70 dark:text-emerald-400/70 uppercase tracking-wide">{isAr ? 'مدفوع' : 'Paid'}</p>
              <p className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">{paidTotal.toLocaleString()} <span className="text-sm font-normal">{isAr ? 'ج.م' : 'EGP'}</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-red-500/15 ring-1 ring-red-500/20">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-red-700/70 dark:text-red-400/70 uppercase tracking-wide">{isAr ? 'متأخر' : 'Overdue'}</p>
              <p className="text-xl font-bold text-red-800 dark:text-red-300 mt-0.5">{overdueCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/15 ring-1 ring-blue-500/20">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-700/70 dark:text-blue-400/70 uppercase tracking-wide">{isAr ? 'تنبيهات (30 يوم)' : 'Alerts (30d)'}</p>
              <p className="text-xl font-bold text-blue-800 dark:text-blue-300 mt-0.5">{alerts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-50/60 dark:bg-amber-950/20 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              {isAr ? 'تنبيهات استحقاق قريبة' : 'Upcoming Due Alerts'}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 space-y-2">
            {alerts.map(a => {
              const daysLeft = differenceInDays(new Date(a.due_date), new Date());
              return (
                <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/60 dark:bg-white/5">
                  <CalendarDays className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-sm text-amber-800 dark:text-amber-300 flex-1">
                    <span className="font-semibold">{stationName(a.station_id)}</span>
                    {' — '}
                    {a.amount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                  <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 shrink-0">
                    {daysLeft} {isAr ? 'يوم' : 'days'}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={isAr ? 'بحث بالمحطة أو العنوان أو رقم الإيصال...' : 'Search by station, address, or receipt...'} value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
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
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-right font-semibold">{isAr ? 'المحطة' : 'Station'}</TableHead>
                  <TableHead className="text-right font-semibold">{isAr ? 'نوع العقار' : 'Type'}</TableHead>
                  <TableHead className="text-right font-semibold">{isAr ? 'العنوان' : 'Address'}</TableHead>
                  <TableHead className="text-right font-semibold">{isAr ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead className="text-right font-semibold">{isAr ? 'الفترة' : 'Period'}</TableHead>
                  <TableHead className="text-right font-semibold">{isAr ? 'الاستحقاق' : 'Due'}</TableHead>
                  <TableHead className="text-right font-semibold">{isAr ? 'الدفع' : 'Paid'}</TableHead>
                  <TableHead className="text-right font-semibold">{isAr ? 'الإيصال' : 'Receipt'}</TableHead>
                  <TableHead className="text-right font-semibold">{isAr ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-right font-semibold">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        <span className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-muted/50">
                          <Receipt className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">{isAr ? 'لا توجد سجلات' : 'No records found'}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">{isAr ? 'أضف سجل جديد للبدء' : 'Add a new record to get started'}</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.map(r => (
                  <TableRow key={r.id} className="group">
                    <TableCell className="font-medium">{stationName(r.station_id)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.property_type || '-'}</TableCell>
                    <TableCell className="max-w-[200px] whitespace-normal break-words text-muted-foreground">{r.address || '-'}</TableCell>
                    <TableCell className="font-semibold tabular-nums">{r.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">{periodLabel(r.tax_period)}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{format(new Date(r.due_date), 'yyyy/MM/dd')}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{r.paid_date ? format(new Date(r.paid_date), 'yyyy/MM/dd') : '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{r.receipt_number || '-'}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onClick={() => openEdit(r)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteConfirm(r.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
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
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              {editingId ? (isAr ? 'تعديل سجل ضريبي' : 'Edit Tax Record') : (isAr ? 'إضافة سجل ضريبي جديد' : 'Add New Tax Record')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'المحطة' : 'Station'}</Label>
              <Select value={form.station_id} onValueChange={v => setForm(f => ({ ...f, station_id: v }))}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'اختر المحطة' : 'Select station'} /></SelectTrigger>
                <SelectContent>{stations.map(s => <SelectItem key={s.id} value={s.id}>{isAr ? s.name_ar : s.name_en}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'المبلغ' : 'Amount'} <span className="text-destructive">*</span></Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'} <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'تاريخ الدفع' : 'Paid Date'}</Label>
              <Input type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'الحالة' : 'Status'}</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{isAr ? 'معلق' : 'Pending'}</SelectItem>
                  <SelectItem value="paid">{isAr ? 'مدفوع' : 'Paid'}</SelectItem>
                  <SelectItem value="overdue">{isAr ? 'متأخر' : 'Overdue'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'رقم الإيصال' : 'Receipt Number'}</Label>
              <Input value={form.receipt_number} onChange={e => setForm(f => ({ ...f, receipt_number: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'نوع العقار' : 'Property Type'}</Label>
              <Input value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))} placeholder={isAr ? 'مبنى إداري، مخزن...' : 'Office, warehouse...'} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'المساحة (م²)' : 'Area (sqm)'}</Label>
              <Input type="number" value={form.area_sqm} onChange={e => setForm(f => ({ ...f, area_sqm: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'القيمة الإيجارية' : 'Rental Value'}</Label>
              <Input type="number" value={form.rental_value} onChange={e => setForm(f => ({ ...f, rental_value: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'الفترة الضريبية' : 'Tax Period'}</Label>
              <Select value={form.tax_period} onValueChange={v => setForm(f => ({ ...f, tax_period: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">{isAr ? 'سنوي' : 'Annual'}</SelectItem>
                  <SelectItem value="quarterly">{isAr ? 'ربع سنوي' : 'Quarterly'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'العنوان' : 'Address'}</Label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'ملاحظات' : 'Notes'}</Label>
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
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              {isAr ? 'تأكيد الحذف' : 'Confirm Delete'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{isAr ? 'هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this record? This action cannot be undone.'}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>{isAr ? 'حذف' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
