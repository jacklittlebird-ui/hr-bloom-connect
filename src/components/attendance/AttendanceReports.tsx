import { useMemo, useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BarChart3, Users, Clock, TrendingUp, PieChart, Printer, FileText, FileSpreadsheet, FileType } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useReportExport } from '@/hooks/useReportExport';

interface DBAttendanceRecord {
  id: string;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  is_late: boolean | null;
  work_hours: number | null;
  work_minutes: number | null;
  notes: string | null;
  employees?: { name_ar: string; name_en: string; department_id: string | null } | null;
}

interface AttendanceReportsProps {
  records?: any[];
}

export const AttendanceReports = ({ records: _legacyRecords }: AttendanceReportsProps) => {
  const { t, isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const { handlePrint, exportBilingualPDF, exportBilingualCSV, exportBilingualWord } = useReportExport();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [dbRecords, setDbRecords] = useState<DBAttendanceRecord[]>([]);
  const [departments, setDepartments] = useState<Record<string, { name_ar: string; name_en: string }>>({});
  const [loading, setLoading] = useState(false);

  const monthNames = ar
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['January','February','March','April','May','June','July','August','September','October','November','December'];

  // Fetch departments once
  useEffect(() => {
    const fetchDepts = async () => {
      const { data } = await supabase.from('departments').select('id, name_ar, name_en');
      if (data) {
        const map: Record<string, { name_ar: string; name_en: string }> = {};
        data.forEach(d => { map[d.id] = { name_ar: d.name_ar, name_en: d.name_en }; });
        setDepartments(map);
      }
    };
    fetchDepts();
  }, []);

  // Fetch attendance records for selected month/year
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      const month = Number(selectedMonth);
      const year = Number(selectedYear);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, employee_id, date, check_in, check_out, status, is_late, work_hours, work_minutes, notes, employees!inner(name_ar, name_en, department_id)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (!error && data) {
        setDbRecords(data as any);
      }
      setLoading(false);
    };
    fetchRecords();
  }, [selectedMonth, selectedYear]);

  // Compute stats
  const stats = useMemo(() => {
    const totalRecords = dbRecords.length;
    const present = dbRecords.filter(r => r.status === 'present').length;
    const late = dbRecords.filter(r => r.status === 'late' || r.is_late).length;
    const absent = dbRecords.filter(r => r.status === 'absent').length;
    const onLeave = dbRecords.filter(r => r.status === 'on-leave').length;
    const earlyLeave = dbRecords.filter(r => r.status === 'early-leave').length;
    const mission = dbRecords.filter(r => r.status === 'mission').length;

    const totalMinutes = dbRecords.reduce((sum, r) => sum + (r.work_minutes || 0), 0);
    const totalWorkHours = Math.floor(totalMinutes / 60);
    const totalOvertimeHours = dbRecords.reduce((sum, r) => {
      const mins = r.work_minutes || 0;
      return sum + Math.max(0, mins - 480); // over 8 hours
    }, 0);

    const attendanceRate = totalRecords > 0 ? (((present + late + mission) / totalRecords) * 100).toFixed(1) : '0';
    const punctualityRate = (present + late) > 0 ? ((present / (present + late)) * 100).toFixed(1) : '0';

    return {
      totalRecords, present, late, absent, onLeave, earlyLeave, mission,
      totalWorkHours, totalOvertimeHours: Math.floor(totalOvertimeHours / 60),
      attendanceRate, punctualityRate,
    };
  }, [dbRecords]);

  // Status distribution for pie chart
  const statusData = useMemo(() => [
    { name: ar ? 'حاضر' : 'Present', value: stats.present, color: '#22c55e' },
    { name: ar ? 'متأخر' : 'Late', value: stats.late, color: '#f59e0b' },
    { name: ar ? 'غائب' : 'Absent', value: stats.absent, color: '#ef4444' },
    { name: ar ? 'إجازة' : 'On Leave', value: stats.onLeave, color: '#3b82f6' },
    { name: ar ? 'انصراف مبكر' : 'Early Leave', value: stats.earlyLeave, color: '#f97316' },
    { name: ar ? 'مأمورية' : 'Mission', value: stats.mission, color: '#8b5cf6' },
  ].filter(d => d.value > 0), [stats, ar]);

  // Department-wise attendance
  const departmentData = useMemo(() => {
    const depts: Record<string, { present: number; late: number; absent: number }> = {};
    dbRecords.forEach(r => {
      const deptId = (r.employees as any)?.department_id;
      const deptName = deptId && departments[deptId]
        ? (ar ? departments[deptId].name_ar : departments[deptId].name_en)
        : (ar ? 'بدون قسم' : 'No Dept');
      if (!depts[deptName]) depts[deptName] = { present: 0, late: 0, absent: 0 };
      if (r.status === 'present') depts[deptName].present++;
      else if (r.status === 'late' || r.is_late) depts[deptName].late++;
      else if (r.status === 'absent') depts[deptName].absent++;
    });
    const pLabel = ar ? 'حاضر' : 'Present';
    const lLabel = ar ? 'متأخر' : 'Late';
    const aLabel = ar ? 'غائب' : 'Absent';
    return Object.entries(depts).map(([dept, data]) => ({
      name: dept,
      [pLabel]: data.present,
      [lLabel]: data.late,
      [aLabel]: data.absent,
    }));
  }, [dbRecords, departments, ar]);

  // Daily trend within the month
  const dailyTrend = useMemo(() => {
    const days: Record<string, { date: string; attendance: number; late: number }> = {};
    dbRecords.forEach(r => {
      if (!days[r.date]) days[r.date] = { date: r.date, attendance: 0, late: 0 };
      if (r.status === 'present' || r.status === 'late' || r.status === 'mission') {
        days[r.date].attendance++;
      }
      if (r.status === 'late' || r.is_late) {
        days[r.date].late++;
      }
    });
    return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
  }, [dbRecords]);

  const pLabel = ar ? 'حاضر' : 'Present';
  const lLabel = ar ? 'متأخر' : 'Late';
  const aLabel = ar ? 'غائب' : 'Absent';

  // ============ Export ============
  const reportTitle = {
    ar: `تقرير الحضور الشهري — ${monthNames[Number(selectedMonth) - 1]} ${selectedYear}`,
    en: `Monthly Attendance Report — ${ar ? '' : monthNames[Number(selectedMonth) - 1] + ' '}${selectedYear}`,
  };
  // English month name (force English regardless of UI language) for the EN title
  const monthNamesEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const reportTitleEn = `Monthly Attendance Report — ${monthNamesEn[Number(selectedMonth) - 1]} ${selectedYear}`;

  // Department breakdown table — same column order as the bar chart series
  const exportColumns = [
    { headerAr: 'القسم', headerEn: 'Department', key: 'department' },
    { headerAr: 'حاضر', headerEn: 'Present', key: 'present' },
    { headerAr: 'متأخر', headerEn: 'Late', key: 'late' },
    { headerAr: 'غائب', headerEn: 'Absent', key: 'absent' },
    { headerAr: 'الإجمالي', headerEn: 'Total', key: 'total' },
  ];

  const exportData = useMemo(() => {
    const rows = departmentData.map(d => {
      const present = (d as any)[pLabel] || 0;
      const late = (d as any)[lLabel] || 0;
      const absent = (d as any)[aLabel] || 0;
      return {
        department: d.name,
        present,
        late,
        absent,
        total: present + late + absent,
      };
    });
    // Append totals row
    if (rows.length > 0) {
      rows.push({
        department: ar ? 'الإجمالي' : 'Total',
        present: rows.reduce((s, r) => s + r.present, 0),
        late: rows.reduce((s, r) => s + r.late, 0),
        absent: rows.reduce((s, r) => s + r.absent, 0),
        total: rows.reduce((s, r) => s + r.total, 0),
      });
    }
    return rows;
  }, [departmentData, pLabel, lLabel, aLabel, ar]);

  const summaryCards = [
    { label: ar ? 'نسبة الحضور' : 'Attendance Rate', value: `${stats.attendanceRate}%` },
    { label: ar ? 'نسبة الالتزام' : 'Punctuality Rate', value: `${stats.punctualityRate}%` },
    { label: ar ? 'إجمالي ساعات العمل' : 'Total Work Hours', value: `${stats.totalWorkHours}h` },
    { label: ar ? 'إجمالي الإضافي' : 'Total Overtime', value: `${stats.totalOvertimeHours}h` },
  ];

  const exportOpts = {
    titleAr: reportTitle.ar,
    titleEn: reportTitleEn,
    data: exportData,
    columns: exportColumns,
    fileName: `attendance_report_${selectedYear}_${String(selectedMonth).padStart(2, '0')}`,
    summaryCards,
  };
  const onPrint = () => handlePrint(ar ? reportTitle.ar : reportTitleEn);
  const onPDF = () => exportBilingualPDF(exportOpts);
  const onWord = () => exportBilingualWord(exportOpts);
  const onExcel = () => exportBilingualCSV(exportOpts);

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Filter + Export Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={ar ? 'الشهر' : 'Month'} />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={ar ? 'السنة' : 'Year'} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {loading && <span className="text-sm text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={onPrint} className="gap-1.5">
                <Printer className="w-4 h-4" />
                {ar ? 'طباعة' : 'Print'}
              </Button>
              <Button variant="outline" size="sm" onClick={onPDF} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5">
                <FileText className="w-4 h-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={onWord} className="gap-1.5 text-blue-600 border-blue-600/30 hover:bg-blue-600/5">
                <FileType className="w-4 h-4" />
                Word
              </Button>
              <Button variant="outline" size="sm" onClick={onExcel} className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5">
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-success/10">
                <Users className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ar ? 'نسبة الحضور' : 'Attendance Rate'}</p>
                <p className="text-2xl font-bold text-success">{stats.attendanceRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-primary/10">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ar ? 'نسبة الالتزام' : 'Punctuality Rate'}</p>
                <p className="text-2xl font-bold text-primary">{stats.punctualityRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-blue-100">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ar ? 'إجمالي ساعات العمل' : 'Total Work Hours'}</p>
                <p className="text-2xl font-bold">{stats.totalWorkHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-purple-100">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ar ? 'إجمالي الإضافي' : 'Total Overtime'}</p>
                <p className="text-2xl font-bold">{stats.totalOvertimeHours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              {ar ? 'توزيع الحالات' : 'Status Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {statusData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {ar ? 'لا توجد بيانات' : 'No data'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {ar ? 'الاتجاه اليومي' : 'Daily Trend'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {dailyTrend.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  {ar ? 'لا توجد بيانات' : 'No data'}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.split('-')[2]} />
                    <YAxis fontSize={12} />
                    <Tooltip labelFormatter={(v) => v} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="attendance"
                      name={ar ? 'الحضور' : 'Attendance'}
                      stroke="#22c55e"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="late"
                      name={ar ? 'التأخير' : 'Late'}
                      stroke="#f59e0b"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department-wise Attendance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {ar ? 'الحضور حسب القسم' : 'Attendance by Department'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            {departmentData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {ar ? 'لا توجد بيانات' : 'No data'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={pLabel} fill="#22c55e" />
                  <Bar dataKey={lLabel} fill="#f59e0b" />
                  <Bar dataKey={aLabel} fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
