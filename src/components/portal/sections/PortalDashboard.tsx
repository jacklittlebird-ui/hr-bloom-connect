import { useLanguage } from '@/contexts/LanguageContext';
import { usePayrollData } from '@/contexts/PayrollDataContext';
import { useAttendanceData } from '@/contexts/AttendanceDataContext';
import { usePortalData } from '@/contexts/PortalDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, Calendar, Wallet, Star, LogIn, LogOut, FileText, Bell, QrCode, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ar as arLocale, enUS } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { usePortalEmployee } from '@/hooks/usePortalEmployee';
import { useEmployeeData } from '@/contexts/EmployeeDataContext';
import { supabase } from '@/integrations/supabase/client';
import { getCairoDateString } from '@/lib/cairoDate';
import { getOrCreateDeviceId, getDeviceMeta } from '@/lib/device';
import QrScanner from '@/components/attendance/QrScanner';
import { GpsCheckinButton } from '@/components/portal/GpsCheckinButton';
import { invokeAttendanceFunction } from '@/lib/attendanceApi';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export const PortalDashboard = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { getEmployee } = useEmployeeData();
  const employee = getEmployee(PORTAL_EMPLOYEE_ID);
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { session, loading: authLoading } = useAuth();
  const { getEmployeePayroll, refreshPayroll } = usePayrollData();
  const { records, getMonthlyStats, refresh: refreshAttendance } = useAttendanceData();
  const { getLeaveBalances, getEvaluations, getLeaveRequests, getMissions, getRequests, ensureLeaves, ensureEvaluations, ensureMissions } = usePortalData();
  useEffect(() => { ensureLeaves(); }, [ensureLeaves]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const employeeRecords = useMemo(
    () => records.filter(r => r.employeeId === PORTAL_EMPLOYEE_ID),
    [records, PORTAL_EMPLOYEE_ID]
  );
  const todayRecord = useMemo(
    () => [...employeeRecords]
      .filter(r => r.date === today)
      .sort((a, b) => `${b.date}T${b.checkIn ?? b.checkOut ?? ''}`.localeCompare(`${a.date}T${a.checkIn ?? a.checkOut ?? ''}`))[0],
    [employeeRecords, today]
  );
  const latestOpenRecord = useMemo(
    () => [...employeeRecords]
      .filter(r => r.checkIn && !r.checkOut)
      .sort((a, b) => `${b.date}T${b.checkIn ?? ''}`.localeCompare(`${a.date}T${a.checkIn ?? ''}`))[0],
    [employeeRecords]
  );

  const [liveAttendanceState, setLiveAttendanceState] = useState<{ checkIn: string | null; checkOut: string | null; date: string | null; loading: boolean }>({
    checkIn: null,
    checkOut: null,
    date: null,
    loading: true,
  });

  const activeRecord = latestOpenRecord ?? todayRecord;
  const effectiveCheckIn = liveAttendanceState.checkIn ?? activeRecord?.checkIn ?? null;
  const effectiveCheckOut = liveAttendanceState.checkOut ?? activeRecord?.checkOut ?? null;
  const effectiveDate = liveAttendanceState.date ?? activeRecord?.date ?? null;
  const hasCheckedIn = !!effectiveCheckIn;
  const hasCheckedOut = !!effectiveCheckOut;
  const isCrossDayOpenRecord = !!effectiveDate && effectiveDate !== today && !!effectiveCheckIn && !effectiveCheckOut;

  // Station checkin method
  const [checkinMethod, setCheckinMethod] = useState<string>('qr');
  const [methodLoading, setMethodLoading] = useState(true);

  useEffect(() => {
    const fetchMethod = async () => {
      if (!employee?.stationId) { setMethodLoading(false); return; }
      const { data } = await supabase
        .from('stations')
        .select('checkin_method')
        .eq('id', employee.stationId)
        .single();
      if (data && (data as any).checkin_method) {
        setCheckinMethod((data as any).checkin_method);
      }
      setMethodLoading(false);
    };
    fetchMethod();
  }, [employee?.stationId]);

  useEffect(() => {
    const fetchLiveAttendanceState = async () => {
      if (!PORTAL_EMPLOYEE_ID) {
        setLiveAttendanceState({ checkIn: null, checkOut: null, date: null, loading: false });
        return;
      }

      setLiveAttendanceState((prev) => ({ ...prev, loading: true }));

      const { data: openRecord, error: openErr } = await supabase
        .from('attendance_records')
        .select('date, check_in, check_out')
        .eq('employee_id', PORTAL_EMPLOYEE_ID)
        .not('check_in', 'is', null)
        .is('check_out', null)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // CRITICAL: If the live query fails (RLS not ready, network blip), do NOT
      // reset live state to null — that would falsely tell the employee they have
      // not checked in and prompt a duplicate check-in. Just keep the previous
      // state and let the activeRecord (from context) take over via the ?? merge.
      if (openErr) {
        console.warn('[PortalDashboard] open-record query failed, keeping previous live state:', openErr);
        setLiveAttendanceState((prev) => ({ ...prev, loading: false }));
        return;
      }

      if (openRecord) {
        const openCheckIn = openRecord.check_in ? new Date(openRecord.check_in) : null;
        const openCheckOut = openRecord.check_out ? new Date(openRecord.check_out) : null;
        setLiveAttendanceState({
          date: openRecord.date,
          checkIn: openCheckIn ? `${openCheckIn.getHours().toString().padStart(2, '0')}:${openCheckIn.getMinutes().toString().padStart(2, '0')}` : null,
          checkOut: openCheckOut ? `${openCheckOut.getHours().toString().padStart(2, '0')}:${openCheckOut.getMinutes().toString().padStart(2, '0')}` : null,
          loading: false,
        });
        return;
      }

      const { data: latestTodayRecord, error: todayErr } = await supabase
        .from('attendance_records')
        .select('date, check_in, check_out')
        .eq('employee_id', PORTAL_EMPLOYEE_ID)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (todayErr) {
        console.warn('[PortalDashboard] today-record query failed, keeping previous live state:', todayErr);
        setLiveAttendanceState((prev) => ({ ...prev, loading: false }));
        return;
      }

      // If we get here and there is genuinely no record today AND no open record from
      // a previous day, only then clear the live state. This is the legitimate
      // "needs to check in" case for a fresh day.
      const todayCheckIn = latestTodayRecord?.check_in ? new Date(latestTodayRecord.check_in) : null;
      const todayCheckOut = latestTodayRecord?.check_out ? new Date(latestTodayRecord.check_out) : null;

      setLiveAttendanceState({
        date: latestTodayRecord?.date ?? null,
        checkIn: todayCheckIn ? `${todayCheckIn.getHours().toString().padStart(2, '0')}:${todayCheckIn.getMinutes().toString().padStart(2, '0')}` : null,
        checkOut: todayCheckOut ? `${todayCheckOut.getHours().toString().padStart(2, '0')}:${todayCheckOut.getMinutes().toString().padStart(2, '0')}` : null,
        loading: false,
      });
    };

    fetchLiveAttendanceState();
  }, [PORTAL_EMPLOYEE_ID, today, records]);

  const showQr = checkinMethod === 'qr' || checkinMethod === 'both';
  const showGps = checkinMethod === 'gps' || checkinMethod === 'both';

  // QR Scanner state
  const [qrMode, setQrMode] = useState(false);
  const [qrEventType, setQrEventType] = useState<'check_in' | 'check_out'>('check_in');
  const [qrStatus, setQrStatus] = useState<'idle' | 'scanning' | 'validating' | 'success' | 'error'>('idle');
  const [qrMessage, setQrMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [confirmCheckoutOpen, setConfirmCheckoutOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    refreshPayroll();
  }, [refreshPayroll]);

  const [monthlyStats, setMonthlyStats] = useState({ present: 0, late: 0, absent: 0, totalHours: 0, totalMinutes: 0, overtime: 0 });
  useEffect(() => {
    if (!PORTAL_EMPLOYEE_ID) return;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = now.toISOString().split('T')[0];
    (async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('status, is_late, work_hours, work_minutes')
        .eq('employee_id', PORTAL_EMPLOYEE_ID)
        .gte('date', startDate)
        .lte('date', endDate);
      if (data) {
        let present = 0, late = 0, absent = 0, totalMins = 0;
        data.forEach(r => {
          if (['present', 'late', 'early-leave', 'mission'].includes(r.status)) present++;
          if (r.is_late) late++;
          if (r.status === 'absent') absent++;
          totalMins += (r.work_minutes || 0);
        });
        setMonthlyStats({ present, late, absent, totalHours: Math.floor(totalMins / 60), totalMinutes: totalMins % 60, overtime: 0 });
      }
    })();
  }, [PORTAL_EMPLOYEE_ID]);
  const latestPayroll = useMemo(() => {
    const p = getEmployeePayroll(PORTAL_EMPLOYEE_ID);
    return p[0];
  }, [getEmployeePayroll]);

  const leaveBalances = useMemo(() => getLeaveBalances(PORTAL_EMPLOYEE_ID), [getLeaveBalances]);
  const totalLeaveRemaining = leaveBalances.reduce((sum, b) => sum + b.remaining, 0);

  const evaluations = useMemo(() => getEvaluations(PORTAL_EMPLOYEE_ID), [getEvaluations]);
  const latestEval = evaluations.length > 0 ? evaluations[0] : null;

  const pendingLeaves = useMemo(() => getLeaveRequests(PORTAL_EMPLOYEE_ID).filter(r => r.status === 'pending').length, [getLeaveRequests]);
  const pendingMissions = useMemo(() => getMissions(PORTAL_EMPLOYEE_ID).filter(r => r.status === 'pending').length, [getMissions]);
  const pendingRequests = useMemo(() => getRequests(PORTAL_EMPLOYEE_ID).filter(r => r.status === 'pending').length, [getRequests]);
  const totalPending = pendingLeaves + pendingMissions + pendingRequests;

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

      const payload = await invokeAttendanceFunction(
        'submit-scan',
        session.access_token,
        { token, event_type: qrEventType, device_id: getOrCreateDeviceId(), gps, device_meta: getDeviceMeta() },
        { retryOnTransient: qrEventType === 'check_out' },
      );

      if (!payload.ok) {
        setQrStatus('error');
        setQrMessage(payload.error ?? 'Unknown error');
      } else if (qrEventType === 'check_out' && payload.deduplicated && !payload.verified) {
        setQrStatus('error');
        setQrMessage(ar ? 'لم يتم تأكيد حفظ الانصراف بعد، حدّث الصفحة ثم أعد المحاولة.' : 'Check-out was not verified yet. Refresh and try again.');
      } else {
        setQrStatus('success');
        setQrMessage(
          qrEventType === 'check_in'
            ? ar ? 'تم تسجيل الحضور بنجاح ✔' : 'Check-in recorded ✔'
            : payload.deduplicated
              ? ar ? 'تم تأكيد الانصراف من الطلب السابق ✔' : 'Previous check-out confirmed ✔'
              : ar ? 'تم تسجيل الانصراف بنجاح ✔' : 'Check-out recorded ✔'
        );
        refreshAttendance(true);
      }
    } catch (e: any) {
      setQrStatus('error');
      setQrMessage(e.message);
    }
  }, [qrStatus, session, qrEventType, ar]);

  const formatTimeClock = (date: Date) => {
    return date.toLocaleTimeString(ar ? 'ar-EG' : 'en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  };

  const annualCasualRemaining = leaveBalances
    .filter(b => b.typeEn === 'Annual' || b.typeEn === 'Casual')
    .reduce((sum, b) => sum + b.remaining, 0);

  const stats = [
    { icon: Clock, labelAr: 'أيام الحضور هذا الشهر', labelEn: 'Attendance Days', value: String(monthlyStats.present), gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    { icon: Calendar, labelAr: 'رصيد الإجازات المتاح', labelEn: 'Available Leave Balance', value: String(annualCasualRemaining), gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { icon: Star, labelAr: 'آخر تقييم', labelEn: 'Last Evaluation', value: latestEval ? `${latestEval.score}/${latestEval.maxScore}` : '—', gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-50 dark:bg-purple-950/40' },
  ];

  return (
    <div dir="rtl" className="space-y-6 text-right">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-right">
          {ar ? 'لوحة التحكم' : 'Dashboard'}
        </h1>
        <p className="text-muted-foreground text-sm text-right">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ar ? arLocale : enUS })}
        </p>
      </div>

      {/* Check-in/out Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-4 md:p-6">
          <div className="text-center space-y-4">
            <AlertDialog open={confirmCheckoutOpen} onOpenChange={setConfirmCheckoutOpen}>
              <AlertDialogContent dir={ar ? 'rtl' : 'ltr'}>
                <AlertDialogHeader>
                  <AlertDialogTitle>{ar ? 'تأكيد تسجيل الانصراف' : 'Confirm check-out'}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {ar ? 'سيتم حفظ وقت الانصراف الحالي بعد التحقق من الكود. هل تريد المتابعة؟' : 'The current check-out time will be saved after QR validation. Continue?'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{ar ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { setQrMode(true); setQrStatus('scanning'); setQrMessage(''); }}>
                    {ar ? 'بدء الانصراف' : 'Start check-out'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="text-3xl md:text-5xl font-bold text-primary font-mono">
              {formatTimeClock(currentTime)}
            </div>

            {/* Scanner area - above buttons */}
            {showQr && qrMode && qrStatus !== 'success' && qrStatus !== 'error' && qrStatus !== 'validating' && (
              <div className="flex justify-center">
                <div className="w-full max-w-[300px]">
                  <QrScanner key={qrEventType} onScan={onQrScan} />
                </div>
              </div>
            )}

            {/* QR buttons */}
            {showQr && (
              <>
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      setQrEventType('check_in');
                      setQrMode(true);
                      setQrStatus('scanning');
                      setQrMessage('');
                    }}
                    className="w-full max-w-[320px] mx-auto"
                    size="lg"
                  disabled={authLoading || methodLoading || liveAttendanceState.loading || (hasCheckedIn && !hasCheckedOut)}
                  >
                    <LogIn className="h-5 w-5 me-2" />
                    {ar ? 'تسجيل حضور (QR)' : 'Check In (QR)'}
                  </Button>
                  {hasCheckedIn && effectiveCheckIn && !showGps && (
                    <p className="text-sm font-medium text-success">
                      {isCrossDayOpenRecord
                        ? ar
                          ? `✔ يوجد حضور مفتوح من ${effectiveDate} الساعة ${effectiveCheckIn}`
                          : `✔ Open check-in from ${effectiveDate} at ${effectiveCheckIn}`
                        : ar
                          ? `✔ تم الحضور في ${effectiveCheckIn}`
                          : `✔ Checked in at ${effectiveCheckIn}`}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      setQrEventType('check_out');
                      setConfirmCheckoutOpen(true);
                    }}
                    className="w-full max-w-[320px] mx-auto"
                    size="lg"
                    variant="outline"
                    disabled={authLoading || methodLoading || liveAttendanceState.loading || !hasCheckedIn || hasCheckedOut}
                  >
                    <LogOut className="h-5 w-5 me-2" />
                    {ar ? 'تسجيل انصراف (QR)' : 'Check Out (QR)'}
                  </Button>
                </div>
              </>
            )}

            {/* GPS buttons */}
            {showGps && (
              <div className="space-y-3">
                <GpsCheckinButton
                  eventType="check_in"
                  disabled={authLoading || methodLoading || liveAttendanceState.loading || (hasCheckedIn && !hasCheckedOut)}
                  onSuccess={() => refreshAttendance(true)}
                  ar={ar}
                />
                <GpsCheckinButton
                  eventType="check_out"
                  disabled={authLoading || methodLoading || liveAttendanceState.loading || !hasCheckedIn || hasCheckedOut}
                  onSuccess={() => refreshAttendance(true)}
                  ar={ar}
                />
              </div>
            )}

            {/* Status timestamps */}
            {hasCheckedIn && effectiveCheckIn && (
              <p className="text-sm font-medium text-success">
                {isCrossDayOpenRecord
                  ? ar
                    ? `✔ يوجد حضور مفتوح من ${effectiveDate} الساعة ${effectiveCheckIn}`
                    : `✔ Open check-in from ${effectiveDate} at ${effectiveCheckIn}`
                  : ar
                    ? `✔ تم الحضور في ${effectiveCheckIn}`
                    : `✔ Checked in at ${effectiveCheckIn}`}
              </p>
            )}
            {hasCheckedOut && effectiveCheckOut && (
              <p className="text-sm font-medium text-muted-foreground">
                {ar ? `✔ تم الانصراف في ${effectiveCheckOut}` : `✔ Checked out at ${effectiveCheckOut}`}
              </p>
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
                <CheckCircle className="h-6 w-6" />
                <span className="font-semibold text-lg">{qrMessage}</span>
              </div>
            )}
            {qrStatus === 'error' && (
              <div className="flex items-center justify-center gap-2 text-destructive py-4">
                <XCircle className="h-6 w-6" />
                <span className="font-semibold">{qrMessage}</span>
              </div>
            )}

            {(qrStatus === 'success' || qrStatus === 'error') && (
              <Button
                variant="outline"
                onClick={() => { setQrStatus('idle'); setQrMessage(''); setQrMode(false); }}
                className="w-full max-w-[320px] mx-auto"
              >
                {ar ? 'إغلاق' : 'Close'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {stats.map((s, i) => (
          <Card key={i} className={cn("border-0 shadow-sm", s.bg)}>
            <CardContent className="p-4 md:p-5 text-center">
              <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl mx-auto mb-2 flex items-center justify-center bg-gradient-to-br", s.gradient)}>
                <s.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <p className="text-xl md:text-2xl font-bold">{s.value}</p>
              <p className="text-xs md:text-sm text-muted-foreground">{ar ? s.labelAr : s.labelEn}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Requests */}
        <Card className="border-0 shadow-sm bg-orange-50 dark:bg-orange-950/40">
          <CardContent className="p-5">
            <div className="flex flex-row-reverse items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-500">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-right">{ar ? 'طلبات معلقة' : 'Pending Requests'}</h3>
            </div>
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 text-center">{totalPending}</p>
            <div className="text-xs text-muted-foreground text-center mt-2 space-y-1">
              {pendingLeaves > 0 && <p>{ar ? `${pendingLeaves} إجازة` : `${pendingLeaves} leave(s)`}</p>}
              {pendingMissions > 0 && <p>{ar ? `${pendingMissions} مأمورية` : `${pendingMissions} mission(s)`}</p>}
              {pendingRequests > 0 && <p>{ar ? `${pendingRequests} طلب` : `${pendingRequests} request(s)`}</p>}
              {totalPending === 0 && <p>{ar ? 'لا توجد طلبات معلقة' : 'No pending requests'}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Leave Balances */}
        <Card className="border-0 shadow-sm bg-sky-50 dark:bg-sky-950/40">
          <CardContent className="p-5">
            <div className="flex flex-row-reverse items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-sky-500 to-blue-500">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-right">{ar ? 'أرصدة الإجازات' : 'Leave Balances'}</h3>
            </div>
            <div className="space-y-3">
              {leaveBalances.map((b, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex flex-row-reverse justify-between text-sm">
                    <span className="font-medium text-foreground">{ar ? b.typeAr : b.typeEn}</span>
                  </div>
                  <div className="flex flex-row-reverse justify-between text-xs text-muted-foreground">
                    <span>{ar ? 'المستخدم' : 'Used'}: <span className="font-semibold text-destructive">{b.total - b.remaining}</span></span>
                    <span>{ar ? 'المتبقي' : 'Remaining'}: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{b.remaining}</span></span>
                    <span>{ar ? 'الإجمالي' : 'Total'}: <span className="font-semibold text-foreground">{b.total}</span></span>
                  </div>
                </div>
              ))}
              {leaveBalances.length === 0 && <p className="text-sm text-muted-foreground text-center">{ar ? 'لا توجد أرصدة' : 'No balances'}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Latest Evaluation */}
        <Card className="border-0 shadow-sm bg-violet-50 dark:bg-violet-950/40">
          <CardContent className="p-5">
            <div className="flex flex-row-reverse items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-500">
                <Star className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-right">{ar ? 'آخر تقييم' : 'Latest Evaluation'}</h3>
            </div>
            {latestEval ? (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">{latestEval.period}</p>
                <div className="flex items-center justify-center gap-1">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star key={si} className={cn("w-5 h-5", si < Math.floor(latestEval.score) ? "text-warning fill-warning" : "text-muted")} />
                  ))}
                </div>
                <p className="text-xl font-bold">{latestEval.score}/{latestEval.maxScore}</p>
                <p className="text-xs text-muted-foreground">{ar ? latestEval.notesAr : latestEval.notesEn}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center">{ar ? 'لا توجد تقييمات' : 'No evaluations'}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
