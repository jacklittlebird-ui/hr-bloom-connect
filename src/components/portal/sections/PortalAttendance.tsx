import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAttendanceData, calculateWorkTime } from '@/contexts/AttendanceDataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Clock, Calendar, TrendingUp, LogIn, LogOut, QrCode, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getOrCreateDeviceId } from '@/lib/device';
import QrScanner from '@/components/attendance/QrScanner';

export const PortalAttendance = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { language, isRTL } = useLanguage();
  const { session } = useAuth();
  const ar = language === 'ar';
  const { records, getEmployeeMonthlyRecords, getMonthlyStats, checkIn, checkOut } = useAttendanceData();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employeeName, setEmployeeName] = useState({ en: '', ar: '', dept: '' });

  // QR Scanner state
  const [qrMode, setQrMode] = useState(false);
  const [qrEventType, setQrEventType] = useState<'check_in' | 'check_out'>('check_in');
  const [qrStatus, setQrStatus] = useState<'idle' | 'scanning' | 'validating' | 'success' | 'error'>('idle');
  const [qrMessage, setQrMessage] = useState('');

  // Fetch employee name for check-in
  useEffect(() => {
    if (!PORTAL_EMPLOYEE_ID) return;
    supabase.from('employees').select('name_en, name_ar, departments(name_ar)').eq('id', PORTAL_EMPLOYEE_ID).single()
      .then(({ data }) => {
        if (data) {
          setEmployeeName({
            en: data.name_en,
            ar: data.name_ar,
            dept: (data.departments as any)?.name_ar || '',
          });
        }
      });
  }, [PORTAL_EMPLOYEE_ID]);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const monthlyRecords = useMemo(() => getEmployeeMonthlyRecords(PORTAL_EMPLOYEE_ID, year, month), [year, month, getEmployeeMonthlyRecords, PORTAL_EMPLOYEE_ID]);
  const stats = useMemo(() => getMonthlyStats(PORTAL_EMPLOYEE_ID, year, month), [year, month, getMonthlyStats, PORTAL_EMPLOYEE_ID]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = useMemo(() => records.find(r => r.employeeId === PORTAL_EMPLOYEE_ID && r.date === todayStr), [records, PORTAL_EMPLOYEE_ID, todayStr]);

  const hasCheckedIn = !!todayRecord?.checkIn;
  const hasCheckedOut = !!todayRecord?.checkOut;

  const handleCheckIn = () => {
    if (!PORTAL_EMPLOYEE_ID) {
      toast.error(ar ? 'خطأ: لم يتم ربط حسابك بموظف' : 'Error: Your account is not linked to an employee record');
      return;
    }
    checkIn(PORTAL_EMPLOYEE_ID, employeeName.en, employeeName.ar, employeeName.dept);
    toast.success(ar ? 'تم تسجيل الحضور بنجاح' : 'Check-in recorded successfully');
  };

  const handleCheckOut = () => {
    if (!todayRecord) return;
    checkOut(todayRecord.id);
    toast.success(ar ? 'تم تسجيل الانصراف بنجاح' : 'Check-out recorded successfully');
  };

  // QR Scan handler
  const onQrScan = useCallback(async (token: string) => {
    if (qrStatus === 'validating') return;
    setQrStatus('validating');

    try {
      const gps = await new Promise<{ lat?: number; lng?: number; accuracy?: number }>((resolve) => {
        if (!navigator.geolocation) return resolve({});
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
          () => resolve({}),
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });

      if (!session?.access_token) {
        setQrStatus('error');
        setQrMessage(ar ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first.');
        return;
      }

      const device_id = getOrCreateDeviceId();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/submit-scan`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token, event_type: qrEventType, device_id, gps }),
        }
      );

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setQrStatus('error');
        setQrMessage(e.error ?? res.statusText);
      } else {
        setQrStatus('success');
        setQrMessage(
          qrEventType === 'check_in'
            ? ar ? 'تم تسجيل الحضور بنجاح ✔' : 'Check-in recorded ✔'
            : ar ? 'تم تسجيل الانصراف بنجاح ✔' : 'Check-out recorded ✔'
        );
      }
    } catch (e: any) {
      setQrStatus('error');
      setQrMessage(e.message);
    }
  }, [qrStatus, session, qrEventType, ar]);

  const months = ar
    ? ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const nowDate = new Date();
  let working = 0;
  let pastWorking = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) continue;
    const dateStr = date.toISOString().split('T')[0];
    const rec = monthlyRecords.find(r => r.date === dateStr);
    if (rec && rec.status === 'on-leave') continue;
    working++;
    if (date <= nowDate) pastWorking++;
  }
  const rate = pastWorking > 0 ? ((stats.present / pastWorking) * 100).toFixed(1) : '0';

  const statusBadge = (s: string) => {
    const map: Record<string, { cls: string; ar: string; en: string }> = {
      present: { cls: 'bg-success/10 text-success border-success', ar: 'حاضر', en: 'Present' },
      absent: { cls: 'bg-destructive/10 text-destructive border-destructive', ar: 'غائب', en: 'Absent' },
      late: { cls: 'bg-warning/10 text-warning border-warning', ar: 'متأخر', en: 'Late' },
      'early-leave': { cls: 'bg-orange-100 text-orange-600 border-orange-300', ar: 'انصراف مبكر', en: 'Early Leave' },
      weekend: { cls: 'bg-muted text-muted-foreground', ar: 'عطلة', en: 'Weekend' },
      'on-leave': { cls: 'bg-blue-100 text-blue-600 border-blue-300', ar: 'إجازة', en: 'On Leave' },
      mission: { cls: 'bg-purple-100 text-purple-600 border-purple-300', ar: 'مأمورية', en: 'Mission' },
    };
    const m = map[s] || map.absent;
    return <Badge variant="outline" className={m.cls}>{ar ? m.ar : m.en}</Badge>;
  };

  const formatTimeClock = (date: Date) => {
    return date.toLocaleTimeString(ar ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className={cn("text-2xl font-bold", isRTL && "text-right")}>{ar ? 'الحضور والانصراف' : 'Attendance'}</h1>

      {/* Check-in / Check-out Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-muted-foreground">
                {currentTime.toLocaleDateString(ar ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <div className="text-5xl font-bold text-primary font-mono">
              {formatTimeClock(currentTime)}
            </div>

            {/* Status indicator */}
            {hasCheckedIn && !hasCheckedOut && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/20 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-success font-medium">
                  {ar ? `تم الحضور في ${todayRecord?.checkIn}` : `Checked in at ${todayRecord?.checkIn}`}
                </span>
              </div>
            )}
            {hasCheckedIn && hasCheckedOut && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted border border-border rounded-lg">
                <span className="text-muted-foreground font-medium">
                  {ar ? `حضور: ${todayRecord?.checkIn} — انصراف: ${todayRecord?.checkOut}` : `In: ${todayRecord?.checkIn} — Out: ${todayRecord?.checkOut}`}
                </span>
              </div>
            )}

            <div className={cn("flex justify-center gap-4 flex-wrap", isRTL && "flex-row-reverse")}>
              <Button
                size="lg"
                className="bg-success hover:bg-success/90 min-w-[180px] h-14 text-lg gap-2 shadow-lg"
                onClick={handleCheckIn}
                disabled={hasCheckedIn}
              >
                <LogIn className="w-5 h-5" />
                {ar ? 'تسجيل حضور' : 'Check In'}
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="min-w-[180px] h-14 text-lg gap-2 shadow-lg"
                onClick={handleCheckOut}
                disabled={!hasCheckedIn || hasCheckedOut}
              >
                <LogOut className="w-5 h-5" />
                {ar ? 'تسجيل انصراف' : 'Check Out'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Scanner Card */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
            <CardTitle className={cn("flex items-center gap-2 text-lg", isRTL && "flex-row-reverse")}>
              <QrCode className="w-5 h-5 text-primary" />
              {ar ? 'تسجيل حضور بـ QR' : 'QR Attendance'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event type toggle */}
          <div className="flex gap-2 justify-center">
            <Button
              variant={qrEventType === 'check_in' ? 'default' : 'outline'}
              onClick={() => setQrEventType('check_in')}
              className="flex-1 max-w-[160px]"
            >
              <LogIn className="h-4 w-4 me-2" />
              {ar ? 'حضور' : 'Check In'}
            </Button>
            <Button
              variant={qrEventType === 'check_out' ? 'default' : 'outline'}
              onClick={() => setQrEventType('check_out')}
              className="flex-1 max-w-[160px]"
            >
              <LogOut className="h-4 w-4 me-2" />
              {ar ? 'انصراف' : 'Check Out'}
            </Button>
          </div>

          {/* Scanner area */}
          {qrMode && qrStatus !== 'success' && qrStatus !== 'error' && qrStatus !== 'validating' && (
            <div className="flex justify-center">
              <QrScanner onScan={onQrScan} />
            </div>
          )}

          {/* Status messages */}
          {qrStatus === 'validating' && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              {ar ? 'جاري التحقق...' : 'Validating...'}
            </div>
          )}
          {qrStatus === 'success' && (
            <div className="flex items-center justify-center gap-2 text-success py-4">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">{qrMessage}</span>
            </div>
          )}
          {qrStatus === 'error' && (
            <div className="flex items-center justify-center gap-2 text-destructive py-4">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">{qrMessage}</span>
            </div>
          )}

          {/* Action buttons */}
          {!qrMode && qrStatus === 'idle' && (
            <Button
              onClick={() => { setQrMode(true); setQrStatus('scanning'); setQrMessage(''); }}
              className="w-full"
              size="lg"
            >
              <QrCode className="h-5 w-5 me-2" />
              {ar ? 'مسح رمز QR' : 'Scan QR Code'}
            </Button>
          )}
          {(qrStatus === 'success' || qrStatus === 'error') && (
            <Button
              variant="outline"
              onClick={() => { setQrStatus('idle'); setQrMessage(''); setQrMode(false); }}
              className="w-full"
            >
              {ar ? 'مسح آخر' : 'Scan Again'}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { l: { ar: 'أيام العمل', en: 'Working' }, v: working, c: 'text-primary' },
          { l: { ar: 'حضور', en: 'Present' }, v: stats.present, c: 'text-success' },
          { l: { ar: 'تأخير', en: 'Late' }, v: stats.late, c: 'text-warning' },
          { l: { ar: 'غياب', en: 'Absent' }, v: stats.absent, c: 'text-destructive' },
          { l: { ar: 'إجمالي الساعات', en: 'Total Hours' }, v: `${String(stats.totalHours).padStart(2, '0')}:${String(stats.totalMinutes).padStart(2, '0')}`, c: '' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">{ar ? s.l.ar : s.l.en}</p>
            <p className={cn("text-2xl font-bold", s.c)}>{s.v}</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Monthly Record */}
      <Card>
        <CardHeader>
          <div className={cn("flex justify-between items-center", isRTL && "flex-row-reverse")}>
            <CardTitle className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
              <Calendar className="w-5 h-5" />
              {ar ? 'سجل الحضور الشهري' : 'Monthly Record'}
            </CardTitle>
            <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
              <Select value={month.toString()} onValueChange={v => setMonth(+v)}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>{months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={year.toString()} onValueChange={v => setYear(+v)}>
                <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>{[2024,2025,2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn("flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg", isRTL && "flex-row-reverse")}>
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="font-medium">{ar ? 'نسبة الحضور:' : 'Rate:'}</span>
            <Badge variant="outline" className="bg-success/10 text-success text-lg px-3">{rate}%</Badge>
          </div>
          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader><TableRow>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'اليوم' : 'Day'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الحضور' : 'In'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الانصراف' : 'Out'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الساعات' : 'Hours'}</TableHead>
                <TableHead className={cn(isRTL && "text-right")}>{ar ? 'الحالة' : 'Status'}</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {monthlyRecords.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{format(new Date(r.date), 'EEEE', { locale: ar ? arLocale : enUS })}</TableCell>
                    <TableCell className="font-mono">{r.checkIn || '--:--'}</TableCell>
                    <TableCell className="font-mono">{r.checkOut || '--:--'}</TableCell>
                    <TableCell>{r.workHours > 0 || r.workMinutes > 0 ? `${String(r.workHours).padStart(2, '0')}:${String(r.workMinutes).padStart(2, '0')}` : '-'}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                  </TableRow>
                ))}
                {monthlyRecords.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">{ar ? 'لا توجد سجلات' : 'No records'}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
