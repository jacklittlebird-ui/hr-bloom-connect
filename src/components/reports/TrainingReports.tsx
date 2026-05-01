import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { GraduationCap, BookOpen, Users, Award, Download, Printer, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useReportExport } from '@/hooks/useReportExport';
import { stationLocations } from '@/data/stationLocations';

export const TrainingReports = () => {
  const { t, isRTL } = useLanguage();
  const { language } = useLanguage();
  const [period, setPeriod] = useState('year');
  const [station, setStation] = useState('all');
  const { reportRef, handlePrint, exportToCSV, exportToPDF } = useReportExport();

  const courseCompletion = [
    { month: t('months.jan'), completed: 45, enrolled: 60 },
    { month: t('months.feb'), completed: 52, enrolled: 65 },
    { month: t('months.mar'), completed: 48, enrolled: 58 },
    { month: t('months.apr'), completed: 55, enrolled: 70 },
    { month: t('months.may'), completed: 60, enrolled: 72 },
    { month: t('months.jun'), completed: 58, enrolled: 68 },
  ];

  const categoryData = [
    { name: t('training.categories.technical'), value: 45, color: '#3b82f6' },
    { name: t('training.categories.soft'), value: 30, color: '#22c55e' },
    { name: t('training.categories.leadership'), value: 15, color: '#f59e0b' },
    { name: t('training.categories.safety'), value: 10, color: '#ef4444' },
  ];

  const departmentTraining = [
    { dept: t('dept.it'), hours: 450, employees: 45 },
    { dept: t('dept.hr'), hours: 180, employees: 20 },
    { dept: t('dept.finance'), hours: 220, employees: 25 },
    { dept: t('dept.marketing'), hours: 280, employees: 30 },
    { dept: t('dept.operations'), hours: 350, employees: 40 },
  ];

  const budgetData = [
    { month: t('months.jan'), budget: 50000, spent: 45000 },
    { month: t('months.feb'), budget: 50000, spent: 48000 },
    { month: t('months.mar'), budget: 55000, spent: 52000 },
    { month: t('months.apr'), budget: 55000, spent: 50000 },
    { month: t('months.may'), budget: 60000, spent: 58000 },
    { month: t('months.jun'), budget: 60000, spent: 55000 },
  ];

  const stats = [
    { label: t('reports.totalCourses'), value: 48, icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10' },
    { label: t('reports.trainedEmployees'), value: 145, icon: Users, color: 'text-success', bg: 'bg-success/10' },
    { label: t('reports.totalHours'), value: '1,480', icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: t('reports.certifications'), value: 89, icon: Award, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  const reportTitle = t('reports.tabs.training');

  const getExportColumns = () => [
    { header: t('reports.month'), key: 'month' },
    { header: t('reports.enrolled'), key: 'enrolled' },
    { header: t('reports.completed'), key: 'completed' },
    { header: t('reports.budget'), key: 'budget' },
    { header: t('reports.spent'), key: 'spent' },
  ];

  const getExportData = () => courseCompletion.map((c, i) => ({
    month: c.month, enrolled: c.enrolled, completed: c.completed,
    budget: budgetData[i]?.budget ?? 0, spent: budgetData[i]?.spent ?? 0,
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
                  <SelectItem value="month">{t('reports.thisMonth')}</SelectItem>
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
                <Download className="w-4 h-4 mr-2" />{t('reports.previewPDF') || (t('language') === 'ar' ? 'معاينة PDF' : 'Preview PDF')}
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
            <CardHeader><CardTitle>{t('reports.courseCompletion')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseCompletion}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} />
                    <Tooltip /><Legend />
                    <Bar dataKey="enrolled" name={t('reports.enrolled')} fill="#3b82f6" />
                    <Bar dataKey="completed" name={t('reports.completed')} fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('reports.trainingByCategory')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {categoryData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('reports.trainingByDept')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentTraining}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dept" fontSize={12} /><YAxis fontSize={12} />
                    <Tooltip /><Legend />
                    <Bar dataKey="hours" name={t('reports.trainingHours')} fill="#8b5cf6" />
                    <Bar dataKey="employees" name={t('reports.employees')} fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('reports.budgetVsSpent')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={budgetData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                    <Legend />
                    <Line type="monotone" dataKey="budget" name={t('reports.budget')} stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="spent" name={t('reports.spent')} stroke="#22c55e" strokeWidth={2} />
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
