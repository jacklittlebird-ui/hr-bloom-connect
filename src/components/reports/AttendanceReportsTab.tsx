import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Clock, UserCheck, UserX, AlertTriangle, Download, Printer, FileText, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { useReportExport } from '@/hooks/useReportExport';
import { stationLocations } from '@/data/stationLocations';
import { DemoDataBanner } from './DemoDataBanner';

export const AttendanceReportsTab = () => {
  const { t, isRTL } = useLanguage();
  const { language } = useLanguage();
  const [period, setPeriod] = useState('month');
  const [station, setStation] = useState('all');
  const { reportRef, handlePrint, exportToCSV, exportToPDF } = useReportExport();

  const dailyAttendance = [
    { day: t('days.sun'), present: 145, absent: 10, late: 5 },
    { day: t('days.mon'), present: 150, absent: 8, late: 2 },
    { day: t('days.tue'), present: 148, absent: 7, late: 5 },
    { day: t('days.wed'), present: 152, absent: 5, late: 3 },
    { day: t('days.thu'), present: 147, absent: 9, late: 4 },
  ];

  const monthlyTrend = [
    { month: t('months.jan'), rate: 92 },
    { month: t('months.feb'), rate: 94 },
    { month: t('months.mar'), rate: 91 },
    { month: t('months.apr'), rate: 95 },
    { month: t('months.may'), rate: 93 },
    { month: t('months.jun'), rate: 96 },
  ];

  const statusDistribution = [
    { name: t('reports.present'), value: 85, color: '#22c55e' },
    { name: t('reports.absent'), value: 5, color: '#ef4444' },
    { name: t('reports.late'), value: 7, color: '#f59e0b' },
    { name: t('reports.onLeave'), value: 3, color: '#3b82f6' },
  ];

  const overtimeData = [
    { month: t('months.jan'), hours: 320 },
    { month: t('months.feb'), hours: 280 },
    { month: t('months.mar'), hours: 350 },
    { month: t('months.apr'), hours: 290 },
    { month: t('months.may'), hours: 310 },
    { month: t('months.jun'), hours: 340 },
  ];

  const stats = [
    { label: t('reports.avgAttendance'), value: '94%', icon: UserCheck, color: 'text-success', bg: 'bg-success/10' },
    { label: t('reports.avgLateArrivals'), value: '3.5%', icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
    { label: t('reports.avgAbsence'), value: '2.5%', icon: UserX, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: t('reports.totalOvertime'), value: '1,890h', icon: AlertTriangle, color: 'text-blue-600', bg: 'bg-blue-100' },
  ];

  const reportTitle = t('reports.tabs.attendance');

  const getExportColumns = () => [
    { header: t('reports.day'), key: 'day' },
    { header: t('reports.present'), key: 'present' },
    { header: t('reports.absent'), key: 'absent' },
    { header: t('reports.late'), key: 'late' },
  ];

  const getExportData = () => dailyAttendance.map(d => ({
    day: d.day, present: d.present, absent: d.absent, late: d.late,
  }));

  const hasFilters = period !== 'month' || station !== 'all';
  const resetFilters = () => { setPeriod('month'); setStation('all'); };

  return (
    <div className="space-y-6">
      <DemoDataBanner />
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-4 items-center justify-between", isRTL && "flex-row-reverse")}>
            <div className={cn("flex flex-wrap gap-4 items-center", isRTL && "flex-row-reverse")}>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t('reports.thisWeek')}</SelectItem>
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
            <CardHeader><CardTitle>{t('reports.dailyAttendance')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyAttendance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" fontSize={12} /><YAxis fontSize={12} />
                    <Tooltip /><Legend />
                    <Bar dataKey="present" name={t('reports.present')} fill="#22c55e" />
                    <Bar dataKey="absent" name={t('reports.absent')} fill="#ef4444" />
                    <Bar dataKey="late" name={t('reports.late')} fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('reports.statusDistribution')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {statusDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('reports.attendanceTrend')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} domain={[80, 100]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="rate" name={t('reports.attendanceRate')} stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('reports.overtimeHours')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={overtimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="hours" name={t('reports.hours')} stroke="#8b5cf6" strokeWidth={2} />
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
