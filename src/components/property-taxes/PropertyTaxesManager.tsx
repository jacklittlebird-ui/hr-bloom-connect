import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Plus, Search, AlertTriangle, Clock, CheckCircle2, XCircle, Edit, Trash2, Bell, Landmark,
  CalendarDays, Receipt, FileSpreadsheet, FileText, RefreshCw, TrendingUp, Wallet, Filter,
  ArrowUpDown, CheckCircle, MapPin, Building2, Calculator, ChevronRight, Loader2,
} from 'lucide-react';
import { format, differenceInDays, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface Station { id: string; name_ar: string; name_en: string; }

const EMPTY_FORM = {
  station_id: '', amount: '', due_date: '', paid_date: '', status: 'pending',
  receipt_number: '', property_type: '', address: '', area_sqm: '', rental_value: '',
  tax_period: 'annual', notes: '',
};

type SortKey = 'due_date' | 'amount' | 'station' | 'status';
type SortDir = 'asc' | 'desc';

const PROPERTY_TYPES_AR = ['مبنى إداري', 'مخزن', 'محطة', 'ورشة', 'موقف', 'أرض فضاء', 'شقة', 'أخرى'];
const PROPERTY_TYPES_EN = ['Office', 'Warehouse', 'Station', 'Workshop', 'Parking', 'Land', 'Apartment', 'Other'];

export const PropertyTaxesManager = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [records, setRecords] = useState<PropertyTax[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // sort & pagination
  const [sortKey, setSortKey] = useState<SortKey>('due_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<PropertyTax | null>(null);
  const [paymentForm, setPaymentForm] = useState({ paid_date: '', receipt_number: '' });

  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true); else setLoading(true);
    try {
      const [taxRes, stRes] = await Promise.all([
        supabase.from('property_taxes').select('*').order('due_date', { ascending: false }),
        supabase.from('stations').select('id, name_ar, name_en').order('name_ar'),
      ]);
      if (taxRes.error) throw taxRes.error;
      if (taxRes.data) {
        const today = new Date();
        const updated = (taxRes.data as any[]).map(r => {
          if (r.status !== 'paid' && differenceInDays(parseISO(r.due_date), today) < 0) {
            return { ...r, status: 'overdue' };
          }
          return r;
        });
        setRecords(updated as PropertyTax[]);
      }
      if (stRes.data) setStations(stRes.data as any);
      if (isManual) toast.success(isAr ? 'تم تحديث البيانات' : 'Data refreshed');
    } catch (e: any) {
      toast.error(e?.message || (isAr ? 'فشل تحميل البيانات' : 'Failed to load data'));
    } finally {
      if (isManual) setRefreshing(false); else setLoading(false);
    }
  }, [isAr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stationName = useCallback((id: string | null) => {
    if (!id) return isAr ? 'غير محدد' : 'N/A';
    const s = stations.find(st => st.id === id);
    return s ? (isAr ? s.name_ar : s.name_en) : id;
  }, [stations, isAr]);

  const fmtMoney = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const fmtDate = (d: string | null) => d ? format(parseISO(d), 'dd/MM/yyyy') : '-';

  const statusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-medium gap-1"><CheckCircle2 className="w-3 h-3" />{isAr ? 'مدفوع' : 'Paid'}</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30 font-medium gap-1"><XCircle className="w-3 h-3" />{isAr ? 'متأخر' : 'Overdue'}</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-medium gap-1"><Clock className="w-3 h-3" />{isAr ? 'معلق' : 'Pending'}</Badge>;
    }
  };

  const periodLabel = (p: string) => p === 'quarterly' ? (isAr ? 'ربع سنوي' : 'Quarterly') : (isAr ? 'سنوي' : 'Annual');

  // years available
  const years = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => set.add(String(new Date(r.due_date).getFullYear())));
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [records]);

  // alerts (next 30 days, not paid)
  const alerts = useMemo(() => {
    return records
      .filter(r => r.status !== 'paid')
      .map(r => ({ ...r, days: differenceInDays(parseISO(r.due_date), new Date()) }))
      .filter(r => r.days >= 0 && r.days <= 30)
      .sort((a, b) => a.days - b.days);
  }, [records]);

  const overdueRecords = useMemo(() =>
    records.filter(r => r.status === 'overdue'),
  [records]);

  // KPIs
  const stats = useMemo(() => {
    const pendingTotal = records.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0);
    const overdueTotal = records.filter(r => r.status === 'overdue').reduce((s, r) => s + Number(r.amount), 0);
    const paidTotal = records.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0);
    const yearNow = new Date().getFullYear();
    const ytdPaid = records.filter(r => r.status === 'paid' && r.paid_date && new Date(r.paid_date).getFullYear() === yearNow)
      .reduce((s, r) => s + Number(r.amount), 0);
    const totalRecords = records.length;
    const paidPct = totalRecords ? Math.round((records.filter(r => r.status === 'paid').length / totalRecords) * 100) : 0;
    return { pendingTotal, overdueTotal, paidTotal, ytdPaid, totalRecords, paidPct };
  }, [records]);

  // by station summary
  const byStation = useMemo(() => {
    const map = new Map<string, { name: string; total: number; paid: number; pending: number; overdue: number; count: number }>();
    records.forEach(r => {
      const key = r.station_id || '__none__';
      const name = stationName(r.station_id);
      const cur = map.get(key) || { name, total: 0, paid: 0, pending: 0, overdue: 0, count: 0 };
      cur.total += Number(r.amount);
      cur.count += 1;
      if (r.status === 'paid') cur.paid += Number(r.amount);
      else if (r.status === 'overdue') cur.overdue += Number(r.amount);
      else cur.pending += Number(r.amount);
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [records, stationName]);

  // filter + sort
  const filtered = useMemo(() => {
    let out = records.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (stationFilter !== 'all' && r.station_id !== stationFilter) return false;
      if (periodFilter !== 'all' && r.tax_period !== periodFilter) return false;
      if (typeFilter !== 'all' && r.property_type !== typeFilter) return false;
      if (yearFilter !== 'all') {
        const y = String(new Date(r.due_date).getFullYear());
        if (y !== yearFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const sn = stationName(r.station_id).toLowerCase();
        if (!sn.includes(q) && !(r.address || '').toLowerCase().includes(q) &&
            !(r.receipt_number || '').toLowerCase().includes(q) &&
            !(r.property_type || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });

    out.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'due_date') cmp = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      else if (sortKey === 'amount') cmp = Number(a.amount) - Number(b.amount);
      else if (sortKey === 'station') cmp = stationName(a.station_id).localeCompare(stationName(b.station_id));
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return out;
  }, [records, statusFilter, stationFilter, periodFilter, typeFilter, yearFilter, search, sortKey, sortDir, stationName]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter, stationFilter, periodFilter, typeFilter, yearFilter]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  const resetFilters = () => {
    setSearch(''); setStatusFilter('all'); setStationFilter('all');
    setPeriodFilter('all'); setYearFilter('all'); setTypeFilter('all');
    toast.success(isAr ? 'تم إعادة ضبط الفلاتر' : 'Filters reset');
  };

  // CRUD
  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (r: PropertyTax) => {
    setEditingId(r.id);
    setForm({
      station_id: r.station_id || '', amount: String(r.amount), due_date: r.due_date,
      paid_date: r.paid_date || '', status: r.status, receipt_number: r.receipt_number || '',
      property_type: r.property_type || '', address: r.address || '',
      area_sqm: r.area_sqm ? String(r.area_sqm) : '', rental_value: r.rental_value ? String(r.rental_value) : '',
      tax_period: r.tax_period, notes: r.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.due_date || !form.amount) {
      toast.error(isAr ? 'يرجى إدخال المبلغ وتاريخ الاستحقاق' : 'Please enter amount and due date');
      return;
    }
    const amt = Number(form.amount);
    if (!isFinite(amt) || amt <= 0) {
      toast.error(isAr ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than zero');
      return;
    }
    if (form.status === 'paid' && !form.paid_date) {
      toast.error(isAr ? 'حالة "مدفوع" تتطلب تاريخ الدفع' : 'Paid status requires a payment date');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        station_id: form.station_id || null, amount: amt, due_date: form.due_date,
        paid_date: form.paid_date || null, status: form.status,
        receipt_number: form.receipt_number || null, property_type: form.property_type || null,
        address: form.address || null,
        area_sqm: form.area_sqm ? Number(form.area_sqm) : null,
        rental_value: form.rental_value ? Number(form.rental_value) : null,
        tax_period: form.tax_period, notes: form.notes || null,
      };
      if (editingId) {
        const { error } = await supabase.from('property_taxes').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success(isAr ? 'تم التحديث بنجاح' : 'Updated successfully');
      } else {
        const { error } = await supabase.from('property_taxes').insert(payload);
        if (error) throw error;
        toast.success(isAr ? 'تمت الإضافة بنجاح' : 'Added successfully');
      }
      setDialogOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error(e?.message || (isAr ? 'تعذر الحفظ' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('property_taxes').delete().eq('id', id);
      if (error) throw error;
      toast.success(isAr ? 'تم الحذف' : 'Deleted');
      setDeleteConfirm(null);
      fetchData();
    } catch (e: any) {
      toast.error(e?.message || (isAr ? 'تعذر الحذف' : 'Delete failed'));
    } finally {
      setDeleting(false);
    }
  };

  const openPayment = (r: PropertyTax) => {
    setPaymentDialog(r);
    setPaymentForm({ paid_date: format(new Date(), 'yyyy-MM-dd'), receipt_number: r.receipt_number || '' });
  };

  const handleMarkPaid = async () => {
    if (!paymentDialog) return;
    if (!paymentForm.paid_date) { toast.error(isAr ? 'أدخل تاريخ الدفع' : 'Enter paid date'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('property_taxes').update({
        status: 'paid', paid_date: paymentForm.paid_date,
        receipt_number: paymentForm.receipt_number || paymentDialog.receipt_number,
      }).eq('id', paymentDialog.id);
      if (error) throw error;
      toast.success(isAr ? 'تم تسجيل الدفع' : 'Payment recorded');
      setPaymentDialog(null);
      fetchData();
    } catch (e: any) {
      toast.error(e?.message || (isAr ? 'تعذر تسجيل الدفع' : 'Failed to record payment'));
    } finally {
      setSaving(false);
    }
  };

  // Exports
  const exportExcel = () => {
    const rows = filtered.map(r => ({
      [isAr ? 'المحطة' : 'Station']: stationName(r.station_id),
      [isAr ? 'نوع العقار' : 'Property Type']: r.property_type || '',
      [isAr ? 'العنوان' : 'Address']: r.address || '',
      [isAr ? 'المساحة (م²)' : 'Area (sqm)']: r.area_sqm || '',
      [isAr ? 'القيمة الإيجارية' : 'Rental Value']: r.rental_value || '',
      [isAr ? 'المبلغ' : 'Amount']: Number(r.amount),
      [isAr ? 'الفترة' : 'Period']: periodLabel(r.tax_period),
      [isAr ? 'تاريخ الاستحقاق' : 'Due Date']: fmtDate(r.due_date),
      [isAr ? 'تاريخ الدفع' : 'Paid Date']: fmtDate(r.paid_date),
      [isAr ? 'رقم الإيصال' : 'Receipt']: r.receipt_number || '',
      [isAr ? 'الحالة' : 'Status']: r.status === 'paid' ? (isAr ? 'مدفوع' : 'Paid') : r.status === 'overdue' ? (isAr ? 'متأخر' : 'Overdue') : (isAr ? 'معلق' : 'Pending'),
      [isAr ? 'ملاحظات' : 'Notes']: r.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isAr ? 'الضرائب العقارية' : 'Property Taxes');
    XLSX.writeFile(wb, `property_taxes_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
    toast.success(isAr ? 'تم تصدير Excel' : 'Excel exported');
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text(isAr ? 'Property Taxes Report' : 'Property Taxes Report', 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);
    doc.text(`Records: ${filtered.length}`, 14, 28);

    autoTable(doc, {
      startY: 34,
      head: [['Station', 'Type', 'Address', 'Amount (EGP)', 'Period', 'Due', 'Paid', 'Receipt', 'Status']],
      body: filtered.map(r => [
        stationName(r.station_id),
        r.property_type || '-',
        r.address || '-',
        fmtMoney(Number(r.amount)),
        periodLabel(r.tax_period),
        fmtDate(r.due_date),
        fmtDate(r.paid_date),
        r.receipt_number || '-',
        r.status,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });

    doc.save(`property_taxes_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    toast.success(isAr ? 'تم تصدير PDF' : 'PDF exported');
  };

  const activeFiltersCount = [statusFilter, stationFilter, periodFilter, yearFilter, typeFilter]
    .filter(v => v !== 'all').length + (search ? 1 : 0);

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
            <Landmark className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{isAr ? 'الضرائب العقارية' : 'Real Estate Taxes'}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAr ? 'نظام متكامل لإدارة ومتابعة الضرائب العقارية' : 'Integrated system for property tax management'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tooltip><TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              aria-busy={refreshing}
              aria-label={isAr ? 'تحديث البيانات' : 'Refresh data'}
              title={isAr ? 'تحديث' : 'Refresh'}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger><TooltipContent>{isAr ? 'تحديث' : 'Refresh'}</TooltipContent></Tooltip>
          <Button variant="outline" onClick={exportExcel} className="gap-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
          <Button variant="outline" onClick={exportPDF} className="gap-2 border-red-500/30 text-red-700 dark:text-red-400 hover:bg-red-500/10">
            <FileText className="w-4 h-4" /> PDF
          </Button>
          <Button onClick={openAdd} size="default" className="gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> {isAr ? 'إضافة سجل' : 'Add Record'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-950/30 dark:to-amber-900/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 ring-1 ring-amber-500/20">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-700 dark:text-amber-400">{isAr ? 'معلق' : 'Pending'}</Badge>
            </div>
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 tabular-nums">{fmtMoney(stats.pendingTotal)}</p>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-1">{isAr ? 'جنيه مصري' : 'EGP'}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/40 dark:from-red-950/30 dark:to-red-900/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -translate-y-8 translate-x-8" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-red-500/15 ring-1 ring-red-500/20">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-700 dark:text-red-400">{overdueRecords.length} {isAr ? 'سجل' : 'rec'}</Badge>
            </div>
            <p className="text-2xl font-bold text-red-800 dark:text-red-300 tabular-nums">{fmtMoney(stats.overdueTotal)}</p>
            <p className="text-xs text-red-700/70 dark:text-red-400/70 mt-1">{isAr ? 'متأخرات' : 'Overdue'}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/40 dark:from-emerald-950/30 dark:to-emerald-900/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-8 translate-x-8" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-700 dark:text-emerald-400">{stats.paidPct}%</Badge>
            </div>
            <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 tabular-nums">{fmtMoney(stats.paidTotal)}</p>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-1">{isAr ? 'إجمالي مدفوع' : 'Total Paid'}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/40 dark:from-blue-950/30 dark:to-blue-900/10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-8 translate-x-8" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-500/15 ring-1 ring-blue-500/20">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-700 dark:text-blue-400">{new Date().getFullYear()}</Badge>
            </div>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-300 tabular-nums">{fmtMoney(stats.ytdPaid)}</p>
            <p className="text-xs text-blue-700/70 dark:text-blue-400/70 mt-1">{isAr ? 'مدفوع هذا العام' : 'Paid YTD'}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-50 to-violet-100/40 dark:from-violet-950/30 dark:to-violet-900/10 overflow-hidden relative col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full -translate-y-8 translate-x-8" />
          <CardContent className="p-5 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-violet-500/15 ring-1 ring-violet-500/20">
                <Bell className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-700 dark:text-violet-400">{isAr ? '30 يوم' : '30d'}</Badge>
            </div>
            <p className="text-2xl font-bold text-violet-800 dark:text-violet-300 tabular-nums">{alerts.length}</p>
            <p className="text-xs text-violet-700/70 dark:text-violet-400/70 mt-1">{isAr ? 'تنبيهات قادمة' : 'Upcoming alerts'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1 h-auto">
          <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background">
            <Wallet className="w-4 h-4" /> {isAr ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-2 data-[state=active]:bg-background">
            <Receipt className="w-4 h-4" /> {isAr ? 'السجلات' : 'Records'}
            <Badge variant="secondary" className="ms-1 h-5 px-1.5 text-[10px]">{records.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2 data-[state=active]:bg-background">
            <AlertTriangle className="w-4 h-4" /> {isAr ? 'التنبيهات' : 'Alerts'}
            {(alerts.length + overdueRecords.length) > 0 && (
              <Badge className="ms-1 h-5 px-1.5 text-[10px] bg-red-500 hover:bg-red-500">{alerts.length + overdueRecords.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stations" className="gap-2 data-[state=active]:bg-background">
            <Building2 className="w-4 h-4" /> {isAr ? 'حسب المحطة' : 'By Station'}
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent due */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  {isAr ? 'استحقاقات قادمة' : 'Upcoming Due Dates'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">{isAr ? 'لا توجد استحقاقات قريبة' : 'No upcoming due dates'}</p>
                ) : alerts.slice(0, 6).map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer" onClick={() => openEdit(a)}>
                    <div className={`p-2 rounded-lg ${a.days <= 7 ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                      <CalendarDays className={`w-4 h-4 ${a.days <= 7 ? 'text-red-600' : 'text-amber-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{stationName(a.station_id)}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(a.due_date)} • {fmtMoney(Number(a.amount))} {isAr ? 'ج.م' : 'EGP'}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs ${a.days <= 7 ? 'border-red-500/30 text-red-600' : 'border-amber-500/30 text-amber-600'}`}>
                      {a.days} {isAr ? 'يوم' : 'd'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top stations by total */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  {isAr ? 'أعلى المحطات (إجمالي)' : 'Top Stations (Total)'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {byStation.slice(0, 6).map((s, i) => {
                  const max = byStation[0]?.total || 1;
                  const pct = (s.total / max) * 100;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          {s.name}
                        </span>
                        <span className="tabular-nums font-semibold text-xs">{fmtMoney(s.total)}</span>
                      </div>
                      <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {byStation.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">{isAr ? 'لا توجد بيانات' : 'No data'}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* RECORDS */}
        <TabsContent value="records" className="space-y-4 mt-4">
          {/* Filters */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{isAr ? 'الفلاتر' : 'Filters'}</span>
                {activeFiltersCount > 0 && (
                  <>
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{activeFiltersCount}</Badge>
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs me-auto">
                      {isAr ? 'مسح الكل' : 'Clear all'}
                    </Button>
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <div className="relative lg:col-span-2">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder={isAr ? 'بحث...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="pr-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</SelectItem>
                    <SelectItem value="pending">{isAr ? 'معلق' : 'Pending'}</SelectItem>
                    <SelectItem value="paid">{isAr ? 'مدفوع' : 'Paid'}</SelectItem>
                    <SelectItem value="overdue">{isAr ? 'متأخر' : 'Overdue'}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={stationFilter} onValueChange={setStationFilter}>
                  <SelectTrigger><SelectValue placeholder={isAr ? 'المحطة' : 'Station'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isAr ? 'كل المحطات' : 'All Stations'}</SelectItem>
                    {stations.map(s => <SelectItem key={s.id} value={s.id}>{isAr ? s.name_ar : s.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger><SelectValue placeholder={isAr ? 'الفترة' : 'Period'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isAr ? 'كل الفترات' : 'All Periods'}</SelectItem>
                    <SelectItem value="annual">{isAr ? 'سنوي' : 'Annual'}</SelectItem>
                    <SelectItem value="quarterly">{isAr ? 'ربع سنوي' : 'Quarterly'}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger><SelectValue placeholder={isAr ? 'السنة' : 'Year'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{isAr ? 'كل السنوات' : 'All Years'}</SelectItem>
                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
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
                    <TableRow className="bg-muted/40 hover:bg-muted/40 border-b-2">
                      <TableHead className="text-right font-semibold cursor-pointer select-none" onClick={() => toggleSort('station')}>
                        <div className="flex items-center gap-1">{isAr ? 'المحطة' : 'Station'} <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                      </TableHead>
                      <TableHead className="text-right font-semibold">{isAr ? 'نوع العقار' : 'Type'}</TableHead>
                      <TableHead className="text-right font-semibold">{isAr ? 'العنوان' : 'Address'}</TableHead>
                      <TableHead className="text-right font-semibold cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                        <div className="flex items-center gap-1">{isAr ? 'المبلغ' : 'Amount'} <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                      </TableHead>
                      <TableHead className="text-right font-semibold">{isAr ? 'الفترة' : 'Period'}</TableHead>
                      <TableHead className="text-right font-semibold cursor-pointer select-none" onClick={() => toggleSort('due_date')}>
                        <div className="flex items-center gap-1">{isAr ? 'الاستحقاق' : 'Due'} <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                      </TableHead>
                      <TableHead className="text-right font-semibold">{isAr ? 'الدفع' : 'Paid'}</TableHead>
                      <TableHead className="text-right font-semibold">{isAr ? 'الإيصال' : 'Receipt'}</TableHead>
                      <TableHead className="text-right font-semibold cursor-pointer select-none" onClick={() => toggleSort('status')}>
                        <div className="flex items-center gap-1">{isAr ? 'الحالة' : 'Status'} <ArrowUpDown className="w-3 h-3 opacity-50" /></div>
                      </TableHead>
                      <TableHead className="text-right font-semibold w-[140px]">{isAr ? 'إجراءات' : 'Actions'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                          <span className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</span>
                        </div>
                      </TableCell></TableRow>
                    ) : pageRows.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-4 rounded-full bg-muted/50"><Receipt className="w-8 h-8 text-muted-foreground/50" /></div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{isAr ? 'لا توجد سجلات' : 'No records found'}</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">{isAr ? 'جرّب تعديل الفلاتر أو إضافة سجل جديد' : 'Try adjusting filters or add a new record'}</p>
                          </div>
                        </div>
                      </TableCell></TableRow>
                    ) : pageRows.map(r => (
                      <TableRow key={r.id} className="group hover:bg-muted/30">
                        <TableCell className="font-medium">{stationName(r.station_id)}</TableCell>
                        <TableCell className="text-muted-foreground">{r.property_type || '-'}</TableCell>
                        <TableCell className="max-w-[200px] whitespace-normal break-words text-muted-foreground text-xs">{r.address || '-'}</TableCell>
                        <TableCell className="font-semibold tabular-nums">{fmtMoney(Number(r.amount))}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs font-normal">{periodLabel(r.tax_period)}</Badge></TableCell>
                        <TableCell className="tabular-nums">{fmtDate(r.due_date)}</TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">{fmtDate(r.paid_date)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{r.receipt_number || '-'}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            {r.status !== 'paid' && (
                              <Tooltip><TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-emerald-500/10" onClick={() => openPayment(r)} aria-label={isAr ? 'تسجيل دفع' : 'Mark paid'}>
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                </Button>
                              </TooltipTrigger><TooltipContent>{isAr ? 'تسجيل دفع' : 'Mark Paid'}</TooltipContent></Tooltip>
                            )}
                            <Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onClick={() => openEdit(r)} aria-label={isAr ? 'تعديل السجل' : 'Edit record'}>
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger><TooltipContent>{isAr ? 'تعديل' : 'Edit'}</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteConfirm(r.id)} aria-label={isAr ? 'حذف السجل' : 'Delete record'}>
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </TooltipTrigger><TooltipContent>{isAr ? 'حذف' : 'Delete'}</TooltipContent></Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination */}
              {filtered.length > 0 && (
                <div className="flex items-center justify-between border-t p-3 bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    {isAr
                      ? `عرض ${(pageSafe - 1) * PAGE_SIZE + 1} - ${Math.min(pageSafe * PAGE_SIZE, filtered.length)} من ${filtered.length}`
                      : `Showing ${(pageSafe - 1) * PAGE_SIZE + 1} - ${Math.min(pageSafe * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={pageSafe === 1} onClick={() => setPage(p => p - 1)} className="h-8">
                      {isAr ? 'السابق' : 'Previous'}
                    </Button>
                    <span className="text-xs px-2">{pageSafe} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={pageSafe === totalPages} onClick={() => setPage(p => p + 1)} className="h-8">
                      {isAr ? 'التالي' : 'Next'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALERTS */}
        <TabsContent value="alerts" className="space-y-4 mt-4">
          {overdueRecords.length > 0 && (
            <Card className="border-red-500/20 bg-red-50/40 dark:bg-red-950/10 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
                  <XCircle className="w-4 h-4" />
                  {isAr ? `سجلات متأخرة (${overdueRecords.length})` : `Overdue Records (${overdueRecords.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overdueRecords.map(r => {
                  const days = Math.abs(differenceInDays(parseISO(r.due_date), new Date()));
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-white/5 border border-red-500/10 hover:border-red-500/30 transition-colors">
                      <div className="p-2 rounded-lg bg-red-500/15"><XCircle className="w-4 h-4 text-red-600" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{stationName(r.station_id)}</p>
                        <p className="text-xs text-muted-foreground">{r.property_type || '-'} • {fmtDate(r.due_date)}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm font-bold tabular-nums text-red-700 dark:text-red-400">{fmtMoney(Number(r.amount))}</p>
                        <p className="text-[10px] text-red-600/80">{isAr ? `متأخر ${days} يوم` : `${days} days late`}</p>
                      </div>
                      <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10" onClick={() => openPayment(r)}>
                        <CheckCircle className="w-3.5 h-3.5 me-1" /> {isAr ? 'دفع' : 'Pay'}
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Card className="border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/10 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                {isAr ? `استحقاقات خلال 30 يوم (${alerts.length})` : `Due Within 30 Days (${alerts.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{isAr ? 'لا توجد تنبيهات' : 'No alerts'}</p>
              ) : alerts.map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-white/5 border border-amber-500/10 hover:border-amber-500/30 transition-colors">
                  <div className="p-2 rounded-lg bg-amber-500/15"><CalendarDays className="w-4 h-4 text-amber-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{stationName(a.station_id)}</p>
                    <p className="text-xs text-muted-foreground">{a.property_type || '-'} • {fmtDate(a.due_date)}</p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400">{fmtMoney(Number(a.amount))}</p>
                    <p className="text-[10px] text-amber-600/80">{a.days} {isAr ? 'يوم متبقي' : 'days left'}</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10" onClick={() => openPayment(a)}>
                    <CheckCircle className="w-3.5 h-3.5 me-1" /> {isAr ? 'دفع' : 'Pay'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BY STATION */}
        <TabsContent value="stations" className="space-y-4 mt-4">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b-2">
                    <TableHead className="text-right font-semibold">{isAr ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead className="text-right font-semibold">{isAr ? 'عدد السجلات' : 'Records'}</TableHead>
                    <TableHead className="text-right font-semibold">{isAr ? 'مدفوع' : 'Paid'}</TableHead>
                    <TableHead className="text-right font-semibold">{isAr ? 'معلق' : 'Pending'}</TableHead>
                    <TableHead className="text-right font-semibold">{isAr ? 'متأخر' : 'Overdue'}</TableHead>
                    <TableHead className="text-right font-semibold">{isAr ? 'الإجمالي' : 'Total'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byStation.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">{isAr ? 'لا توجد بيانات' : 'No data'}</TableCell></TableRow>
                  ) : byStation.map((s, i) => (
                    <TableRow key={i} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><Badge variant="outline">{s.count}</Badge></TableCell>
                      <TableCell className="tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">{fmtMoney(s.paid)}</TableCell>
                      <TableCell className="tabular-nums text-amber-700 dark:text-amber-400 font-medium">{fmtMoney(s.pending)}</TableCell>
                      <TableCell className="tabular-nums text-red-700 dark:text-red-400 font-medium">{fmtMoney(s.overdue)}</TableCell>
                      <TableCell className="tabular-nums font-bold">{fmtMoney(s.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              {editingId ? (isAr ? 'تعديل سجل ضريبي' : 'Edit Tax Record') : (isAr ? 'إضافة سجل ضريبي جديد' : 'Add New Tax Record')}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isAr ? 'الحقول المميزة بـ * مطلوبة' : 'Fields marked with * are required'}
            </DialogDescription>
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
              <Label className="text-xs font-medium">{isAr ? 'نوع العقار' : 'Property Type'}</Label>
              <Select value={form.property_type} onValueChange={v => setForm(f => ({ ...f, property_type: v }))}>
                <SelectTrigger><SelectValue placeholder={isAr ? 'اختر النوع' : 'Select type'} /></SelectTrigger>
                <SelectContent>
                  {(isAr ? PROPERTY_TYPES_AR : PROPERTY_TYPES_EN).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'المبلغ' : 'Amount'} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="pe-12" />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'} <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'تاريخ الدفع' : 'Paid Date'}</Label>
              <Input type="date" value={form.paid_date} onChange={e => setForm(f => ({ ...f, paid_date: e.target.value, status: e.target.value ? 'paid' : f.status }))} />
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
              <Label className="text-xs font-medium">{isAr ? 'المساحة (م²)' : 'Area (sqm)'}</Label>
              <Input type="number" value={form.area_sqm} onChange={e => setForm(f => ({ ...f, area_sqm: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{isAr ? 'القيمة الإيجارية' : 'Rental Value'}</Label>
              <Input type="number" value={form.rental_value} onChange={e => setForm(f => ({ ...f, rental_value: e.target.value }))} />
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
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave} className="gap-2" disabled={saving} aria-busy={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {saving ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (editingId ? (isAr ? 'تحديث' : 'Update') : (isAr ? 'إضافة' : 'Add'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Payment Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={(o) => { if (!o && !saving) setPaymentDialog(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5" /> {isAr ? 'تسجيل دفع' : 'Record Payment'}
            </DialogTitle>
            <DialogDescription>
              {paymentDialog && `${stationName(paymentDialog.station_id)} • ${fmtMoney(Number(paymentDialog.amount))} ${isAr ? 'ج.م' : 'EGP'} • ${fmtDate(paymentDialog.due_date)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? 'تاريخ الدفع' : 'Payment Date'} <span className="text-destructive">*</span></Label>
              <Input type="date" value={paymentForm.paid_date} onChange={e => setPaymentForm(f => ({ ...f, paid_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{isAr ? 'رقم الإيصال' : 'Receipt Number'}</Label>
              <Input value={paymentForm.receipt_number} onChange={e => setPaymentForm(f => ({ ...f, receipt_number: e.target.value }))} placeholder={isAr ? 'اختياري' : 'Optional'} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPaymentDialog(null)} disabled={saving}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleMarkPaid} className="gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={saving} aria-busy={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {saving ? (isAr ? 'جارٍ التسجيل...' : 'Recording...') : (isAr ? 'تأكيد الدفع' : 'Confirm Payment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o && !deleting) setDeleteConfirm(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" /> {isAr ? 'تأكيد الحذف' : 'Confirm Delete'}
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this record? This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          {deleteConfirm && (() => {
            const r = records.find(x => x.id === deleteConfirm);
            if (!r) return null;
            return (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? 'المحطة:' : 'Station:'}</span><span className="font-medium">{stationName(r.station_id)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? 'المبلغ:' : 'Amount:'}</span><span className="font-semibold tabular-nums">{fmtMoney(Number(r.amount))} {isAr ? 'ج.م' : 'EGP'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">{isAr ? 'الاستحقاق:' : 'Due:'}</span><span className="tabular-nums">{fmtDate(r.due_date)}</span></div>
                <div className="flex justify-between items-center"><span className="text-muted-foreground">{isAr ? 'الحالة:' : 'Status:'}</span>{statusBadge(r.status)}</div>
              </div>
            );
          })()}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} disabled={deleting}>{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} disabled={deleting} aria-busy={deleting} className="gap-2">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? (isAr ? 'جارٍ الحذف...' : 'Deleting...') : (isAr ? 'حذف' : 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
};
