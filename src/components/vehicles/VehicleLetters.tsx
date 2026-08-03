import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BOSTAN_INSURANCE } from '@/components/vehicles/InsuredDriverPicker';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Car, ChevronDown, Search, FileText, Printer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Station { id: string; name_ar: string; name_en: string; code: string | null; }
interface Vehicle {
  id: string; vehicle_code: string; brand: string; model: string; year: number;
  plate_number: string; color: string | null; engine_number: string | null; chassis_number: string | null;
  cylinders_count: number | null; station_id: string | null;
  insured_driver_name: string | null; insurance_number: string | null;
  transport_license_start: string | null; transport_license_end: string | null;
}

type LetterKind = 'insurance' | 'transport';

const fmt = (d: string | null) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const todayAr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const buildLetterHtml = (v: Vehicle, kind: LetterKind, stationName: string) => {
  const logo = `${window.location.origin}/images/company-logo.png`;
  const body = kind === 'insurance'
    ? `
      <p class="line">السيد / مدير مكتب تأمينات الزمالك</p>
      <p class="line">تحية طيبة وبعد،،،</p>
      <p class="para">
        نرجو التكرم من سيادتكم بإعطائنا شهادة تأمين مستخرجة من واقع الحاسب الآلي لتقديمها إلى إدارة المرور
        تفيد بأن منشأة لينك إيرو تريدنج إجنسي تحت رقم 1307926 ملتزمة بسداد الإشتراكات الشهرية المستحقة عليها
        للمكتب حتي تاريخه والرصيد مسدد وأنه مؤمن علي سائق <b>${v.insured_driver_name || '—'}</b>
        رقم تأميني <b>${v.insurance_number || '—'}</b> ، وبيانات السيارة كالتالي :
      </p>
      <p class="para">
        سيارة <b>${v.brand || '—'}</b> لوحات رقم: <b>${v.plate_number || '—'}</b> موديل <b>${v.year || '—'}</b>
        شاسية رقم <b>${v.chassis_number || '—'}</b> ورقم الموتور <b>${v.engine_number || '—'}</b>،
        <b>${v.cylinders_count ?? '—'}</b> سلندر اللون <b>${v.color || '—'}</b>.
      </p>
      <p class="para">مع ملاحظة أن عدد السائقين أكبر من عدد السيارات.</p>
      <p class="line">وتفضلوا بقبول فائق الاحترام،،،</p>
    `
    : `
      <p class="line">السيد / مدير إدارة النقل البري</p>
      <p class="line">تحية طيبة وبعد،،،</p>
      <p class="para">
        نرجو التكرم من سيادتكم بالموافقة على إصدار / تجديد ترخيص النقل البري الخاص بسيارة منشأة
        لينك إيرو تريدنج إجنسي تحت رقم 1307926، والعاملة بموقع <b>${stationName}</b>، وبياناتها كالتالي :
      </p>
      <p class="para">
        سيارة <b>${v.brand || '—'}</b> موديل <b>${v.year || '—'}</b> لوحات رقم: <b>${v.plate_number || '—'}</b>
        شاسية رقم <b>${v.chassis_number || '—'}</b> ورقم الموتور <b>${v.engine_number || '—'}</b>،
        <b>${v.cylinders_count ?? '—'}</b> سلندر اللون <b>${v.color || '—'}</b>.
      </p>
      <p class="para">
        سائق السيارة <b>${v.insured_driver_name || '—'}</b> — ترخيص النقل البري الحالي من
        <b>${fmt(v.transport_license_start)}</b> حتى <b>${fmt(v.transport_license_end)}</b>.
      </p>
      <p class="line">وتفضلوا بقبول فائق الاحترام،،،</p>
    `;

  return `<!doctype html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8" />
<title>${kind === 'insurance' ? 'خطاب تأمينات' : 'خطاب نقل بري'} - ${v.plate_number}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: "Baloo Bhaijaan 2", Arial, sans-serif; color:#0f172a; direction: rtl; line-height: 2.1; }
  .head { text-align:center; border-bottom:2px solid #1e3a8a; padding-bottom:12px; margin-bottom:24px; }
  .head img { height:80px; }
  .date { text-align:left; font-size:14px; color:#475569; margin-bottom:18px; }
  .line { font-size:16px; font-weight:700; margin:14px 0; }
  .para { font-size:16px; text-align:justify; margin:14px 0; }
  .sign { margin-top:60px; text-align:center; font-weight:700; font-size:16px; }
  .sign span { display:block; margin-top:48px; }
</style></head>
<body>
  <div class="head"><img src="${logo}" alt="logo" /></div>
  <div class="date">التاريخ: ${todayAr()}</div>
  ${body}
  <div class="sign">رئيس شؤون العاملين<span>جاك إسحق</span></div>
</body></html>`;
};

export const VehicleLetters = ({ allowedStationIds }: { allowedStationIds?: string[] | null } = {}) => {
  const { language, isRTL } = useLanguage();
  const scopeIds = allowedStationIds && allowedStationIds.length ? new Set(allowedStationIds) : null;
  const isAr = language === 'ar';
  const [stations, setStations] = useState<Station[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{ html: string; title: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: s }, { data: v }] = await Promise.all([
        supabase.from('stations').select('id, name_ar, name_en, code').eq('is_active', true).order('name_ar'),
        supabase.from('vehicles').select('id, vehicle_code, brand, model, year, plate_number, color, engine_number, chassis_number, cylinders_count, station_id, insured_driver_name, insurance_number, transport_license_start, transport_license_end').order('vehicle_code'),
      ]);
      if (s) setStations((scopeIds ? (s as Station[]).filter((x) => scopeIds.has(x.id)) : (s as Station[])));
      if (v) setVehicles((scopeIds ? (v as any[]).filter((x) => x.station_id && scopeIds.has(x.station_id)) : v) as unknown as Vehicle[]);
      setLoading(false);
    };
    load();
  }, []);

  const grouped = useMemo(() => {
    const txt = search.trim().toLowerCase();
    const map = new Map<string, Vehicle[]>();
    vehicles.forEach((v) => {
      if (txt) {
        const hay = `${v.vehicle_code} ${v.brand} ${v.model} ${v.plate_number} ${v.insured_driver_name || ''}`.toLowerCase();
        if (!hay.includes(txt)) return;
      }
      const k = v.station_id || 'unassigned';
      const arr = map.get(k) || [];
      arr.push(v);
      map.set(k, arr);
    });
    return map;
  }, [vehicles, search]);

  const stationName = (id: string) => {
    if (id === 'unassigned') return isAr ? 'غير مخصص' : 'Unassigned';
    const s = stations.find((x) => x.id === id);
    return s ? (isAr ? s.name_ar : s.name_en) : (isAr ? 'غير مخصص' : 'Unassigned');
  };

  const openLetter = (v: Vehicle, kind: LetterKind) => {
    const html = buildLetterHtml(v, kind, stationName(v.station_id || 'unassigned'));
    setPreview({
      html,
      title: `${kind === 'insurance' ? (isAr ? 'خطاب تأمينات' : 'Insurance Letter') : (isAr ? 'خطاب النقل البري' : 'Transport Letter')} — ${v.plate_number}`,
    });
  };

  const printLetter = () => {
    if (!preview) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(preview.html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  const keys = [...grouped.keys()].sort((a, b) => stationName(a).localeCompare(stationName(b), 'ar'));

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-muted-foreground gap-2"><Loader2 className="h-5 w-5 animate-spin" />{isAr ? 'جاري التحميل...' : 'Loading...'}</div>;
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="relative max-w-sm">
        <Search className="absolute top-2.5 start-3 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isAr ? 'بحث بالسيارة أو اللوحة أو السائق...' : 'Search vehicle, plate or driver...'}
          className="ps-9 h-9"
        />
      </div>

      {keys.length === 0 && (
        <p className="text-sm text-muted-foreground py-8 text-center">{isAr ? 'لا توجد سيارات' : 'No vehicles'}</p>
      )}

      {keys.map((k) => {
        const list = grouped.get(k) || [];
        const isOpen = openIds.has(k);
        return (
          <Card key={k}>
            <Collapsible
              open={isOpen}
              onOpenChange={() => setOpenIds((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; })}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer py-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="whitespace-pre-wrap break-words">{stationName(k)}</span>
                    <Badge variant="secondary" className="ms-2">{list.length}</Badge>
                    <ChevronDown className={cn('ms-auto h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  {list.map((v) => (
                    <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-md border p-3">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{v.vehicle_code}</span>
                      <span className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                        {v.brand} {v.model} — {v.plate_number}
                      </span>
                      <div className="ms-auto flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openLetter(v, 'transport')}>
                          <FileText className="h-4 w-4 me-1" />{isAr ? 'خطاب نقل بري' : 'Transport Letter'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openLetter(v, 'insurance')}>
                          <FileText className="h-4 w-4 me-1" />{isAr ? 'خطاب تأمينات' : 'Insurance Letter'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle className="text-base">{preview?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden bg-muted/30 p-3">
            {preview && (
              <iframe srcDoc={preview.html} title="letter-preview" className="w-full h-full bg-white rounded-md border" />
            )}
          </div>
          <DialogFooter className="px-6 py-3 border-t flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setPreview(null)}>{isAr ? 'إغلاق' : 'Close'}</Button>
            <Button onClick={printLetter}><Printer className="h-4 w-4 me-1" />{isAr ? 'طباعة / PDF' : 'Print / PDF'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
