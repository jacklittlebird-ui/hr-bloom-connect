import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Clock, Plus, Edit2, Trash2, Calendar, Moon, Sun, Sunset, Building2, RefreshCw, Loader2, GripVertical, EyeOff, Eye, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// Convert HH:MM to minutes; supports overnight by extending end
const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Build [start, end] in minutes for a shift (overnight extends past 1440)
const shiftRange = (s: { start_time: string; end_time: string; is_overnight: boolean }) => {
  const start = toMinutes(s.start_time);
  let end = toMinutes(s.end_time);
  if (s.is_overnight && end <= start) end += 1440;
  if (!s.is_overnight && end < start) end += 1440;
  return [start, end] as const;
};

const rangesOverlap = (a: readonly [number, number], b: readonly [number, number]) => {
  // Check overlap allowing wrap by comparing two cycles
  const [a1, a2] = a; const [b1, b2] = b;
  return a1 < b2 && b1 < a2;
};

export const ShiftManagement = () => {
  const { t, isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const [shifts, setShifts] = useState<DbShift[]>([]);
  const [stations, setStations] = useState<StationOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStation, setSelectedStation] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);

  const emptyForm = {
    name_en: '', name_ar: '', code: '',
    start_time: '08:00', end_time: '16:00',
    break_duration: 30, color: '#22c55e',
    station_id: '', is_overnight: false,
  };
  const [form, setForm] = useState({ ...emptyForm });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchAll = useCallback(async (showToast = false) => {
    if (showToast) setRefreshing(true);
    const [sRes, stRes] = await Promise.all([
      supabase.from('shifts').select('*').order('display_order').order('start_time'),
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

  // Realtime subscription so other tabs/components stay in sync
  useEffect(() => {
    const ch = supabase
      .channel('shifts-management')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
        fetchAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  const resetForm = () => { setForm({ ...emptyForm }); setEditingId(null); setOverlapWarning(null); };

  const openAdd = () => { resetForm(); setIsDialogOpen(true); };
  const openEdit = (s: DbShift) => {
    setForm({
      name_en: s.name_en, name_ar: s.name_ar, code: s.code,
      start_time: s.start_time, end_time: s.end_time,
      break_duration: s.break_duration, color: s.color,
      station_id: s.station_id || '', is_overnight: s.is_overnight,
    });
    setEditingId(s.id);
    setOverlapWarning(null);
    setIsDialogOpen(true);
  };

  // Detect overlap with other ACTIVE shifts on the same station
  const detectOverlap = useMemo(() => {
    if (!form.station_id || !form.start_time || !form.end_time) return null;
    const newRange = shiftRange({ start_time: form.start_time, end_time: form.end_time, is_overnight: form.is_overnight });
    const conflicts = shifts.filter(s =>
      s.is_active &&
      s.station_id === form.station_id &&
      s.id !== editingId &&
      rangesOverlap(newRange, shiftRange(s))
    );
    if (conflicts.length === 0) return null;
    const names = conflicts.map(c => `${ar ? c.name_ar : c.name_en} (${c.start_time}-${c.end_time})`).join('، ');
    return ar
      ? `تتداخل مع الورديات النشطة التالية في نفس المحطة: ${names}`
      : `Overlaps with active shifts in the same station: ${names}`;
  }, [form, shifts, editingId, ar]);

  useEffect(() => { setOverlapWarning(detectOverlap); }, [detectOverlap]);

  const handleSave = async (forceOverlap = false) => {
    if (!form.name_en || !form.start_time || !form.end_time || !form.station_id) {
      toast({ title: ar ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields', variant: 'destructive' });
      return;
    }
    if (overlapWarning && !forceOverlap) {
      toast({
        title: ar ? 'تداخل في الورديات' : 'Shift overlap detected',
        description: overlapWarning,
        variant: 'destructive',
      });
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

  const toggleActive = async (s: DbShift) => {
    const { error } = await supabase.from('shifts').update({ is_active: !s.is_active }).eq('id', s.id);
    if (error) {
      toast({ title: ar ? 'تعذر التحديث' : 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: s.is_active
          ? (ar ? 'تم تعطيل الوردية' : 'Shift deactivated')
          : (ar ? 'تم تفعيل الوردية' : 'Shift activated'),
      });
      fetchAll();
    }
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

  const filtered = useMemo(() => {
    let list = shifts;
    if (!showInactive) list = list.filter(s => s.is_active);
    if (selectedStation !== 'all') list = list.filter(s => s.station_id === selectedStation);
    return list;
  }, [shifts, showInactive, selectedStation]);

  // Drag end → persist new display_order
  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = filtered.findIndex(s => s.id === active.id);
    const newIdx = filtered.findIndex(s => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reorderedFiltered = arrayMove(filtered, oldIdx, newIdx);

    // Build full ordering: replace filtered items in original order with reordered version
    const filteredIds = new Set(filtered.map(s => s.id));
    const filteredQueue = [...reorderedFiltered];
    const newFullOrder: DbShift[] = shifts.map(s => {
      if (filteredIds.has(s.id)) return filteredQueue.shift()!;
      return s;
    });

    setShifts(newFullOrder); // optimistic

    const updates = newFullOrder.map((s, i) =>
      supabase.from('shifts').update({ display_order: i + 1 }).eq('id', s.id)
    );
    const results = await Promise.all(updates);
    const failed = results.find(r => r.error);
    if (failed?.error) {
      toast({ title: ar ? 'تعذر حفظ الترتيب' : 'Failed to save order', description: failed.error.message, variant: 'destructive' });
      fetchAll();
    } else {
      toast({ title: ar ? 'تم تحديث الترتيب' : 'Order updated' });
    }
  };

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

            {overlapWarning && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/40 bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{overlapWarning}</span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button onClick={() => handleSave(false)} className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? (ar ? 'حفظ التعديلات' : 'Save Changes') : t('attendance.shifts.save')}
              </Button>
              {overlapWarning && (
                <Button onClick={() => handleSave(true)} variant="outline" className="w-full" disabled={saving}>
                  {ar ? 'حفظ رغم التداخل' : 'Save anyway'}
                </Button>
              )}
            </div>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Label>{ar ? 'تصفية حسب المحطة' : 'Filter by Station'}</Label>
        <Select value={selectedStation} onValueChange={setSelectedStation}>
          <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
            {stations.map(s => <SelectItem key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border">
          <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
          <Label htmlFor="show-inactive" className="cursor-pointer text-sm">
            {ar ? 'إظهار غير النشطة' : 'Show inactive'}
          </Label>
        </div>
        <Badge variant="secondary">{filtered.length} {ar ? 'وردية' : 'shifts'}</Badge>
        <span className="text-xs text-muted-foreground">
          {ar ? '↕ اسحب البطاقات لإعادة الترتيب' : '↕ Drag cards to reorder'}
        </span>
      </div>

      {/* Shifts Grid (sortable) */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{ar ? 'لا توجد ورديات. اضغط "إضافة وردية" للبدء.' : 'No shifts yet. Click "Add Shift" to start.'}</p>
        </CardContent></Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filtered.map(f => f.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((shift) => (
                <SortableShiftCard
                  key={shift.id}
                  shift={shift}
                  ar={ar}
                  t={t}
                  getShiftIcon={getShiftIcon}
                  getStationLabel={getStationLabel}
                  onEdit={() => openEdit(shift)}
                  onDelete={() => setDeleteId(shift.id)}
                  onToggle={() => toggleActive(shift)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
                    <TableRow key={shift.id} className={cn(!shift.is_active && 'opacity-60')}>
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
                        {shift.is_active ? (
                          <Badge variant="default" className="bg-green-100 text-green-700 border-green-300">
                            {ar ? 'نشط' : 'Active'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            {ar ? 'غير نشط' : 'Inactive'}
                          </Badge>
                        )}
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

interface SortableShiftCardProps {
  shift: DbShift;
  ar: boolean;
  t: (k: string) => string;
  getShiftIcon: (code: string) => JSX.Element;
  getStationLabel: (id: string | null) => string;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

const SortableShiftCard = ({ shift, ar, t, getShiftIcon, getStationLabel, onEdit, onDelete, onToggle }: SortableShiftCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: shift.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto' as const,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className={cn('relative overflow-hidden', !shift.is_active && 'opacity-70 border-dashed')}>
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: shift.color }} />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              {...attributes}
              {...listeners}
              className="p-1 rounded hover:bg-accent cursor-grab active:cursor-grabbing touch-none shrink-0"
              aria-label={ar ? 'سحب لإعادة الترتيب' : 'Drag to reorder'}
              title={ar ? 'اسحب لإعادة الترتيب' : 'Drag to reorder'}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${shift.color}20` }}>
              {getShiftIcon(shift.code)}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg truncate">{ar ? shift.name_ar : shift.name_en}</CardTitle>
              <p className="text-xs text-muted-foreground truncate">{shift.code}</p>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost" size="icon" className="h-8 w-8"
              onClick={onToggle}
              aria-label={shift.is_active ? (ar ? 'تعطيل' : 'Deactivate') : (ar ? 'تفعيل' : 'Activate')}
              title={shift.is_active ? (ar ? 'تعطيل' : 'Deactivate') : (ar ? 'تفعيل' : 'Activate')}
            >
              {shift.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-green-600" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}
              aria-label={ar ? 'تعديل' : 'Edit'}><Edit2 className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}
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
        <div className="flex justify-between items-center gap-2 flex-wrap">
          {shift.is_overnight && (
            <Badge variant="secondary" className="gap-1">
              <Moon className="w-3 h-3" />{t('attendance.shifts.overnightShift')}
            </Badge>
          )}
          {!shift.is_active && (
            <Badge variant="outline" className="bg-muted text-muted-foreground">
              {ar ? 'غير نشط' : 'Inactive'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
