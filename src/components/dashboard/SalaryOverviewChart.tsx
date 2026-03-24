import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

export const SalaryOverviewChart = () => {
  const { isRTL } = useLanguage();
  const ar = isRTL;
  const [data, setData] = useState<{ month: string; total: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const year = new Date().getFullYear().toString();
      // Only fetch month and net_salary columns
      const { data: entries } = await supabase.from('payroll_entries').select('month, net_salary').eq('year', year);
      if (!entries) return;
      const monthMap: Record<string, number> = {};
      entries.forEach(e => {
        monthMap[e.month] = (monthMap[e.month] || 0) + (e.net_salary || 0);
      });
      const monthNames = ar
        ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
        : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      setData(
        Array.from({ length: 12 }, (_, i) => ({
          month: monthNames[i],
          total: monthMap[String(i + 1).padStart(2, '0')] || monthMap[String(i + 1)] || 0,
        })).filter((_, i) => i <= new Date().getMonth())
      );
    };
    load();
  }, [ar]);

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 text-right">
        <span className="text-primary">💰</span>
        {ar ? 'إجمالي الرواتب الشهرية' : 'Monthly Payroll Total'}
      </h3>
      <div className="h-[280px]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">{ar ? 'لا توجد بيانات' : 'No data'}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontFamily: ar ? 'Cairo' : 'Inter', fontSize: 11 }} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} orientation={ar ? 'right' : 'left'} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontFamily: ar ? 'Cairo' : 'Inter' }}
                formatter={(v: number) => [v.toLocaleString(), ar ? 'الإجمالي' : 'Total']} />
              <Bar dataKey="total" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
