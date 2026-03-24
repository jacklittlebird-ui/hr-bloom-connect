import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

export const EmployeeGrowthChart = () => {
  const { t, isRTL } = useLanguage();
  const [data, setData] = useState<{ month: string; employees: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      // Only fetch created_at column
      const { data: employees } = await supabase.from('employees').select('created_at');
      if (!employees) return;
      const now = new Date();
      const months: { month: string; employees: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const count = employees.filter(e => new Date(e.created_at) <= end).length;
        months.push({
          month: d.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { month: 'short' }),
          employees: count,
        });
      }
      setData(months);
    };
    fetch();
  }, [isRTL]);

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 text-right">
        <span className="text-primary">📈</span>
        {t('chart.employeeGrowth')}
      </h3>
      <div className="h-[280px]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">{isRTL ? 'لا توجد بيانات' : 'No data'}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" tick={{ fontFamily: isRTL ? 'Cairo' : 'Inter', fontSize: 12 }} reversed={isRTL} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontFamily: isRTL ? 'Cairo' : 'Inter', fontSize: 12 }} orientation={isRTL ? 'right' : 'left'} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontFamily: isRTL ? 'Cairo' : 'Inter' }} />
              <Line type="monotone" dataKey="employees" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 5 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
