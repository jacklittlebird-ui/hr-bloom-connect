import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner';
import { SectionHeader } from '@/components/dashboard/SectionHeader';
import { DepartmentChart } from '@/components/dashboard/DepartmentChart';
import { EmployeeGrowthChart } from '@/components/dashboard/EmployeeGrowthChart';
import { AttendanceChart } from '@/components/dashboard/AttendanceChart';
import { LeavesPieChart } from '@/components/dashboard/LeavesPieChart';
import { TrainingChart } from '@/components/dashboard/TrainingChart';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { SalaryOverviewChart } from '@/components/dashboard/SalaryOverviewChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { Button } from '@/components/ui/button';
import { 
  Users, UserCheck, Building2, CalendarCheck, FileText, Monitor,
  GraduationCap, Star, DollarSign, Banknote, RefreshCw, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { t, isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const [dashStats, setDashStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    departments: 0,
    todayAttendance: 0,
    pendingLeaves: 0,
    assignedAssets: 0,
    activeCourses: 0,
    performanceReviews: 0,
    activeLoans: 0,
    payrollThisMonth: 0,
  });

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const currentYear = new Date().getFullYear().toString();

    const [empRes, deptRes, attRes, leaveRes, assetRes, courseRes, perfRes, loanRes, payrollRes] = await Promise.all([
      supabase.from('employees').select('id, status'),
      supabase.from('departments').select('id').eq('is_active', true),
      supabase.from('attendance_records').select('id').eq('date', today),
      supabase.from('leave_requests').select('id').eq('status', 'pending'),
      supabase.from('assets').select('id').not('assigned_to', 'is', null),
      supabase.from('planned_courses').select('id').in('status', ['planned', 'in_progress']),
      supabase.from('performance_reviews').select('id').eq('year', currentYear),
      supabase.from('loans').select('id').eq('status', 'active'),
      supabase.from('payroll_entries').select('net_salary').eq('year', currentYear).eq('month', currentMonth),
    ]);

    setDashStats({
      totalEmployees: empRes.data?.length || 0,
      activeEmployees: empRes.data?.filter(e => e.status === 'active').length || 0,
      departments: deptRes.data?.length || 0,
      todayAttendance: attRes.data?.length || 0,
      pendingLeaves: leaveRes.data?.length || 0,
      assignedAssets: assetRes.data?.length || 0,
      activeCourses: courseRes.data?.length || 0,
      performanceReviews: perfRes.data?.length || 0,
      activeLoans: loanRes.data?.length || 0,
      payrollThisMonth: payrollRes.data?.reduce((s, e) => s + (e.net_salary || 0), 0) || 0,
    });
  };

  useEffect(() => { fetchStats(); }, []);

  const stats = [
    { key: 'dashboard.totalEmployees', value: dashStats.totalEmployees, icon: Users, variant: 'coral' as const, trend: 'up' as const, trendValue: '+3%' },
    { key: 'dashboard.activeEmployees', value: dashStats.activeEmployees, icon: UserCheck, variant: 'purple' as const, trend: 'up' as const, trendValue: '+2%' },
    { key: 'dashboard.departments', value: dashStats.departments, icon: Building2, variant: 'blue' as const, trend: 'neutral' as const, trendValue: '0%' },
    { key: 'dashboard.todayAttendance', value: dashStats.todayAttendance, icon: CalendarCheck, variant: 'teal' as const },
    { key: 'dashboard.pendingLeaves', value: dashStats.pendingLeaves, icon: FileText, variant: 'yellow' as const },
    { key: 'dashboard.assignedAssets', value: dashStats.assignedAssets, icon: Monitor, variant: 'pink' as const, trend: 'up' as const, trendValue: '+5' },
  ];

  const extraStats = [
    { label: ar ? 'دورات تدريبية نشطة' : 'Active Courses', value: dashStats.activeCourses, icon: GraduationCap, variant: 'green' as const },
    { label: ar ? 'تقييمات الأداء' : 'Performance Reviews', value: dashStats.performanceReviews, icon: Star, variant: 'yellow' as const },
    { label: ar ? 'سلف نشطة' : 'Active Loans', value: dashStats.activeLoans, icon: Banknote, variant: 'coral' as const },
    { label: ar ? 'رواتب الشهر الحالي' : 'This Month Payroll', value: dashStats.payrollThisMonth.toLocaleString(), icon: DollarSign, variant: 'teal' as const },
  ];

  return (
    <DashboardLayout>
      <WelcomeBanner />

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {stats.map((stat, i) => (
          <StatCard
            key={stat.key}
            title={t(stat.key)}
            value={stat.value}
            icon={stat.icon}
            variant={stat.variant}
            trend={stat.trend}
            trendValue={stat.trendValue}
            delay={i}
          />
        ))}
      </div>

      {/* Extended Module Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {extraStats.map((stat, i) => (
          <StatCard
            key={i}
            title={stat.label}
            value={stat.value}
            icon={stat.icon}
            variant={stat.variant}
            delay={i + 6}
          />
        ))}
      </div>

      <SectionHeader title={t('chart.reportsStats')} icon={BarChart3}>
        <Button variant="default" className={cn("gap-2", isRTL && "flex-row-reverse")}>
          <BarChart3 className="w-4 h-4" />{t('chart.advancedReports')}
        </Button>
        <Button variant="outline" className={cn("gap-2", isRTL && "flex-row-reverse")} onClick={fetchStats}>
          <RefreshCw className="w-4 h-4" />{t('chart.refresh')}
        </Button>
      </SectionHeader>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <DepartmentChart />
        </div>
        <div className="bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <EmployeeGrowthChart />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <AttendanceChart />
        </div>
        <div className="bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <LeavesPieChart />
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <TrainingChart />
        </div>
        <div className="bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <PerformanceChart />
        </div>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <SalaryOverviewChart />
        </div>
        <div className="bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
          <RecentActivity />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
