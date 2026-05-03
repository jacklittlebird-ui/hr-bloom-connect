import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Star, Award, TrendingUp, Users, Download, Printer, FileText, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, LineChart, Line } from 'recharts';
import { useReportExport } from '@/hooks/useReportExport';
import { stationLocations } from '@/data/stationLocations';
import { DemoDataBanner } from './DemoDataBanner';

export const PerformanceReports = () => {
  const { t, isRTL } = useLanguage();
  const { language } = useLanguage();
  const [period, setPeriod] = useState('year');
  const [station, setStation] = useState('all');
  const { reportRef, handlePrint, exportToCSV, exportToPDF } = useReportExport();

  const ratingDistribution = [
    { name: t('performance.ratings.excellent'), value: 35, color: '#22c55e' },
    { name: t('performance.ratings.good'), value: 55, color: '#3b82f6' },
    { name: t('performance.ratings.average'), value: 40, color: '#f59e0b' },
    { name: t('performance.ratings.needsImprovement'), value: 20, color: '#ef4444' },
    { name: t('performance.ratings.poor'), value: 10, color: '#6b7280' },
  ];

  const departmentPerformance = [
    { dept: t('dept.it'), score: 4.2 },
    { dept: t('dept.hr'), score: 4.5 },
    { dept: t('dept.finance'), score: 4.0 },
    { dept: t('dept.marketing'), score: 3.8 },
    { dept: t('dept.operations'), score: 4.1 },
  ];

  const criteriaScores = [
    { criteria: t('performance.criteria.quality'), score: 4.2 },
    { criteria: t('performance.criteria.productivity'), score: 3.9 },
    { criteria: t('performance.criteria.teamwork'), score: 4.3 },
    { criteria: t('performance.criteria.communication'), score: 4.0 },
    { criteria: t('performance.criteria.initiative'), score: 3.7 },
    { criteria: t('performance.criteria.attendance'), score: 4.5 },
  ];

  const quarterlyTrend = [
    { quarter: 'Q1', avgScore: 3.8 },
    { quarter: 'Q2', avgScore: 4.0 },
    { quarter: 'Q3', avgScore: 4.1 },
    { quarter: 'Q4', avgScore: 4.2 },
  ];

  const stats = [
    { label: t('reports.avgRating'), value: '4.1', icon: Star, color: 'text-warning', bg: 'bg-warning/10' },
    { label: t('reports.topPerformers'), value: 35, icon: Award, color: 'text-success', bg: 'bg-success/10' },
    { label: t('reports.improvement'), value: '+8%', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: t('reports.reviewsCompleted'), value: 145, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  const reportTitle = t('reports.tabs.performance');

  const getExportColumns = () => [
    { header: t('reports.department'), key: 'dept' },
    { header: t('reports.avgScore'), key: 'score' },
  ];

  const getExportData = () => departmentPerformance.map(d => ({
    dept: d.dept, score: d.score,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-4 items-center justify-between", isRTL && "flex-row-reverse")}>
            <div className={cn("flex gap-4", isRTL && "flex-row-reverse")}>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarter">{t('reports.thisQuarter')}</SelectItem>
                  <SelectItem value="year">{t('reports.thisYear')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={station} onValueChange={setStation}>
                <SelectTrigger className="w-44"><SelectValue placeholder={language === 'ar' ? 'المحطة/الموقع' : 'Station'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                  {stationLocations.map(s => (
                    <SelectItem key={s.value} value={s.value}>{language === 'ar' ? s.labelAr : s.labelEn}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
              <Button variant="outline" size="sm" onClick={() => handlePrint(reportTitle)}>
                <Printer className="w-4 h-4 mr-2" />{t('reports.print')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToPDF({ title: reportTitle, data: getExportData(), columns: getExportColumns() })}>
                <Download className="w-4 h-4 mr-2" />{t('reports.exportPDF')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToCSV({ title: reportTitle, data: getExportData(), columns: getExportColumns() })}>
                <FileText className="w-4 h-4 mr-2" />{t('reports.exportExcel')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                  <div className={cn("p-3 rounded-lg", stat.bg)}>
                    <stat.icon className={cn("w-6 h-6", stat.color)} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader><CardTitle>{t('reports.ratingDistribution')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ratingDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {ratingDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('reports.criteriaAnalysis')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={criteriaScores}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="criteria" fontSize={10} />
                    <PolarRadiusAxis domain={[0, 5]} />
                    <Radar name={t('reports.score')} dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('reports.deptPerformance')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 5]} fontSize={12} />
                    <YAxis type="category" dataKey="dept" fontSize={12} width={80} />
                    <Tooltip />
                    <Bar dataKey="score" name={t('reports.avgScore')} fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('reports.quarterlyTrend')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={quarterlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="quarter" fontSize={12} /><YAxis domain={[3, 5]} fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgScore" name={t('reports.avgScore')} stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
