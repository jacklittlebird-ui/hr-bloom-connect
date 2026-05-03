import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Clock, User, TrendingUp, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { getCairoDateString } from '@/lib/cairoDate';

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

interface LateRecord {
  id: string;
  employee_id: string;
  employee_code: string;
  employee_name_ar: string;
  employee_name_en: string;
  station_name_ar: string;
  station_name_en: string;
  date: string;
  check_in: string;
  work_hours: number;
}

export const LateArrivals = () => {
  const { isRTL, language } = useLanguage();
  const ar = language === 'ar';
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<LateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));

  useEffect(() => {
    const fetchLateRecords = async () => {
      setLoading(true);
      const startDate = `${selectedYear}-${selectedMonth}-01`;
      const endMonth = parseInt(selectedMonth);
      const endYear = parseInt(selectedYear);
      const lastDay = new Date(endYear, endMonth, 0).getDate();
      const endDate = `${selectedYear}-${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id, employee_id, date, check_in, work_hours,
          employees!attendance_records_employee_id_fkey(employee_code, name_ar, name_en, stations(name_ar, name_en))
        `)
        .eq('is_late', true)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('check_in', { ascending: false });

      if (!error && data) {
        const mapped: LateRecord[] = data.map((r: any) => ({
          id: r.id,
          employee_id: r.employee_id,
          employee_code: r.employees?.employee_code || '',
          employee_name_ar: r.employees?.name_ar || '',
          employee_name_en: r.employees?.name_en || '',
          station_name_ar: r.employees?.stations?.name_ar || '',
          station_name_en: r.employees?.stations?.name_en || '',
          date: r.date,
          check_in: r.check_in,
          work_hours: r.work_hours || 0,
        }));
        setRecords(mapped);
      }
      setLoading(false);
    };
    fetchLateRecords();
  }, [selectedMonth, selectedYear]);

  // Group by employee
  const groupedByEmployee = useMemo(() => {
    const map: Record<string, { code: string; nameAr: string; nameEn: string; stationAr: string; stationEn: string; count: number; totalMinutesLate: number }> = {};
    records.forEach(r => {
      if (!map[r.employee_id]) {
        map[r.employee_id] = { code: r.employee_code, nameAr: r.employee_name_ar, nameEn: r.employee_name_en, stationAr: r.station_name_ar, stationEn: r.station_name_en, count: 0, totalMinutesLate: 0 };
      }
      map[r.employee_id].count++;
    });
    let result = Object.entries(map).map(([id, v]) => ({ id, ...v }));

    // Filter by search term (name or employee code)
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter(e =>
        e.nameAr.toLowerCase().includes(q) ||
        e.nameEn.toLowerCase().includes(q) ||
        (e.code || '').toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => b.count - a.count);
  }, [records, searchTerm]);

  const today = getCairoDateString();
  const todayLate = records.filter(r => r.date === today);

  const { paginatedItems, currentPage, totalPages, totalItems, startIndex, endIndex, setCurrentPage } = usePagination(groupedByEmployee, 20);

  const formatTime = (isoStr: string) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-6">
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-warning/20">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ar ? 'تأخيرات اليوم' : "Today's Late"}</p>
                <p className="text-3xl font-bold text-warning">{todayLate.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-orange-100">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ar ? 'إجمالي التأخيرات' : 'Total Late'}</p>
                <p className="text-3xl font-bold">{records.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className="p-3 rounded-lg bg-red-100">
                <TrendingUp className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{ar ? 'متكرري التأخير (3+)' : 'Frequent (3+)'}</p>
                <p className="text-3xl font-bold">{groupedByEmployee.filter(e => e.count >= 3).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className={cn("flex items-center gap-3 flex-wrap", isRTL && "flex-row-reverse")}>
        <Select value={selectedMonth} onValueChange={v => { setSelectedMonth(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map(m => <SelectItem key={m.value} value={m.value}>{ar ? m.ar : m.en}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={v => { setSelectedYear(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground", isRTL ? "right-3" : "left-3")} />
          <Input
            placeholder={ar ? 'بحث بالاسم أو كود الموظف...' : 'Search by name or employee ID...'}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className={cn(isRTL ? "pr-10" : "pl-10")}
          />
        </div>
      </div>

      {/* Today's Late */}
      {todayLate.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-5 h-5" />
              {ar ? 'تأخيرات اليوم' : "Today's Late Arrivals"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayLate.map(record => (
                <div key={record.id} className={cn("flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20", isRTL && "flex-row-reverse")}>
                  <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                    <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{ar ? record.employee_name_ar : record.employee_name_en}</p>
                        {record.employee_code && (
                          <Badge variant="outline" className="font-mono text-xs">{record.employee_code}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{ar ? record.station_name_ar : record.station_name_en}</p>
                    </div>
                  </div>
                  <p className="font-mono text-lg font-bold text-warning">{formatTime(record.check_in)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frequent Late Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {ar ? 'ملخص التأخيرات حسب الموظف' : 'Late Summary by Employee'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</div>
          ) : groupedByEmployee.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{ar ? 'لا توجد تأخيرات' : 'No late arrivals'}</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'كود الموظف' : 'Employee ID'}</TableHead>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الموظف' : 'Employee'}</TableHead>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'المحطة' : 'Station'}</TableHead>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'عدد التأخيرات' : 'Late Count'}</TableHead>
                      <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الشدة' : 'Severity'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.map(emp => {
                      const severity = emp.count >= 5 ? 'high' : emp.count >= 3 ? 'medium' : 'low';
                      return (
                        <TableRow key={emp.id}>
                          <TableCell className="font-mono text-xs">{emp.code || '—'}</TableCell>
                          <TableCell className="font-medium">{ar ? emp.nameAr : emp.nameEn}</TableCell>
                          <TableCell>{ar ? emp.stationAr : emp.stationEn}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning">
                              {emp.count} {ar ? 'مرة' : 'times'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              severity === 'high' && "bg-destructive/10 text-destructive border-destructive",
                              severity === 'medium' && "bg-warning/10 text-warning border-warning",
                              severity === 'low' && "bg-green-100 text-green-700 border-green-300",
                            )}>
                              {severity === 'high' ? (ar ? 'مرتفع' : 'High') : severity === 'medium' ? (ar ? 'متوسط' : 'Medium') : (ar ? 'منخفض' : 'Low')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} startIndex={startIndex} endIndex={endIndex} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
