import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar as CalendarIcon, Pencil, Trash2, Loader2 } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface Station {
  id: string;
  name_ar: string;
  name_en: string;
}

interface OfficialHoliday {
  id: string;
  name_ar: string;
  name_en: string;
  holiday_date: string;
  station_ids: string[];
  notes: string | null;
  created_at: string;
}

export const OfficialHolidays = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';

  const [holidays, setHolidays] = useState<OfficialHoliday[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OfficialHoliday | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    holiday_date: '',
    station_ids: [] as string[],
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    const [hRes, sRes] = await Promise.all([
      supabase.from('official_holidays').select('*').order('holiday_date', { ascending: false }),
      supabase.from('stations').select('id, name_ar, name_en').order('name_en'),
    ]);
    if (hRes.error) toast.error(ar ? 'فشل تحميل الإجازات' : 'Failed to load holidays');
    else setHolidays((hRes.data || []) as OfficialHoliday[]);
    if (sRes.data) setStations(sRes.data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name_ar: '', name_en: '', holiday_date: '', station_ids: [], notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (h: OfficialHoliday) => {
    setEditing(h);
    setForm({
      name_ar: h.name_ar,
      name_en: h.name_en,
      holiday_date: h.holiday_date,
      station_ids: h.station_ids || [],
      notes: h.notes || '',
    });
    setDialogOpen(true);
  };

  const toggleStation = (id: string) => {
    setForm(f => ({
      ...f,
      station_ids: f.station_ids.includes(id) ? f.station_ids.filter(s => s !== id) : [...f.station_ids, id],
    }));
  };

  const toggleAllStations = () => {
    setForm(f => ({
      ...f,
      station_ids: f.station_ids.length === stations.length ? [] : stations.map(s => s.id),
    }));
  };

  const save = async () => {
    if (!form.name_ar.trim() || !form.name_en.trim() || !form.holiday_date) {
      toast.error(ar ? 'يرجى تعبئة جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }
    if (form.station_ids.length === 0) {
      toast.error(ar ? 'يرجى اختيار محطة واحدة على الأقل' : 'Please select at least one station');
      return;
    }
    setSaving(true);
    const payload = {
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      holiday_date: form.holiday_date,
      station_ids: form.station_ids,
      notes: form.notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from('official_holidays').update(payload).eq('id', editing.id)
      : await supabase.from('official_holidays').insert(payload);
    setSaving(false);
    if (error) {
      toast.error(ar ? 'فشل الحفظ' : 'Save failed');
      return;
    }
    toast.success(ar ? 'تم الحفظ' : 'Saved');
    setDialogOpen(false);
    loadData();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('official_holidays').delete().eq('id', id);
    if (error) {
      toast.error(ar ? 'فشل الحذف' : 'Delete failed');
      return;
    }
    toast.success(ar ? 'تم الحذف' : 'Deleted');
    setDeleteId(null);
    loadData();
  };

  const stationLabel = (id: string) => {
    const s = stations.find(x => x.id === id);
    return s ? (ar ? s.name_ar : s.name_en) : id;
  };

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className={cn("flex flex-row items-center justify-between", isRTL && "flex-row-reverse")}>
        <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <CalendarIcon className="w-5 h-5" />
          {ar ? 'الإجازات الرسمية' : 'Official Holidays'}
        </CardTitle>
        <Button onClick={openNew} className={cn("gap-2", isRTL && "flex-row-reverse")}>
          <Plus className="w-4 h-4" />
          {ar ? 'إضافة إجازة رسمية' : 'Add Holiday'}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الاسم' : 'Name'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المحطات' : 'Stations'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{ar ? 'ملاحظات' : 'Notes'}</TableHead>
                  <TableHead className={cn("w-[120px]", isRTL && "text-right")}>{ar ? 'إجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {ar ? 'لا توجد إجازات رسمية' : 'No official holidays'}
                    </TableCell>
                  </TableRow>
                ) : (
                  holidays.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="font-medium">{ar ? h.name_ar : h.name_en}</TableCell>
                      <TableCell>{formatDate(h.holiday_date)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {h.station_ids.length === stations.length ? (
                            <Badge variant="secondary">{ar ? 'جميع المحطات' : 'All Stations'}</Badge>
                          ) : (
                            h.station_ids.map(id => (
                              <Badge key={id} variant="outline" className="text-xs">{stationLabel(id)}</Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{h.notes || '-'}</TableCell>
                      <TableCell>
                        <div className={cn("flex gap-1", isRTL && "flex-row-reverse")}>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(h)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(h.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>
              {editing ? (ar ? 'تعديل إجازة رسمية' : 'Edit Holiday') : (ar ? 'إضافة إجازة رسمية' : 'Add Holiday')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{ar ? 'الاسم (عربي)' : 'Name (Arabic)'} *</Label>
                <Input dir="rtl" value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} placeholder="عيد الفطر" />
              </div>
              <div>
                <Label>{ar ? 'الاسم (إنجليزي)' : 'Name (English)'} *</Label>
                <Input dir="ltr" value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} placeholder="Eid Al-Fitr" />
              </div>
            </div>
            <div>
              <Label>{ar ? 'التاريخ' : 'Date'} *</Label>
              <Input type="date" value={form.holiday_date} onChange={e => setForm({ ...form, holiday_date: e.target.value })} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{ar ? 'المحطات' : 'Stations'} *</Label>
                <Button type="button" variant="link" size="sm" onClick={toggleAllStations}>
                  {form.station_ids.length === stations.length ? (ar ? 'إلغاء الكل' : 'Clear all') : (ar ? 'تحديد الكل' : 'Select all')}
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border rounded-lg max-h-64 overflow-y-auto">
                {stations.map(s => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded">
                    <Checkbox checked={form.station_ids.includes(s.id)} onCheckedChange={() => toggleStation(s.id)} />
                    <span className="text-sm">{ar ? s.name_ar : s.name_en}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>{ar ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {ar ? 'حفظ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>{ar ? 'تأكيد الحذف' : 'Confirm Deletion'}</AlertDialogTitle>
            <AlertDialogDescription>
              {ar ? 'هل أنت متأكد من حذف هذه الإجازة الرسمية؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this official holiday? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ar ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove(deleteId)} className="bg-destructive hover:bg-destructive/90">
              {ar ? 'حذف' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
