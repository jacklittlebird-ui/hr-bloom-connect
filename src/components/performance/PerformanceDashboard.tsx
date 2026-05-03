import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePerformanceData } from '@/contexts/PerformanceDataContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Star, TrendingUp, Users, Target, Award, BarChart3, CheckCircle, Clock, FileText, Send, ShieldCheck, Building2, MapPin, UserCheck, UserX, RotateCcw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { stationLocations } from '@/data/stationLocations';
import { toast } from 'sonner';

export const PerformanceDashboard = () => {
  const { t, isRTL, language } = useLanguage();
  const { reviews } = usePerformanceData();
  const { employees } = useEmployeeData();
  const ar = language === 'ar';

  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [stationFilter, setStationFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const years = useMemo(() => Array.from({ length: 11 }, (_, i) => String(2025 + i)), []);
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

  const allActiveEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees]);

  const departments = useMemo(() => {
    const depts = [...new Set(allActiveEmployees.map(e => e.department).filter(Boolean))];
    return depts.sort();
  }, [allActiveEmployees]);

  const activeEmployees = useMemo(() => {
    let list = allActiveEmployees;
    if (stationFilter !== 'all') list = list.filter(e => e.stationLocation === stationFilter);
    if (departmentFilter !== 'all') list = list.filter(e => e.department === departmentFilter);
    return list;
  }, [allActiveEmployees, stationFilter, departmentFilter]);

  // Filter reviews by selected year, quarter & station/department employees
  const activeEmployeeIds = useMemo(() => new Set(activeEmployees.map(e => e.id)), [activeEmployees]);

  const filteredReviews = useMemo(() => {
    let list = reviews;
    if (selectedYear) list = list.filter(r => r.year === selectedYear);
    if (selectedQuarter && selectedQuarter !== 'all') list = list.filter(r => r.quarter === selectedQuarter);
    if (stationFilter !== 'all' || departmentFilter !== 'all') list = list.filter(r => activeEmployeeIds.has(r.employeeId));
    return list;
  }, [reviews, selectedYear, selectedQuarter, stationFilter, departmentFilter, activeEmployeeIds]);

  // Status counts
  const statusCounts = useMemo(() => {
    const draft = filteredReviews.filter(r => r.status === 'draft').length;
    const submitted = filteredReviews.filter(r => r.status === 'submitted').length;
    const approved = filteredReviews.filter(r => r.status === 'approved').length;
    return { draft, submitted, approved, total: filteredReviews.length };
  }, [filteredReviews]);

  // Evaluated employee IDs
  const evaluatedIds = useMemo(() => new Set(filteredReviews.map(r => r.employeeId)), [filteredReviews]);

  // Station breakdown
  const stationBreakdown = useMemo(() => {
    const stationMap: Record<string, { total: number; evaluated: number; labelAr: string; labelEn: string }> = {};
    activeEmployees.forEach(emp => {
      const key = emp.stationLocation || '_none';
      if (!stationMap[key]) {
        const sl = stationLocations.find(s => s.value === emp.stationLocation);
        stationMap[key] = { total: 0, evaluated: 0, labelAr: sl?.labelAr || (ar ? 'غير محدد' : 'Unassigned'), labelEn: sl?.labelEn || 'Unassigned' };
      }
      stationMap[key].total++;
      if (evaluatedIds.has(emp.id)) stationMap[key].evaluated++;
    });
    return Object.entries(stationMap)
      .map(([key, v]) => ({ key, ...v, notEvaluated: v.total - v.evaluated }))
      .sort((a, b) => b.total - a.total);
  }, [activeEmployees, evaluatedIds, ar]);

  // Department breakdown
  const deptBreakdown = useMemo(() => {
    const deptMap: Record<string, { total: number; evaluated: number }> = {};
    activeEmployees.forEach(emp => {
      const key = emp.department || (ar ? 'غير محدد' : 'Unassigned');
      if (!deptMap[key]) deptMap[key] = { total: 0, evaluated: 0 };
      deptMap[key].total++;
      if (evaluatedIds.has(emp.id)) deptMap[key].evaluated++;
    });
    return Object.entries(deptMap)
      .map(([dept, v]) => ({ dept, ...v, notEvaluated: v.total - v.evaluated }))
      .sort((a, b) => b.total - a.total);
  }, [activeEmployees, evaluatedIds, ar]);

  const { performanceData, quarterlyTrend, topPerformers, stats } = useMemo(() => {
    const total = filteredReviews.length;
    const avgScore = total > 0 ? (filteredReviews.reduce((s, r) => s + r.score, 0) / total) : 0;
    const approved = filteredReviews.filter(r => r.status === 'approved').length;
    const pending = filteredReviews.filter(r => r.status === 'submitted' || r.status === 'draft').length;
    const completionRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    const excellent = filteredReviews.filter(r => r.score >= 4.5).length;
    const veryGood = filteredReviews.filter(r => r.score >= 3.5 && r.score < 4.5).length;
    const good = filteredReviews.filter(r => r.score >= 2.5 && r.score < 3.5).length;
    const acceptable = filteredReviews.filter(r => r.score >= 1.5 && r.score < 2.5).length;
    const poor = filteredReviews.filter(r => r.score < 1.5).length;

    const performanceData = [
      { name: ar ? 'ممتاز' : 'Excellent', value: excellent, color: 'hsl(var(--stat-green))' },
      { name: ar ? 'جيد جداً' : 'Very Good', value: veryGood, color: 'hsl(var(--stat-blue))' },
      { name: ar ? 'جيد' : 'Good', value: good, color: 'hsl(var(--stat-yellow))' },
      { name: ar ? 'مقبول' : 'Acceptable', value: acceptable, color: 'hsl(var(--stat-coral))' },
      { name: ar ? 'ضعيف' : 'Poor', value: poor, color: 'hsl(var(--destructive))' },
    ].filter(d => d.value > 0);

    const quarterMap: Record<string, { total: number; count: number }> = {};
    filteredReviews.forEach(r => {
      const key = `${r.quarter} ${r.year}`;
      if (!quarterMap[key]) quarterMap[key] = { total: 0, count: 0 };
      quarterMap[key].total += r.score;
      quarterMap[key].count++;
    });
    const quarterlyTrend = Object.entries(quarterMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-4)
      .map(([quarter, data]) => ({
        quarter,
        average: parseFloat((data.total / data.count).toFixed(1)),
        completed: data.count,
      }));

    const empBest: Record<string, { name: string; department: string; score: number }> = {};
    filteredReviews.filter(r => r.status === 'approved').forEach(r => {
      if (!empBest[r.employeeId] || r.score > empBest[r.employeeId].score) {
        empBest[r.employeeId] = { name: r.employeeName, department: r.department, score: r.score };
      }
    });
    const topPerformers = Object.entries(empBest)
      .map(([id, data]) => ({ id, ...data, avatar: data.name.split(' ').map(w => w[0]).join('').slice(0, 2) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const stats = [
      { key: 'performance.stats.avgScore', value: avgScore.toFixed(1), icon: Star, color: 'bg-stat-yellow/10 text-stat-yellow' },
      { key: 'performance.stats.totalReviews', value: String(total), icon: BarChart3, color: 'bg-stat-blue/10 text-stat-blue' },
      { key: 'performance.stats.pendingReviews', value: String(pending), icon: Target, color: 'bg-stat-coral/10 text-stat-coral' },
      { key: 'performance.stats.completionRate', value: `${completionRate}%`, icon: TrendingUp, color: 'bg-stat-green/10 text-stat-green' },
    ];

    return { performanceData, quarterlyTrend, topPerformers, stats };
  }, [filteredReviews, ar]);

  const totalEvaluated = evaluatedIds.size;
  const totalNotEvaluated = activeEmployees.length - totalEvaluated;

  return (
    <div className="space-y-6">
      {/* Year & Quarter Filter */}
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex items-end gap-4 flex-wrap", isRTL && "flex-row-reverse")}>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? 'السنة' : 'Year'}</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? 'الربع السنوي' : 'Quarter'}</Label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder={ar ? 'الكل' : 'All'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع الأرباع' : 'All Quarters'}</SelectItem>
                  {quarters.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? 'المحطة' : 'Station'}</Label>
              <Select value={stationFilter} onValueChange={setStationFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                  {stationLocations.map(s => <SelectItem key={s.value} value={s.value}>{ar ? s.labelAr : s.labelEn}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{ar ? 'القسم' : 'Department'}</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع الأقسام' : 'All Departments'}</SelectItem>
                  {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Evaluated */}
        <Card className="border-stat-green/30">
          <CardContent className="p-4 text-center space-y-1">
            <UserCheck className="w-6 h-6 mx-auto text-stat-green" />
            <p className="text-2xl font-bold text-stat-green">{totalEvaluated}</p>
            <p className="text-xs text-muted-foreground">{ar ? 'تم تقييمهم' : 'Evaluated'}</p>
          </CardContent>
        </Card>
        {/* Total Not Evaluated */}
        <Card className="border-destructive/30">
          <CardContent className="p-4 text-center space-y-1">
            <UserX className="w-6 h-6 mx-auto text-destructive" />
            <p className="text-2xl font-bold text-destructive">{totalNotEvaluated}</p>
            <p className="text-xs text-muted-foreground">{ar ? 'لم يتم تقييمهم' : 'Not Evaluated'}</p>
          </CardContent>
        </Card>
        {/* Total Employees */}
        <Card>
          <CardContent className="p-4 text-center space-y-1">
            <Users className="w-6 h-6 mx-auto text-primary" />
            <p className="text-2xl font-bold">{activeEmployees.length}</p>
            <p className="text-xs text-muted-foreground">{ar ? 'إجمالي الموظفين' : 'Total Employees'}</p>
          </CardContent>
        </Card>
        {/* Draft */}
        <Card className="border-muted-foreground/20">
          <CardContent className="p-4 text-center space-y-1">
            <FileText className="w-6 h-6 mx-auto text-muted-foreground" />
            <p className="text-2xl font-bold text-muted-foreground">{statusCounts.draft}</p>
            <p className="text-xs text-muted-foreground">{ar ? 'مسودة' : 'Draft'}</p>
          </CardContent>
        </Card>
        {/* Submitted */}
        <Card className="border-stat-yellow/30">
          <CardContent className="p-4 text-center space-y-1">
            <Send className="w-6 h-6 mx-auto text-stat-yellow" />
            <p className="text-2xl font-bold text-stat-yellow">{statusCounts.submitted}</p>
            <p className="text-xs text-muted-foreground">{ar ? 'مرسلة' : 'Submitted'}</p>
          </CardContent>
        </Card>
        {/* Approved */}
        <Card className="border-stat-green/30">
          <CardContent className="p-4 text-center space-y-1">
            <ShieldCheck className="w-6 h-6 mx-auto text-stat-green" />
            <p className="text-2xl font-bold text-stat-green">{statusCounts.approved}</p>
            <p className="text-xs text-muted-foreground">{ar ? 'معتمدة' : 'Approved'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Station & Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Station */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={cn("flex items-center gap-2 text-base", isRTL && "flex-row-reverse")}>
              <MapPin className="w-5 h-5 text-primary" />
              {ar ? 'حالة التقييم حسب المحطة' : 'Evaluation Status by Station'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stationBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{ar ? 'لا توجد بيانات' : 'No data'}</p>
            ) : stationBreakdown.map(s => {
              const pct = s.total > 0 ? Math.round((s.evaluated / s.total) * 100) : 0;
              return (
                <div key={s.key} className="space-y-1.5">
                  <div className={cn("flex items-center justify-between text-sm", isRTL && "flex-row-reverse")}>
                    <span className="font-medium">{ar ? s.labelAr : s.labelEn}</span>
                    <div className={cn("flex items-center gap-2 text-xs", isRTL && "flex-row-reverse")}>
                      <Badge variant="outline" className="bg-stat-green/10 text-stat-green border-stat-green/30 gap-1">
                        <UserCheck className="w-3 h-3" /> {s.evaluated}
                      </Badge>
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                        <UserX className="w-3 h-3" /> {s.notEvaluated}
                      </Badge>
                      <span className="text-muted-foreground">/ {s.total}</span>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* By Department */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className={cn("flex items-center gap-2 text-base", isRTL && "flex-row-reverse")}>
              <Building2 className="w-5 h-5 text-primary" />
              {ar ? 'حالة التقييم حسب القسم' : 'Evaluation Status by Department'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deptBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{ar ? 'لا توجد بيانات' : 'No data'}</p>
            ) : deptBreakdown.map(d => {
              const pct = d.total > 0 ? Math.round((d.evaluated / d.total) * 100) : 0;
              return (
                <div key={d.dept} className="space-y-1.5">
                  <div className={cn("flex items-center justify-between text-sm", isRTL && "flex-row-reverse")}>
                    <span className="font-medium">{d.dept}</span>
                    <div className={cn("flex items-center gap-2 text-xs", isRTL && "flex-row-reverse")}>
                      <Badge variant="outline" className="bg-stat-green/10 text-stat-green border-stat-green/30 gap-1">
                        <UserCheck className="w-3 h-3" /> {d.evaluated}
                      </Badge>
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                        <UserX className="w-3 h-3" /> {d.notEvaluated}
                      </Badge>
                      <span className="text-muted-foreground">/ {d.total}</span>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Original Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key}>
              <CardContent className="p-6">
                <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                  <div className={cn("space-y-1", isRTL && "text-right")}>
                    <p className="text-sm text-muted-foreground">{t(stat.key)}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={cn("p-3 rounded-lg", stat.color)}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <BarChart3 className="w-5 h-5 text-primary" />
              {t('performance.charts.distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {performanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={performanceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}>
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">{ar ? 'لا توجد بيانات' : 'No data'}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <TrendingUp className="w-5 h-5 text-primary" />
              {t('performance.charts.quarterlyTrend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {quarterlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quarterlyTrend}>
                    <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average" fill="hsl(var(--stat-blue))" name={t('performance.metrics.average')} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" fill="hsl(var(--stat-green))" name={t('performance.metrics.completed')} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">{ar ? 'لا توجد بيانات' : 'No data'}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Award className="w-5 h-5 text-stat-yellow" />
            {t('performance.topPerformers')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topPerformers.length > 0 ? (
            <div className="space-y-4">
              {topPerformers.map((performer, index) => (
                <div key={performer.id} className={cn("flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors", isRTL && "flex-row-reverse")}>
                  <div className={cn("flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                    index === 0 ? "bg-stat-yellow text-stat-yellow-foreground" :
                    index === 1 ? "bg-muted-foreground/20 text-muted-foreground" :
                    index === 2 ? "bg-stat-coral/20 text-stat-coral" :
                    "bg-muted text-muted-foreground"
                  )}>{index + 1}</div>
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold">{performer.avatar}</div>
                  <div className={cn("flex-1", isRTL && "text-right")}>
                    <p className="font-medium">{performer.name}</p>
                    <p className="text-sm text-muted-foreground">{performer.department}</p>
                  </div>
                  <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                    <Star className="w-4 h-4 text-stat-yellow fill-stat-yellow" />
                    <span className="font-bold text-lg">{performer.score}</span>
                  </div>
                  <Progress value={performer.score * 20} className="w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">{ar ? 'لا توجد تقييمات معتمدة بعد' : 'No approved reviews yet'}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
