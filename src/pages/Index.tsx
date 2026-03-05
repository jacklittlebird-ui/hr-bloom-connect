import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
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
  GraduationCap, Star, DollarSign, Banknote, RefreshCw, BarChart3, Briefcase
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
    { key: 'dashboard.totalEmployees', value: dashStats.totalEmployees, icon: Users, variant: 'coral' as const },
    { key: 'dashboard.activeEmployees', value: dashStats.activeEmployees, icon: UserCheck, variant: 'purple' as const },
    { key: 'dashboard.departments', value: dashStats.departments, icon: Building2, variant: 'blue' as const },
    { key: 'dashboard.todayAttendance', value: dashStats.todayAttendance, icon: CalendarCheck, variant: 'teal' as const },
    { key: 'dashboard.pendingLeaves', value: dashStats.pendingLeaves, icon: FileText, variant: 'yellow' as const },
    { key: 'dashboard.assignedAssets', value: dashStats.assignedAssets, icon: Monitor, variant: 'pink' as const },
  ];

  const extraStats = [
    { label: ar ? 'دورات تدريبية نشطة' : 'Active Courses', value: dashStats.activeCourses, icon: GraduationCap, variant: 'green' as const },
    { label: ar ? 'تقييمات الأداء' : 'Performance Reviews', value: dashStats.performanceReviews, icon: Star, variant: 'yellow' as const },
    { label: ar ? 'سلف نشطة' : 'Active Loans', value: dashStats.activeLoans, icon: Banknote, variant: 'coral' as const },
    { label: ar ? 'رواتب الشهر الحالي' : 'This Month Payroll', value: dashStats.payrollThisMonth.toLocaleString(), icon: DollarSign, variant: 'teal' as const },
  ];

  return (
    <DashboardLayout>
      <div className={cn("mb-8", isRTL && "text-right")}>
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {stats.map((stat) => (
          <StatCard key={stat.key} title={t(stat.key)} value={stat.value} icon={stat.icon} variant={stat.variant} />
        ))}
      </div>

      {/* Extended Module Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {extraStats.map((stat, i) => (
          <StatCard key={i} title={stat.label} value={stat.value} icon={stat.icon} variant={stat.variant} />
        ))}
      </div>

      <div className={cn("flex items-center justify-between mb-6", isRTL && "flex-row-reverse")}>
        <h2 className="text-xl font-semibold text-foreground">{t('chart.reportsStats')}</h2>
        <div className={cn("flex gap-3", isRTL && "flex-row-reverse")}>
          <Button variant="default" className={cn("gap-2", isRTL && "flex-row-reverse")}>
            <BarChart3 className="w-4 h-4" />{t('chart.advancedReports')}
          </Button>
          <Button variant="outline" className={cn("gap-2", isRTL && "flex-row-reverse")} onClick={fetchStats}>
            <RefreshCw className="w-4 h-4" />{t('chart.refresh')}
          </Button>
        </div>
      </div>

      {/* Row 1: Department + Employee Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DepartmentChart />
        <EmployeeGrowthChart />
      </div>

      {/* Row 2: Attendance + Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <AttendanceChart />
        <LeavesPieChart />
      </div>

      {/* Row 3: Training + Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TrainingChart />
        <PerformanceChart />
      </div>

      {/* Row 4: Salary Overview + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <SalaryOverviewChart />
        <RecentActivity />
      </div>
    </DashboardLayout>
  );
};

export default Index;
