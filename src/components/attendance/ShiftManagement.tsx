import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Plus, Edit2, Trash2, Calendar, Moon, Sun, Sunset, Building2, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DbShift {
  id: string;
  name_en: string;
  name_ar: string;
  code: string;
  start_time: string;
  end_time: string;
  is_overnight: boolean;
  break_duration: number;
  work_duration: number;
  color: string;
  station_id: string | null;
  display_order: number;
  is_active: boolean;
}

interface StationOpt { id: string; name_ar: string; name_en: string; }

const calculateWorkDuration = (start: string, end: string, overnight: boolean): number => {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let s = sh * 60 + sm;
  let e = eh * 60 + em;
  if (overnight && e < s) e += 1440;
  return Math.max(0, (e - s) / 60);
};

const trimSeconds = (t: string) => (t || '').slice(0, 5);

export const ShiftManagement = () => {
  const { t, isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const [shifts, setShifts] = useState<DbShift[]>([]);
  const [stations, setStations] = useState<StationOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    name_en: '', name_ar: '', code: '',
    start_time: '08:00', end_time: '16:00',
    break_duration: 30, color: '#22c55e',
    station_id: '', is_overnight: false,
  };
  const [form, setForm] = useState({ ...emptyForm });

  const fetchAll = useCallback(async (showToast = false) => {
    if (showToast) setRefreshing(true);
    const [sRes, stRes] = await Promise.all([
      supabase.from('shifts').select('*').eq('is_active', true).order('display_order').order('start_time'),
      supabase.from('stations').select('id, name_ar, name_en').eq('is_active', true).order('name_ar'),
    ]);
    if (sRes.data) setShifts(sRes.data.map((r: any) => ({ ...r, start_time: trimSeconds(r.start_time), end_time: trimSeconds(r.end_time) })));
    if (stRes.data) setStations(stRes.data as StationOpt[]);
    setLoading(false);
    if (showToast) {
      setRefreshing(false);
      toast({ title: ar ? 'تم تحديث البيانات' : 'Data refreshed' });
    }
  }, [ar]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const resetForm = () => { setForm({ ...emptyForm }); setEditingId(null); };

  const openAdd = () => { resetForm(); setIsDialogOpen(true); };
  const openEdit = (s: DbShift) => {
    setForm({
      name_en: s.name_en, name_ar: s.name_ar, code: s.code,
      start_time: s.start_time, end_time: s.end_time,
      break_duration: s.break_duration, color: s.color,
      station_id: s.station_id || '', is_overnight: s.is_overnight,
    });
    setEditingId(s.id);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name_en || !form.start_time || !form.end_time || !form.station_id) {
      toast({ title: ar ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const work_duration = calculateWorkDuration(form.start_time, form.end_time, form.is_overnight);
    const payload = {
      name_en: form.name_en,
      name_ar: form.name_ar || form.name_en,
      code: form.code || form.name_en.toUpperCase().replace(/\s+/g, '_'),
      start_time: form.start_time,
      end_time: form.end_time,
      is_overnight: form.is_overnight,
      break_duration: form.break_duration,
      work_duration,
      color: form.color,
      station_id: form.station_id,
    };
    const { error } = editingId
      ? await supabase.from('shifts').update(payload).eq('id', editingId)
      : await supabase.from('shifts').insert({ ...payload, display_order: shifts.length + 1 });
    setSaving(false);
    if (error) {
      toast({ title: ar ? 'خطأ في الحفظ' : 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editingId ? (ar ? 'تم تحديث الوردية' : 'Shift updated') : (ar ? 'تمت إضافة الوردية' : 'Shift added') });
    resetForm();
    setIsDialogOpen(false);
    fetchAll();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('shifts').delete().eq('id', deleteId);
    if (error) {
      toast({ title: ar ? 'تعذر الحذف' : 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: ar ? 'تم حذف الوردية' : 'Shift deleted' });
      fetchAll();
    }
    setDeleteId(null);
  };

  const getShiftIcon = (code: string) => {
    const c = (code || '').toUpperCase();
    if (c.includes('MORNING') || c.includes('صباح')) return <Sun className="w-4 h-4" />;
    if (c.includes('AFTERNOON') || c.includes('مسائ')) return <Sunset className="w-4 h-4" />;
    if (c.includes('NIGHT') || c.includes('ليل')) return <Moon className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getStationLabel = (id: string | null) => {
    if (!id) return '-';
    const s = stations.find(x => x.id === id);
    if (!s) return '-';
    return ar ? s.name_ar : s.name_en;
  };

  const filtered = selectedStation === 'all' ? shifts : shifts.filter(s => s.station_id === selectedStation);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold">{t('attendance.shifts.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('attendance.shifts.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchAll(true)} disabled={refreshing}
            aria-label={ar ? 'تحديث' : 'Refresh'} title={ar ? 'تحديث' : 'Refresh'}>
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </Button>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('attendance.shifts.addShift')}
          </Button>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(o) => { setIsDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>
              {editingId ? (ar ? 'تعديل الوردية' : 'Edit Shift') : t('attendance.shifts.addShift')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('attendance.shifts.nameEn')}</Label>
                <Input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} placeholder="Morning Shift" dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{t('attendance.shifts.nameAr')}</Label>
                <Input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} placeholder="وردية صباحية" dir="rtl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('attendance.shifts.startTime')}</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{t('attendance.shifts.endTime')}</Label>
                <Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} dir="ltr" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{ar ? 'المحطة' : 'Station'}</Label>
              <Select value={form.station_id} onValueChange={(v) => setForm({ ...form, station_id: v })}>
                <SelectTrigger><SelectValue placeholder={ar ? 'اختر المحطة' : 'Select Station'} /></SelectTrigger>
                <SelectContent>
                  {stations.map(s => <SelectItem key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('attendance.shifts.breakDuration')}</Label>
                <Input type="number" value={form.break_duration} onChange={e => setForm({ ...form, break_duration: Number(e.target.value) })} min={0} max={120} dir="ltr" />
              </div>
              <div className="space-y-2">
                <Label>{t('attendance.shifts.color')}</Label>
                <Input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="h-10 p-1" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="overnight">{t('attendance.shifts.overnight')}</Label>
              <Switch id="overnight" checked={form.is_overnight} onCheckedChange={(v) => setForm({ ...form, is_overnight: v })} />
            </div>

            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? (ar ? 'حفظ التعديلات' : 'Save Changes') : t('attendance.shifts.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? 'تأكيد الحذف' : 'Confirm Delete'}</AlertDialogTitle>
            <AlertDialogDescription>
              {ar ? 'هل تريد حذف هذه الوردية؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this shift? This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ar ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {ar ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Station Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <Label>{ar ? 'تصفية حسب المحطة' : 'Filter by Station'}</Label>
        <Select value={selectedStation} onValueChange={setSelectedStation}>
          <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
            {stations.map(s => <SelectItem key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="secondary">{filtered.length} {ar ? 'وردية' : 'shifts'}</Badge>
      </div>

      {/* Shifts Grid */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{ar ? 'لا توجد ورديات. اضغط "إضافة وردية" للبدء.' : 'No shifts yet. Click "Add Shift" to start.'}</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((shift) => (
            <Card key={shift.id} className="relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: shift.color }} />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${shift.color}20` }}>
                      {getShiftIcon(shift.code)}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">{ar ? shift.name_ar : shift.name_en}</CardTitle>
                      <p className="text-xs text-muted-foreground truncate">{shift.code}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(shift)}
                      aria-label={ar ? 'تعديل' : 'Edit'}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(shift.id)}
                      aria-label={ar ? 'حذف' : 'Delete'}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('attendance.shifts.time')}</span>
                  <span className="font-medium" dir="ltr">{shift.start_time} - {shift.end_time}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('attendance.shifts.duration')}</span>
                  <span className="font-medium" dir="ltr">{shift.work_duration}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('attendance.shifts.break')}</span>
                  <span className="font-medium" dir="ltr">{shift.break_duration} min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{ar ? 'المحطة' : 'Station'}</span>
                  <Badge variant="outline" className="gap-1">
                    <Building2 className="w-3 h-3" />
                    {getStationLabel(shift.station_id)}
                  </Badge>
                </div>
                {shift.is_overnight && (
                  <Badge variant="secondary" className="gap-1">
                    <Moon className="w-3 h-3" />{t('attendance.shifts.overnightShift')}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Table */}
      {filtered.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('attendance.shifts.scheduleOverview')}
            </CardTitle>
            <CardDescription>{t('attendance.shifts.scheduleDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn(isRTL && 'text-right')}>{t('attendance.shifts.shift')}</TableHead>
                    <TableHead className={cn(isRTL && 'text-right')}>{ar ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead className={cn(isRTL && 'text-right')}>{t('attendance.shifts.time')}</TableHead>
                    <TableHead className={cn(isRTL && 'text-right')}>{t('attendance.shifts.duration')}</TableHead>
                    <TableHead className={cn(isRTL && 'text-right')}>{t('attendance.shifts.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: shift.color }} />
                          <span>{ar ? shift.name_ar : shift.name_en}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStationLabel(shift.station_id)}</TableCell>
                      <TableCell dir="ltr">{shift.start_time} - {shift.end_time}</TableCell>
                      <TableCell dir="ltr">{shift.work_duration}h</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-100 text-green-700 border-green-300">
                          {ar ? 'نشط' : 'Active'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
