import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Printer, Download, CreditCard, User } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface EmployeeForId {
  id: string;
  employee_code: string;
  name_en: string;
  job_title_en: string | null;
  hire_date: string | null;
  avatar: string | null;
  national_id: string | null;
  department_id: string | null;
  station_id: string | null;
  departments?: { name_en: string } | null;
  stations?: { name_en: string } | null;
}

const EMPLOYEE_CARD_SELECT = 'id, employee_code, name_en, job_title_en, hire_date, national_id, department_id, station_id';

const BRAND_RED = '#E30613';
const BRAND_BLUE = '#1E3A8A';
const COMPANY_LOGO = '/images/company-logo-vertical.png';
const RED_ARROW_IMG = '/images/id-red-arrow.png';
const BLUE_TRI_IMG = '/images/id-blue-triangle.png';
const WORLD_IMG = '/images/id-world.png';

/* ---------- Front side preview (matches reference page 1) ---------- */

const IdCardFront = ({ emp }: { emp: EmployeeForId }) => {
  const brandRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);

  // Runtime overlap detection — warns if brand collides with any other card element
  const checkOverlap = useCallback(() => {
    const brand = brandRef.current?.getBoundingClientRect();
    if (!brand || brand.width === 0) return;
    const targets: Array<[string, DOMRect | undefined]> = [
      ['photo', photoRef.current?.getBoundingClientRect()],
      ['info', infoRef.current?.getBoundingClientRect()],
      ['logo', logoRef.current?.getBoundingClientRect()],
    ];
    const overlap = (a: DOMRect, b: DOMRect) =>
      !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
    targets.forEach(([name, rect]) => {
      if (rect && rect.width > 0 && overlap(brand, rect)) {
        // eslint-disable-next-line no-console
        console.warn(`[IdCardFront] "Link Aero" overlaps ${name}`, { brand, [name]: rect });
      }
    });
  }, []);

  useEffect(() => {
    let debounceId: number | undefined;
    const debounced = () => {
      if (debounceId) window.clearTimeout(debounceId);
      debounceId = window.setTimeout(checkOverlap, 150);
    };
    // initial check after layout settles
    const initId = window.setTimeout(checkOverlap, 50);
    window.addEventListener('resize', debounced);
    return () => {
      window.clearTimeout(initId);
      if (debounceId) window.clearTimeout(debounceId);
      window.removeEventListener('resize', debounced);
    };
  }, [checkOverlap, emp.avatar]);


  return (
    <div
      dir="ltr"
      style={{
        width: '320px',
        height: '500px',
        borderRadius: '18px',
        overflow: 'hidden',
        position: 'relative',
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Baloo Bhaijaan 2', 'Cairo', sans-serif",
        boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
        border: '1px solid #e5e7eb',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top-left red arrow */}
      <img
        src={RED_ARROW_IMG}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-30px',
          left: '-40px',
          width: '150px',
          height: 'auto',
          zIndex: 1,
        }}
      />

      {/* Bottom-right small blue triangle */}
      <img
        src={BLUE_TRI_IMG}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '-10px',
          right: '-10px',
          width: '90px',
          height: 'auto',
          zIndex: 1,
        }}
      />

      {/* Brand wordmark — Link Aero (flow-based, can't overlap photo) */}
      <div ref={brandRef} style={{ marginTop: '44px', textAlign: 'center', zIndex: 4, position: 'relative' }}>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontWeight: 900, fontSize: '38px', color: BRAND_RED, letterSpacing: '0px' }}>Link</span>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontWeight: 900, fontSize: '38px', color: BRAND_BLUE, letterSpacing: '0px' }}> Aero</span>
      </div>

      {/* Circular photo (flow-based, sits below brand) */}
      <div
        ref={photoRef}
        style={{
          position: 'relative',
          margin: '10px auto 0',
          width: '170px',
          height: '170px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid #0f172a',
          background: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        {emp.avatar ? (
          <img src={emp.avatar} alt={emp.name_en} onLoad={checkOverlap} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <User style={{ width: '60px', height: '60px', color: '#94a3b8' }} />
        )}
      </div>

      {/* Info block bottom-left */}
      <div ref={infoRef} style={{ position: 'absolute', bottom: '64px', left: '22px', zIndex: 2, maxWidth: '170px' }}>
        <div style={{ fontSize: '17px', fontWeight: 800, color: BRAND_BLUE, lineHeight: 1.15 }}>
          {emp.name_en}
        </div>
        {emp.job_title_en && (
          <div style={{ fontSize: '10px', color: '#475569', fontWeight: 600, marginTop: '4px', lineHeight: 1.3 }}>
            {emp.job_title_en}
          </div>
        )}
        <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: 700, color: BRAND_BLUE, lineHeight: 1.4 }}>
          ID: <span style={{ color: '#0f172a' }}>{emp.employee_code}</span>
        </div>
        <div style={{ marginTop: '3px', fontSize: '11px', fontWeight: 700, color: BRAND_BLUE, lineHeight: 1.4 }}>
          Employed: <span style={{ color: '#0f172a' }}>{emp.hire_date || 'N/A'}</span>
        </div>
        <div style={{ marginTop: '3px', fontSize: '11px', fontWeight: 700, color: BRAND_BLUE, lineHeight: 1.4 }}>
          NID: <span style={{ color: '#0f172a' }}>{emp.national_id || 'N/A'}</span>
        </div>
        <div style={{ marginTop: '5px', fontSize: '10px', fontWeight: 600, color: '#475569', lineHeight: 1.3 }}>
          Valid till 31/12/2035
        </div>
      </div>

      {/* Company logo bottom-right */}
      <img
        ref={logoRef}
        src={COMPANY_LOGO}
        alt="Company"
        onLoad={checkOverlap}
        style={{
          position: 'absolute',
          bottom: '58px',
          right: '22px',
          height: '105px',
          width: 'auto',
          objectFit: 'contain',
          zIndex: 3,
        }}
      />


      {/* Website bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '20px',
          fontSize: '13px',
          fontWeight: 800,
          color: BRAND_RED,
          letterSpacing: '0.3px',
          zIndex: 3,
        }}
      >
        www.linkagency.com
      </div>
    </div>
  );
};

/* ---------- Build full bilingual two-side print HTML ---------- */

function buildPrintHtml(emp: EmployeeForId, origin: string): string {
  const logo = `${origin}${COMPANY_LOGO}`;
  const redArrow = `${origin}${RED_ARROW_IMG}`;
  const blueTri = `${origin}${BLUE_TRI_IMG}`;
  const world = `${origin}${WORLD_IMG}`;
  const photo = emp.avatar || '';
  return `<!DOCTYPE html>
<html dir="ltr">
<head>
  <meta charset="utf-8" />
  <title>Employee ID — ${emp.name_en}</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700;800&family=Archivo+Black&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    @page{size:A4 portrait;margin:12mm;}
    html,body{direction:ltr;text-align:left;background:#f1f5f9;}
    body{font-family:'Baloo Bhaijaan 2','Cairo',sans-serif;padding:24px;display:flex;justify-content:center;}
    .wrap{display:flex;gap:28px;flex-wrap:wrap;justify-content:center;}
    .card-slot{display:block;}
    .card{
      width:380px;height:600px;border-radius:22px;overflow:hidden;position:relative;
      background:#ffffff;color:#0f172a;
      box-shadow:0 12px 36px rgba(15,23,42,0.15);
      border:1px solid #e5e7eb;direction:ltr;text-align:left;
    }
    .card *{text-align:left;}

    /* Front */
    .red-arrow{position:absolute;top:-40px;left:-148px;width:210px;height:auto;z-index:1;}
    .blue-tri-sm{position:absolute;bottom:-12px;right:-12px;width:110px;height:auto;z-index:1;}
    .brand{position:absolute;top:64px;left:50%;transform:translateX(-50%);width:270px;text-align:center;z-index:4;line-height:1;}
    .brand span{font-family:'Archivo Black',sans-serif;font-weight:900;font-size:42px;letter-spacing:0;line-height:1;}
    .brand .b1{color:${BRAND_RED};}
    .brand .b2{color:${BRAND_BLUE};}
    .photo{position:relative;margin:124px auto 0;width:190px;height:190px;border-radius:50%;
      overflow:hidden;border:2px solid #0f172a;background:#e5e7eb;display:flex;
      align-items:center;justify-content:center;z-index:2;}
    .photo img{width:100%;height:100%;object-fit:cover;}
    .info{position:absolute;bottom:78px;left:28px;z-index:2;max-width:200px;}
    .name{font-size:20px;font-weight:800;color:${BRAND_BLUE};line-height:1.15;}
    .title{font-size:11px;color:#475569;font-weight:600;margin-top:5px;line-height:1.3;}
    .row{margin-top:10px;font-size:14px;font-weight:700;color:${BRAND_BLUE};line-height:1.4;}
    .row + .row{margin-top:4px;font-size:13px;}
    .row span{color:#0f172a;font-weight:700;}
    .valid{margin-top:6px;font-size:11px;font-weight:600;color:#475569;line-height:1.3;}
    .flogo{position:absolute;bottom:68px;right:26px;height:125px;width:auto;object-fit:contain;z-index:3;}
    .site{position:absolute;bottom:20px;left:28px;font-size:14px;font-weight:800;color:${BRAND_RED};z-index:3;}

    /* Back */
    .back .blogo{position:absolute;top:140px;left:50%;transform:translateX(-50%);height:170px;object-fit:contain;z-index:3;}
    .contact{position:absolute;top:360px;left:34px;z-index:3;display:flex;flex-direction:column;gap:12px;font-size:14px;color:${BRAND_BLUE};font-weight:700;}
    .contact .li{display:flex;align-items:center;gap:12px;}
    .contact svg{flex-shrink:0;}
    .globe{position:absolute;bottom:-30px;right:-40px;width:240px;height:auto;z-index:1;}

    @media print{
      html,body{background:#fff;padding:0;margin:0;width:auto;min-height:100%;display:flex;justify-content:center;align-items:flex-start;}
      .wrap{gap:6mm;justify-content:center;align-items:flex-start;width:100%;padding:0;break-inside:avoid;page-break-inside:avoid;}
      .card-slot{width:205px;height:324px;flex:0 0 205px;break-inside:avoid;page-break-inside:avoid;}
      .card{transform:scale(0.54);transform-origin:top left;margin:0;box-shadow:none;}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <!-- FRONT -->
    <div class="card-slot"><div class="card">
      <img class="red-arrow" src="${redArrow}" alt=""/>
      <img class="blue-tri-sm" src="${blueTri}" alt=""/>
      <div class="brand"><span class="b1">Link</span><span class="b2"> Aero</span></div>
      <div class="photo">
        ${photo
          ? `<img src="${photo}" alt="${emp.name_en}"/>`
          : `<svg viewBox="0 0 24 24" width="72" height="72" fill="none" stroke="#94a3b8" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`}
      </div>
      <div class="info">
        <div class="name">${emp.name_en}</div>
        ${emp.job_title_en ? `<div class="title">${emp.job_title_en}</div>` : ''}
        <div class="row">ID: <span>${emp.employee_code}</span></div>
        <div class="row">Employed: <span>${emp.hire_date || 'N/A'}</span></div>
        <div class="row">NID: <span>${emp.national_id || 'N/A'}</span></div>
        <div class="valid">Valid till 31/12/2035</div>
      </div>
      <img class="flogo" src="${logo}" alt="Company"/>
      <div class="site">www.linkagency.com</div>
    </div></div>

    <!-- BACK (page 2) -->
    <div class="card-slot"><div class="card back">
      <img class="red-arrow" src="${redArrow}" alt=""/>
      <img class="blogo" src="${logo}" alt="Company"/>
      <div class="contact">
        <div class="li">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${BRAND_BLUE}" stroke-width="2"><path d="M12 22s8-7.5 8-13a8 8 0 1 0-16 0c0 5.5 8 13 8 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>
          Zamalek 11211 Cairo, Egypt
        </div>
        <div class="li">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${BRAND_BLUE}" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>
          www.linkagency.com
        </div>
        <div class="li">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${BRAND_BLUE}" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
          +202 27 352025 (10 lines)
        </div>
      </div>
      <img class="globe" src="${world}" alt=""/>
    </div></div>
  </div>
</body>
</html>`;
}

export const EmployeeIdCards = ({ filterEmployeeId, allowedStationIds }: { filterEmployeeId?: string; allowedStationIds?: string[] }) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [employees, setEmployees] = useState<EmployeeForId[]>([]);
  const [filtered, setFiltered] = useState<EmployeeForId[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [stationFilter, setStationFilter] = useState('all');
  const [departments, setDepartments] = useState<{ id: string; name_en: string; name_ar: string }[]>([]);
  const [stations, setStations] = useState<{ id: string; name_en: string; name_ar: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let empQuery = supabase
        .from('employees')
        .select(EMPLOYEE_CARD_SELECT)
        .eq('status', 'active')
        .order('employee_code');
      if (filterEmployeeId) empQuery = empQuery.eq('id', filterEmployeeId);
      if (allowedStationIds && allowedStationIds.length) empQuery = empQuery.in('station_id', allowedStationIds);

      let stationsQuery = supabase.from('stations').select('id, name_en, name_ar').eq('is_active', true);
      if (allowedStationIds && allowedStationIds.length) stationsQuery = stationsQuery.in('id', allowedStationIds);

      const [empRes, deptRes, stationRes] = await Promise.all([
        empQuery,
        supabase.from('departments').select('id, name_en, name_ar').eq('is_active', true),
        stationsQuery,
      ]);
      if (empRes.error) throw empRes.error;
      if (deptRes.data) setDepartments(deptRes.data);
      if (stationRes.data) setStations(stationRes.data);
      if (empRes.data) {
        const deptMap = new Map((deptRes.data || []).map(d => [d.id, d]));
        const stationMap = new Map((stationRes.data || []).map(s => [s.id, s]));
        const rows = (empRes.data as any[]).map((emp) => ({
          ...emp,
          avatar: null,
          departments: deptMap.get(emp.department_id) ? { name_en: deptMap.get(emp.department_id)!.name_en } : null,
          stations: stationMap.get(emp.station_id) ? { name_en: stationMap.get(emp.station_id)!.name_en } : null,
        })) as EmployeeForId[];
        setEmployees(rows);
        setFiltered(rows);
      }
    } catch (err: any) {
      console.error('EmployeeIdCards fetch error:', err);
      setError(err?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [filterEmployeeId, allowedStationIds?.join(',')]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let list = employees;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.name_en?.toLowerCase().includes(q) || e.employee_code?.toLowerCase().includes(q));
    }
    if (deptFilter !== 'all') list = list.filter(e => e.department_id === deptFilter);
    if (stationFilter !== 'all') list = list.filter(e => e.station_id === stationFilter);
    setFiltered(list);
  }, [search, deptFilter, stationFilter, employees]);

  const printCard = (emp: EmployeeForId) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildPrintHtml(emp, window.location.origin));
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  // High-quality PDF export: render the print HTML into an isolated iframe,
  // rasterize each card at scale=3, and embed both faces on a single A4 page.
  const downloadPdf = async (emp: EmployeeForId) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '900px';
    iframe.style.height = '1400px';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    try {
      const doc = iframe.contentDocument!;
      doc.open();
      doc.write(buildPrintHtml(emp, window.location.origin));
      doc.close();

      // Wait for fonts + images
      await new Promise<void>((res) => {
        const ready = () => res();
        if (doc.readyState === 'complete') ready();
        else iframe.onload = () => ready();
      });
      // @ts-ignore
      if (doc.fonts && doc.fonts.ready) { try { await doc.fonts.ready; } catch {} }
      const imgs = Array.from(doc.images);
      await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = () => r(null); })));
      await new Promise(r => setTimeout(r, 200));

      const cards = Array.from(doc.querySelectorAll<HTMLElement>('.card'));
      if (cards.length === 0) throw new Error('No cards rendered');

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();   // 210
      const pageH = pdf.internal.pageSize.getHeight();  // 297
      // Smaller card size (CR80-like ~ 54x85.6mm) with higher rasterization quality
      const gap = 10;
      const cardW = 54;                                 // mm (smaller)
      const cardH = cardW * (600 / 380);                // preserve 380x600 ratio (~85.3mm)
      const totalW = cardW * 2 + gap;
      const xStart = (pageW - totalW) / 2;
      const yTop = (pageH - cardH) / 2;

      for (let i = 0; i < cards.length; i++) {
        const canvas = await html2canvas(cards[i], {
          scale: 5,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          imageTimeout: 0,
        });
        const dataUrl = canvas.toDataURL('image/png');
        const x = xStart + i * (cardW + gap);
        pdf.addImage(dataUrl, 'PNG', x, yTop, cardW, cardH, undefined, 'SLOW');
      }

      const safeName = (emp.name_en || emp.employee_code || 'employee').replace(/[^A-Za-z0-9_-]+/g, '_');
      pdf.save(`ID_${safeName}.pdf`);
    } finally {
      document.body.removeChild(iframe);
    }
  };

  return (
    <div className="space-y-6">
      {!filterEmployeeId && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder={ar ? 'القسم' : 'Department'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? 'الكل' : 'All Departments'}</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>{ar ? d.name_ar : d.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stationFilter} onValueChange={setStationFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder={ar ? 'المحطة' : 'Station'} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? 'الكل' : 'All Stations'}</SelectItem>
              {stations.map(s => (
                <SelectItem key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="gap-1">
            <CreditCard className="w-3.5 h-3.5" />
            {filtered.length} {ar ? 'موظف' : 'employees'}
          </Badge>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <Card><CardContent className="py-12 text-center space-y-3">
          <p className="text-destructive font-medium">{ar ? 'تعذر تحميل البيانات' : 'Failed to load data'}</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button size="sm" variant="outline" onClick={fetchData}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button>
        </CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{ar ? 'لا توجد نتائج' : 'No results found'}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(emp => (
            <div key={emp.id} className="flex flex-col items-center gap-3">
              <IdCardFront emp={emp} />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => printCard(emp)}>
                  <Printer className="w-3.5 h-3.5" />
                  {ar ? 'طباعة' : 'Print'}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadPdf(emp)}>
                  <Download className="w-3.5 h-3.5" />
                  PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
