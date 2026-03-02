import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAttendanceData } from '@/contexts/AttendanceDataContext';
import { Employee } from '@/types/employee';
import { cn } from '@/lib/utils';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AttendanceRecordTabProps {
  employee: Employee;
}

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

export const AttendanceRecordTab = ({ employee }: AttendanceRecordTabProps) => {
  const { language, isRTL } = useLanguage();
  const ar = language === 'ar';
  const { records: attendanceLogs } = useAttendanceData();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const years = Array.from({ length: 3 }, (_, i) => String(now.getFullYear() - i));

  const filteredLogs = useMemo(() => {
    return attendanceLogs
      .filter(log => log.employeeId === employee.id)
      .filter(log => {
        const d = new Date(log.date);
        return String(d.getMonth() + 1).padStart(2, '0') === selectedMonth && String(d.getFullYear()) === selectedYear;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceLogs, employee.id, selectedMonth, selectedYear]);

  const summary = useMemo(() => {
    const present = filteredLogs.filter(l => l.checkIn).length;
    const late = filteredLogs.filter(l => l.status === 'late').length;
    return { present, late, absent: 0 };
  }, [filteredLogs]);

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
      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map(m => (
              <SelectItem key={m.value} value={m.value}>{ar ? m.ar : m.en}</SelectItem>
            ))}
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
      <div className="rounded-xl overflow-hidden border border-border/30">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary text-primary-foreground">
              <TableHead className="text-primary-foreground">{ar ? 'التاريخ' : 'Date'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'وقت الحضور' : 'Check In'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'وقت الانصراف' : 'Check Out'}</TableHead>
              <TableHead className="text-primary-foreground">{ar ? 'الحالة' : 'Status'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  {ar ? 'لا توجد سجلات حضور' : 'No attendance records'}
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log, idx) => (
                <TableRow key={idx}>
                  <TableCell>{log.date}</TableCell>
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
                    {log.status === 'late' ? (
                      <span className="px-2 py-1 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
                        {ar ? 'متأخر' : 'Late'}
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
