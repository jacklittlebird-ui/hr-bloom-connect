import { useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortalData } from '@/contexts/PortalDataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { GraduationCap } from 'lucide-react';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';

export const PortalTraining = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { getTraining } = usePortalData();
  const courses = useMemo(() => getTraining(PORTAL_EMPLOYEE_ID), [getTraining, PORTAL_EMPLOYEE_ID]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{ar ? 'التدريب' : 'Training'}</h1>

      {courses.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">{ar ? 'لا توجد دورات' : 'No courses'}</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {courses.map(c => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">{ar ? c.nameAr : c.nameEn}</h3>
                  </div>
                  <Badge variant="outline" className={c.status === 'completed' ? 'bg-success/10 text-success border-success' : 'bg-primary/10 text-primary border-primary'}>
                    {c.status === 'completed' ? (ar ? 'مكتمل' : 'Completed') : c.status === 'in-progress' ? (ar ? 'جاري' : 'In Progress') : (ar ? 'مخطط' : 'Planned')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{c.startDate} - {c.endDate}</p>
                <div className="flex items-center gap-3">
                  <Progress value={c.progress} className="flex-1" />
                  <span className="text-sm font-medium">{c.progress}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};