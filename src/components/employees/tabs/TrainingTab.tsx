import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { cn, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TrainingRecord {
  id: string;
  courseNameAr: string;
  courseNameEn: string;
  provider: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
  score: number | null;
}

interface TrainingTabProps {
  employee: Employee;
}

export const TrainingTab = ({ employee }: TrainingTabProps) => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('training_records')
      .select('*, training_courses(name_ar, name_en, provider)')
      .eq('employee_id', employee.id)
      .order('start_date', { ascending: false });

    if (data) {
      setRecords(data.map(r => ({
        id: r.id,
        courseNameAr: (r.training_courses as any)?.name_ar || '-',
        courseNameEn: (r.training_courses as any)?.name_en || '-',
        provider: (r.training_courses as any)?.provider || '-',
        startDate: r.start_date,
        endDate: r.end_date,
        status: r.status,
        score: r.score,
      })));
    }
    setLoading(false);
  }, [employee.id]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const statusLabels: Record<string, { ar: string; en: string; color: string }> = {
    completed: { ar: 'مكتمل', en: 'Completed', color: 'bg-green-100 text-green-700 border-green-300' },
    in_progress: { ar: 'جاري', en: 'In Progress', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
    enrolled: { ar: 'مسجل', en: 'Enrolled', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    planned: { ar: 'مخطط', en: 'Planned', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  };

  return (
    <div className="p-6 space-y-6">
      <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
        <h3 className={cn("text-lg font-semibold flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <GraduationCap className="w-5 h-5 text-primary" />
          {ar ? 'التدريب والتطوير' : 'Training & Development'}
        </h3>
      </div>

      <div className="rounded-xl overflow-hidden border border-border/30">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary text-primary-foreground">
              <TableHead className="text-primary-foreground">{ar ? 'اسم الدورة' : 'Course Name'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'الجهة' : 'Provider'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'من' : 'From'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'إلى' : 'To'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'الحالة' : 'Status'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'الدرجة' : 'Score'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {ar ? 'جاري التحميل...' : 'Loading...'}
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {ar ? 'لا توجد دورات تدريبية' : 'No training records'}
                </TableCell>
              </TableRow>
            ) : (
              records.map(r => {
                const sl = statusLabels[r.status] || statusLabels['planned'];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{ar ? r.courseNameAr : r.courseNameEn}</TableCell>
                    <TableCell>{r.provider}</TableCell>
                    <TableCell>{formatDate(r.startDate)}</TableCell>
                    <TableCell>{formatDate(r.endDate)}</TableCell>
                    <TableCell>
                      <span className={cn("px-2 py-1 rounded-md text-xs font-semibold border", sl.color)}>
                        {ar ? sl.ar : sl.en}
                      </span>
                    </TableCell>
                    <TableCell>{r.score ?? '-'}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
