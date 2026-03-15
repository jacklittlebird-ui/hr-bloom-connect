import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Users, Award, TrendingUp, Calendar, Coins } from 'lucide-react';

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
    const fetchStats = async () => {
      const [recCountRes, recCostRes, empCountRes, activeRes, courseRes, plannedRes] = await Promise.all([
        supabase.from('training_records').select('id', { count: 'exact', head: true }),
        supabase.from('training_records').select('cost'),
        supabase.from('training_records').select('employee_id'),
        supabase.from('training_courses').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('training_courses').select('id', { count: 'exact', head: true }),
        supabase.from('planned_courses').select('id', { count: 'exact', head: true }).eq('status', 'scheduled'),
      ]);
      
      // For cost and unique employees, we need all rows - use pagination if needed
      const allCosts: number[] = [];
      const allEmpIds = new Set<string>();
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data } = await supabase.from('training_records')
          .select('employee_id, cost')
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (data && data.length > 0) {
          data.forEach(r => {
            allCosts.push(r.cost || 0);
            allEmpIds.add(r.employee_id);
          });
          if (data.length < pageSize) hasMore = false;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      const totalCost = allCosts.reduce((s, c) => s + c, 0);
      
      setStats({
        totalRecords: recCountRes.count || 0,
        activeCourses: activeRes.count || 0,
        totalCourses: courseRes.count || 0,
        trainedEmployees: allEmpIds.size,
        upcomingPlanned: plannedRes.count || 0,
        totalCost,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { icon: BookOpen, label: ar ? 'إجمالي السجلات' : 'Total Records', value: stats.totalRecords, gradient: 'from-blue-500 to-blue-600', lightBg: 'bg-blue-50 dark:bg-blue-950/40', ring: 'ring-blue-200 dark:ring-blue-800' },
    { icon: Award, label: ar ? 'دورات نشطة' : 'Active Courses', value: stats.activeCourses, gradient: 'from-emerald-500 to-teal-600', lightBg: 'bg-emerald-50 dark:bg-emerald-950/40', ring: 'ring-emerald-200 dark:ring-emerald-800' },
    { icon: Users, label: ar ? 'موظفون مدربون' : 'Trained Employees', value: stats.trainedEmployees, gradient: 'from-violet-500 to-purple-600', lightBg: 'bg-violet-50 dark:bg-violet-950/40', ring: 'ring-violet-200 dark:ring-violet-800' },
    { icon: TrendingUp, label: ar ? 'إجمالي الدورات' : 'Total Courses', value: stats.totalCourses, gradient: 'from-amber-500 to-orange-600', lightBg: 'bg-amber-50 dark:bg-amber-950/40', ring: 'ring-amber-200 dark:ring-amber-800' },
    { icon: Calendar, label: ar ? 'دورات مخططة' : 'Planned Courses', value: stats.upcomingPlanned, gradient: 'from-pink-500 to-rose-600', lightBg: 'bg-pink-50 dark:bg-pink-950/40', ring: 'ring-pink-200 dark:ring-pink-800' },
    { icon: Coins, label: ar ? 'إجمالي التكلفة' : 'Total Cost', value: stats.totalCost.toLocaleString(), gradient: 'from-cyan-500 to-sky-600', lightBg: 'bg-cyan-50 dark:bg-cyan-950/40', ring: 'ring-cyan-200 dark:ring-cyan-800' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((card, i) => (
        <div
          key={i}
          className={cn(
            "relative overflow-hidden flex flex-col items-center gap-3 p-5 rounded-2xl",
            "border ring-1 transition-all duration-300",
            "hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]",
            "group cursor-default",
            card.lightBg, card.ring, "border-transparent"
          )}
        >
          {/* Decorative gradient blob */}
          <div className={cn(
            "absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20 blur-2xl",
            "bg-gradient-to-br", card.gradient,
            "group-hover:opacity-30 transition-opacity"
          )} />
          
          <div className={cn(
            "relative w-12 h-12 rounded-2xl flex items-center justify-center",
            "bg-gradient-to-br shadow-lg",
            card.gradient,
            "group-hover:scale-110 transition-transform duration-300"
          )}>
            <card.icon className="w-6 h-6 text-white" />
          </div>
          
          <span className="relative text-2xl font-extrabold text-foreground tracking-tight">
            {card.value}
          </span>
          
          <span className="relative text-xs font-medium text-muted-foreground text-center leading-tight">
            {card.label}
          </span>
        </div>
      ))}
    </div>
  );
};
