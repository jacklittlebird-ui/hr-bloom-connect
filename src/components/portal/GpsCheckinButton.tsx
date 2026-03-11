import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateDeviceId } from '@/lib/device';
import { Navigation, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  eventType: 'check_in' | 'check_out';
  disabled?: boolean;
  onSuccess?: () => void;
  ar?: boolean;
}

export const GpsCheckinButton = ({ eventType, disabled, onSuccess, ar = true }: Props) => {
  const { session } = useAuth();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleClick = async () => {
    setStatus('loading');
    setMessage('');

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error(ar ? 'الموقع غير مدعوم' : 'Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });

      if (!session?.access_token) {
        setStatus('error');
        setMessage(ar ? 'يرجى تسجيل الدخول أولاً' : 'Please sign in first');
        return;
      }

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/gps-checkin`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            event_type: eventType,
            gps_lat: pos.coords.latitude,
            gps_lng: pos.coords.longitude,
            gps_accuracy: pos.coords.accuracy,
            device_id: getOrCreateDeviceId(),
          }),
        }
      );

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setStatus('error');
        setMessage(e.error || res.statusText);
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
