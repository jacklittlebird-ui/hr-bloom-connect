import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Search, Printer, Download, CreditCard, Building2, User } from 'lucide-react';

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

const IdCardPreview = ({ emp }: { emp: EmployeeForId }) => {
  return (
    <div
      className="id-card-container"
      dir="ltr"
      style={{
        width: '340px',
        height: '215px',
        borderRadius: '14px',
        overflow: 'hidden',
        position: 'relative',
        direction: 'ltr',
        fontFamily: "'Baloo Bhaijaan 2', 'Cairo', sans-serif",
        background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 50%, #f8fafc 100%)',
        color: '#1e293b',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Decorative elements */}
      <div style={{
        position: 'absolute', top: '-30px', right: '-30px',
        width: '120px', height: '120px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-20px', left: '-20px',
        width: '80px', height: '80px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)',
      }} />

      {/* Top bar with logo */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 8px', position: 'relative', zIndex: 1,
      }}>
        <img
          src="/images/company-logo.png"
          alt="Company Logo"
          style={{ height: '32px', objectFit: 'contain' }}
        />
        <div style={{
          fontSize: '8px', letterSpacing: '2px', textTransform: 'uppercase',
          color: '#2563eb', fontWeight: 700,
        }}>
          EMPLOYEE ID
        </div>
      </div>

      {/* Divider line */}
      <div style={{
        height: '2px', margin: '0 16px',
        background: 'linear-gradient(90deg, transparent, #2563eb, transparent)',
      }} />

      {/* Main content */}
      <div style={{
        display: 'flex', gap: '14px', padding: '10px 16px',
        position: 'relative', zIndex: 1,
      }}>
        {/* Photo */}
        <div style={{
          width: '72px', height: '88px', borderRadius: '8px',
          overflow: 'hidden', flexShrink: 0,
          border: '2px solid #2563eb',
          background: '#e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {emp.avatar ? (
            <img src={emp.avatar} alt={emp.name_en}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User style={{ width: '32px', height: '32px', color: '#94a3b8' }} />
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '5px' }}>
          <div style={{
            fontSize: '14px', fontWeight: 700, lineHeight: 1.2,
            letterSpacing: '0.3px', color: '#0f172a',
          }}>
            {emp.name_en}
          </div>
          <div style={{
            fontSize: '10px', color: '#2563eb', fontWeight: 600,
          }}>
            {emp.job_title_en || 'N/A'}
          </div>
          
          <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
            <div>
              <div style={{ fontSize: '7px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>ID No.</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af' }}>{emp.employee_code}</div>
            </div>
            <div>
              <div style={{ fontSize: '7px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Dept</div>
              <div style={{ fontSize: '10px', fontWeight: 500, color: '#334155' }}>{(emp.departments as any)?.name_en || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 16px',
        background: 'linear-gradient(90deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02))',
        borderTop: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div>
            <span style={{ fontSize: '7px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Hired </span>
            <span style={{ fontSize: '9px', fontWeight: 600, color: '#334155' }}>{emp.hire_date || 'N/A'}</span>
          </div>
          <div>
            <span style={{ fontSize: '7px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Valid Until </span>
            <span style={{ fontSize: '9px', fontWeight: 600, color: '#334155' }}>{ID_EXPIRY}</span>
          </div>
        </div>
        <div style={{ fontSize: '7px', color: '#94a3b8', letterSpacing: '0.5px' }}>
          {(emp.stations as any)?.name_en || ''}
        </div>
      </div>
    </div>
  );
};

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
  const [selectedEmp, setSelectedEmp] = useState<EmployeeForId | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let empQuery = supabase.from('employees').select('id, employee_code, name_en, job_title_en, hire_date, avatar, department_id, station_id, departments(name_en), stations(name_en)').eq('status', 'active').order('name_en');
    if (filterEmployeeId) {
      empQuery = empQuery.eq('id', filterEmployeeId);
    }
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
    if (deptFilter !== 'all') {
      list = list.filter(e => e.department_id === deptFilter);
    }
    if (stationFilter !== 'all') {
      list = list.filter(e => e.station_id === stationFilter);
    }
    setFiltered(list);
  }, [search, deptFilter, stationFilter, employees]);

  const exportPdf = (emp: EmployeeForId) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee ID - ${emp.name_en}</title>
        <link href="https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: A4; margin: 20mm; }
          html, body { direction: ltr; text-align: left; }
          body { font-family: 'Baloo Bhaijaan 2', 'Cairo', sans-serif; display: flex; justify-content: center; align-items: flex-start; padding: 40px; background: #f8fafc; min-height: 100vh; }
          .page-wrapper { text-align: center; width: 100%; display: flex; flex-direction: column; align-items: center; }
          .page-title { font-size: 18px; font-weight: 700; color: #0a1628; margin-bottom: 24px; letter-spacing: 1px; }
          .card {
            width: 680px; height: 430px; border-radius: 28px; overflow: hidden;
            position: relative; background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 50%, #f8fafc 100%);
            color: #1e293b; box-shadow: 0 4px 24px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;
            direction: ltr; text-align: left;
          }
          .card * { text-align: left; }
          .deco1 { position: absolute; top: -60px; right: -60px; width: 240px; height: 240px; border-radius: 50%; background: radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%); }
          .deco2 { position: absolute; bottom: -40px; left: -40px; width: 160px; height: 160px; border-radius: 50%; background: radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%); }
          .top-bar { display: flex; align-items: center; justify-content: space-between; padding: 24px 32px 16px; position: relative; z-index: 1; }
          .top-bar img { height: 48px; object-fit: contain; }
          .top-bar .label { font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #2563eb; font-weight: 700; }
          .divider { height: 2px; margin: 0 32px; background: linear-gradient(90deg, transparent, #2563eb, transparent); }
          .main { display: flex; gap: 28px; padding: 20px 32px; position: relative; z-index: 1; }
          .photo { width: 144px; height: 176px; border-radius: 16px; overflow: hidden; flex-shrink: 0; border: 3px solid #2563eb; background: #e2e8f0; display: flex; align-items: center; justify-content: center; }
          .photo img { width: 100%; height: 100%; object-fit: cover; }
          .photo .placeholder { width: 64px; height: 64px; color: #94a3b8; }
          .info { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 10px; }
          .name { font-size: 26px; font-weight: 700; line-height: 1.2; letter-spacing: 0.3px; color: #0f172a; }
          .title { font-size: 16px; color: #2563eb; font-weight: 600; }
          .fields { display: flex; gap: 32px; margin-top: 8px; }
          .field-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; }
          .field-value { font-size: 18px; font-weight: 700; color: #1e40af; }
          .field-value.normal { font-size: 15px; color: #334155; font-weight: 500; }
          .bottom { position: absolute; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; padding: 12px 32px; background: linear-gradient(90deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02)); border-top: 1px solid #e2e8f0; }
          .bottom .pair span:first-child { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; }
          .bottom .pair span:last-child { font-size: 14px; font-weight: 600; color: #334155; margin-left: 4px; }
          .bottom .station { font-size: 10px; color: #94a3b8; }
          @media print { body { background: #fff; padding: 0; } .page-wrapper { align-items: center; } }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          <div class="page-title">EMPLOYEE IDENTIFICATION CARD</div>
          <div class="card">
            <div class="deco1"></div>
            <div class="deco2"></div>
            <div class="top-bar">
              <img src="${window.location.origin}/images/company-logo.png" alt="Logo" />
              <div class="label">EMPLOYEE ID</div>
            </div>
            <div class="divider"></div>
            <div class="main">
              <div class="photo">
                ${emp.avatar
                  ? `<img src="${emp.avatar}" alt="${emp.name_en}" />`
                  : `<svg class="placeholder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
                }
              </div>
              <div class="info">
                <div class="name">${emp.name_en}</div>
                <div class="title">${emp.job_title_en || 'N/A'}</div>
                <div class="fields">
                  <div>
                    <div class="field-label">ID No.</div>
                    <div class="field-value">${emp.employee_code}</div>
                  </div>
                  <div>
                    <div class="field-label">Department</div>
                    <div class="field-value normal">${(emp.departments as any)?.name_en || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="bottom">
              <div style="display:flex;gap:32px">
                <div class="pair"><span>Hired </span><span>${emp.hire_date || 'N/A'}</span></div>
                <div class="pair"><span>Valid Until </span><span>${ID_EXPIRY}</span></div>
              </div>
              <div class="station">${(emp.stations as any)?.name_en || ''}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Filters - hidden when viewing single employee */}
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
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={ar ? 'القسم' : 'Department'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ar ? 'الكل' : 'All Departments'}</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>{ar ? d.name_ar : d.name_en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stationFilter} onValueChange={setStationFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={ar ? 'المحطة' : 'Station'} />
            </SelectTrigger>
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
              <IdCardPreview emp={emp} />
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
