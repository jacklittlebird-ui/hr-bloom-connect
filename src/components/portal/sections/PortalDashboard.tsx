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
import { getFreshPosition, freshGeoErrorMessage, FreshGeolocationError } from '@/lib/freshGeolocation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type AttendanceStateRecord = {
  id?: string;
  date: string | null;
  check_in: string | null;
  check_out: string | null;
};

const formatDbTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export const PortalDashboard = () => {
  const PORTAL_EMPLOYEE_ID = usePortalEmployee();
  const { getEmployee } = useEmployeeData();
  const employee = getEmployee(PORTAL_EMPLOYEE_ID);
  const { language } = useLanguage();
  const ar = language === 'ar';
  const { session, loading: authLoading } = useAuth();
  const { getEmployeePayroll, refreshPayroll } = usePayrollData();
  const { records, getMonthlyStats, refresh: refreshAttendance } = useAttendanceData();
  const { getLeaveBalances, getEvaluations, getLeaveRequests, getMissions, getRequests, getOvertimeDays, ensureLeaves, ensureEvaluations, ensureMissions } = usePortalData();
  useEffect(() => { ensureLeaves(); }, [ensureLeaves]);

  // Today, computed in Cairo timezone — never the device-local timezone, so
  // an employee whose phone is set to a different region still sees the
  // correct "today" for the workplace.
  const today = getCairoDateString();
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

  const [liveAttendanceState, setLiveAttendanceState] = useState<{ checkIn: string | null; checkOut: string | null; date: string | null; loading: boolean; error: boolean }>({
    checkIn: null,
    checkOut: null,
    date: null,
    loading: true,
    error: false,
  });
  const [attendanceStateVersion, setAttendanceStateVersion] = useState(0);
  const refreshLiveAttendanceState = useCallback(() => {
    setAttendanceStateVersion((version) => version + 1);
  }, []);

  const activeRecord = latestOpenRecord ?? todayRecord;
  // Merge logic: prefer whichever source actually has a check-in. This guards
  // against the case where a transient query failure leaves liveAttendanceState
  // empty even though the context records show the employee already checked in
  // — and vice versa, when the live query has fresher data than the context
  // cache. We never silently downgrade "checked in" → "not checked in".
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
      if (authLoading) return;

      if (!PORTAL_EMPLOYEE_ID || !session?.access_token) {
        setLiveAttendanceState({ checkIn: null, checkOut: null, date: null, loading: false, error: false });
        return;
      }

      setLiveAttendanceState((prev) => ({ ...prev, loading: true }));

      const payload = await invokeAttendanceFunction('attendance-state', session.access_token, {});

      if (!payload.ok) {
        // Do NOT block the UI on transient failures of attendance-state.
        // The backend (gps-checkin / submit-scan) is the source of truth and
        // will reject duplicates itself. Keep previous state and clear loading.
        console.warn('[PortalDashboard] attendance-state failed, keeping previous live state:', payload.error);
        setLiveAttendanceState((prev) => ({ ...prev, loading: false, error: false }));
        return;
      }

      const statePayload = payload as typeof payload & {
        checkin_method?: string;
        today?: string;
        open_record?: AttendanceStateRecord | null;
        today_record?: AttendanceStateRecord | null;
      };
      if (statePayload.checkin_method) {
        setCheckinMethod(statePayload.checkin_method);
        setMethodLoading(false);
      }
      const currentRecord = statePayload.open_record ?? statePayload.today_record ?? null;

      setLiveAttendanceState({
        date: currentRecord?.date ?? null,
        checkIn: formatDbTime(currentRecord?.check_in),
        checkOut: formatDbTime(currentRecord?.check_out),
        loading: false,
        error: false,
      });
    };

    fetchLiveAttendanceState();
  }, [PORTAL_EMPLOYEE_ID, session?.access_token, authLoading, records, attendanceStateVersion]);

  const showQr = checkinMethod === 'qr' || checkinMethod === 'both';
  const showGps = checkinMethod === 'gps' || checkinMethod === 'both';
  // GPS checkout must remain actionable as long as the employee has an actual
  // open record on the server. We intentionally IGNORE liveAttendanceState.error
  // and liveAttendanceState.loading here — the backend (gps-checkin function) is
  // the absolute source of truth and will reject the request itself if no open
  // record actually exists. Disabling the button on a transient state-fetch
  // failure would unfairly trap employees who are physically checked-in.
  const gpsCheckoutDisabled = authLoading || methodLoading || hasCheckedOut;

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

  const leaveBalances = useMemo(() => getLeaveBalances(PORTAL_EMPLOYEE_ID), [getLeaveBalances, PORTAL_EMPLOYEE_ID]);

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
      // QR mode: GPS is OPTIONAL. The QR code itself proves on-site presence
      // (it can only be obtained by scanning the kiosk screen at the workplace),
      // so a missing/weak/stale GPS reading must NOT block the scan.
      let gps: { lat?: number; lng?: number; accuracy?: number } = {};
      try {
        const fresh = await getFreshPosition({
          maxAgeMs: 300_000,
          maxAccuracyMeters: 300,
          timeoutMs: 8_000,
        });
        gps = { lat: fresh.coords.latitude, lng: fresh.coords.longitude, accuracy: fresh.coords.accuracy };
      } catch (geoErr) {
        console.warn('[PortalDashboard] QR scan continuing without GPS:', geoErr);
      }

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
        refreshLiveAttendanceState();
      }
    } catch (e: any) {
      setQrStatus('error');
      setQrMessage(e.message);
    }
  }, [qrStatus, session, qrEventType, ar, refreshAttendance, refreshLiveAttendanceState]);

  const formatTimeClock = (date: Date) => {
    return date.toLocaleTimeString(ar ? 'ar-EG' : 'en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  };

  // Available Leave Balance — computed live from actual records, NOT from
  // leave_balances.*_used (which is now opening-balance only).
  // Formula: AnnualOpening + CasualOpening - AnnualUsed - CasualUsed + AddedDays
  const annualBal = leaveBalances.find(b => b.typeEn === 'Annual');
  const casualBal = leaveBalances.find(b => b.typeEn === 'Casual');
  const annualOpening = annualBal?.baseTotal ?? annualBal?.total ?? 0;
  const casualOpening = casualBal?.total ?? 0;
  const currentYearForBalance = new Date().getFullYear();
  const portalLeaveRequests = useMemo(
    () => getLeaveRequests(PORTAL_EMPLOYEE_ID),
    [getLeaveRequests, PORTAL_EMPLOYEE_ID]
  );
  const portalOvertime = useMemo(
    () => getOvertimeDays(PORTAL_EMPLOYEE_ID),
    [getOvertimeDays, PORTAL_EMPLOYEE_ID]
  );
  const annualUsedLive = useMemo(
    () => portalLeaveRequests
      .filter(r => r.status === 'approved' && r.type === 'annual' && new Date(r.startDate).getFullYear() === currentYearForBalance)
      .reduce((s, r) => s + Number(r.days || 0), 0),
    [portalLeaveRequests, currentYearForBalance]
  );
  const casualUsedLive = useMemo(
    () => portalLeaveRequests
      .filter(r => r.status === 'approved' && r.type === 'casual' && new Date(r.startDate).getFullYear() === currentYearForBalance)
      .reduce((s, r) => s + Number(r.days || 0), 0),
    [portalLeaveRequests, currentYearForBalance]
  );
  const overtimeAddedLive = useMemo(
    () => portalOvertime
      .filter(o => o.status === 'approved' && new Date(o.date).getFullYear() === currentYearForBalance)
      .reduce((s, o) => s + (o.overtimeType === 'eid_first_day' ? 2 : 1), 0),
    [portalOvertime, currentYearForBalance]
  );
  const annualCasualRemaining =
    annualOpening + casualOpening - annualUsedLive - casualUsedLive + overtimeAddedLive;

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
                  disabled={authLoading || methodLoading || (hasCheckedIn && !hasCheckedOut)}
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
                    disabled={authLoading || methodLoading || !hasCheckedIn || hasCheckedOut}
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
                  disabled={authLoading || methodLoading || (hasCheckedIn && !hasCheckedOut)}
                  onSuccess={() => { refreshAttendance(true); refreshLiveAttendanceState(); }}
                  ar={ar}
                />
                <GpsCheckinButton
                  eventType="check_out"
                  disabled={gpsCheckoutDisabled}
                  onSuccess={() => { refreshAttendance(true); refreshLiveAttendanceState(); }}
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

            {/* Removed the "تعذر التحقق من سجل الحضور" banner — the backend
                rejects true duplicates, and a transient lookup failure must
                NOT block legitimate check-ins/outs. */}

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
