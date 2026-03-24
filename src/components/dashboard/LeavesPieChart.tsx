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
      // Use count queries instead of fetching all rows
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
      ]);
      setData([
        { name: ar ? 'معلقة' : 'Pending', value: pendingRes.count || 0 },
        { name: ar ? 'معتمدة' : 'Approved', value: approvedRes.count || 0 },
        { name: ar ? 'مرفوضة' : 'Rejected', value: rejectedRes.count || 0 },
      ].filter(d => d.value > 0));
    };
    load();
  }, [ar]);

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 text-right">
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
