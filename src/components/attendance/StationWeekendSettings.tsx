import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Save, Search, RefreshCw, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface StationRow {
  id: string;
  name_ar: string;
  name_en: string;
  weekend_days: number[] | null;
}

// Day-of-week indices match JS: 0=Sun ... 6=Sat
const DAYS: { idx: number; ar: string; en: string; short_ar: string; short_en: string }[] = [
  { idx: 6, ar: 'السبت', en: 'Saturday', short_ar: 'س', short_en: 'Sat' },
  { idx: 0, ar: 'الأحد', en: 'Sunday', short_ar: 'ح', short_en: 'Sun' },
  { idx: 1, ar: 'الإثنين', en: 'Monday', short_ar: 'ن', short_en: 'Mon' },
  { idx: 2, ar: 'الثلاثاء', en: 'Tuesday', short_ar: 'ث', short_en: 'Tue' },
  { idx: 3, ar: 'الأربعاء', en: 'Wednesday', short_ar: 'ر', short_en: 'Wed' },
  { idx: 4, ar: 'الخميس', en: 'Thursday', short_ar: 'خ', short_en: 'Thu' },
  { idx: 5, ar: 'الجمعة', en: 'Friday', short_ar: 'ج', short_en: 'Fri' },
];

const normalizeDays = (raw: any): number[] => {
  if (!Array.isArray(raw)) return [5, 6];
  const out = raw
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 6);
  return Array.from(new Set(out)).sort((a, b) => a - b);
};

export const StationWeekendSettings = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stations, setStations] = useState<StationRow[]>([]);
  const [edits, setEdits] = useState<Record<string, number[]>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stations')
      .select('id, name_ar, name_en, weekend_days')
      .order('name_ar');
    if (error) {
      console.error('[StationWeekendSettings] load error', error);
      toast({ title: ar ? 'تعذر تحميل المحطات' : 'Failed to load stations', variant: 'destructive' });
    } else {
      const rows = (data as StationRow[]) || [];
      setStations(rows);
      const e: Record<string, number[]> = {};
      rows.forEach((s) => { e[s.id] = normalizeDays(s.weekend_days); });
      setEdits(e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredStations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter((s) =>
      s.name_ar.toLowerCase().includes(q) || s.name_en.toLowerCase().includes(q)
    );
  }, [stations, search]);

  const isDirty = (s: StationRow) => {
    const orig = normalizeDays(s.weekend_days);
    const cur = edits[s.id] || [];
    if (orig.length !== cur.length) return true;
    return orig.some((d, i) => d !== cur[i]);
  };

  const toggleDay = (stationId: string, dayIdx: number) => {
    setEdits((prev) => {
      const cur = new Set(prev[stationId] || []);
      if (cur.has(dayIdx)) cur.delete(dayIdx);
      else cur.add(dayIdx);
      return { ...prev, [stationId]: Array.from(cur).sort((a, b) => a - b) };
    });
  };

  const saveStation = async (s: StationRow) => {
    const newDays = edits[s.id] || [];
    setSaving(s.id);
    const { error } = await supabase
      .from('stations')
      .update({ weekend_days: newDays as any })
      .eq('id', s.id);
    setSaving(null);
    if (error) {
      console.error('[StationWeekendSettings] save error', error);
      toast({ title: ar ? 'تعذر الحفظ' : 'Save failed', description: error.message, variant: 'destructive' });
      return;
    }
    setStations((prev) => prev.map((x) => (x.id === s.id ? { ...x, weekend_days: newDays } : x)));
    toast({ title: ar ? 'تم الحفظ' : 'Saved', description: ar ? `تم تحديث أيام العطلة لمحطة ${s.name_ar}` : `Weekend days updated for ${s.name_en}` });
  };

  const resetStation = (s: StationRow) => {
    setEdits((prev) => ({ ...prev, [s.id]: normalizeDays(s.weekend_days) }));
  };

  const applyToAll = (preset: number[]) => {
    const next: Record<string, number[]> = { ...edits };
    stations.forEach((s) => { next[s.id] = [...preset].sort((a, b) => a - b); });
    setEdits(next);
    toast({ title: ar ? 'تم التطبيق' : 'Applied', description: ar ? 'لم يُحفظ بعد — اضغط "حفظ" لكل محطة، أو "حفظ الكل".' : 'Not saved yet — save each station, or use "Save all".' });
  };

  const saveAllDirty = async () => {
    const dirty = stations.filter(isDirty);
    if (dirty.length === 0) {
      toast({ title: ar ? 'لا تغييرات' : 'No changes' });
      return;
    }
    setSaving('__all__');
    let ok = 0, fail = 0;
    for (const s of dirty) {
      const { error } = await supabase
        .from('stations')
        .update({ weekend_days: (edits[s.id] || []) as any })
        .eq('id', s.id);
      if (error) { fail++; console.error(error); } else { ok++; }
    }
    setSaving(null);
    if (ok) {
      setStations((prev) => prev.map((x) => isDirty(x) ? { ...x, weekend_days: edits[x.id] || [] } : x));
    }
    toast({
      title: ar ? `تم حفظ ${ok} محطة` : `Saved ${ok} stations`,
      description: fail ? (ar ? `فشل في ${fail}` : `Failed: ${fail}`) : undefined,
      variant: fail ? 'destructive' : 'default',
    });
  };

  return (
    <Card dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader>
        <div className={cn('flex items-start justify-between gap-3', isRTL && 'flex-row-reverse')}>
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              {ar ? 'أيام العطلة الأسبوعية لكل محطة' : 'Weekly Off-Days per Station'}
            </CardTitle>
            <CardDescription className="mt-1">
              {ar
                ? 'حدّد الأيام التي تُعتبر عطلة رسمية في كل محطة. ستظهر مظللة في تقارير الحضور التفصيلية.'
                : 'Pick the weekdays treated as off in each station. The Daily Attendance Report will shade them.'}
            </CardDescription>
          </div>
          <div className={cn('flex flex-wrap gap-2 items-center', isRTL && 'flex-row-reverse')}>
            <Button variant="outline" size="sm" onClick={() => applyToAll([5, 6])}>
              {ar ? 'تطبيق (الجمعة + السبت) للكل' : 'Apply (Fri+Sat) to all'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyToAll([5])}>
              {ar ? 'تطبيق (الجمعة) للكل' : 'Apply (Fri) to all'}
            </Button>
            <Button size="sm" onClick={saveAllDirty} disabled={saving === '__all__'}>
              <Save className="w-4 h-4 mr-2" />
              {ar ? 'حفظ الكل' : 'Save all'}
            </Button>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
        <div className="relative w-full max-w-sm mt-3">
          <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none', isRTL ? 'right-2.5' : 'left-2.5')} />
          <Input
            placeholder={ar ? 'بحث باسم المحطة' : 'Search by station name'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn('h-9 text-sm', isRTL ? 'pr-8' : 'pl-8')}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredStations.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">{ar ? 'لا توجد محطات' : 'No stations'}</div>
        ) : (
          <div className="space-y-2">
            {filteredStations.map((s) => {
              const cur = edits[s.id] || [];
              const dirty = isDirty(s);
              return (
                <div
                  key={s.id}
                  className={cn(
                    'flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-background',
                    dirty && 'border-amber-400 bg-amber-50/40',
                    isRTL && 'flex-row-reverse',
                  )}
                >
                  <div className={cn('flex items-center gap-2 min-w-[200px] flex-1', isRTL && 'flex-row-reverse')}>
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div className="font-medium">{ar ? s.name_ar : s.name_en}</div>
                    {dirty && (
                      <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700">
                        {ar ? 'غير محفوظ' : 'Unsaved'}
                      </Badge>
                    )}
                  </div>

                  <div className={cn('flex flex-wrap gap-1.5', isRTL && 'flex-row-reverse')}>
                    {DAYS.map((d) => {
                      const active = cur.includes(d.idx);
                      return (
                        <button
                          key={d.idx}
                          type="button"
                          onClick={() => toggleDay(s.id, d.idx)}
                          aria-pressed={active}
                          className={cn(
                            'min-w-[42px] h-8 px-2 rounded-md text-xs font-medium border transition',
                            active
                              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                              : 'bg-background hover:bg-muted text-muted-foreground border-border',
                          )}
                          title={ar ? d.ar : d.en}
                        >
                          {ar ? d.short_ar : d.short_en}
                        </button>
                      );
                    })}
                  </div>

                  <div className={cn('flex gap-2', isRTL && 'flex-row-reverse')}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resetStation(s)}
                      disabled={!dirty || saving === s.id}
                    >
                      {ar ? 'تراجع' : 'Reset'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveStation(s)}
                      disabled={!dirty || saving === s.id}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {ar ? 'حفظ' : 'Save'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
