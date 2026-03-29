import { useMemo, useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReportExport } from '@/hooks/useReportExport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Printer, Download, FileText, AlertTriangle, Users, Banknote, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DebtRow {
  id: string;
  employee_id: string;
  course_name: string;
  cost: number;
  actual_date: string;
  expiry_date: string;
}

interface EmpInfo {
  id: string;
  name_ar: string;
  name_en: string;
  employee_code: string;
  department_id: string | null;
  station_id: string | null;
}

export const TrainingDebtReport = () => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { reportRef, handlePrint, exportToCSV, exportToPDF } = useReportExport();
  const [station, setStation] = useState('all');
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [employees, setEmployees] = useState<EmpInfo[]>([]);
  const [stations, setStations] = useState<{ id: string; name_ar: string; name_en: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name_ar: string; name_en: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [dRes, eRes, sRes, depRes] = await Promise.all([
        supabase.from('training_debts').select('*'),
        supabase.from('employees').select('id, name_ar, name_en, employee_code, department_id, station_id'),
        supabase.from('stations').select('id, name_ar, name_en'),
        supabase.from('departments').select('id, name_ar, name_en'),
      ]);
      setDebts(dRes.data || []);
      setEmployees(eRes.data || []);
      setStations(sRes.data || []);
      setDepartments(depRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const now = new Date();

  const activeDebts = useMemo(() =>
    debts.filter(d => new Date(d.expiry_date) > now),
  [debts]);

  const getEmpName = (emp: EmpInfo) => ar ? emp.name_ar : emp.name_en;
  const getStationName = (id: string | null) => {
    if (!id) return '-';
    const s = stations.find(s => s.id === id);
    return s ? (ar ? s.name_ar : s.name_en) : '-';
  };
  const getDeptName = (id: string | null) => {
    if (!id) return '-';
    const d = departments.find(d => d.id === id);
    return d ? (ar ? d.name_ar : d.name_en) : '-';
  };

  const debtsByEmployee = useMemo(() => {
    const map: Record<string, { employeeId: string; code: string; name: string; dept: string; stationName: string; debts: DebtRow[]; total: number }> = {};
    activeDebts.forEach(d => {
      const emp = employees.find(e => e.id === d.employee_id);
      if (!emp) return;
      if (station !== 'all' && emp.station_id !== station) return;
      if (!map[d.employee_id]) {
        map[d.employee_id] = {
          employeeId: d.employee_id,
          code: emp.employee_code,
          name: getEmpName(emp),
          dept: getDeptName(emp.department_id),
          stationName: getStationName(emp.station_id),
          debts: [],
          total: 0,
        };
      }
      map[d.employee_id].debts.push(d);
      map[d.employee_id].total += d.cost;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeDebts, employees, station, ar, stations, departments]);

  const totalDebt = debtsByEmployee.reduce((s, e) => s + e.total, 0);
  const totalEmployees = debtsByEmployee.length;
  const totalCourses = debtsByEmployee.reduce((s, e) => s + e.debts.length, 0);

  const deptData = useMemo(() => {
    const map: Record<string, number> = {};
    debtsByEmployee.forEach(e => {
      map[e.dept] = (map[e.dept] || 0) + e.total;
    });
    return Object.entries(map).map(([dept, total]) => ({ dept, total }));
  }, [debtsByEmployee]);

  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const expiryData = useMemo(() => {
    const ranges = [
      { label: ar ? 'أقل من 6 أشهر' : '< 6 months', min: 0, max: 6 },
      { label: ar ? '6-12 شهر' : '6-12 months', min: 6, max: 12 },
      { label: ar ? '1-2 سنة' : '1-2 years', min: 12, max: 24 },
      { label: ar ? '2-3 سنوات' : '2-3 years', min: 24, max: 36 },
    ];
    return ranges.map(r => {
      const count = activeDebts.filter(d => {
        const months = (new Date(d.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
        return months >= r.min && months < r.max;
      }).length;
      return { name: r.label, value: count };
    }).filter(r => r.value > 0);
  }, [activeDebts, ar]);

  const stats = [
    { label: ar ? 'إجمالي الدين' : 'Total Debt', value: `${totalDebt.toLocaleString()} ${ar ? 'ج.م' : 'EGP'}`, icon: Banknote, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: ar ? 'موظفين مديونين' : 'Indebted Employees', value: totalEmployees, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: ar ? 'دورات نشطة' : 'Active Courses', value: totalCourses, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: ar ? 'متوسط الدين' : 'Avg Debt', value: totalEmployees ? `${Math.round(totalDebt / totalEmployees).toLocaleString()}` : '0', icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  const reportTitle = ar ? 'تقرير ديون التدريب' : 'Training Debt Report';

  const getExportData = () => debtsByEmployee.flatMap(e =>
    e.debts.map(d => ({
      code: e.code,
      name: e.name,
      dept: e.dept,
      station: e.stationName,
      course: d.course_name,
      cost: d.cost,
      actualDate: d.actual_date,
      expiryDate: d.expiry_date,
    }))
  );

  const getExportColumns = () => [
    { header: ar ? 'كود الموظف' : 'Employee Code', key: 'code' },
    { header: ar ? 'الاسم' : 'Name', key: 'name' },
    { header: ar ? 'القسم' : 'Department', key: 'dept' },
    { header: ar ? 'المحطة' : 'Station', key: 'station' },
    { header: ar ? 'الدورة' : 'Course', key: 'course' },
    { header: ar ? 'التكلفة' : 'Cost', key: 'cost' },
    { header: ar ? 'تاريخ الدورة' : 'Date', key: 'actualDate' },
    { header: ar ? 'تاريخ الانتهاء' : 'Expiry', key: 'expiryDate' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className={cn("flex flex-wrap gap-4 items-center justify-between", isRTL && "flex-row-reverse")}>
            <div className={cn("flex gap-4", isRTL && "flex-row-reverse")}>
              <Select value={station} onValueChange={setStation}>
                <SelectTrigger className="w-44"><SelectValue placeholder={ar ? 'المحطة' : 'Station'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ar ? 'جميع المحطات' : 'All Stations'}</SelectItem>
                  {stations.map(s => (
                    <SelectItem key={s.id} value={s.id}>{ar ? s.name_ar : s.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
              <Button variant="outline" size="sm" onClick={() => handlePrint(reportTitle)}>
                <Printer className="w-4 h-4 mr-2" />{ar ? 'طباعة' : 'Print'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToPDF({ title: reportTitle, data: getExportData(), columns: getExportColumns() })}>
                <Download className="w-4 h-4 mr-2" />PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToCSV({ title: reportTitle, data: getExportData(), columns: getExportColumns() })}>
                <FileText className="w-4 h-4 mr-2" />CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i}>
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
            <CardHeader><CardTitle>{ar ? 'الديون حسب القسم' : 'Debt by Department'}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {deptData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">{ar ? 'لا توجد بيانات' : 'No data'}</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deptData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dept" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="total" name={ar ? 'إجمالي الدين' : 'Total Debt'} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{ar ? 'توزيع فترات الانتهاء' : 'Expiry Distribution'}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {expiryData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">{ar ? 'لا توجد بيانات' : 'No data'}</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expiryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                        {expiryData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader><CardTitle>{ar ? 'تفاصيل ديون التدريب' : 'Training Debt Details'}</CardTitle></CardHeader>
          <CardContent>
            {debtsByEmployee.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {ar ? 'لا توجد ديون تدريب نشطة' : 'No active training debts'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{ar ? 'الكود' : 'Code'}</TableHead>
                    <TableHead>{ar ? 'الموظف' : 'Employee'}</TableHead>
                    <TableHead>{ar ? 'القسم' : 'Department'}</TableHead>
                    <TableHead>{ar ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead>{ar ? 'الدورة' : 'Course'}</TableHead>
                    <TableHead>{ar ? 'التكلفة' : 'Cost'}</TableHead>
                    <TableHead>{ar ? 'تاريخ الدورة' : 'Course Date'}</TableHead>
                    <TableHead>{ar ? 'تاريخ الانتهاء' : 'Expiry Date'}</TableHead>
                    <TableHead>{ar ? 'الحالة' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debtsByEmployee.flatMap(e =>
                    e.debts.map((d, i) => {
                      const monthsLeft = Math.round((new Date(d.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
                      return (
                        <TableRow key={d.id}>
                          {i === 0 && <TableCell rowSpan={e.debts.length} className="font-medium">{e.code}</TableCell>}
                          {i === 0 && <TableCell rowSpan={e.debts.length} className="font-medium">{e.name}</TableCell>}
                          {i === 0 && <TableCell rowSpan={e.debts.length}>{e.dept}</TableCell>}
                          {i === 0 && <TableCell rowSpan={e.debts.length}>{e.stationName}</TableCell>}
                          <TableCell>{d.course_name}</TableCell>
                          <TableCell>{d.cost.toLocaleString()}</TableCell>
                          <TableCell>{d.actual_date}</TableCell>
                          <TableCell>{d.expiry_date}</TableCell>
                          <TableCell>
                            <Badge variant={monthsLeft <= 6 ? 'destructive' : 'secondary'}>
                              {monthsLeft} {ar ? 'شهر' : 'mo'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={5}>{ar ? 'الإجمالي' : 'Total'}</TableCell>
                    <TableCell>{totalDebt.toLocaleString()}</TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
