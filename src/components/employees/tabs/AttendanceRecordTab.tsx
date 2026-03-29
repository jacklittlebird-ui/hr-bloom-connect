import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Employee } from '@/types/employee';
import { cn, formatDate } from '@/lib/utils';
import { Clock, LogIn, LogOut, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface AttendanceRecordTabProps {
  employee: Employee;
}

interface AttendanceLog {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workHours: number;
  workMinutes: number;
}

const formatTime = (ts: string | null): string | null => {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch { return null; }
};

export const AttendanceRecordTab = ({ employee }: AttendanceRecordTabProps) => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const startDate = dateFrom;
      const endDate = dateTo;

      const { data, error } = await supabase
        .from('attendance_records')
        .select('id, date, check_in, check_out, status, work_hours, work_minutes, is_late')
        .eq('employee_id', employee.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('check_in', { ascending: false });

      if (error) {
        console.error('Error fetching attendance:', error);
        setLogs([]);
      } else {
        setLogs((data || []).map(r => ({
          id: r.id,
          date: r.date,
          checkIn: formatTime(r.check_in),
          checkOut: formatTime(r.check_out),
          status: r.is_late ? 'late' : (r.status || 'present'),
          workHours: r.work_hours ? Math.floor(r.work_hours) : 0,
          workMinutes: r.work_minutes || 0,
        })));
      }
      setLoading(false);
    };

    fetchLogs();
  }, [employee.id, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const present = logs.filter(l => l.checkIn).length;
    const late = logs.filter(l => l.status === 'late').length;
    return { present, late, absent: 0 };
  }, [logs]);

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 text-center">
          <p className="text-sm font-medium text-green-700 mb-1">{ar ? 'أيام الحضور' : 'Present Days'}</p>
          <p className="text-3xl font-bold text-green-600">{summary.present}</p>
        </div>
        <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4 text-center">
          <p className="text-sm font-medium text-yellow-700 mb-1">{ar ? 'تأخير' : 'Late'}</p>
          <p className="text-3xl font-bold text-yellow-600">{summary.late}</p>
        </div>
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium text-red-700 mb-1">{ar ? 'غياب' : 'Absent'}</p>
          <p className="text-3xl font-bold text-red-600">{summary.absent}</p>
        </div>
      </div>

      {/* Filters */}
      <div className={cn("flex items-center gap-3 flex-wrap", isRTL && "flex-row-reverse")}>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">{ar ? 'من' : 'From'}</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">{ar ? 'إلى' : 'To'}</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden border border-border/30">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary text-primary-foreground">
              <TableHead className="text-primary-foreground">{ar ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'وقت الحضور' : 'Check In'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'وقت الانصراف' : 'Check Out'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'ساعات العمل' : 'Work Hours'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'الحالة' : 'Status'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {ar ? 'لا توجد سجلات حضور' : 'No attendance records'}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDate(log.date)}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <LogIn className="w-3 h-3 text-green-500" />
                      {log.checkIn || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <LogOut className="w-3 h-3 text-red-500" />
                      {log.checkOut || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.workMinutes > 0 ? `${Math.floor(log.workMinutes / 60)}:${String(log.workMinutes % 60).padStart(2, '0')}` : '-'}
                  </TableCell>
                  <TableCell>
                    {log.status === 'late' ? (
                      <span className="px-2 py-1 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
                        {ar ? 'متأخر' : 'Late'}
                      </span>
                    ) : log.status === 'mission' ? (
                      <span className="px-2 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300">
                        {ar ? 'مأمورية' : 'Mission'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-700 border border-green-300">
                        {ar ? 'في الموعد' : 'On Time'}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
