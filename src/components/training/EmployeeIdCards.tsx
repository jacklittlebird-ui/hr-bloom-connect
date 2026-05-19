import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Printer, Download, CreditCard, User } from 'lucide-react';

interface EmployeeForId {
  id: string;
  employee_code: string;
  name_en: string;
  job_title_en: string | null;
  hire_date: string | null;
  avatar: string | null;
  department_id: string | null;
  station_id: string | null;
  departments?: { name_en: string } | null;
  stations?: { name_en: string } | null;
}

const ID_EXPIRY = '31/12/2036';
const BRAND_RED = '#E30613';
const BRAND_BLUE = '#1E3A8A';
const COMPANY_LOGO = '/images/company-logo-vertical.png';
const COMPANY_LOGO_H = '/images/company-logo.png';

/* ---------- Reusable SVG decorations (page 1 + page 2 inspired) ---------- */

const RedArrow = ({ style }: { style?: React.CSSProperties }) => (
  <svg viewBox="0 0 200 200" style={style} aria-hidden="true">
    <polygon points="0,20 130,20 200,100 130,180 0,180 70,100" fill={BRAND_RED} />
    <polygon points="0,40 110,40 175,100 110,160 0,160 60,100" fill="#fff" opacity="0.18" />
  </svg>
);

const BlueTriangle = ({ style }: { style?: React.CSSProperties }) => (
  <svg viewBox="0 0 200 200" style={style} aria-hidden="true">
    <polygon points="200,200 200,40 30,200" fill={BRAND_BLUE} />
  </svg>
);

const GlobePlane = ({ style }: { style?: React.CSSProperties }) => (
  <svg viewBox="0 0 300 300" style={style} aria-hidden="true">
    <g fill="none" stroke={BRAND_BLUE} strokeWidth="2.2" strokeLinecap="round">
      <circle cx="170" cy="160" r="95" />
      <path d="M75 160 q95 -55 190 0" />
      <path d="M75 160 q95 55 190 0" />
      <path d="M170 65 q-55 95 0 190" />
      <path d="M170 65 q55 95 0 190" />
    </g>
    <path
      d="M40 220 q70 -50 150 -90"
      fill="none"
      stroke={BRAND_BLUE}
      strokeWidth="2"
      strokeDasharray="4 6"
      strokeLinecap="round"
    />
    <g transform="translate(35 225) rotate(-25)">
      <path
        d="M0 0 L34 -6 L48 -16 L54 -12 L44 0 L54 12 L48 16 L34 6 L0 0 Z"
        fill={BRAND_RED}
      />
    </g>
  </svg>
);

/* ---------- Front side preview (page 1 inspired) ---------- */

const IdCardFront = ({ emp }: { emp: EmployeeForId }) => {
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
      }}
    >
      {/* Top-left red arrow */}
      <RedArrow style={{ position: 'absolute', top: '-30px', left: '-50px', width: '170px', height: '170px' }} />

      {/* Bottom-right blue triangle */}
      <BlueTriangle style={{ position: 'absolute', bottom: '0', right: '0', width: '110px', height: '110px', opacity: 0.95 }} />

      {/* Brand wordmark — Link Aero */}
      <div style={{ position: 'relative', textAlign: 'center', paddingTop: '22px', zIndex: 2 }}>
        <span style={{ fontWeight: 800, fontSize: '30px', color: BRAND_RED, letterSpacing: '-0.5px' }}>Link</span>
        <span style={{ fontWeight: 800, fontSize: '30px', color: BRAND_BLUE, letterSpacing: '-0.5px' }}> Aero</span>
      </div>

      {/* Circular photo */}
      <div
        style={{
          position: 'relative',
          margin: '18px auto 0',
          width: '170px',
          height: '170px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '3px solid #0f172a',
          background: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        {emp.avatar ? (
          <img src={emp.avatar} alt={emp.name_en} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <User style={{ width: '60px', height: '60px', color: '#94a3b8' }} />
        )}
      </div>

      {/* Info block */}
      <div style={{ position: 'relative', padding: '20px 22px 0', zIndex: 2 }}>
        <div style={{ fontSize: '22px', fontWeight: 800, color: BRAND_BLUE, lineHeight: 1.1 }}>
          {emp.name_en}
        </div>
        {emp.job_title_en && (
          <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '2px' }}>
            {emp.job_title_en}
          </div>
        )}
        <div style={{ marginTop: '14px', fontSize: '14px', fontWeight: 700, color: BRAND_BLUE }}>
          ID: <span style={{ color: '#0f172a' }}>{emp.employee_code}</span>
        </div>
        <div style={{ marginTop: '4px', fontSize: '13px', fontWeight: 700, color: BRAND_BLUE }}>
          Employed: <span style={{ color: '#0f172a' }}>{emp.hire_date || 'N/A'}</span>
        </div>
      </div>

      {/* Logo bottom-right (above triangle) */}
      <img
        src={COMPANY_LOGO}
        alt="Company"
        style={{
          position: 'absolute',
          bottom: '70px',
          right: '18px',
          height: '92px',
          objectFit: 'contain',
          zIndex: 3,
        }}
      />

      {/* Website bottom-left */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          left: '20px',
          fontSize: '12px',
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
  const photo = emp.avatar || '';
  return `<!DOCTYPE html>
<html dir="ltr">
<head>
  <meta charset="utf-8" />
  <title>Employee ID — ${emp.name_en}</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    @page{size:A4;margin:14mm;}
    html,body{direction:ltr;text-align:left;background:#f1f5f9;}
    body{font-family:'Baloo Bhaijaan 2','Cairo',sans-serif;padding:24px;display:flex;justify-content:center;}
    .wrap{display:flex;gap:28px;flex-wrap:wrap;justify-content:center;}
    .card{
      width:380px;height:600px;border-radius:22px;overflow:hidden;position:relative;
      background:#ffffff;color:#0f172a;
      box-shadow:0 12px 36px rgba(15,23,42,0.15);
      border:1px solid #e5e7eb;direction:ltr;text-align:left;
    }
    .card *{text-align:left;}
    .red-arrow{position:absolute;top:-36px;left:-58px;width:200px;height:200px;}
    .blue-tri{position:absolute;bottom:0;right:0;width:130px;height:130px;}
    .brand{position:relative;text-align:center;padding-top:26px;z-index:2;}
    .brand span{font-weight:800;font-size:36px;letter-spacing:-0.5px;}
    .brand .b1{color:${BRAND_RED};}
    .brand .b2{color:${BRAND_BLUE};}
    .photo{position:relative;margin:22px auto 0;width:200px;height:200px;border-radius:50%;
      overflow:hidden;border:3px solid #0f172a;background:#e5e7eb;display:flex;
      align-items:center;justify-content:center;z-index:2;}
    .photo img{width:100%;height:100%;object-fit:cover;}
    .info{position:relative;padding:24px 26px 0;z-index:2;}
    .name{font-size:26px;font-weight:800;color:${BRAND_BLUE};line-height:1.1;}
    .title{font-size:12px;color:#475569;font-weight:600;margin-top:3px;}
    .row{margin-top:16px;font-size:16px;font-weight:700;color:${BRAND_BLUE};}
    .row span{color:#0f172a;font-weight:700;}
    .vlogo{position:absolute;bottom:80px;right:20px;height:108px;object-fit:contain;z-index:3;}
    .site{position:absolute;bottom:16px;left:22px;font-size:13px;font-weight:800;color:${BRAND_RED};z-index:3;}

    /* Back side */
    .back .blogo{position:absolute;top:120px;left:50%;transform:translateX(-50%);height:170px;object-fit:contain;z-index:3;}
    .contact{position:absolute;top:330px;left:30px;right:30px;z-index:3;display:flex;flex-direction:column;gap:10px;font-size:13px;color:${BRAND_BLUE};font-weight:700;}
    .contact .li{display:flex;align-items:center;gap:10px;}
    .contact svg{flex-shrink:0;}
    .globe{position:absolute;bottom:-20px;right:-30px;width:240px;height:240px;opacity:0.95;}

    @media print{
      body{background:#fff;padding:0;}
      .wrap{gap:18px;}
    }
  </style>
</head>
<body>
  <div class="wrap">
    <!-- FRONT -->
    <div class="card">
      <svg class="red-arrow" viewBox="0 0 200 200"><polygon points="0,20 130,20 200,100 130,180 0,180 70,100" fill="${BRAND_RED}"/></svg>
      <svg class="blue-tri" viewBox="0 0 200 200"><polygon points="200,200 200,40 30,200" fill="${BRAND_BLUE}"/></svg>
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
        <div class="row">Valid Until: <span>${ID_EXPIRY}</span></div>
      </div>
      <img class="vlogo" src="${logo}" alt="Company"/>
      <div class="site">www.linkagency.com</div>
    </div>

    <!-- BACK (page 2 inspired) -->
    <div class="card back">
      <svg class="red-arrow" viewBox="0 0 200 200"><polygon points="0,20 130,20 200,100 130,180 0,180 70,100" fill="${BRAND_RED}"/></svg>
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
      <svg class="globe" viewBox="0 0 300 300">
        <g fill="none" stroke="${BRAND_BLUE}" stroke-width="2.4" stroke-linecap="round">
          <circle cx="170" cy="160" r="95"/>
          <path d="M75 160 q95 -55 190 0"/>
          <path d="M75 160 q95 55 190 0"/>
          <path d="M170 65 q-55 95 0 190"/>
          <path d="M170 65 q55 95 0 190"/>
        </g>
        <path d="M40 220 q70 -50 150 -90" fill="none" stroke="${BRAND_BLUE}" stroke-width="2" stroke-dasharray="4 6" stroke-linecap="round"/>
        <g transform="translate(35 225) rotate(-25)">
          <path d="M0 0 L34 -6 L48 -16 L54 -12 L44 0 L54 12 L48 16 L34 6 L0 0 Z" fill="${BRAND_RED}"/>
        </g>
      </svg>
    </div>
  </div>
</body>
</html>`;
}

export const EmployeeIdCards = ({ filterEmployeeId }: { filterEmployeeId?: string }) => {
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    let empQuery = supabase
      .from('employees')
      .select('id, employee_code, name_en, job_title_en, hire_date, avatar, department_id, station_id, departments(name_en), stations(name_en)')
      .eq('status', 'active')
      .order('name_en');
    if (filterEmployeeId) empQuery = empQuery.eq('id', filterEmployeeId);

    const [empRes, deptRes, stationRes] = await Promise.all([
      empQuery,
      supabase.from('departments').select('id, name_en, name_ar').eq('is_active', true),
      supabase.from('stations').select('id, name_en, name_ar').eq('is_active', true),
    ]);
    if (empRes.data) {
      setEmployees(empRes.data as any);
      setFiltered(empRes.data as any);
    }
    if (deptRes.data) setDepartments(deptRes.data);
    if (stationRes.data) setStations(stationRes.data);
    setLoading(false);
  }, [filterEmployeeId]);

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

  const exportPdf = (emp: EmployeeForId) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(buildPrintHtml(emp, window.location.origin));
    w.document.close();
    setTimeout(() => w.print(), 600);
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
        <div className="text-center py-12 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">{ar ? 'لا توجد نتائج' : 'No results found'}</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(emp => (
            <div key={emp.id} className="flex flex-col items-center gap-3">
              <IdCardFront emp={emp} />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportPdf(emp)}>
                  <Printer className="w-3.5 h-3.5" />
                  {ar ? 'طباعة' : 'Print'}
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportPdf(emp)}>
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
