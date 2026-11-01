import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchAllPages } from '@/lib/fetchAllPages';
import { RosterGrid } from '@/components/attendance/RosterGrid';
import { Employee } from '@/types/employee';
import { Loader2 } from 'lucide-react';

/**
 * Roster for the station vehicle portal: loads the station's employees
 * (scoped by RLS to the account's station) and renders the shared grid.
 */
export function VehicleRoster() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchAllPages<any>((f, t) =>
          supabase
            .from('employees')
            .select('id, employee_code, name_ar, name_en, status, station_id, job_title_ar, job_title_en, departments(name_ar), stations(code)')
            .order('employee_code')
            .range(f, t)
        );
        if (cancelled) return;
        const mapped = (rows || []).map((r) => ({
          id: r.id,
          employeeId: r.employee_code,
          nameAr: r.name_ar,
          nameEn: r.name_en,
          department: r.departments?.name_ar || '-',
          jobTitle: r.job_title_en || '',
          jobTitleAr: r.job_title_ar || '',
          status: r.status,
          stationLocation: r.stations?.code || '',
        })) as Employee[];
        setEmployees(user?.station ? mapped.filter((e) => e.stationLocation === user.station) : mapped);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.station]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin me-2" />
        {ar ? 'جاري تحميل الروستر...' : 'Loading roster...'}
      </div>
    );
  }

  return <RosterGrid employees={employees} />;
}
