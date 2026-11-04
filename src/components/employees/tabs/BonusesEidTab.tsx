import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils';
import { Gift, Award } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

interface BonusesEidTabProps {
  employee: Employee;
}

interface EidRecord {
  id: string;
  year: string;
  bonus_number: number;
  amount: number;
  station_name: string | null;
  department_name: string | null;
  job_level: string | null;
  created_at: string;
}

interface BonusRecord {
  id: string;
  year: string;
  bonus_number: number;
  quarter?: string;
  amount: number;
  gross_salary: number;
  percentage: number;
  station_name: string | null;
  department_name: string | null;
  job_level: string | null;
  created_at: string;
}

export const BonusesEidTab = ({ employee }: BonusesEidTabProps) => {
  const { t, isRTL, language } = useLanguage();
  const isAr = language === 'ar';
  const [eidRecords, setEidRecords] = useState<EidRecord[]>([]);
  const [bonusRecords, setBonusRecords] = useState<BonusRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [eidRes, bonusRes, perfRes] = await Promise.all([
        supabase
          .from('eid_bonuses')
          .select('id, year, bonus_number, amount, station_name, department_name, job_level, created_at')
          .eq('employee_id', employee.id)
          .order('year', { ascending: false })
          .order('bonus_number', { ascending: false }),
        supabase
          .from('bonus_records')
          .select('id, year, bonus_number, amount, gross_salary, percentage, station_name, department_name, job_level, created_at')
          .eq('employee_id', employee.id)
          .order('year', { ascending: false })
          .order('bonus_number', { ascending: false }),
        supabase
          .from('performance_bonus_records')
          .select('id, year, quarter, amount, gross_salary, percentage, station_name, department_name, created_at')
          .eq('employee_id', employee.id),
      ]);
      const perfData = perfRes;
      setEidRecords(eidRes.data || []);
      const regular: BonusRecord[] = (bonusRes.data || []).map((r: any) => ({ ...r, amount: Number(r.amount || 0), gross_salary: Number(r.gross_salary || 0), percentage: Number(r.percentage || 0) }));
      const perf: BonusRecord[] = ((perfData as any)?.data || []).map((r: any) => ({
        id: r.id, year: r.year, bonus_number: 0, quarter: r.quarter, job_level: null,
        amount: Number(r.amount || 0), gross_salary: Number(r.gross_salary || 0), percentage: Number(r.percentage || 0),
        station_name: r.station_name, department_name: r.department_name, created_at: r.created_at,
      }));
      setBonusRecords([...regular, ...perf].sort((a, b) =>
        String(b.year).localeCompare(String(a.year)) || String(b.quarter || '').localeCompare(String(a.quarter || '')) || b.bonus_number - a.bonus_number));
      setLoading(false);
    };
    fetchData();
  }, [employee.id]);

  const totalEid = useMemo(() => eidRecords.reduce((s, r) => s + r.amount, 0), [eidRecords]);
  const totalBonus = useMemo(() => bonusRecords.reduce((s, r) => s + r.amount, 0), [bonusRecords]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className={cn("flex items-center gap-2 mb-2", isRTL && "flex-row-reverse")}>
            <Gift className="w-5 h-5 text-primary" />
            <span className="font-semibold">{isAr ? 'إجمالي العيديات' : 'Total Eid Bonuses'}</span>
          </div>
          <p className="text-2xl font-bold text-primary">{totalEid.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</p>
          <p className="text-sm text-muted-foreground">{eidRecords.length} {isAr ? 'سجل' : 'records'}</p>
        </div>
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className={cn("flex items-center gap-2 mb-2", isRTL && "flex-row-reverse")}>
            <Award className="w-5 h-5 text-primary" />
            <span className="font-semibold">{isAr ? 'إجمالي المكافآت' : 'Total Bonuses'}</span>
          </div>
          <p className="text-2xl font-bold text-primary">{totalBonus.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</p>
          <p className="text-sm text-muted-foreground">{bonusRecords.length} {isAr ? 'سجل' : 'records'}</p>
        </div>
      </div>

      <Tabs defaultValue="eid" dir={isRTL ? 'rtl' : 'ltr'}>
        <TabsList>
          <TabsTrigger value="eid" className="gap-2">
            <Gift className="w-4 h-4" />
            {isAr ? 'العيديات' : 'Eid Bonuses'}
          </TabsTrigger>
          <TabsTrigger value="bonus" className="gap-2">
            <Award className="w-4 h-4" />
            {isAr ? 'المكافآت' : 'Bonuses'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="eid" className="mt-4">
          {eidRecords.length === 0 ? (
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
                    <TableHead>{isAr ? 'المستوى' : 'Level'}</TableHead>
                    <TableHead>{isAr ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead>{isAr ? 'القسم' : 'Department'}</TableHead>
                    <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eidRecords.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.year}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.bonus_number}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">{r.amount.toLocaleString()}</TableCell>
                      <TableCell>{r.job_level || '-'}</TableCell>
                      <TableCell>{r.station_name || '-'}</TableCell>
                      <TableCell>{r.department_name || '-'}</TableCell>
                      <TableCell>{formatDate(r.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="bonus" className="mt-4">
          {bonusRecords.length === 0 ? (
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
                    <TableHead>{isAr ? 'الراتب الإجمالي' : 'Gross Salary'}</TableHead>
                    <TableHead>{isAr ? 'النسبة' : 'Percentage'}</TableHead>
                    <TableHead>{isAr ? 'المبلغ' : 'Amount'}</TableHead>
                    <TableHead>{isAr ? 'المستوى' : 'Level'}</TableHead>
                    <TableHead>{isAr ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead>{isAr ? 'التاريخ' : 'Date'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bonusRecords.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.year}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.quarter ? (isAr ? `تقييم ${r.quarter}` : `Eval ${r.quarter}`) : r.bonus_number}</Badge>
                      </TableCell>
                      <TableCell>{r.gross_salary.toLocaleString()}</TableCell>
                      <TableCell>{r.percentage}%</TableCell>
                      <TableCell className="font-semibold text-primary">{r.amount.toLocaleString()}</TableCell>
                      <TableCell>{r.job_level || '-'}</TableCell>
                      <TableCell>{r.station_name || '-'}</TableCell>
                      <TableCell>{formatDate(r.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
