import { useLanguage } from '@/contexts/LanguageContext';
import { useUniformData, getDepreciationPercent, getCurrentValue } from '@/contexts/UniformDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shirt, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

export const PortalUniforms = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language, isRTL } = useLanguage();
  const { getEmployeeUniforms } = useUniformData();

  // getEmployeeUniforms already filters out expired (12+ months)
  const myUniforms = getEmployeeUniforms(PORTAL_EMPLOYEE_ID);

  const totalCurrentValue = myUniforms.reduce((s, u) => s + getCurrentValue(u.totalPrice, u.deliveryDate), 0);
  const totalOriginalValue = myUniforms.reduce((s, u) => s + u.totalPrice, 0);

  return (
    <div className={cn("space-y-6", isRTL && "text-right")}>
      <h2 className={cn("text-xl md:text-2xl font-bold flex items-center gap-2", isRTL && "flex-row-reverse")}>
        <Shirt className="w-5 h-5 md:w-6 md:h-6 text-primary" />
        {language === 'ar' ? 'اليونيفورم' : 'Uniforms'}
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{language === 'ar' ? 'عدد الأصناف' : 'Items'}</p>
            <p className="text-2xl font-bold mt-1">{myUniforms.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{language === 'ar' ? 'القيمة الأصلية' : 'Original Value'}</p>
            <p className="text-2xl font-bold mt-1">{totalOriginalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{language === 'ar' ? 'القيمة المستحقة الحالية' : 'Current Due'}</p>
            <p className="text-2xl font-bold mt-1 text-primary">{totalCurrentValue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Depreciation info */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <p className={cn("text-sm flex items-center gap-2 text-amber-700", isRTL && "flex-row-reverse")}>
            <Info className="w-4 h-4" />
            {language === 'ar'
              ? 'القيمة المستحقة تتناقص تلقائياً: 75% بعد 3 أشهر، 50% بعد 6 أشهر، 25% بعد 9 أشهر، 0% بعد سنة (يتم إخفاء الصنف).'
              : 'Due value depreciates automatically: 75% after 3 months, 50% after 6, 25% after 9, 0% after 12 months (item hidden).'}
          </p>
        </CardContent>
      </Card>

      {/* Table */}
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
                  <TableHead className={cn(isRTL && "text-right")}>{language === 'ar' ? 'الصنف' : 'Type'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{language === 'ar' ? 'العدد' : 'Qty'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{language === 'ar' ? 'القيمة الأصلية' : 'Original'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{language === 'ar' ? 'القيمة الحالية' : 'Current'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{language === 'ar' ? 'تاريخ التسليم' : 'Delivery'}</TableHead>
                  <TableHead className={cn(isRTL && "text-right")}>{language === 'ar' ? 'الاستهلاك' : 'Depreciation'}</TableHead>
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
