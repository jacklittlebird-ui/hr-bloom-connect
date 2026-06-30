import { useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePerformanceData } from '@/contexts/PerformanceDataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

export const PortalEvaluations = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { reviews } = usePerformanceData();

  const myReviews = useMemo(
    () => reviews.filter(r => r.employeeId === PORTAL_EMPLOYEE_ID),
    [reviews, PORTAL_EMPLOYEE_ID]
  );

  const statusLabel = (status: string) => {
    if (status === 'approved') return ar ? 'معتمد' : 'Approved';
    if (status === 'submitted') return ar ? 'مقدّم' : 'Submitted';
    return ar ? 'مسودة' : 'Draft';
  };

  const statusColor = (status: string) => {
    if (status === 'approved') return 'bg-success/10 text-success border-success';
    if (status === 'submitted') return 'bg-warning/10 text-warning border-warning';
    return 'bg-muted text-muted-foreground border-muted';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ar ? 'تقييماتي' : 'My Evaluations'}</h1>

      {myReviews.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">{ar ? 'لا توجد تقييمات' : 'No evaluations'}</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {myReviews.map(r => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{r.quarter} {r.year}</h3>
                    <p className="text-sm text-muted-foreground">{ar ? 'المقيّم:' : 'Reviewer:'} {r.reviewer}</p>
                    <p className="text-sm text-muted-foreground">{ar ? 'التاريخ:' : 'Date:'} {r.reviewDate}</p>
                    {r.strengths && <p className="text-sm mt-2"><span className="font-medium">{ar ? 'نقاط القوة:' : 'Strengths:'}</span> {r.strengths}</p>}
                    {r.improvements && <p className="text-sm"><span className="font-medium">{ar ? 'التحسينات:' : 'Improvements:'}</span> {r.improvements}</p>}
                    {r.goals && <p className="text-sm"><span className="font-medium">{ar ? 'الأهداف:' : 'Goals:'}</span> {r.goals}</p>}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star key={si} className={cn("w-5 h-5", si < Math.floor(r.score) ? "text-warning fill-warning" : "text-muted")} />
                      ))}
                    </div>
                    <span className="text-xl font-bold">{r.score}/5</span>
                    <Badge variant="outline" className={statusColor(r.status)}>{statusLabel(r.status)}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};