import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/utils';
import { Gift } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface EidRecord {
  id: string;
  year: string;
  bonus_number: number;
  amount: number;
  station_name: string | null;
  created_at: string;
}

export const PortalEidBonuses = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const employeeId = usePortalEmployee();
  const [records, setRecords] = useState<EidRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('eid_bonuses')
        .select('id, year, bonus_number, amount, station_name, created_at')
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
        <Gift className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">{isAr ? 'العيديات' : 'Eid Bonuses'}</h2>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {isAr ? 'لا توجد سجلات عيديات' : 'No Eid bonus records'}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isAr ? 'السنة' : 'Year'}</TableHead>
                <TableHead>{isAr ? 'رقم المنحة' : 'Bonus #'}</TableHead>
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
