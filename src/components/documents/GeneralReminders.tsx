import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePersistedState } from '@/hooks/usePersistedState';
import { cn, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Bell, Plus, Edit, Trash2, CheckCircle2, BellRing } from 'lucide-react';
import { toast } from 'sonner';

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  completed: boolean;
  notified?: boolean;
  createdAt: string;
}

type FilterKey = 'all' | 'upcoming' | 'today' | 'overdue' | 'completed';
type SortKey = 'nearest' | 'furthest' | 'alpha';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const daysUntil = (dateStr: string): number => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, (m || 1) - 1, d || 1);
  const now = new Date();
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - t0.getTime()) / 86400000);
};

export const GeneralReminders = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [reminders, setReminders] = usePersistedState<Reminder[]>('hr_general_reminders', []);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('nearest');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', date: todayStr(), time: '' });

  // Request browser notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Trigger notifications for due reminders (once per reminder)
  useEffect(() => {
    const due = reminders.filter(r => !r.completed && !r.notified && daysUntil(r.date) <= 0);
    if (due.length === 0) return;
    due.forEach(r => {
      const title = ar ? `تذكير: ${r.title}` : `Reminder: ${r.title}`;
      const body = r.description || (ar ? 'حان موعد التذكير' : 'Reminder due');
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification(title, { body }); } catch {}
      }
      toast(title, { description: body, icon: '🔔' });
    });
    setReminders(prev => prev.map(r => due.find(d => d.id === r.id) ? { ...r, notified: true } : r));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeCount = reminders.filter(r => !r.completed).length;

  const filtered = useMemo(() => {
    let list = [...reminders];
    if (filter === 'upcoming') list = list.filter(r => !r.completed && daysUntil(r.date) > 0);
    else if (filter === 'today') list = list.filter(r => !r.completed && daysUntil(r.date) === 0);
    else if (filter === 'overdue') list = list.filter(r => !r.completed && daysUntil(r.date) < 0);
    else if (filter === 'completed') list = list.filter(r => r.completed);

    if (sort === 'nearest') list.sort((a, b) => a.date.localeCompare(b.date));
    else if (sort === 'furthest') list.sort((a, b) => b.date.localeCompare(a.date));
    else list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [reminders, filter, sort]);

  const openAdd = () => { setEditing(null); setForm({ title: '', description: '', date: todayStr(), time: '' }); setDialogOpen(true); };
  const openEdit = (r: Reminder) => { setEditing(r); setForm({ title: r.title, description: r.description || '', date: r.date, time: r.time || '' }); setDialogOpen(true); };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error(ar ? 'أدخل عنوان التذكير' : 'Enter reminder title'); return; }
    if (!form.date) { toast.error(ar ? 'اختر التاريخ' : 'Pick a date'); return; }
    if (editing) {
      setReminders(prev => prev.map(r => r.id === editing.id ? { ...r, title: form.title, description: form.description, date: form.date, time: form.time, notified: false } : r));
      toast.success(ar ? 'تم التحديث' : 'Updated');
    } else {
      const newR: Reminder = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: form.title, description: form.description, date: form.date, time: form.time,
        completed: false, notified: false, createdAt: new Date().toISOString(),
      };
      setReminders(prev => [newR, ...prev]);
      toast.success(ar ? 'تمت الإضافة' : 'Added');
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    setDeleteId(null);
    toast.success(ar ? 'تم الحذف' : 'Deleted');
  };

  const handleComplete = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  const daysLabel = (dateStr: string) => {
    const n = daysUntil(dateStr);
    if (n === 0) return ar ? 'اليوم' : 'Today';
    if (n === 1) return ar ? 'غداً' : 'Tomorrow';
    if (n > 1) return ar ? `متبقي ${n} يوم` : `${n} days left`;
    return ar ? `متأخر ${Math.abs(n)} يوم` : `Overdue by ${Math.abs(n)} days`;
  };

  const rowColor = (r: Reminder) => {
    if (r.completed) return 'bg-muted/40';
    const n = daysUntil(r.date);
    if (n <= 0) return 'bg-red-500/10 border-l-4 border-red-500';
    if (n <= 7) return 'bg-amber-500/10 border-l-4 border-amber-500';
    return 'bg-emerald-500/5 border-l-4 border-emerald-500';
  };

  const statusBadge = (r: Reminder) => {
    if (r.completed) return <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3" />{ar ? 'مكتمل' : 'Completed'}</Badge>;
    const n = daysUntil(r.date);
    if (n < 0) return <Badge variant="destructive">{ar ? 'متأخر' : 'Overdue'}</Badge>;
    if (n === 0) return <Badge className="bg-red-500 text-white hover:bg-red-600">{ar ? 'اليوم' : 'Today'}</Badge>;
    if (n <= 7) return <Badge className="bg-amber-500 text-white hover:bg-amber-600">{ar ? 'قريب' : 'Soon'}</Badge>;
    return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">{ar ? 'قادم' : 'Upcoming'}</Badge>;
  };

  const filterButtons: { key: FilterKey; ar: string; en: string }[] = [
    { key: 'all', ar: 'الكل', en: 'All' },
    { key: 'upcoming', ar: 'قادمة', en: 'Upcoming' },
    { key: 'today', ar: 'اليوم', en: 'Today' },
    { key: 'overdue', ar: 'متأخرة', en: 'Overdue' },
    { key: 'completed', ar: 'مكتملة', en: 'Completed' },
  ];

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className={cn("flex items-center justify-between flex-wrap gap-3", isRTL && "flex-row-reverse")}>
        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
          <div className="p-2.5 rounded-xl bg-primary/10">
            <BellRing className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              {ar ? 'التنبيهات العامة' : 'General Reminders'}
              {activeCount > 0 && <Badge variant="destructive" className="h-5">{activeCount}</Badge>}
            </h2>
            <p className="text-xs text-muted-foreground">{ar ? 'أضف تذكيرات لأي مهمة أو موعد مهم' : 'Add reminders for any task or important date'}</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" />
          {ar ? 'إضافة تذكير' : 'Add Reminder'}
        </Button>
      </div>

      {/* Filters + Sort */}
      <div className={cn("flex flex-wrap items-center gap-2", isRTL && "flex-row-reverse")}>
        {filterButtons.map(b => (
          <Button key={b.key} size="sm" variant={filter === b.key ? 'default' : 'outline'} onClick={() => setFilter(b.key)}>
            {ar ? b.ar : b.en}
          </Button>
        ))}
        <div className="flex-1" />
        <Select value={sort} onValueChange={(v: SortKey) => setSort(v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nearest">{ar ? 'الأقرب أولاً' : 'Nearest first'}</SelectItem>
            <SelectItem value="furthest">{ar ? 'الأبعد أولاً' : 'Furthest first'}</SelectItem>
            <SelectItem value="alpha">{ar ? 'أبجدياً' : 'Alphabetically'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-muted">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {reminders.length === 0
                  ? (ar ? 'لا توجد تذكيرات بعد. اضغط "إضافة تذكير" لإنشاء أول تذكير.' : 'No reminders yet. Click Add Reminder to create your first reminder.')
                  : (ar ? 'لا توجد تذكيرات في هذه الفئة' : 'No reminders in this category')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ar ? 'العنوان' : 'Title'}</TableHead>
                  <TableHead>{ar ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{ar ? 'الوقت' : 'Time'}</TableHead>
                  <TableHead>{ar ? 'المتبقي' : 'Days Remaining'}</TableHead>
                  <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="text-end">{ar ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} className={cn(rowColor(r), r.completed && 'opacity-60')}>
                    <TableCell>
                      <div className={cn('font-medium', r.completed && 'line-through')}>{r.title}</div>
                      {r.description && <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">{r.description}</div>}
                    </TableCell>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell>{r.time || '-'}</TableCell>
                    <TableCell className="font-medium">{daysLabel(r.date)}</TableCell>
                    <TableCell>{statusBadge(r)}</TableCell>
                    <TableCell>
                      <div className={cn("flex gap-1 justify-end", isRTL && "flex-row-reverse justify-start")}>
                        <Button size="icon" variant="ghost" title={ar ? 'مكتمل' : 'Complete'} onClick={() => handleComplete(r.id)}>
                          <CheckCircle2 className={cn('w-4 h-4', r.completed && 'text-emerald-600')} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(r.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>{editing ? (ar ? 'تعديل تذكير' : 'Edit Reminder') : (ar ? 'إضافة تذكير جديد' : 'Add New Reminder')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{ar ? 'العنوان' : 'Title'} *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{ar ? 'الوصف / ملاحظات' : 'Description / Notes'}</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{ar ? 'تاريخ التذكير' : 'Reminder Date'} *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{ar ? 'الوقت (اختياري)' : 'Time (optional)'}</Label>
                <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button onClick={handleSave}>{editing ? (ar ? 'حفظ' : 'Save') : (ar ? 'إضافة' : 'Add')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle>{ar ? 'تأكيد الحذف' : 'Confirm Delete'}</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">{ar ? 'هل أنت متأكد من حذف هذا التذكير؟' : 'Are you sure you want to delete this reminder?'}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>{ar ? 'إلغاء' : 'Cancel'}</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>{ar ? 'حذف' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
