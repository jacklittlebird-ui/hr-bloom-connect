import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateDeviceId, getDeviceMeta } from '@/lib/device';
import { performCheckin, clearCheckinDedup } from '@/lib/attendanceQueue';
import { getFreshPosition, freshGeoErrorMessage } from '@/lib/freshGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { Navigation, Loader2, CheckCircle, XCircle, WifiOff, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Props {
  eventType: 'check_in' | 'check_out';
  disabled?: boolean;
  onSuccess?: () => void;
  ar?: boolean;
}

type Status = 'idle' | 'loading' | 'verifying' | 'success' | 'error' | 'offline';

export const GpsCheckinButton = ({ eventType, disabled, onSuccess, ar = true }: Props) => {
  const { session } = useAuth();
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onUp = () => setIsOnline(true);
    const onDown = () => setIsOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  /**
   * Re-query the database to PROVE the operation was actually persisted on the
   * server (not just a cached/stale response).
   *
   * NIGHT-SHIFT SAFE: a check-out done after midnight is stored under the
   * check-in's date, NOT today's date. We therefore never filter by date —
   * we look at the most recent records regardless of date and match by
   * timestamp within a 5-minute tolerance.
   *
   * Every attempt is recorded in `gps_verification_logs` for the audit page.
   */
  const verifyOnServer = async (
    employeeUserId: string,
    expectedRecordedAt: string,
  ): Promise<{ matchedAt: string | null; matchedDate: string | null; reason: string }> => {
    let employeeId: string | null = null;
    let outcome: 'matched' | 'not_found' | 'error' = 'error';
    let matchedAt: string | null = null;
    let matchedDate: string | null = null;
    let reason = '';

    try {
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('employee_id')
        .eq('user_id', employeeUserId)
        .eq('role', 'employee')
        .maybeSingle();

      employeeId = roleRow?.employee_id ?? null;
      if (!employeeId) {
        reason = 'employee_not_resolved';
      } else {
        const expectedTs = new Date(expectedRecordedAt).getTime();

        // Pull the 3 most recent records (any date) — covers night shifts
        // crossing midnight where check_out belongs to yesterday's record.
        const { data: recs, error } = await supabase
          .from('attendance_records')
          .select('id, date, check_in, check_out')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          reason = `query_error:${error.message}`;
        } else if (!recs || recs.length === 0) {
          outcome = 'not_found';
          reason = 'no_recent_records';
        } else {
          for (const rec of recs) {
            const stamp = eventType === 'check_in' ? rec.check_in : rec.check_out;
            if (!stamp) continue;
            if (Math.abs(new Date(stamp).getTime() - expectedTs) <= 5 * 60_000) {
              matchedAt = stamp;
              matchedDate = rec.date;
              outcome = 'matched';
              reason = 'within_5min_window';
              break;
            }
          }
          if (!matchedAt) {
            outcome = 'not_found';
            reason = 'no_timestamp_within_window';
          }
        }
      }
    } catch (e: any) {
      reason = `exception:${e?.message ?? 'unknown'}`;
    }

    // Fire-and-forget audit insert (never blocks the user)
    void supabase.from('gps_verification_logs').insert({
      user_id: employeeUserId,
      employee_id: employeeId,
      event_type: eventType,
      expected_recorded_at: expectedRecordedAt,
      found_recorded_at: matchedAt,
      matched_record_date: matchedDate,
      outcome,
      reason,
    });

    return { matchedAt, matchedDate, reason };
  };

  const submitAttendance = async () => {
    if (!navigator.onLine) {
      setStatus('offline');
      setMessage(
        ar
          ? '⚠️ لا يوجد اتصال بالإنترنت. يرجى التأكد من الاتصال ثم إعادة المحاولة.'
          : '⚠️ No internet connection. Please reconnect and retry.'
      );
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      let pos: GeolocationPosition;
      try {
        pos = await getFreshPosition({
          maxAgeMs: 10_000,
          maxAccuracyMeters: 150,
          timeoutMs: 20_000,
        });
      } catch (geoErr) {
        setStatus('error');
        setMessage(freshGeoErrorMessage(geoErr, ar));
        return;
      }

      if (!session?.access_token || !session.user?.id) {
        setStatus('error');
        setMessage(ar ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first');
        return;
      }

      const deviceMeta = getDeviceMeta();
      const result = await performCheckin({
        eventType,
        accessToken: session.access_token,
        userId: session.user.id,
        deviceId: getOrCreateDeviceId(),
        gpsLat: pos.coords.latitude,
        gpsLng: pos.coords.longitude,
        gpsAccuracy: pos.coords.accuracy,
        deviceMeta,
      });

      if (!result.ok) {
        setStatus('error');
        const code = result.error_code;
        if (eventType === 'check_out' && code === 'NO_OPEN_RECORD') {
          setMessage(
            ar
              ? '⚠️ لا يوجد تسجيل حضور مفتوح.\nالخطوة التالية: اضغط "تسجيل حضور (GPS)" أولاً، ثم سجّل الانصراف.'
              : '⚠️ No open check-in found.\nNext step: press "Check In (GPS)" first, then check out.'
          );
          return;
        }
        if (code === 'OPEN_RECORD_EXISTS') {
          setMessage(
            ar
              ? '⚠️ يوجد سجل حضور مفتوح من يوم سابق.\nالخطوة التالية: سجّل الانصراف أولاً قبل تسجيل حضور جديد.'
              : '⚠️ You have an open check-in from a previous day.\nNext step: check out first, then check in again.'
          );
          return;
        }
        if (code === 'MINIMUM_WORK_DURATION') {
          setMessage(
            ar
              ? `⚠️ ${result.error}\nالخطوة التالية: انتظر حتى تكتمل دقيقة من تسجيل الحضور ثم أعد المحاولة.`
              : `⚠️ ${result.error}\nNext step: wait until 60s after check-in, then retry.`
          );
          return;
        }
        if (code === 'CHECKOUT_SAVE_FAILED') {
          setMessage(
            ar
              ? '⚠️ تم العثور على سجل حضور مفتوح لكن فشل حفظ الانصراف.\nالخطوة التالية: أعد المحاولة فوراً — لن يحدث ازدواج.'
              : '⚠️ Open record found but check-out save failed.\nNext step: retry immediately — no duplicate will be created.'
          );
          return;
        }
        if (result.reason === 'in_flight' || result.reason === 'concurrent_lock') {
          setMessage(
            ar
              ? '⚠️ الطلب السابق ما زال قيد التحقق على الخادم.\nالخطوة التالية: انتظر 10 ثوانٍ ثم أعد المحاولة.'
              : '⚠️ Previous request is still being verified by the server.\nNext step: wait 10s and retry.'
          );
          return;
        }
        if (result.reason === 'previous_failed') {
          setMessage(
            ar
              ? '⚠️ لم يكتمل الطلب السابق.\nالخطوة التالية: اضغط الزر مرة أخرى الآن — تم فتح القفل تلقائياً.'
              : '⚠️ Previous attempt did not complete.\nNext step: press the button again now — the lock was released.'
          );
          return;
        }
        if (code === 'NETWORK_ERROR') {
          setStatus('offline');
          setMessage(
            ar
              ? '⚠️ تعذّر الوصول للخادم. لم يتم حفظ العملية.\nالخطوة التالية: تأكد من الإنترنت وأعد المحاولة.'
              : '⚠️ Could not reach the server. Operation was NOT saved.\nNext step: check internet and retry.'
          );
          return;
        }
        const retryHint = result.retryable
          ? ar ? '\nيمكنك إعادة المحاولة فوراً.' : '\nYou can retry immediately.'
          : '';
        setMessage(`${result.error || 'Unknown error'}${retryHint}`);
        return;
      }

      // Server returned ok — but BEFORE we display success, we re-query the DB
      // to PROVE the row was actually persisted. This protects against stale
      // service-worker responses or any cached "success" that doesn't reflect
      // real server state.
      if (!result.recorded_at) {
        setStatus('error');
        setMessage(
          ar
            ? '⚠️ لم يصل تأكيد فعلي من الخادم.\nالخطوة التالية: أعد المحاولة الآن.'
            : '⚠️ No confirmation received from the server.\nNext step: retry now.'
        );
        return;
      }

      setStatus('verifying');
      setMessage(ar ? 'جارٍ التحقق من الحفظ على الخادم...' : 'Verifying with server...');

      const { matchedAt: verifiedTs, reason: verifyReason } = await verifyOnServer(
        session.user.id,
        result.recorded_at,
      );

      if (!verifiedTs) {
        // Free local dedup so the user can press the button again immediately
        // — the server claimed success but the row was not found within the
        // tolerance window, so a real retry must NOT be blocked as duplicate.
        clearCheckinDedup(session.user.id, eventType);
        setStatus('error');
        setMessage(
          ar
            ? `⚠️ لم يتم العثور على السجل في قاعدة البيانات (${verifyReason}).\nالخطوة التالية: اضغط "إعادة المحاولة" — لن يحدث ازدواج.`
            : `⚠️ Record not found on server (${verifyReason}).\nNext step: press "Retry" — no duplicate will be created.`
        );
        return;
      }

      const timeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Africa/Cairo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(verifiedTs));

      setStatus('success');
      setMessage(
        eventType === 'check_in'
          ? ar ? `تم تسجيل الحضور وتأكيده من الخادم ✔ — الوقت: ${timeStr}` : `Check-in confirmed by server ✔ — Time: ${timeStr}`
          : ar ? `تم تسجيل الانصراف وتأكيده من الخادم ✔ — الوقت: ${timeStr}` : `Check-out confirmed by server ✔ — Time: ${timeStr}`
      );
      onSuccess?.();
    } catch (e: any) {
      // Distinguish network failures from other errors
      if (!navigator.onLine || e?.name === 'TypeError') {
        setStatus('offline');
        setMessage(
          ar
            ? '⚠️ تعذّر الاتصال بالخادم. لم يتم حفظ العملية. يرجى إعادة المحاولة.'
            : '⚠️ Could not reach the server. Operation was NOT saved. Please retry.'
        );
        return;
      }
      setStatus('error');
      if (e.code === 1) {
        setMessage(ar ? 'يرجى السماح بالوصول للموقع' : 'Please allow location access');
      } else if (e.code === 3) {
        setMessage(ar ? 'انتهت مهلة تحديد الموقع - تأكد من تفعيل GPS وحاول مجدداً' : 'Location timeout - ensure GPS is enabled and try again');
      } else if (e.code === 2) {
        setMessage(ar ? 'تعذر تحديد الموقع - تأكد من تفعيل GPS' : 'Position unavailable - enable GPS');
      } else {
        setMessage(e.message);
      }
    }
  };

  const handleClick = async () => {
    if (eventType === 'check_out') {
      setConfirmOpen(true);
      return;
    }
    await submitAttendance();
  };

  const isBusy = status === 'loading' || status === 'verifying';

  return (
    <div className="space-y-2 w-full">
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir={ar ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {ar ? 'تأكيد تسجيل الانصراف' : 'Confirm check-out'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {ar
                ? 'سيتم حفظ وقت الانصراف الحالي بعد التحقق من الموقع. هل تريد المتابعة؟'
                : 'The current check-out time will be saved after location validation. Continue?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ar ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submitAttendance()}>
              {ar ? 'تأكيد الانصراف' : 'Confirm check-out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isOnline && status !== 'offline' && (
        <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
          <WifiOff className="h-4 w-4" />
          <span>{ar ? 'لا يوجد اتصال بالإنترنت' : 'You are offline'}</span>
        </div>
      )}

      <Button
        onClick={handleClick}
        disabled={disabled || isBusy}
        className="w-full max-w-[320px] mx-auto"
        size="lg"
        variant={eventType === 'check_out' ? 'outline' : 'default'}
      >
        {isBusy ? (
          <Loader2 className="h-5 w-5 me-2 animate-spin" />
        ) : (
          <Navigation className="h-5 w-5 me-2" />
        )}
        {status === 'verifying'
          ? ar ? 'جارٍ التحقق من الخادم...' : 'Verifying with server...'
          : eventType === 'check_in'
            ? ar ? 'تسجيل حضور (GPS)' : 'Check In (GPS)'
            : ar ? 'تسجيل انصراف (GPS)' : 'Check Out (GPS)'}
      </Button>

      {status === 'success' && (
        <div className="flex items-center justify-center gap-2 text-success">
          <CheckCircle className="h-5 w-5" />
          <span className="font-semibold text-sm">{message}</span>
        </div>
      )}
      {status === 'error' && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <span className="font-semibold text-sm whitespace-pre-wrap break-words">{message}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void submitAttendance()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {ar ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </div>
      )}
      {status === 'offline' && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
            <WifiOff className="h-5 w-5" />
            <span className="font-semibold text-sm whitespace-pre-wrap break-words">{message}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void submitAttendance()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {ar ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </div>
      )}
    </div>
  );
};
