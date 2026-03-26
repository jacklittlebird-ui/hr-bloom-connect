import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateDeviceId, getDeviceMeta } from '@/lib/device';
import { performCheckin } from '@/lib/attendanceQueue';
import { Navigation, Loader2, CheckCircle, XCircle } from 'lucide-react';

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

  const handleClick = async () => {
    setStatus('loading');
    setMessage('');

    try {
      // Try high accuracy first, fallback to low accuracy on timeout
      const getPosition = (highAccuracy: boolean, timeout: number) =>
        new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error(ar ? 'الموقع غير مدعوم' : 'Geolocation not supported'));
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: highAccuracy,
            timeout,
            maximumAge: 30000,
          });
        });

      let pos: GeolocationPosition;
      try {
        pos = await getPosition(true, 20000);
      } catch (geoErr: any) {
        if (geoErr.code === 3) {
          // Timeout — retry with low accuracy
          pos = await getPosition(false, 15000);
        } else {
          throw geoErr;
        }
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
        setMessage(result.error || 'Unknown error');
      } else {
        setStatus('success');
        setMessage(
          eventType === 'check_in'
            ? ar ? 'تم تسجيل الحضور بنجاح ✔' : 'Check-in recorded ✔'
            : ar ? 'تم تسجيل الانصراف بنجاح ✔' : 'Check-out recorded ✔'
        );
        onSuccess?.();
      }
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

  return (
    <div className="space-y-2 w-full">
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
