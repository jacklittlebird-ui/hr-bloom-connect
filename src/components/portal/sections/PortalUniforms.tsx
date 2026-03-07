import { useLanguage } from '@/contexts/LanguageContext';
import { useUniformData, getDepreciationPercent, getCurrentValue } from '@/contexts/UniformDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shirt, Info, Hash, Banknote, Coins } from 'lucide-react';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

export const PortalUniforms = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language } = useLanguage();
  const { getEmployeeUniforms } = useUniformData();

  const myUniforms = getEmployeeUniforms(PORTAL_EMPLOYEE_ID);

  const totalCurrentValue = myUniforms.reduce((s, u) => s + getCurrentValue(u.totalPrice, u.deliveryDate), 0);
  const totalOriginalValue = myUniforms.reduce((s, u) => s + u.totalPrice, 0);

  return (
    <div className="space-y-6">
      <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
        <Shirt className="w-5 h-5 md:w-6 md:h-6 text-primary" />
        {language === 'ar' ? 'اليونيفورم' : 'Uniforms'}
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {[
          { icon: Hash, label: language === 'ar' ? 'عدد الأصناف' : 'Items', value: myUniforms.length, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
          { icon: Banknote, label: language === 'ar' ? 'القيمة الأصلية' : 'Original Value', value: totalOriginalValue.toLocaleString(), gradient: 'from-slate-500 to-gray-500', bg: 'bg-slate-50 dark:bg-slate-950/40' },
          { icon: Coins, label: language === 'ar' ? 'القيمة المستحقة الحالية' : 'Current Due', value: totalCurrentValue.toLocaleString(), gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
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
            {language === 'ar'
              ? 'القيمة المستحقة تتناقص تلقائياً: 75% بعد 3 أشهر، 50% بعد 6 أشهر، 25% بعد 9 أشهر، 0% بعد سنة (يتم إخفاء الصنف).'
              : 'Due value depreciates automatically: 75% after 3 months, 50% after 6, 25% after 9, 0% after 12 months (item hidden).'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{language === 'ar' ? 'أصناف اليونيفورم' : 'Uniform Items'}</CardTitle>
        </CardHeader>
        <CardContent>
          {myUniforms.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {language === 'ar' ? 'لا توجد أصناف يونيفورم حالياً' : 'No uniform items currently'}
            </p>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{language === 'ar' ? 'الصنف' : 'Type'}</TableHead>
                  <TableHead>{language === 'ar' ? 'العدد' : 'Qty'}</TableHead>
                  <TableHead>{language === 'ar' ? 'القيمة الأصلية' : 'Original'}</TableHead>
                  <TableHead>{language === 'ar' ? 'القيمة الحالية' : 'Current'}</TableHead>
                  <TableHead>{language === 'ar' ? 'تاريخ التسليم' : 'Delivery'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الاستهلاك' : 'Depreciation'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myUniforms.map(u => {
                  const depPct = getDepreciationPercent(u.deliveryDate);
                  const curVal = getCurrentValue(u.totalPrice, u.deliveryDate);
                  const usedPct = 100 - depPct;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{language === 'ar' ? u.typeAr : u.typeEn}</TableCell>
                      <TableCell>{u.quantity}</TableCell>
                      <TableCell>{u.totalPrice.toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-primary">{curVal.toLocaleString()}</TableCell>
                      <TableCell>{u.deliveryDate}</TableCell>
                      <TableCell>
                        <Badge variant={usedPct >= 75 ? 'destructive' : usedPct >= 50 ? 'secondary' : 'outline'}>
                          {usedPct}%
                        </Badge>
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