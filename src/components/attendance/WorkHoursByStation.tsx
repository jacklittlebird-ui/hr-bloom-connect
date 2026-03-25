import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const months = [
  { value: '01', ar: 'يناير', en: 'January' },
  { value: '02', ar: 'فبراير', en: 'February' },
  { value: '03', ar: 'مارس', en: 'March' },
  { value: '04', ar: 'أبريل', en: 'April' },
  { value: '05', ar: 'مايو', en: 'May' },
  { value: '06', ar: 'يونيو', en: 'June' },
  { value: '07', ar: 'يوليو', en: 'July' },
  { value: '08', ar: 'أغسطس', en: 'August' },
  { value: '09', ar: 'سبتمبر', en: 'September' },
  { value: '10', ar: 'أكتوبر', en: 'October' },
  { value: '11', ar: 'نوفمبر', en: 'November' },
  { value: '12', ar: 'ديسمبر', en: 'December' },
];

interface StationHours {
  stationId: string;
  stationNameAr: string;
  stationNameEn: string;
  totalHours: number;
  totalMinutes: number;
  employeeCount: number;
  recordCount: number;
}

export const WorkHoursByStation = () => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [stationData, setStationData] = useState<StationHours[]>([]);
  const [loading, setLoading] = useState(true);
  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const startDate = `${selectedYear}-${selectedMonth}-01`;
      const endMonth = parseInt(selectedMonth);
      const endYear = parseInt(selectedYear);
      const lastDay = new Date(endYear, endMonth, 0).getDate();
      const endDate = `${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id, employee_id, work_hours, work_minutes,
          employees!attendance_records_employee_id_fkey(station_id, stations(id, name_ar, name_en))
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .not('check_in', 'is', null);

      if (!error && data) {
        const stationMap: Record<string, { nameAr: string; nameEn: string; totalHours: number; totalMinutes: number; employees: Set<string>; records: number }> = {};

        data.forEach((r: any) => {
          const station = r.employees?.stations;
          const stationId = station?.id || 'no-station';
          const nameAr = station?.name_ar || 'بدون محطة';
          const nameEn = station?.name_en || 'No Station';

          if (!stationMap[stationId]) {
            stationMap[stationId] = { nameAr, nameEn, totalHours: 0, totalMinutes: 0, employees: new Set(), records: 0 };
          }
          stationMap[stationId].totalHours += Number(r.work_hours || 0);
          stationMap[stationId].totalMinutes += Number(r.work_minutes || 0);
          stationMap[stationId].employees.add(r.employee_id);
          stationMap[stationId].records++;
        });

        const result: StationHours[] = Object.entries(stationMap)
          .map(([id, v]) => {
            // Convert excess minutes to hours
            const extraHours = Math.floor(v.totalMinutes / 60);
            const remainingMinutes = v.totalMinutes % 60;
            return {
              stationId: id,
              stationNameAr: v.nameAr,
              stationNameEn: v.nameEn,
              totalHours: v.totalHours + extraHours,
              totalMinutes: remainingMinutes,
              employeeCount: v.employees.size,
              recordCount: v.records,
            };
          })
          .sort((a, b) => (b.totalHours * 60 + b.totalMinutes) - (a.totalHours * 60 + a.totalMinutes));

        setStationData(result);
      }
      setLoading(false);
    };
    fetchData();
  }, [selectedMonth, selectedYear]);

  const grandTotal = useMemo(() => {
    const totalMin = stationData.reduce((sum, s) => sum + s.totalHours * 60 + s.totalMinutes, 0);
    return { hours: Math.floor(totalMin / 60), minutes: totalMin % 60 };
  }, [stationData]);

  const formatHoursMinutes = (h: number, m: number) => `${h}h ${m}m`;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-primary/10">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ar ? 'إجمالي الساعات' : 'Total Hours'}</p>
                <p className="text-3xl font-bold">{formatHoursMinutes(grandTotal.hours, grandTotal.minutes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-blue-100">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ar ? 'عدد المحطات' : 'Stations'}</p>
                <p className="text-3xl font-bold">{stationData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-green-100">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ar ? 'إجمالي السجلات' : 'Total Records'}</p>
                <p className="text-3xl font-bold">{stationData.reduce((s, r) => s + r.recordCount, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map(m => <SelectItem key={m.value} value={m.value}>{ar ? m.ar : m.en}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {ar ? 'إجمالي ساعات العمل حسب المحطة' : 'Total Work Hours by Station'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
          ) : stationData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{ar ? 'لا توجد بيانات' : 'No data'}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn(isRTL && "text-right")}>#</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المحطة' : 'Station'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'عدد الموظفين' : 'Employees'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'عدد السجلات' : 'Records'}</TableHead>
                    <TableHead className={cn(isRTL && "text-right")}>{ar ? 'إجمالي الساعات' : 'Total Hours'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stationData.map((station, idx) => (
                    <TableRow key={station.stationId}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{ar ? station.stationNameAr : station.stationNameEn}</TableCell>
                      <TableCell>{station.employeeCount}</TableCell>
                      <TableCell>{station.recordCount}</TableCell>
                      <TableCell className="font-mono font-bold">{formatHoursMinutes(station.totalHours, station.totalMinutes)}</TableCell>
                    </TableRow>
                  ))}
                  {/* Grand Total Row */}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell></TableCell>
                    <TableCell>{ar ? 'الإجمالي' : 'Grand Total'}</TableCell>
                    <TableCell>{stationData.reduce((s, r) => s + r.employeeCount, 0)}</TableCell>
                    <TableCell>{stationData.reduce((s, r) => s + r.recordCount, 0)}</TableCell>
                    <TableCell className="font-mono">{formatHoursMinutes(grandTotal.hours, grandTotal.minutes)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
