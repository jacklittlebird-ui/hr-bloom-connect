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
import { LazyChart } from '@/components/dashboard/LazyChart';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserCheck, Building2, CalendarCheck, FileText, Monitor,
  GraduationCap, Star, UserX, Banknote, RefreshCw, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { LiveStatus } from '@/components/dashboard/LiveStatus';
import { UpcomingEvents } from '@/components/dashboard/UpcomingEvents';
import { Announcements } from '@/components/dashboard/Announcements';
import { StationCards } from '@/components/dashboard/StationCards';

const Index = () => {
  const { t, isRTL, language } = useLanguage();
  const navigate = useNavigate();
  const ar = language === 'ar';
  const [loading, setLoading] = useState(true);
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
    absentToday: 0,
  });

  const fetchStats = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear().toString();

    // Use head:true count queries — zero rows transferred, only count header
    const [totalEmpRes, activeEmpRes, deptRes, attRes, leaveRes, assetRes, courseRes, perfRes, loanRes] = await Promise.all([
      supabase.from('employees').select('id', { count: 'exact', head: true }),
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('departments').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('attendance_records').select('id', { count: 'exact', head: true }).eq('date', today),
      supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('assets').select('id', { count: 'exact', head: true }).not('assigned_to', 'is', null),
      supabase.from('planned_courses').select('id', { count: 'exact', head: true }).in('status', ['planned', 'in_progress']),
      supabase.from('performance_reviews').select('id', { count: 'exact', head: true }).eq('year', currentYear),
      supabase.from('loans').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    const totalEmps = totalEmpRes.count || 0;
    const totalActive = activeEmpRes.count || 0;
    const todayAtt = attRes.count || 0;

    setDashStats({
      totalEmployees: totalEmps,
      activeEmployees: totalActive,
      departments: deptRes.count || 0,
      todayAttendance: todayAtt,
      pendingLeaves: leaveRes.count || 0,
      assignedAssets: assetRes.count || 0,
      activeCourses: courseRes.count || 0,
      performanceReviews: perfRes.count || 0,
      activeLoans: loanRes.count || 0,
      absentToday: Math.max(0, totalActive - todayAtt),
    });
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, []);

  const stats = [
    { key: 'dashboard.totalEmployees', value: dashStats.totalEmployees, icon: Users, variant: 'coral' as const, trend: 'up' as const, trendValue: '+3%' },
    { key: 'dashboard.inactiveEmployees', value: dashStats.totalEmployees - dashStats.activeEmployees, icon: UserCheck, variant: 'purple' as const },
    { key: 'dashboard.departments', value: dashStats.departments, icon: Building2, variant: 'blue' as const, trend: 'neutral' as const, trendValue: '0%' },
    { key: 'dashboard.todayAttendance', value: dashStats.todayAttendance, icon: CalendarCheck, variant: 'teal' as const },
    { key: 'dashboard.pendingLeaves', value: dashStats.pendingLeaves, icon: FileText, variant: 'yellow' as const },
    { key: 'dashboard.assignedAssets', value: dashStats.assignedAssets, icon: Monitor, variant: 'pink' as const, trend: 'up' as const, trendValue: '+5' },
  ];

  const extraStats = [
    { label: ar ? 'دورات تدريبية نشطة' : 'Active Courses', value: dashStats.activeCourses, icon: GraduationCap, variant: 'green' as const },
    { label: ar ? 'تقييمات الأداء' : 'Performance Reviews', value: dashStats.performanceReviews, icon: Star, variant: 'yellow' as const },
    { label: ar ? 'سلف نشطة' : 'Active Loans', value: dashStats.activeLoans, icon: Banknote, variant: 'coral' as const },
    { label: ar ? 'غائبون اليوم' : 'Absent Today', value: dashStats.absentToday, icon: UserX, variant: 'teal' as const },
  ];

  const ChartCard = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group hover:border-border">
      {children}
    </div>
  );

  return (
    <DashboardLayout>
      <WelcomeBanner />
      <QuickActions />
      <LiveStatus />

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {stats.map((stat, i) => (
          <StatCard key={stat.key} title={t(stat.key)} value={stat.value} icon={stat.icon} variant={stat.variant} trend={stat.trend} trendValue={stat.trendValue} delay={i} />
        ))}
      </div>

      {/* Extended Module Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {extraStats.map((stat, i) => (
          <StatCard key={i} title={stat.label} value={stat.value} icon={stat.icon} variant={stat.variant} delay={i + 6} />
        ))}
      </div>

      <StationCards />

      <SectionHeader title={t('chart.reportsStats')} icon={BarChart3}>
        <Button variant="default" className="gap-2 rounded-xl shadow-sm" onClick={() => navigate('/reports')}>
          <BarChart3 className="w-4 h-4" />{t('chart.advancedReports')}
        </Button>
        <Button variant="outline" className="gap-2 rounded-xl" onClick={fetchStats} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          {t('chart.refresh')}
        </Button>
      </SectionHeader>

      {/* Charts — lazy loaded on scroll */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <LazyChart><ChartCard><DepartmentChart /></ChartCard></LazyChart>
        <LazyChart><ChartCard><EmployeeGrowthChart /></ChartCard></LazyChart>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <LazyChart><ChartCard><AttendanceChart /></ChartCard></LazyChart>
        <LazyChart><ChartCard><LeavesPieChart /></ChartCard></LazyChart>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <LazyChart><ChartCard><TrainingChart /></ChartCard></LazyChart>
        <LazyChart><ChartCard><PerformanceChart /></ChartCard></LazyChart>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <LazyChart><ChartCard><SalaryOverviewChart /></ChartCard></LazyChart>
        <RecentActivity />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <UpcomingEvents />
        <Announcements />
      </div>
    </DashboardLayout>
  );
};

export default Index;
