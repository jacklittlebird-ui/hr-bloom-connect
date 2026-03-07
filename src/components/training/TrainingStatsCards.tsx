import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Users, Award, TrendingUp, Calendar, DollarSign } from 'lucide-react';

export const TrainingStatsCards = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const [stats, setStats] = useState({
    totalRecords: 0,
    activeCourses: 0,
    totalCourses: 0,
    trainedEmployees: 0,
    upcomingPlanned: 0,
    totalCost: 0,
  });

  useEffect(() => {
    const fetch = async () => {
      const [recRes, activeRes, courseRes, plannedRes] = await Promise.all([
        supabase.from('training_records').select('id, employee_id, cost'),
        supabase.from('planned_courses').select('id').in('status', ['planned', 'in_progress']),
        supabase.from('training_courses').select('id'),
        supabase.from('planned_courses').select('id').eq('status', 'planned'),
      ]);
      const uniqueEmps = new Set(recRes.data?.map(r => r.employee_id) || []);
      const totalCost = recRes.data?.reduce((s, r) => s + (r.cost || 0), 0) || 0;
      setStats({
        totalRecords: recRes.data?.length || 0,
        activeCourses: activeRes.data?.length || 0,
        totalCourses: courseRes.data?.length || 0,
        trainedEmployees: uniqueEmps.size,
        upcomingPlanned: plannedRes.data?.length || 0,
        totalCost,
      });
    };
    fetch();
  }, []);

  const cards = [
    { icon: BookOpen, label: ar ? 'إجمالي السجلات' : 'Total Records', value: stats.totalRecords, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: Award, label: ar ? 'دورات نشطة' : 'Active Courses', value: stats.activeCourses, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { icon: Users, label: ar ? 'موظفون مدربون' : 'Trained Employees', value: stats.trainedEmployees, color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { icon: TrendingUp, label: ar ? 'إجمالي الدورات' : 'Total Courses', value: stats.totalCourses, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { icon: Calendar, label: ar ? 'دورات مخططة' : 'Planned Courses', value: stats.upcomingPlanned, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { icon: DollarSign, label: ar ? 'إجمالي التكلفة' : 'Total Cost', value: stats.totalCost.toLocaleString(), color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((card, i) => (
        <div key={i} className={cn(
          "flex flex-col items-center gap-2 p-4 rounded-xl border border-border/50 bg-card",
          "hover:shadow-md transition-all duration-200"
        )}>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", card.bg)}>
            <card.icon className={cn("w-5 h-5", card.color)} />
          </div>
          <span className="text-xl font-bold text-foreground">{card.value}</span>
          <span className="text-xs text-muted-foreground text-center leading-tight">{card.label}</span>
        </div>
      ))}
    </div>
  );
};
