import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePerformanceData } from '@/contexts/PerformanceDataContext';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Download, FileBarChart, TrendingUp, TrendingDown, Star, Target, Building2, Printer, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useReportExport } from '@/hooks/useReportExport';

const years = Array.from({ length: 11 }, (_, i) => String(2025 + i));
const JOB_DEGREES = ['AA', 'A', 'B', 'C'];
const normalizePeriodValue = (value: unknown) => String(value || '').trim().toUpperCase();

export const QuarterlyReports = () => {
  const { t, isRTL, language } = useLanguage();
  const { reviews } = usePerformanceData();
  const { employees } = useEmployeeData();
  const { exportToCSV, exportToPDF, handlePrint, reportRef } = useReportExport();

  // Default to the most recent year/quarter that actually has data; fall back to current year
  const latest = useMemo(() => {
    const sorted = [...reviews].sort((a, b) => {
      const yc = String(b.year).localeCompare(String(a.year));
      if (yc !== 0) return yc;
      return String(b.quarter).localeCompare(String(a.quarter));
    });
    const first = sorted[0];
    return {
      year: first ? String(first.year) : String(new Date().getFullYear()),
      quarter: first ? String(first.quarter) : 'Q1',
    };
  }, [reviews]);

  const [selectedYear, setSelectedYear] = useState(latest.year);
  const [selectedQuarter, setSelectedQuarter] = useState(latest.quarter);
  const [jobDegreeFilter, setJobDegreeFilter] = useState<string>('all');

  const employeeDegreeMap = useMemo(() => {
    const m = new Map<string, string>();
    employees.forEach(e => {
      const deg = e.jobDegree || '';
      if (e.id) m.set(e.id, deg);
      if (e.employeeId) m.set(e.employeeId, deg);
    });
    return m;
  }, [employees]);

  // Keep defaults in sync once reviews finish loading (only while user hasn't interacted with a non-empty selection)
  useEffect(() => {
    if (reviews.length === 0) return;
    setSelectedYear(prev => (prev && prev !== '2025' ? prev : latest.year));
    setSelectedQuarter(prev => (prev && prev !== 'Q4' ? prev : latest.quarter));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest.year, latest.quarter, reviews.length]);

  const { departmentScores, quarterlyComparison, criteriaAverages, radarData, summaryStats } = useMemo(() => {
    const yearNorm = String(selectedYear || '').trim();
    const quarterNorm = String(selectedQuarter || '').trim().toUpperCase();
    const matchesDegree = (r: any) => jobDegreeFilter === 'all' || employeeDegreeMap.get(r.employeeId) === jobDegreeFilter;
    const filtered = reviews.filter(r => String(r.year || '').trim() === yearNorm && matchesDegree(r));
    const quarterFiltered = filtered.filter(r => String(r.quarter || '').trim().toUpperCase() === quarterNorm);

    // Department scores
    const deptMap: Record<string, { total: number; count: number }> = {};
    quarterFiltered.forEach(r => {
      if (!deptMap[r.department]) deptMap[r.department] = { total: 0, count: 0 };
      deptMap[r.department].total += r.score;
      deptMap[r.department].count++;
    });
    const departmentScores = Object.entries(deptMap).map(([department, data]) => ({
      department,
      average: parseFloat((data.total / data.count).toFixed(1)),
      employees: data.count,
      trend: '+0.0',
    }));

    // Quarterly comparison for the selected year
    const quarterlyComparison = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
      const qReviews = filtered.filter(r => normalizePeriodValue(r.quarter) === q);
      const avg = qReviews.length > 0 ? parseFloat((qReviews.reduce((s, r) => s + r.score, 0) / qReviews.length).toFixed(1)) : 0;
      return { quarter: q, score: avg, target: 4.0 };
    });

    // Criteria averages from reviews with criteria
    const criteriaMap: Record<string, { total: number; count: number }> = {};
    quarterFiltered.forEach(r => {
      r.criteria?.forEach(c => {
        const key = language === 'ar' ? c.name : c.nameEn;
        if (!criteriaMap[key]) criteriaMap[key] = { total: 0, count: 0 };
        criteriaMap[key].total += c.score;
        criteriaMap[key].count++;
      });
    });
    const criteriaAverages = Object.entries(criteriaMap).map(([criteria, data]) => ({
      criteria,
      score: parseFloat((data.total / data.count).toFixed(1)),
    }));

    const radarData = criteriaAverages.map(item => ({
      subject: item.criteria,
      A: item.score * 20,
      fullMark: 100,
    }));

    const totalReviews = quarterFiltered.length;
    const avgScore = totalReviews > 0 ? (quarterFiltered.reduce((s, r) => s + r.score, 0) / totalReviews).toFixed(1) : '0';
    const aboveTarget = totalReviews > 0 ? Math.round((quarterFiltered.filter(r => r.score >= 4.0).length / totalReviews) * 100) : 0;
    const needsImprovement = totalReviews > 0 ? Math.round((quarterFiltered.filter(r => r.score < 2.5).length / totalReviews) * 100) : 0;

    const summaryStats = [
      { label: t('performance.reports.totalReviews'), value: String(totalReviews), icon: FileBarChart, color: 'bg-stat-blue/10 text-stat-blue' },
      { label: t('performance.reports.avgScore'), value: avgScore, icon: Star, color: 'bg-stat-yellow/10 text-stat-yellow' },
      { label: t('performance.reports.aboveTarget'), value: `${aboveTarget}%`, icon: TrendingUp, color: 'bg-stat-green/10 text-stat-green' },
      { label: t('performance.reports.needsImprovement'), value: `${needsImprovement}%`, icon: TrendingDown, color: 'bg-stat-coral/10 text-stat-coral' },
    ];

    return { departmentScores, quarterlyComparison, criteriaAverages, radarData, summaryStats };
  }, [reviews, selectedYear, selectedQuarter, language, t]);

  const handleExportCSV = () => {
    exportToCSV({
      title: language === 'ar' ? 'تقرير أداء الأقسام' : 'Department Performance Report',
      columns: [
        { header: language === 'ar' ? 'القسم' : 'Department', key: 'department' },
        { header: language === 'ar' ? 'المتوسط' : 'Average', key: 'average' },
        { header: language === 'ar' ? 'الموظفين' : 'Employees', key: 'employees' },
      ],
      data: departmentScores as any,
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: language === 'ar' ? 'تقرير أداء الأقسام' : 'Department Performance Report',
      columns: [
        { header: language === 'ar' ? 'القسم' : 'Department', key: 'department' },
        { header: language === 'ar' ? 'المتوسط' : 'Average', key: 'average' },
        { header: language === 'ar' ? 'الموظفين' : 'Employees', key: 'employees' },
      ],
      data: departmentScores as any,
    });
  };

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Report Selection */}
      <Card>
        <CardHeader>
          <div className={cn("flex flex-col sm:flex-row justify-between gap-4", isRTL && "sm:flex-row-reverse")}>
            <div>
              <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                <FileBarChart className="w-5 h-5 text-primary" />
                {t('performance.reports.title')}
              </CardTitle>
              <CardDescription className="mt-1">{t('performance.reports.description')}</CardDescription>
            </div>
            <div className={cn("flex gap-2 flex-wrap", isRTL && "flex-row-reverse")}>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q4">Q4</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q1">Q1</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => handlePrint(language === 'ar' ? 'التقارير الربع سنوية' : 'Quarterly Reports')} className="gap-1.5">
                <Printer className="w-4 h-4" />{language === 'ar' ? 'طباعة' : 'Print'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
                <FileSpreadsheet className="w-4 h-4" />Excel
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
                <Download className="w-4 h-4" />PDF
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                  <div className={cn("space-y-1", isRTL && "text-right")}>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={cn("p-3 rounded-lg", stat.color)}><Icon className="w-6 h-6" /></div>
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
              <TrendingUp className="w-5 h-5 text-primary" />
              {t('performance.reports.quarterlyTrend')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={quarterlyComparison}>
                  <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--stat-blue))" strokeWidth={3} dot={{ fill: 'hsl(var(--stat-blue))', strokeWidth: 2, r: 6 }} name={t('performance.metrics.actualScore')} />
                  <Line type="monotone" dataKey="target" stroke="hsl(var(--stat-green))" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: 'hsl(var(--stat-green))', strokeWidth: 2, r: 4 }} name={t('performance.metrics.target')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Target className="w-5 h-5 text-primary" />
              {t('performance.reports.criteriaAnalysis')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar name="Score" dataKey="A" stroke="hsl(var(--stat-blue))" fill="hsl(var(--stat-blue))" fillOpacity={0.4} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">{language === 'ar' ? 'لا توجد بيانات' : 'No data'}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Performance */}
      <Card>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
            <Building2 className="w-5 h-5 text-primary" />
            {t('performance.reports.departmentPerformance')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {departmentScores.length > 0 ? (
            <div className="space-y-4">
              {departmentScores.map((dept) => (
                <div key={dept.department} className={cn("flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors", isRTL && "flex-row-reverse")}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10"><Building2 className="w-5 h-5 text-primary" /></div>
                  <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
                    <p className="font-medium truncate">{dept.department}</p>
                    <p className="text-sm text-muted-foreground">{dept.employees} {t('performance.reports.employees')}</p>
                  </div>
                  <div className="w-32"><Progress value={dept.average * 20} className="h-2" /></div>
                  <div className={cn("flex items-center gap-2 min-w-[80px]", isRTL && "flex-row-reverse justify-end")}>
                    <Star className="w-4 h-4 text-stat-yellow fill-stat-yellow" />
                    <span className="font-bold">{dept.average}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">{language === 'ar' ? 'لا توجد بيانات لهذه الفترة' : 'No data for this period'}</div>
          )}
        </CardContent>
      </Card>

      {/* Criteria Breakdown */}
      {criteriaAverages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Target className="w-5 h-5 text-primary" />
              {t('performance.reports.criteriaBreakdown')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={criteriaAverages} layout="vertical">
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="criteria" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="hsl(var(--stat-blue))" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
