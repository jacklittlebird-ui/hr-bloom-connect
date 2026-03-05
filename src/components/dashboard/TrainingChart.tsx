import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

export const TrainingChart = () => {
  const { isRTL } = useLanguage();
  const ar = isRTL;
  const [data, setData] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: courses } = await supabase.from('planned_courses').select('status');
      if (!courses) return;
      const statusMap: Record<string, number> = {};
      courses.forEach(c => {
        const key = c.status || 'unknown';
        statusMap[key] = (statusMap[key] || 0) + 1;
      });
      const labels: Record<string, string> = {
        planned: ar ? 'مخطط' : 'Planned',
        in_progress: ar ? 'جارية' : 'In Progress',
        completed: ar ? 'مكتملة' : 'Completed',
        cancelled: ar ? 'ملغاة' : 'Cancelled',
      };
      setData(Object.entries(statusMap).map(([k, v]) => ({ name: labels[k] || k, count: v })));
    };
    load();
  }, [ar]);

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
      <h3 className={`text-lg font-semibold text-foreground mb-4 flex items-center gap-2 ${ar ? 'flex-row-reverse' : ''}`}>
        <span className="text-primary">🎓</span>
        {ar ? 'حالة الدورات التدريبية' : 'Training Courses Status'}
      </h3>
      <div className="h-[280px]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">{ar ? 'لا توجد بيانات' : 'No data'}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fontFamily: ar ? 'Cairo' : 'Inter', fontSize: 12 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} orientation={ar ? 'right' : 'left'} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontFamily: ar ? 'Cairo' : 'Inter' }} />
              <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
