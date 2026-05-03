import { useState } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Calendar, CheckCircle, XCircle, Clock, Download, Printer, FileText, RotateCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useReportExport } from '@/hooks/useReportExport';
import { stationLocations } from '@/data/stationLocations';
import { DemoDataBanner } from './DemoDataBanner';

export const LeaveReports = () => {
  const { t, isRTL } = useLanguage();
  const { language } = useLanguage();
  const [period, setPeriod] = useState('year');
  const [station, setStation] = useState('all');
  const { reportRef, handlePrint, exportToCSV, exportToPDF } = useReportExport();

  const leaveTypeData = [
    { name: t('leave.types.annual'), value: 450, color: '#3b82f6' },
    { name: t('leave.types.sick'), value: 120, color: '#ef4444' },
    { name: t('leaves.types.casual'), value: 80, color: '#22c55e' },
    { name: t('leave.types.unpaid'), value: 25, color: '#6b7280' },
  ];

  const monthlyLeaves = [
    { month: t('months.jan'), requests: 45, approved: 40, rejected: 5 },
    { month: t('months.feb'), requests: 38, approved: 35, rejected: 3 },
    { month: t('months.mar'), requests: 52, approved: 48, rejected: 4 },
    { month: t('months.apr'), requests: 60, approved: 55, rejected: 5 },
    { month: t('months.may'), requests: 48, approved: 44, rejected: 4 },
    { month: t('months.jun'), requests: 55, approved: 50, rejected: 5 },
  ];

  const balanceData = [
    { dept: t('dept.it'), used: 120, remaining: 80 },
    { dept: t('dept.hr'), used: 45, remaining: 35 },
    { dept: t('dept.finance'), used: 60, remaining: 40 },
    { dept: t('dept.marketing'), used: 70, remaining: 50 },
    { dept: t('dept.operations'), used: 90, remaining: 70 },
  ];

  const stats = [
    { label: t('reports.totalRequests'), value: 298, icon: Calendar, color: 'text-primary', bg: 'bg-primary/10' },
    { label: t('reports.approved'), value: 272, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    { label: t('reports.rejected'), value: 26, icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: t('reports.pending'), value: 12, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  const reportTitle = t('reports.tabs.leaves');

  const getExportColumns = () => [
    { header: t('reports.month'), key: 'month' },
    { header: t('reports.requests'), key: 'requests' },
    { header: t('reports.approved'), key: 'approved' },
    { header: t('reports.rejected'), key: 'rejected' },
  ];

  const getExportData = () => monthlyLeaves.map(d => ({
    month: d.month, requests: d.requests, approved: d.approved, rejected: d.rejected,
  }));

  const hasFilters = period !== 'year' || station !== 'all';
  const resetFilters = () => { setPeriod('year'); setStation('all'); };

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
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1 text-muted-foreground">
                  <RotateCcw className="w-4 h-4" />{language === 'ar' ? 'إعادة ضبط' : 'Reset'}
                </Button>
              )}
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
            <CardHeader><CardTitle>{t('reports.leavesByType')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={leaveTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {leaveTypeData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('reports.monthlyRequests')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyLeaves}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} />
                    <Tooltip /><Legend />
                    <Line type="monotone" dataKey="requests" name={t('reports.requests')} stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="approved" name={t('reports.approved')} stroke="#22c55e" strokeWidth={2} />
                    <Line type="monotone" dataKey="rejected" name={t('reports.rejected')} stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>{t('reports.leaveBalanceByDept')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={balanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dept" fontSize={12} /><YAxis fontSize={12} />
                    <Tooltip /><Legend />
                    <Bar dataKey="used" name={t('reports.usedDays')} fill="#ef4444" />
                    <Bar dataKey="remaining" name={t('reports.remainingDays')} fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
