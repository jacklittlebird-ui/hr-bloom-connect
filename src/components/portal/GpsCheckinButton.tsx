import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateDeviceId, getDeviceMeta } from '@/lib/device';
import { performCheckin } from '@/lib/attendanceQueue';
import { getFreshPosition, freshGeoErrorMessage } from '@/lib/freshGeolocation';
import { Navigation, Loader2, CheckCircle, XCircle } from 'lucide-react';
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

export const GpsCheckinButton = ({ eventType, disabled, onSuccess, ar = true }: Props) => {
  const { session, user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const submitAttendance = async () => {
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
        const retryHint = result.retryable && eventType === 'check_out'
          ? ar ? ' يمكنك إعادة المحاولة فوراً.' : ' You can retry immediately.'
          : '';
        setMessage(`${result.error || 'Unknown error'}${retryHint}`);
        return;
      }

      // NOTE: We intentionally DO NOT block the user with a "verify/refresh"
      // error when the backend returns deduplicated && !verified for check_out.
      // The backend (gps-checkin) is the source of truth and has already
      // accepted the request — showing a confusing "refresh the page" message
      // creates the false impression that nothing was saved and pushes the
      // user to retry, which is exactly what we want to avoid. Treat any ok
      // response as success.
      setStatus('success');
      setMessage(
        eventType === 'check_in'
          ? ar ? 'تم تسجيل الحضور بنجاح ✔' : 'Check-in recorded ✔'
          : result.deduplicated
            ? ar ? 'تم تأكيد الانصراف من الطلب السابق ✔' : 'Previous check-out confirmed ✔'
            : ar ? 'تم تسجيل الانصراف بنجاح ✔' : 'Check-out recorded ✔'
      );
      onSuccess?.();
    } catch (e: any) {
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

      <Button
        onClick={handleClick}
        disabled={disabled || status === 'loading'}
        className="w-full max-w-[320px] mx-auto"
        size="lg"
        variant={eventType === 'check_out' ? 'outline' : 'default'}
      >
        {status === 'loading' ? (
          <Loader2 className="h-5 w-5 me-2 animate-spin" />
        ) : (
          <Navigation className="h-5 w-5 me-2" />
        )}
        {eventType === 'check_in'
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
        <div className="flex items-center justify-center gap-2 text-destructive">
          <XCircle className="h-5 w-5" />
          <span className="font-semibold text-sm">{message}</span>
        </div>
      )}
    </div>
  );
};
