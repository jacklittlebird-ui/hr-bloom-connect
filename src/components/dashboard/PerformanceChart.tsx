import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

export const PerformanceChart = () => {
  const { isRTL } = useLanguage();
  const ar = isRTL;
  const [data, setData] = useState<{ quarter: string; avg: number; count: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const year = new Date().getFullYear().toString();
      // Only fetch quarter and score columns
      const { data: reviews } = await supabase.from('performance_reviews').select('quarter, score').eq('year', year);
      if (!reviews) return;
      const qMap: Record<string, { total: number; count: number }> = {};
      reviews.forEach(r => {
        if (!qMap[r.quarter]) qMap[r.quarter] = { total: 0, count: 0 };
        qMap[r.quarter].total += (r.score || 0);
        qMap[r.quarter].count += 1;
      });
      const qLabels: Record<string, string> = {
        Q1: ar ? 'الربع 1' : 'Q1', Q2: ar ? 'الربع 2' : 'Q2',
        Q3: ar ? 'الربع 3' : 'Q3', Q4: ar ? 'الربع 4' : 'Q4',
      };
      setData(['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({
        quarter: qLabels[q] || q,
        avg: qMap[q] ? Math.round(qMap[q].total / qMap[q].count) : 0,
        count: qMap[q]?.count || 0,
      })));
    };
    load();
  }, [ar]);

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 text-right">
        <span className="text-primary">⭐</span>
        {ar ? 'ملخص تقييمات الأداء' : 'Performance Reviews Summary'}
      </h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="quarter" stroke="hsl(var(--muted-foreground))" tick={{ fontFamily: ar ? 'Cairo' : 'Inter', fontSize: 12 }} />
            <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} orientation={ar ? 'right' : 'left'} />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontFamily: ar ? 'Cairo' : 'Inter' }} />
            <Legend formatter={(v) => <span style={{ fontFamily: ar ? 'Cairo' : 'Inter' }}>{v === 'avg' ? (ar ? 'متوسط الدرجة' : 'Avg Score') : (ar ? 'عدد التقييمات' : 'Reviews')}</span>} />
            <Bar dataKey="avg" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
