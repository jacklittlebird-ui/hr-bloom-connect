import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

const COLORS = ['hsl(45, 93%, 47%)', 'hsl(142, 71%, 45%)', 'hsl(0, 79%, 63%)'];

export const LeavesPieChart = () => {
  const { isRTL } = useLanguage();
  const ar = isRTL;
  const [data, setData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: leaves } = await supabase.from('leave_requests').select('status');
      if (!leaves) return;
      const pending = leaves.filter(l => l.status === 'pending').length;
      const approved = leaves.filter(l => l.status === 'approved').length;
      const rejected = leaves.filter(l => l.status === 'rejected').length;
      setData([
        { name: ar ? 'معلقة' : 'Pending', value: pending },
        { name: ar ? 'معتمدة' : 'Approved', value: approved },
        { name: ar ? 'مرفوضة' : 'Rejected', value: rejected },
      ].filter(d => d.value > 0));
    };
    load();
  }, [ar]);

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
      <h3 className={`text-lg font-semibold text-foreground mb-4 flex items-center gap-2 ${ar ? 'flex-row-reverse' : ''}`}>
        <span className="text-primary">🗓️</span>
        {ar ? 'توزيع طلبات الإجازات' : 'Leave Requests Distribution'}
      </h3>
      <div className="h-[280px]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">{ar ? 'لا توجد بيانات' : 'No data'}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontFamily: ar ? 'Cairo' : 'Inter' }} />
              <Legend layout="vertical" align={ar ? 'left' : 'right'} verticalAlign="middle"
                formatter={(value) => <span style={{ fontFamily: ar ? 'Cairo' : 'Inter', color: 'hsl(var(--foreground))' }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
