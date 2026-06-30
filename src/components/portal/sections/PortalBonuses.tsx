import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/utils';
import { Award } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface BonusRecord {
  id: string;
  type: 'regular' | 'performance';
  year: string;
  bonus_number?: number;
  quarter?: string;
  amount: number;
  percentage: number;
  station_name: string | null;
  created_at: string;
  sent_at?: string | null;
}

export const PortalBonuses = () => {
  const { language } = useLanguage();
  const { loading: authLoading, session } = useAuth();
  const isAr = language === 'ar';
  const employeeId = usePortalEmployee();
  const [records, setRecords] = useState<BonusRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      setRecords([]);
      setLoading(false);
      return;
    }
    const fetch = async () => {
      setLoading(true);
      const regularPromise = employeeId
        ? supabase
            .from('bonus_records')
            .select('id, year, bonus_number, amount, percentage, station_name, created_at')
            .eq('employee_id', employeeId)
            .order('year', { ascending: false })
            .order('bonus_number', { ascending: false })
        : Promise.resolve({ data: [], error: null });

      const [{ data: regularData, error: regularError }, { data: performanceData, error: performanceError }] = await Promise.all([
        regularPromise,
        supabase.rpc('get_my_performance_bonuses'),
      ]);

      if (regularError) console.error('Portal regular bonuses fetch error:', regularError);
      if (performanceError) console.error('Portal performance bonuses fetch error:', performanceError);

      const regular: BonusRecord[] = (regularData || []).map((r: any) => ({
        id: r.id,
        type: 'regular',
        year: r.year,
        bonus_number: r.bonus_number,
        amount: Number(r.amount || 0),
        percentage: Number(r.percentage || 0),
        station_name: r.station_name,
        created_at: r.created_at,
      }));

      const performance: BonusRecord[] = (performanceData || []).map((r: any) => ({
        id: r.id,
        type: 'performance',
        year: r.year,
        quarter: r.quarter,
        amount: Number(r.amount || 0),
        percentage: Number(r.percentage || 0),
        station_name: r.station_name,
        created_at: r.created_at,
        sent_at: r.sent_at,
      }));

      setRecords([...regular, ...performance].sort((a, b) => String(b.sent_at || b.created_at).localeCompare(String(a.sent_at || a.created_at))));
      setLoading(false);
    };
    fetch();
  }, [authLoading, session?.user, employeeId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Award className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">{isAr ? 'المكافآت' : 'Bonuses'}</h2>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {isAr ? 'لا توجد سجلات مكافآت' : 'No bonus records'}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'السنة' : 'Year'}</TableHead>
                <TableHead>{isAr ? 'النوع / الفترة' : 'Type / Period'}</TableHead>
                <TableHead>{isAr ? 'النسبة' : 'Percentage'}</TableHead>
                <TableHead>{isAr ? 'المبلغ' : 'Amount'}</TableHead>
                <TableHead>{isAr ? 'المحطة' : 'Station'}</TableHead>
                <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.year}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {r.type === 'performance'
                        ? (isAr ? `مكافأة تقييم ${r.quarter || ''}` : `Performance ${r.quarter || ''}`)
                        : (isAr ? `منحة رقم ${r.bonus_number}` : `Bonus #${r.bonus_number}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.percentage}%</TableCell>
                  <TableCell className="font-semibold text-primary">{r.amount.toLocaleString()}</TableCell>
                  <TableCell>{r.station_name || '-'}</TableCell>
                  <TableCell>{formatDate(r.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
