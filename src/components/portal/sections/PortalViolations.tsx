import { useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalData } from '@/contexts/PortalDataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ban } from 'lucide-react';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';
import { QualityRecordsList } from '@/components/quality/QualityRecordsList';

export const PortalViolations = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { getViolations, ensureViolations } = usePortalData();
  useEffect(() => { ensureViolations(); }, [ensureViolations]);
  const violations = useMemo(() => getViolations(PORTAL_EMPLOYEE_ID), [getViolations]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ar ? 'مخالفاتي' : 'My Violations'}</h1>

      <QualityRecordsList employeeId={PORTAL_EMPLOYEE_ID} title={ar ? 'ملاحظات الجودة' : 'Quality Notes'} />

      {violations.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">{ar ? 'لا توجد مخالفات' : 'No violations'}</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {violations.map(v => (
            <Card key={v.id}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <Ban className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-semibold">{ar ? v.typeAr : v.typeEn}</p>
                      <p className="text-sm text-muted-foreground">{v.date}</p>
                      <p className="text-sm mt-1">{ar ? 'العقوبة:' : 'Penalty:'} {ar ? v.penaltyAr : v.penaltyEn}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={v.status === 'open' ? 'bg-warning/10 text-warning border-warning' : 'bg-muted text-muted-foreground'}>
                    {v.status === 'open' ? (ar ? 'مفتوح' : 'Open') : (ar ? 'مغلق' : 'Closed')}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};