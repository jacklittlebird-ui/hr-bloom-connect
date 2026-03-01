import { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecruitmentData } from '@/contexts/RecruitmentDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Download, Printer, Briefcase, Users, Clock, TrendingUp, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const years = Array.from({ length: 11 }, (_, i) => String(2026 + i));

export const RecruitmentReports = () => {
  const { t, isRTL } = useLanguage();
  const { jobOpenings, candidates, interviews } = useRecruitmentData();
  const [selectedYear, setSelectedYear] = useState('2026');

  // Stats from real data
  const totalApplications = candidates.length;
  const totalHired = candidates.filter(c => c.status === 'hired').length;
  const totalInterviews = interviews.length;
  const completedInterviews = interviews.filter(i => i.status === 'completed').length;
  const conversionRate = totalApplications > 0 ? ((totalHired / totalApplications) * 100).toFixed(1) : '0';

  const stats = [
    { label: isRTL ? 'إجمالي المتقدمين' : 'Total Applications', value: String(totalApplications), icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: isRTL ? 'تم التعيين' : 'Hired', value: String(totalHired), icon: Briefcase, color: 'text-green-600', bg: 'bg-green-100' },
    { label: isRTL ? 'المقابلات المكتملة' : 'Completed Interviews', value: String(completedInterviews), icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: isRTL ? 'معدل التحويل' : 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  // Candidates by status for pie chart
  const statusData = useMemo(() => {
    const statusMap: Record<string, number> = {};
    candidates.forEach(c => { statusMap[c.status] = (statusMap[c.status] || 0) + 1; });
    const colors: Record<string, string> = {
      new: '#3b82f6', screening: '#a855f7', interview: '#f59e0b',
      offer: '#06b6d4', hired: '#22c55e', rejected: '#ef4444',
    };
    const labels: Record<string, string> = {
      new: t('recruitment.candidateStatus.new'), screening: t('recruitment.candidateStatus.screening'),
      interview: t('recruitment.candidateStatus.interview'), offer: t('recruitment.candidateStatus.offer'),
      hired: t('recruitment.candidateStatus.hired'), rejected: t('recruitment.candidateStatus.rejected'),
    };
    return Object.entries(statusMap).map(([status, value]) => ({
      name: labels[status] || status, value, color: colors[status] || '#8b5cf6',
    }));
  }, [candidates, t]);

  // Jobs by department for bar chart
  const deptData = useMemo(() => {
    const deptMap: Record<string, { openings: number; filled: number }> = {};
    jobOpenings.forEach(j => {
      if (!deptMap[j.department]) deptMap[j.department] = { openings: 0, filled: 0 };
      deptMap[j.department].openings += j.vacancies;
    });
    candidates.filter(c => c.status === 'hired').forEach(c => {
      if (deptMap[c.department]) deptMap[c.department].filled++;
    });
    return Object.entries(deptMap).map(([dept, data]) => ({ dept, ...data }));
  }, [jobOpenings, candidates]);

  // Source analysis
  const sourceData = useMemo(() => {
    const sourceMap: Record<string, number> = {};
    candidates.forEach(c => {
      const src = c.source || (isRTL ? 'غير محدد' : 'Unknown');
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];
    return Object.entries(sourceMap).map(([name, value], i) => ({
      name, value, color: colors[i % colors.length],
    }));
  }, [candidates, isRTL]);

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-4 items-center justify-between", isRTL && "flex-row-reverse")}>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
              <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4" />{isRTL ? 'طباعة' : 'Print'}</Button>
              <Button variant="outline" size="sm"><Download className="w-4 h-4" />{isRTL ? 'تصدير' : 'Export'}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                <div className={cn("p-3 rounded-lg", stat.bg)}><stat.icon className={cn("w-6 h-6", stat.color)} /></div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidates by Status */}
        <Card>
          <CardHeader><CardTitle>{isRTL ? 'المرشحون حسب الحالة' : 'Candidates by Status'}</CardTitle></CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source Analysis */}
        <Card>
          <CardHeader><CardTitle>{isRTL ? 'مصادر التوظيف' : 'Recruitment Sources'}</CardTitle></CardHeader>
          <CardContent>
            {sourceData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {sourceData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Hiring */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{isRTL ? 'التوظيف حسب القسم' : 'Hiring by Department'}</CardTitle></CardHeader>
          <CardContent>
            {deptData.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{isRTL ? 'لا توجد بيانات' : 'No data'}</p>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="dept" type="category" fontSize={12} width={120} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="openings" name={isRTL ? 'الشواغر' : 'Openings'} fill="hsl(var(--primary))" />
                    <Bar dataKey="filled" name={isRTL ? 'تم شغلها' : 'Filled'} fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Openings Summary Table */}
      <Card>
        <CardHeader><CardTitle>{isRTL ? 'ملخص الوظائف الشاغرة' : 'Job Openings Summary'}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isRTL ? 'الوظيفة' : 'Position'}</TableHead>
                <TableHead>{isRTL ? 'القسم' : 'Department'}</TableHead>
                <TableHead>{isRTL ? 'الموقع' : 'Location'}</TableHead>
                <TableHead>{isRTL ? 'الشواغر' : 'Vacancies'}</TableHead>
                <TableHead>{isRTL ? 'المتقدمون' : 'Applicants'}</TableHead>
                <TableHead>{isRTL ? 'الحالة' : 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobOpenings.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{isRTL ? 'لا توجد بيانات' : 'No data'}</TableCell></TableRow>
              ) : jobOpenings.map(job => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{isRTL ? job.titleAr : job.titleEn || job.titleAr}</TableCell>
                  <TableCell>{job.department}</TableCell>
                  <TableCell>{job.location}</TableCell>
                  <TableCell>{job.vacancies}</TableCell>
                  <TableCell>{candidates.filter(c => c.appliedPosition === (isRTL ? job.titleAr : job.titleEn || job.titleAr)).length}</TableCell>
                  <TableCell>
                    <Badge className={job.status === 'open' ? 'bg-green-100 text-green-700' : job.status === 'closed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                      {job.status === 'open' ? t('recruitment.status.open') : job.status === 'closed' ? t('recruitment.status.closed') : t('recruitment.status.onHold')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
