import { useState, useCallback } from "react";
import { getOrCreateDeviceId, getDeviceMeta } from "@/lib/device";
import { performCheckin } from "@/lib/attendanceQueue";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import QrScanner from "@/components/attendance/QrScanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, LogIn, LogOut, QrCode, Navigation } from "lucide-react";

const AttendanceScan = () => {
  const { user, session } = useAuth();
  const { language } = useLanguage();
  const ar = language === "ar";

  const [status, setStatus] = useState<"idle" | "scanning" | "validating" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [eventType, setEventType] = useState<"check_in" | "check_out">("check_in");
  const [scanning, setScanning] = useState(false);
  const [mode, setMode] = useState<"qr" | "gps">("qr");

  const onScan = useCallback(async (token: string) => {
    if (status === "validating") return;
    setStatus("validating");
    setScanning(false);

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
        setStatus("error");
        setMessage(ar ? "يرجى تسجيل الدخول أولاً" : "Please sign in first.");
        return;
      }

      const device_id = getOrCreateDeviceId();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/submit-scan`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token, event_type: eventType, device_id, gps, device_meta: getDeviceMeta() }),
        }
      );

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setStatus("error");
        setMessage(e.error ?? res.statusText);
      } else {
        setStatus("success");
        setMessage(
          eventType === "check_in"
            ? ar ? "تم تسجيل الحضور بنجاح ✔" : "Check-in recorded ✔"
            : ar ? "تم تسجيل الانصراف بنجاح ✔" : "Check-out recorded ✔"
        );
      }
    } catch (e: any) {
      setStatus("error");
      setMessage(e.message);
    }
  }, [status, session, eventType, ar]);

  const handleGpsCheckin = useCallback(async () => {
    if (status === "validating") return;
    setStatus("validating");

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error(ar ? "الموقع غير مدعوم" : "Geolocation not supported"));
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
      });

      if (!session?.access_token || !session.user?.id) {
        setStatus("error");
        setMessage(ar ? "يرجى تسجيل الدخول أولاً" : "Please sign in first.");
        return;
      }

      const result = await performCheckin({
        eventType,
        accessToken: session.access_token,
        userId: session.user.id,
        deviceId: getOrCreateDeviceId(),
        gpsLat: pos.coords.latitude,
        gpsLng: pos.coords.longitude,
        gpsAccuracy: pos.coords.accuracy,
      });

      if (!result.ok) {
        setStatus("error");
        setMessage(result.error || "Unknown error");
      } else {
        setStatus("success");
        setMessage(
          eventType === "check_in"
            ? ar ? "تم تسجيل الحضور بنجاح ✔" : "Check-in recorded ✔"
            : ar ? "تم تسجيل الانصراف بنجاح ✔" : "Check-out recorded ✔"
        );
      }
    } catch (e: any) {
      setStatus("error");
      if (e.code === 1) {
        setMessage(ar ? "يرجى السماح بالوصول للموقع" : "Please allow location access");
      } else {
        setMessage(e.message);
      }
    }
  }, [status, session, eventType, ar]);

  const startScan = () => {
    setScanning(true);
    setStatus("scanning");
    setMessage("");
  };

  const reset = () => {
    setStatus("idle");
    setMessage("");
    setScanning(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={ar ? "rtl" : "ltr"}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <QrCode className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {ar ? "تسجيل الحضور" : "Attendance"}
          </CardTitle>
          {user && (
            <p className="text-sm text-muted-foreground">
              {ar ? user.nameAr : user.name}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event type toggle */}
          <div className="flex gap-2 justify-center">
            <Button
              variant={eventType === "check_in" ? "default" : "outline"}
              onClick={() => setEventType("check_in")}
              className="flex-1"
            >
              <LogIn className="h-4 w-4 me-2" />
              {ar ? "حضور" : "Check In"}
            </Button>
            <Button
              variant={eventType === "check_out" ? "default" : "outline"}
              onClick={() => setEventType("check_out")}
              className="flex-1"
            >
              <LogOut className="h-4 w-4 me-2" />
              {ar ? "انصراف" : "Check Out"}
            </Button>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 justify-center">
            <Button
              variant={mode === "qr" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => { setMode("qr"); reset(); }}
            >
              <QrCode className="h-4 w-4 me-1" />
              QR
            </Button>
            <Button
              variant={mode === "gps" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => { setMode("gps"); reset(); }}
            >
              <Navigation className="h-4 w-4 me-1" />
              GPS
            </Button>
          </div>

          {/* Scanner area */}
          {mode === "qr" && scanning && <QrScanner onScan={onScan} />}

          {/* Status messages */}
          {status === "validating" && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {ar ? "جاري التحقق..." : "Validating..."}
            </div>
          )}
          {status === "success" && (
            <div className="flex items-center justify-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5 text-primary" />
              {message}
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center justify-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              {message}
            </div>
          )}

          {/* Action buttons */}
          {!scanning && status !== "validating" && mode === "qr" && (
            <Button onClick={startScan} className="w-full" size="lg">
              <QrCode className="h-5 w-5 me-2" />
              {ar ? "مسح رمز QR" : "Scan QR Code"}
            </Button>
          )}
          {status !== "validating" && mode === "gps" && (
            <Button onClick={handleGpsCheckin} className="w-full" size="lg">
              <Navigation className="h-5 w-5 me-2" />
              {ar ? "تسجيل بالموقع (GPS)" : "Check In (GPS)"}
            </Button>
          )}
          {(status === "success" || status === "error") && (
            <Button variant="outline" onClick={reset} className="w-full">
              {ar ? "محاولة أخرى" : "Try Again"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceScan;
