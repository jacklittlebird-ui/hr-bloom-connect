import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { useUniformData, getDepreciationPercent, getCurrentValue } from '@/contexts/UniformDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Hash, Banknote, Coins, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UniformsTabProps { employee: Employee }

export const UniformsTab = ({ employee }: UniformsTabProps) => {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { getEmployeeUniforms } = useUniformData();
  const myUniforms = getEmployeeUniforms(employee.id);

  const totalCurrentValue = myUniforms.reduce((s, u) => s + getCurrentValue(u.totalPrice, u.deliveryDate), 0);
  const totalOriginalValue = myUniforms.reduce((s, u) => s + u.totalPrice, 0);

  const [ackDates, setAckDates] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!employee?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('uniform_acknowledgments')
        .select('uniform_id, acknowledged_at')
        .eq('employee_id', employee.id);
      if (!cancelled && data) {
        const m: Record<string, string> = {};
        data.forEach((a: any) => { m[a.uniform_id] = a.acknowledged_at; });
        setAckDates(m);
      }
    })();
    return () => { cancelled = true; };
  }, [employee?.id]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { icon: Hash, label: ar ? 'عدد الأصناف' : 'Items', value: myUniforms.length, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
          { icon: Banknote, label: ar ? 'القيمة الأصلية' : 'Original Value', value: totalOriginalValue.toLocaleString(), gradient: 'from-slate-500 to-gray-500', bg: 'bg-slate-50 dark:bg-slate-950/40' },
          { icon: Coins, label: ar ? 'القيمة المستحقة الحالية' : 'Current Due', value: totalCurrentValue.toLocaleString(), gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
        ].map((s, i) => (
          <Card key={i} className={`border-0 shadow-sm ${s.bg}`}>
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-gradient-to-br ${s.gradient}`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <p className="text-sm flex items-center gap-2 text-amber-700">
            <Info className="w-4 h-4" />
            {ar
              ? 'القيمة المستحقة تتناقص تلقائياً: 75% بعد 3 أشهر، 50% بعد 6 أشهر، 25% بعد 9 أشهر، 0% بعد سنة.'
              : 'Due value depreciates automatically: 75% after 3 months, 50% after 6, 25% after 9, 0% after 12 months.'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{ar ? 'أصناف اليونيفورم' : 'Uniform Items'}</CardTitle>
        </CardHeader>
        <CardContent>
          {myUniforms.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {ar ? 'لا توجد أصناف يونيفورم حالياً' : 'No uniform items currently'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{ar ? 'الصنف' : 'Type'}</TableHead>
                    <TableHead>{ar ? 'العدد' : 'Qty'}</TableHead>
                    <TableHead>{ar ? 'القيمة الأصلية' : 'Original'}</TableHead>
                    <TableHead>{ar ? 'القيمة الحالية' : 'Current'}</TableHead>
                    <TableHead>{ar ? 'تاريخ التسليم' : 'Delivery'}</TableHead>
                    <TableHead>{ar ? 'الاستهلاك' : 'Depreciation'}</TableHead>
                    <TableHead>{ar ? 'تاريخ الإقرار' : 'Acknowledged'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myUniforms.map(u => {
                    const depPct = getDepreciationPercent(u.deliveryDate);
                    const curVal = getCurrentValue(u.totalPrice, u.deliveryDate);
                    const usedPct = 100 - depPct;
                    const ack = ackDates[u.id];
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{ar ? u.typeAr : u.typeEn}</TableCell>
                        <TableCell>{u.quantity}</TableCell>
                        <TableCell>{u.totalPrice.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-primary">{curVal.toLocaleString()}</TableCell>
                        <TableCell>{u.deliveryDate}</TableCell>
                        <TableCell>
                          <Badge variant={usedPct >= 75 ? 'destructive' : usedPct >= 50 ? 'secondary' : 'outline'}>
                            {usedPct}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {ack
                            ? new Date(ack).toLocaleDateString(ar ? 'ar-EG' : 'en-GB')
                            : <span className="text-destructive">{ar ? 'لم يتم' : 'Pending'}</span>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
