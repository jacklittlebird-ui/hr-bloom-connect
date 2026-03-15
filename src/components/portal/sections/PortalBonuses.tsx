import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/utils';
import { Award } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface BonusRecord {
  id: string;
  year: string;
  bonus_number: number;
  amount: number;
  percentage: number;
  station_name: string | null;
  created_at: string;
}

export const PortalBonuses = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const employeeId = usePortalEmployee();
  const [records, setRecords] = useState<BonusRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('bonus_records')
        .select('id, year, bonus_number, amount, percentage, station_name, created_at')
        .eq('employee_id', employeeId)
        .order('year', { ascending: false })
        .order('bonus_number', { ascending: false });
      setRecords(data || []);
      setLoading(false);
    };
    fetch();
  }, [employeeId]);

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
                <TableHead>{isAr ? 'رقم المنحة' : 'Bonus #'}</TableHead>
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
                  <TableCell><Badge variant="outline">{r.bonus_number}</Badge></TableCell>
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
