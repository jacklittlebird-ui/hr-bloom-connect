import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn, formatDate } from '@/lib/utils';
import { ChevronsUpDown, Plus, Search, ShieldCheck, Trash2, Anchor, Ship, FileSpreadsheet, FileText, Pencil } from 'lucide-react';
import { exportPermitRenewalSheet, fmt } from '@/lib/permitRenewalExcel';
import { exportPortAuthorityRenewalLetter, exportPortAuthorityIssueLetter, exportSecurityCairoRenewalLetter, exportSecurityCairoIssueLetter, exportSecurityAirportsIssueLetter, exportSecurityAirportsRenewalLetter, exportPortsSecurityIssueLetter, exportPortsSecurityRenewalLetter } from '@/lib/permitRenewalLetter';
import { exportPortsSecuritySheet, exportPortsSecurityRenewalSheet } from '@/lib/permitPortsSecurityExcel';

type ListKey =
  | 'security_airports_issue' | 'security_airports_renew'
  | 'security_cairo_issue' | 'security_cairo_renew'
  | 'ports_security_issue' | 'ports_security_renew'
  | 'port_authority_issue' | 'port_authority_renew';

interface EmployeeLite {
  id: string;
  employee_code: string;
  name_ar: string;
  name_en: string;
  job_title_ar: string | null;
  job_title_en: string | null;
  station_id: string | null;
  department_id: string | null;
  nationality: string | null;
  religion: string | null;
  birth_date: string | null;
  birth_governorate: string | null;
  national_id: string | null;
  issuing_authority: string | null;
  permit_name_ar: string | null;
  address: string | null;
  phone: string | null;
  annual_permit_no: string | null;
  id_issue_date: string | null;
  permit_name_en: string | null;
  governorate: string | null;
  city: string | null;
  social_insurance_no: string | null;
  airports_annual_permit_no: string | null;
}

interface PermitEntry {
  id: string;
  employee_id: string;
  list_key: ListKey;
  status: 'in_progress' | 'done';
  permit_no: string | null;
  created_at: string;
}

// القوائم التي تعرض البيانات التفصيلية
const DETAILED_LISTS: ListKey[] = [
  'port_authority_issue', 'port_authority_renew',
  'security_cairo_issue', 'security_cairo_renew',
];
const RENEWAL_LISTS: ListKey[] = ['port_authority_renew', 'security_cairo_renew'];
// قوائم أمن المواني ومطارات قطاع الأمن (بيانات تفصيلية مختلفة)
const AIRPORT_LISTS: ListKey[] = [
  'ports_security_issue', 'ports_security_renew',
  'security_airports_issue', 'security_airports_renew',
];
const AIRPORT_RENEWAL_LISTS: ListKey[] = ['ports_security_renew', 'security_airports_renew'];
const PERMIT_PURPOSE = 'إنهاء إجراءات الركاب';
const PERMIT_AIRPORTS = 'عموم المطارات';
const religionAr = (v?: string | null) => {
  const s = (v || '').trim().toLowerCase();
  if (s === 'muslim' || s === 'مسلم' || s === 'مسلمة') return 'مسلم';
  if (s === 'christian' || s === 'مسيحي' || s === 'مسيحية') return 'مسيحي';
  return v || '';
};

const VISIT_AREA = 'صالة - مهبط مباني 1،2،3 وترانزيت وبضائع';

const SECTIONS: { key: string; ar: string; en: string; icon: React.ElementType; lists: { key: ListKey; ar: string; en: string }[] }[] = [
  {
    key: 'security', ar: 'قطاع الأمن', en: 'Security Sector', icon: ShieldCheck,
    lists: [
      { key: 'security_airports_issue', ar: 'مطارات - استخراج', en: 'Airports - New' },
      { key: 'security_airports_renew', ar: 'مطارات - تجديد', en: 'Airports - Renewal' },
      { key: 'security_cairo_issue', ar: 'القاهرة - استخراج', en: 'Cairo - New' },
      { key: 'security_cairo_renew', ar: 'القاهرة - تجديد', en: 'Cairo - Renewal' },
    ],
  },
  {
    key: 'ports_security', ar: 'أمن المواني', en: 'Ports Security', icon: Anchor,
    lists: [
      { key: 'ports_security_issue', ar: 'استخراج', en: 'New' },
      { key: 'ports_security_renew', ar: 'تجديد', en: 'Renewal' },
    ],
  },
  {
    key: 'port_authority', ar: 'هيئة الميناء', en: 'Port Authority', icon: Ship,
    lists: [
      { key: 'port_authority_issue', ar: 'استخراج', en: 'New' },
      { key: 'port_authority_renew', ar: 'تجديد', en: 'Renewal' },
    ],
  },
];

const Permits = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';

  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [stationMap, setStationMap] = useState<Map<string, string>>(new Map());
  const [deptMap, setDeptMap] = useState<Map<string, string>>(new Map());
  const [entries, setEntries] = useState<PermitEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const all: EmployeeLite[] = [];
    for (let from = 0; from < 10000; from += 1000) {
      const { data, error } = await supabase
        .from('employees')
        .select('id, employee_code, name_ar, name_en, job_title_ar, job_title_en, station_id, department_id, nationality, religion, birth_date, birth_governorate, national_id, issuing_authority, permit_name_ar, address, phone, annual_permit_no, id_issue_date, permit_name_en, governorate, city, social_insurance_no, airports_annual_permit_no')
        .order('employee_code')
        .range(from, from + 999);
      if (error) break;
      all.push(...((data || []) as EmployeeLite[]));
      if (!data || data.length < 1000) break;
    }

    const [stationsRes, deptsRes, entriesRes] = await Promise.all([
      supabase.from('stations').select('id, name_ar, name_en'),
      supabase.from('departments').select('id, name_ar, name_en'),
      supabase.from('permit_list_entries').select('id, employee_id, list_key, status, permit_no, created_at').order('created_at', { ascending: false }),
    ]);

    setStationMap(new Map(((stationsRes.data || []) as any[]).map(s => [s.id, ar ? s.name_ar : s.name_en])));
    setDeptMap(new Map(((deptsRes.data || []) as any[]).map(d => [d.id, ar ? d.name_ar : d.name_en])));
    setEmployees(all);
    setEntries(((entriesRes.data || []) as any[]) as PermitEntry[]);
    setLoading(false);
  }, [ar]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const employeeById = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  const addEntry = async (employeeId: string, listKey: ListKey) => {
    const { data, error } = await supabase
      .from('permit_list_entries')
      .insert({ employee_id: employeeId, list_key: listKey })
      .select('id, employee_id, list_key, status, permit_no, created_at')
      .single();
    if (error) {
      toast.error(error.code === '23505'
        ? (ar ? 'الموظف مضاف بالفعل في هذه القائمة' : 'Employee already in this list')
        : (ar ? 'تعذر إضافة الموظف' : 'Could not add employee'));
      return;
    }
    setEntries(prev => [data as PermitEntry, ...prev]);
    toast.success(ar ? 'تمت الإضافة' : 'Added');
  };

  const removeEntry = async (id: string) => {
    const { error } = await supabase.from('permit_list_entries').delete().eq('id', id);
    if (error) { toast.error(ar ? 'تعذر الحذف' : 'Could not delete'); return; }
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success(ar ? 'تم الحذف' : 'Deleted');
  };

  const updateStatus = async (id: string, status: 'in_progress' | 'done') => {
    const { error } = await supabase.from('permit_list_entries').update({ status }).eq('id', id);
    if (error) { toast.error(ar ? 'تعذر تحديث الحالة' : 'Could not update status'); return; }
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, status } : e)));
  };

  const updatePermitNo = async (id: string, permit_no: string) => {
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, permit_no } : e)));
    const { error } = await supabase.from('permit_list_entries').update({ permit_no }).eq('id', id);
    if (error) toast.error(ar ? 'تعذر حفظ رقم التصريح' : 'Could not save permit number');
  };

  // يحفظ التعديلات في سجل الموظف الأساسي (جدول الموظفين) وليس في قائمة التصاريح فقط
  const saveEmployee = async (employeeId: string, updates: Partial<EmployeeLite>) => {
    const payload: Record<string, unknown> = {};
    Object.entries(updates).forEach(([k, v]) => {
      payload[k] = typeof v === 'string' && v.trim() === '' ? null : v;
    });
    const { error } = await supabase.from('employees').update(payload as never).eq('id', employeeId);
    if (error) {
      toast.error(ar ? 'تعذر حفظ التعديلات' : 'Could not save changes');
      return false;
    }
    setEmployees(prev => prev.map(e => (e.id === employeeId ? { ...e, ...(payload as Partial<EmployeeLite>) } : e)));
    toast.success(ar ? 'تم حفظ التعديلات في ملف الموظف' : 'Saved to employee record');
    return true;
  };


  return (
    <DashboardLayout>
      <main className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div>
          <h1 className="text-2xl font-bold">{ar ? 'التصاريح' : 'Permits'}</h1>
          <p className="text-sm text-muted-foreground">
            {ar ? 'قوائم الموظفين المطلوب استخراج أو تجديد تصاريحهم' : 'Employee lists for permit issuance and renewal'}
          </p>
        </div>

        <Tabs defaultValue={SECTIONS[0].key} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto">
            {SECTIONS.map(section => (
              <TabsTrigger key={section.key} value={section.key} className="gap-2">
                <section.icon className="w-4 h-4" />
                {ar ? section.ar : section.en}
              </TabsTrigger>
            ))}
          </TabsList>

          {SECTIONS.map(section => (
            <TabsContent key={section.key} value={section.key}>
              <Tabs defaultValue={section.lists[0].key} className="space-y-4">
                <TabsList className="flex flex-wrap h-auto">
                  {section.lists.map(list => (
                    <TabsTrigger key={list.key} value={list.key}>
                      {ar ? list.ar : list.en}
                      <Badge variant="secondary" className="ms-2">
                        {entries.filter(e => e.list_key === list.key).length}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {section.lists.map(list => (
                  <TabsContent key={list.key} value={list.key}>
                    <PermitListPanel
                      title={`${ar ? section.ar : section.en}: ${ar ? list.ar : list.en}`}
                      listKey={list.key}
                      entries={entries.filter(e => e.list_key === list.key)}
                      employees={employees}
                      employeeById={employeeById}
                      stationMap={stationMap}
                      deptMap={deptMap}
                      loading={loading}
                      ar={ar}
                      isRTL={isRTL}
                      onAdd={addEntry}
                      onRemove={removeEntry}
                      onStatusChange={updateStatus}
                      onPermitNoChange={updatePermitNo}
                      onEmployeeSave={saveEmployee}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </DashboardLayout>
  );
};

interface PanelProps {
  title: string;
  listKey: ListKey;
  entries: PermitEntry[];
  employees: EmployeeLite[];
  employeeById: Map<string, EmployeeLite>;
  stationMap: Map<string, string>;
  deptMap: Map<string, string>;
  loading: boolean;
  ar: boolean;
  isRTL: boolean;
  onAdd: (employeeId: string, listKey: ListKey) => void;
  onRemove: (id: string) => void;
  onStatusChange: (id: string, status: 'in_progress' | 'done') => void;
  onPermitNoChange: (id: string, permitNo: string) => void;
  onEmployeeSave: (employeeId: string, updates: Partial<EmployeeLite>) => Promise<boolean>;
}

const PermitListPanel = ({
  title, listKey, entries, employees, employeeById, stationMap, deptMap,
  loading, ar, isRTL, onAdd, onRemove, onStatusChange, onPermitNoChange, onEmployeeSave,
}: PanelProps) => {
  const [editEmp, setEditEmp] = useState<EmployeeLite | null>(null);
  const detailed = DETAILED_LISTS.includes(listKey);
  const isRenewal = RENEWAL_LISTS.includes(listKey);
  const airportDetailed = AIRPORT_LISTS.includes(listKey);
  const isAirportRenewal = AIRPORT_RENEWAL_LISTS.includes(listKey);
  const colCount = 8
    + (detailed ? (isRenewal ? 11 : 10) : 0)
    + (airportDetailed ? (isAirportRenewal ? 14 : 13) : 0);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [addSearch, setAddSearch] = useState('');

  const existingIds = useMemo(() => new Set(entries.map(e => e.employee_id)), [entries]);
  // Filter the FULL roster by the picker search first, then cap the rendered
  // list — otherwise employees beyond the first 400 can never be found.
  const selectable = useMemo(() => {
    const s = addSearch.trim().toLowerCase();
    return employees
      .filter(e => !existingIds.has(e.id))
      .filter(e => !s
        || e.name_ar.toLowerCase().includes(s)
        || (e.name_en || '').toLowerCase().includes(s)
        || (e.employee_code || '').toLowerCase().includes(s))
      .slice(0, 400);
  }, [employees, existingIds, addSearch]);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return entries.filter(entry => {
      if (!s) return true;
      const emp = employeeById.get(entry.employee_id);
      if (!emp) return false;
      return emp.name_ar.toLowerCase().includes(s)
        || (emp.name_en || '').toLowerCase().includes(s)
        || (emp.employee_code || '').toLowerCase().includes(s);
    });
  }, [entries, employeeById, search]);

  const canExportRenewalSheet = listKey === 'port_authority_renew';
  const canExportCairoLetter = listKey === 'security_cairo_renew';
  const canExportCairoIssueLetter = listKey === 'security_cairo_issue';
  const canExportPortIssueLetter = listKey === 'port_authority_issue';
  const canExportAirportsIssueLetter = listKey === 'security_airports_issue';
  const canExportAirportsRenewalLetter = listKey === 'security_airports_renew';
  const canExportPortsSecurityIssueLetter = listKey === 'ports_security_issue';
  const canExportPortsSecurityRenewalLetter = listKey === 'ports_security_renew';

  const handleExportSheet = async () => {
    const data = rows.map(entry => {
      const emp = employeeById.get(entry.employee_id);
      return {
        name: emp?.name_ar || '',
        nationality: emp?.nationality || '',
        religion: religionAr(emp?.religion),
        birthDate: fmt(emp?.birth_date),
        birthGovernorate: emp?.birth_governorate || '',
        nationalId: emp?.national_id || '',
        issuingAuthority: emp?.issuing_authority || '',
        jobTitle: emp?.permit_name_ar || emp?.job_title_ar || '',
        address: emp?.address || '',
        visitArea: VISIT_AREA,
        permitNo: entry.permit_no ?? emp?.annual_permit_no ?? '',
        phone: emp?.phone || '',
      };
    });
    if (data.length === 0) {
      toast.error(ar ? 'لا توجد أسماء للتصدير' : 'No rows to export');
      return;
    }
    const year = String(new Date().getFullYear());
    await exportPermitRenewalSheet(data, year, `كشف_تجديد_${year}.xlsx`);
    toast.success(ar ? 'تم تنزيل الكشف' : 'Sheet downloaded');
  };

  const handleExportLetter = async () => {
    if (rows.length === 0) {
      toast.error(ar ? 'لا توجد أسماء للتصدير' : 'No rows to export');
      return;
    }
    const data = rows.map(entry => {
      const emp = employeeById.get(entry.employee_id);
      return {
        name: emp?.name_ar || '',
        jobTitle: emp?.permit_name_ar || emp?.job_title_ar || '',
      };
    });
    const year = String(new Date().getFullYear());
    await exportPortAuthorityRenewalLetter(data, year, formatDate(new Date().toISOString()));
    toast.success(ar ? 'تم تنزيل الخطاب' : 'Letter downloaded');
  };

  const handleExportCairoLetter = async () => {
    if (rows.length === 0) {
      toast.error(ar ? 'لا توجد أسماء للتصدير' : 'No rows to export');
      return;
    }
    const data = rows.map(entry => {
      const emp = employeeById.get(entry.employee_id);
      return {
        name: emp?.name_ar || '',
        jobTitle: emp?.permit_name_ar || emp?.job_title_ar || '',
      };
    });
    const year = String(new Date().getFullYear() + 1);
    await exportSecurityCairoRenewalLetter(data, year, formatDate(new Date().toISOString()));
    toast.success(ar ? 'تم تنزيل الخطاب' : 'Letter downloaded');
  };

  const handleExportCairoIssueLetter = async () => {
    if (rows.length === 0) {
      toast.error(ar ? 'لا توجد أسماء للتصدير' : 'No rows to export');
      return;
    }
    const data = rows.map(entry => {
      const emp = employeeById.get(entry.employee_id);
      return {
        name: emp?.name_ar || '',
        jobTitle: emp?.permit_name_ar || emp?.job_title_ar || '',
      };
    });
    const year = String(new Date().getFullYear() + 1);
    await exportSecurityCairoIssueLetter(data, year, formatDate(new Date().toISOString()));
    toast.success(ar ? 'تم تنزيل الخطاب' : 'Letter downloaded');
  };

  const handleExportPortIssueLetter = async () => {
    if (rows.length === 0) {
      toast.error(ar ? 'لا توجد أسماء للتصدير' : 'No rows to export');
      return;
    }
    const data = rows.map(entry => {
      const emp = employeeById.get(entry.employee_id);
      return {
        name: emp?.name_ar || '',
        jobTitle: emp?.permit_name_ar || emp?.job_title_ar || '',
      };
    });
    const year = String(new Date().getFullYear());
    await exportPortAuthorityIssueLetter(data, year, formatDate(new Date().toISOString()));
    toast.success(ar ? 'تم تنزيل الخطاب' : 'Letter downloaded');
  };

  const handleExportAirportsIssueLetter = async () => {
    if (rows.length === 0) {
      toast.error(ar ? 'لا توجد أسماء للتصدير' : 'No rows to export');
      return;
    }
    const data = rows.map(entry => {
      const emp = employeeById.get(entry.employee_id);
      return {
        name: emp?.name_ar || '',
        jobTitle: emp?.permit_name_ar || emp?.job_title_ar || '',
      };
    });
    const year = String(new Date().getFullYear() + 1);
    await exportSecurityAirportsIssueLetter(data, year, formatDate(new Date().toISOString()), PERMIT_PURPOSE, PERMIT_AIRPORTS);
    toast.success(ar ? 'تم تنزيل الخطاب' : 'Letter downloaded');
  };

  const handleExportAirportsRenewalLetter = async () => {
    if (rows.length === 0) {
      toast.error(ar ? 'لا توجد أسماء للتصدير' : 'No rows to export');
      return;
    }
    const data = rows.map(entry => {
      const emp = employeeById.get(entry.employee_id);
      return {
        name: emp?.name_ar || '',
        jobTitle: emp?.permit_name_ar || emp?.job_title_ar || '',
      };
    });
    const year = String(new Date().getFullYear() + 1);
    await exportSecurityAirportsRenewalLetter(data, year, formatDate(new Date().toISOString()), PERMIT_PURPOSE, PERMIT_AIRPORTS);
    toast.success(ar ? 'تم تنزيل الخطاب' : 'Letter downloaded');
  };

  const handleExportPortsSecurityIssueLetter = async () => {
    if (rows.length === 0) {
      toast.error(ar ? 'لا توجد أسماء للتصدير' : 'No rows to export');
      return;
    }
    const data = rows.map(entry => {
      const emp = employeeById.get(entry.employee_id);
      return {
        name: emp?.name_ar || '',
        jobTitle: emp?.permit_name_ar || emp?.job_title_ar || '',
      };
    });
    const year = String(new Date().getFullYear());
    await exportPortsSecurityIssueLetter(data, year, formatDate(new Date().toISOString()), PERMIT_PURPOSE, PERMIT_AIRPORTS);
    toast.success(ar ? 'تم تنزيل الخطاب' : 'Letter downloaded');
  };

  const handleExportPortsSecuritySheet = async () => {
    if (rows.length === 0) {
      toast.error(ar ? 'لا توجد أسماء للتصدير' : 'No rows to export');
      return;
    }
    const data = rows.map(entry => {
      const emp = employeeById.get(entry.employee_id);
      return {
        nameAr: emp?.name_ar || '',
        nameEn: emp?.name_en || '',
        nationality: emp?.nationality || '',
        nationalId: emp?.national_id || '',
        jobAr: emp?.permit_name_ar || emp?.job_title_ar || '',
        jobEn: emp?.permit_name_en || emp?.job_title_en || '',
        birthPlace: emp?.birth_governorate || '',
        birthDate: fmt(emp?.birth_date),
        governorate: emp?.governorate || '',
        city: emp?.city || '',
        address: emp?.address || '',
      };
    });
    const year = String(new Date().getFullYear() + 1);
    await exportPortsSecuritySheet(data, year, `استخراج_امن_مؤاني_${year}.xlsx`);
    toast.success(ar ? 'تم تنزيل الكشف' : 'Sheet downloaded');
  };

  const handleExportPortsSecurityRenewalLetter = async () => {
    if (rows.length === 0) {
      toast.error(ar ? 'لا توجد أسماء للتصدير' : 'No rows to export');
      return;
    }
    const data = rows.map(entry => {
      const emp = employeeById.get(entry.employee_id);
      return {
        name: emp?.name_ar || '',
        jobTitle: emp?.permit_name_ar || emp?.job_title_ar || '',
      };
    });
    const year = String(new Date().getFullYear());
    await exportPortsSecurityRenewalLetter(data, year, formatDate(new Date().toISOString()), PERMIT_PURPOSE, PERMIT_AIRPORTS);
    toast.success(ar ? 'تم تنزيل الخطاب' : 'Letter downloaded');
  };

  const handleExportPortsSecurityRenewalSheet = async () => {
    if (rows.length === 0) {
      toast.error(ar ? 'لا توجد أسماء للتصدير' : 'No rows to export');
      return;
    }
    const data = rows.map(entry => {
      const emp = employeeById.get(entry.employee_id);
      return {
        permitNo: entry.permit_no ?? emp?.airports_annual_permit_no ?? '',
        nameAr: emp?.name_ar || '',
        nameEn: emp?.name_en || '',
        nationality: emp?.nationality || '',
        nationalId: emp?.national_id || '',
        jobAr: emp?.permit_name_ar || emp?.job_title_ar || '',
        jobEn: emp?.permit_name_en || emp?.job_title_en || '',
        birthPlace: emp?.birth_governorate || '',
        birthDate: fmt(emp?.birth_date),
        governorate: emp?.governorate || '',
        city: emp?.city || '',
        address: emp?.address || '',
      };
    });
    const year = String(new Date().getFullYear() + 1);
    await exportPortsSecurityRenewalSheet(data, year, `تجديد_امن_مؤاني_${year}.xlsx`);
    toast.success(ar ? 'تم تنزيل الكشف' : 'Sheet downloaded');
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className={cn('absolute top-2.5 w-4 h-4 text-muted-foreground', isRTL ? 'right-3' : 'left-3')} />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={ar ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
              className={cn('w-full sm:w-64', isRTL ? 'pr-9' : 'pl-9')}
            />
          </div>
          {canExportRenewalSheet && (
            <>
              <Button variant="outline" className="gap-2" onClick={handleExportSheet}>
                <FileSpreadsheet className="w-4 h-4" />
                {ar ? 'تصدير كشف التجديد' : 'Export renewal sheet'}
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportLetter}>
                <FileText className="w-4 h-4" />
                {ar ? 'تصدير خطاب التجديد' : 'Export renewal letter'}
              </Button>
            </>
          )}
          {canExportCairoLetter && (
            <Button variant="outline" className="gap-2" onClick={handleExportCairoLetter}>
              <FileText className="w-4 h-4" />
              {ar ? 'تصدير خطاب التجديد' : 'Export renewal letter'}
            </Button>
          )}
          {canExportCairoIssueLetter && (
            <Button variant="outline" className="gap-2" onClick={handleExportCairoIssueLetter}>
              <FileText className="w-4 h-4" />
              {ar ? 'تصدير خطاب الاستخراج' : 'Export issuance letter'}
            </Button>
          )}
          {canExportPortIssueLetter && (
            <Button variant="outline" className="gap-2" onClick={handleExportPortIssueLetter}>
              <FileText className="w-4 h-4" />
              {ar ? 'تصدير خطاب الاستخراج' : 'Export issuance letter'}
            </Button>
          )}
          {canExportAirportsIssueLetter && (
            <Button variant="outline" className="gap-2" onClick={handleExportAirportsIssueLetter}>
              <FileText className="w-4 h-4" />
              {ar ? 'تصدير خطاب الاستخراج' : 'Export issuance letter'}
            </Button>
          )}
          {canExportAirportsRenewalLetter && (
            <Button variant="outline" className="gap-2" onClick={handleExportAirportsRenewalLetter}>
              <FileText className="w-4 h-4" />
              {ar ? 'تصدير خطاب التجديد' : 'Export renewal letter'}
            </Button>
          )}
          {canExportPortsSecurityIssueLetter && (
            <>
              <Button variant="outline" className="gap-2" onClick={handleExportPortsSecurityIssueLetter}>
                <FileText className="w-4 h-4" />
                {ar ? 'تصدير خطاب الاستخراج' : 'Export issuance letter'}
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportPortsSecuritySheet}>
                <FileSpreadsheet className="w-4 h-4" />
                {ar ? 'تصدير كشف الاستخراج' : 'Export issuance sheet'}
              </Button>
            </>
          )}
          {canExportPortsSecurityRenewalLetter && (
            <>
              <Button variant="outline" className="gap-2" onClick={handleExportPortsSecurityRenewalLetter}>
                <FileText className="w-4 h-4" />
                {ar ? 'تصدير خطاب التجديد' : 'Export renewal letter'}
              </Button>
              <Button variant="outline" className="gap-2" onClick={handleExportPortsSecurityRenewalSheet}>
                <FileSpreadsheet className="w-4 h-4" />
                {ar ? 'تصدير كشف التجديد' : 'Export renewal sheet'}
              </Button>
            </>
          )}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                {ar ? 'إضافة موظف' : 'Add employee'}
                <ChevronsUpDown className="w-4 h-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 bg-popover z-50" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={ar ? 'ابحث بالاسم أو الكود...' : 'Search by name or code...'}
                  value={addSearch}
                  onValueChange={setAddSearch}
                />
                <CommandList className="max-h-[300px] overflow-y-auto">
                  <CommandEmpty>{ar ? 'لا يوجد موظف' : 'No employee found'}</CommandEmpty>
                  <CommandGroup>
                    {selectable.map(emp => (
                      <CommandItem
                        key={emp.id}
                        value={`${emp.name_ar} ${emp.name_en} ${emp.employee_code}`}
                        onSelect={() => { onAdd(emp.id, listKey); setOpen(false); }}
                      >
                        <div className={cn('flex flex-col min-w-0', isRTL && 'items-end')}>
                          <span className="font-medium truncate">{ar ? emp.name_ar : emp.name_en}</span>
                          <span className="text-xs text-muted-foreground truncate">{emp.employee_code}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{ar ? 'الكود' : 'Code'}</TableHead>
                <TableHead>{ar ? 'اسم الموظف' : 'Employee'}</TableHead>
                <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                <TableHead>{ar ? 'القسم' : 'Department'}</TableHead>
                <TableHead>{ar ? 'المسمى الوظيفي' : 'Job Title'}</TableHead>
                {detailed && (
                  <>
                    <TableHead>{ar ? 'الجنسية' : 'Nationality'}</TableHead>
                    <TableHead>{ar ? 'الديانة' : 'Religion'}</TableHead>
                    <TableHead>{ar ? 'تاريخ الميلاد' : 'Birth Date'}</TableHead>
                    <TableHead>{ar ? 'محافظة الميلاد' : 'Birth Governorate'}</TableHead>
                    <TableHead>{ar ? 'الرقم القومي' : 'National ID'}</TableHead>
                    <TableHead>{ar ? 'جهة الإصدار' : 'Issuing Authority'}</TableHead>
                    <TableHead>{ar ? 'المسمى في التصريح' : 'Permit Title (AR)'}</TableHead>
                    <TableHead>{ar ? 'العنوان' : 'Address'}</TableHead>
                    {isRenewal && <TableHead>{ar ? 'رقم التصريح' : 'Permit No.'}</TableHead>}
                    <TableHead>{ar ? 'الهاتف المحمول' : 'Mobile'}</TableHead>
                    <TableHead>{ar ? 'منطقة الارتياد' : 'Visit Area'}</TableHead>
                  </>
                )}
                {airportDetailed && (
                  <>
                    <TableHead>{ar ? 'الاسم بالإنجليزية' : 'Full Name (EN)'}</TableHead>
                    <TableHead>{ar ? 'الجنسية' : 'Nationality'}</TableHead>
                    <TableHead>{ar ? 'الرقم القومي' : 'National ID'}</TableHead>
                    <TableHead>{ar ? 'المسمى في التصريح (ع)' : 'Permit Title (AR)'}</TableHead>
                    <TableHead>{ar ? 'المسمى في التصريح (إن)' : 'Permit Title (EN)'}</TableHead>
                    <TableHead>{ar ? 'محافظة الميلاد' : 'Birth Governorate'}</TableHead>
                    <TableHead>{ar ? 'تاريخ الميلاد' : 'Birth Date'}</TableHead>
                    <TableHead>{ar ? 'المحافظة' : 'Governorate'}</TableHead>
                    <TableHead>{ar ? 'المدينة' : 'City'}</TableHead>
                    <TableHead>{ar ? 'العنوان' : 'Address'}</TableHead>
                    {isAirportRenewal && <TableHead>{ar ? 'تصريح المطارات السنوي' : 'Airports Annual Permit'}</TableHead>}
                    <TableHead>{ar ? 'الرقم التأميني' : 'Insurance No.'}</TableHead>
                    <TableHead>{ar ? 'الغرض من التصريح' : 'Permit Purpose'}</TableHead>
                    <TableHead>{ar ? 'المطارات المراد ارتيادها' : 'Airports'}</TableHead>
                  </>
                )}
                <TableHead>{ar ? 'تاريخ الإضافة' : 'Added On'}</TableHead>
                <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={colCount} className="text-center py-8 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={colCount} className="text-center py-8 text-muted-foreground">{ar ? 'لا توجد أسماء في هذه القائمة' : 'No employees in this list'}</TableCell></TableRow>
              ) : rows.map(entry => {
                const emp = employeeById.get(entry.employee_id);
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">{emp?.employee_code || '-'}</TableCell>
                    <TableCell className="font-medium whitespace-pre-wrap break-words">{(ar ? emp?.name_ar : emp?.name_en) || '-'}</TableCell>
                    <TableCell>{(emp?.station_id && stationMap.get(emp.station_id)) || '-'}</TableCell>
                    <TableCell>{(emp?.department_id && deptMap.get(emp.department_id)) || '-'}</TableCell>
                    <TableCell className="whitespace-pre-wrap break-words">{emp?.permit_name_ar || emp?.job_title_ar || '-'}</TableCell>
                    {detailed && (
                      <>
                        <TableCell>{emp?.nationality || '-'}</TableCell>
                        <TableCell>{religionAr(emp?.religion) || '-'}</TableCell>
                        <TableCell>{emp?.birth_date ? formatDate(emp.birth_date) : '-'}</TableCell>
                        <TableCell>{emp?.birth_governorate || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{emp?.national_id || '-'}</TableCell>
                        <TableCell className="whitespace-pre-wrap break-words">{emp?.issuing_authority || '-'}</TableCell>
                        <TableCell className="whitespace-pre-wrap break-words">{emp?.permit_name_ar || '-'}</TableCell>
                        <TableCell className="whitespace-pre-wrap break-words max-w-[220px]">{emp?.address || '-'}</TableCell>
                        {isRenewal && (
                          <TableCell>
                            <PermitNoInput
                              value={entry.permit_no ?? emp?.annual_permit_no ?? ''}
                              onSave={(v) => onPermitNoChange(entry.id, v)}
                              placeholder={ar ? 'رقم التصريح' : 'Permit no.'}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-xs" dir="ltr">{emp?.phone || '-'}</TableCell>
                        <TableCell className="whitespace-pre-wrap break-words max-w-[220px]">{VISIT_AREA}</TableCell>
                      </>
                    )}
                    {airportDetailed && (
                      <>
                        <TableCell className="whitespace-pre-wrap break-words">{emp?.name_en || '-'}</TableCell>
                        <TableCell>{emp?.nationality || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{emp?.national_id || '-'}</TableCell>
                        <TableCell className="whitespace-pre-wrap break-words">{emp?.permit_name_ar || '-'}</TableCell>
                        <TableCell className="whitespace-pre-wrap break-words">{emp?.permit_name_en || '-'}</TableCell>
                        <TableCell>{emp?.birth_governorate || '-'}</TableCell>
                        <TableCell>{emp?.birth_date ? formatDate(emp.birth_date) : '-'}</TableCell>
                        <TableCell>{emp?.governorate || '-'}</TableCell>
                        <TableCell>{emp?.city || '-'}</TableCell>
                        <TableCell className="whitespace-pre-wrap break-words max-w-[220px]">{emp?.address || '-'}</TableCell>
                        {isAirportRenewal && (
                          <TableCell>
                            <PermitNoInput
                              value={entry.permit_no ?? emp?.airports_annual_permit_no ?? ''}
                              onSave={(v) => onPermitNoChange(entry.id, v)}
                              placeholder={ar ? 'رقم التصريح' : 'Permit no.'}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-xs">{emp?.social_insurance_no || '-'}</TableCell>
                        <TableCell className="whitespace-pre-wrap break-words">{PERMIT_PURPOSE}</TableCell>
                        <TableCell className="whitespace-pre-wrap break-words">{PERMIT_AIRPORTS}</TableCell>
                      </>
                    )}
                    <TableCell>{formatDate(entry.created_at)}</TableCell>
                    <TableCell>
                      <Select value={entry.status} onValueChange={(v) => onStatusChange(entry.id, v as 'in_progress' | 'done')}>
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          <SelectItem value="in_progress">{ar ? 'قيد التنفيذ' : 'In progress'}</SelectItem>
                          <SelectItem value="done">{ar ? 'تم' : 'Done'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => onRemove(entry.id)} aria-label={ar ? 'حذف' : 'Delete'}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

const PermitNoInput = ({ value, onSave, placeholder }: { value: string; onSave: (v: string) => void; placeholder: string }) => {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  return (
    <Input
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onSave(local.trim()); }}
      placeholder={placeholder}
      className="w-[140px] h-8"
    />
  );
};

export default Permits;
