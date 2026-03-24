import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

const COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(330, 81%, 60%)',
  'hsl(168, 76%, 42%)',
  'hsl(142, 71%, 45%)',
  'hsl(0, 79%, 72%)',
  'hsl(45, 93%, 47%)',
  'hsl(262, 83%, 58%)',
  'hsl(199, 89%, 48%)',
];

export const DepartmentChart = () => {
  const { t, isRTL, language } = useLanguage();
  const [data, setData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      // Only fetch department_id column instead of full employee rows
      const { data: employees } = await supabase.from('employees').select('department_id');
      const { data: departments } = await supabase.from('departments').select('id, name_ar, name_en');
      if (!employees || !departments) return;
      const countMap: Record<string, number> = {};
      employees.forEach(e => { if (e.department_id) countMap[e.department_id] = (countMap[e.department_id] || 0) + 1; });
      setData(departments.map(d => ({
        name: language === 'ar' ? d.name_ar : d.name_en,
        value: countMap[d.id] || 0,
      })).filter(d => d.value > 0));
    };
    fetch();
  }, [language]);

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2 text-right">
        <span className="text-primary">📊</span>
        {t('chart.departmentDist')}
      </h3>
      <div className="h-[280px]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">{language === 'ar' ? 'لا توجد بيانات' : 'No data'}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                {data.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontFamily: isRTL ? 'Cairo' : 'Inter' }} />
              <Legend layout="vertical" align={isRTL ? "left" : "right"} verticalAlign="middle"
                formatter={(value) => (<span style={{ fontFamily: isRTL ? 'Cairo' : 'Inter', color: 'hsl(var(--foreground))' }}>{value}</span>)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
