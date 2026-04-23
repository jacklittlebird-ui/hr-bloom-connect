import { useState, useCallback, useRef } from "react";
import { getOrCreateDeviceId, getDeviceMeta } from "@/lib/device";
import { performCheckin } from "@/lib/attendanceQueue";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from '@/hooks/use-mobile';
import { usePreventPullToRefresh } from '@/hooks/usePreventPullToRefresh';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import QrScanner from "@/components/attendance/QrScanner";
import { invokeAttendanceFunction } from "@/lib/attendanceApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Loader2, LogIn, LogOut, QrCode, Navigation } from "lucide-react";

const AttendanceScan = () => {
  const { user, session } = useAuth();
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const ar = language === "ar";

  const mainRef = useRef<HTMLDivElement>(null);
  usePreventPullToRefresh(mainRef, isMobile);
  useScrollRestoration(mainRef);

  const [status, setStatus] = useState<"idle" | "scanning" | "validating" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [eventType, setEventType] = useState<"check_in" | "check_out">("check_in");
  const [scanning, setScanning] = useState(false);
  const [mode, setMode] = useState<"qr" | "gps">("qr");
  const [confirmCheckoutOpen, setConfirmCheckoutOpen] = useState(false);

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

      const payload = await invokeAttendanceFunction(
        "submit-scan",
        session.access_token,
        { token, event_type: eventType, device_id: getOrCreateDeviceId(), gps, device_meta: getDeviceMeta() },
        { retryOnTransient: eventType === "check_out" },
      );

      if (!payload.ok) {
        setStatus("error");
        setMessage(payload.error ?? "Unknown error");
      } else if (eventType === "check_out" && payload.deduplicated && !payload.verified) {
        setStatus("error");
        setMessage(ar ? "لم يتم تأكيد حفظ الانصراف بعد، حدّث الصفحة ثم أعد المحاولة." : "Check-out was not verified yet. Refresh and try again.");
      } else {
        setStatus("success");
        setMessage(
          eventType === "check_in"
            ? ar ? "تم تسجيل الحضور بنجاح ✔" : "Check-in recorded ✔"
            : payload.deduplicated
              ? ar ? "تم تأكيد الانصراف من الطلب السابق ✔" : "Previous check-out confirmed ✔"
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
      } else if (eventType === "check_out" && result.deduplicated && !result.verified) {
        setStatus("error");
        setMessage(ar ? "لم يتم تأكيد حفظ الانصراف بعد، حدّث الصفحة ثم أعد المحاولة." : "Check-out was not verified yet. Refresh and try again.");
      } else {
        setStatus("success");
        setMessage(
          eventType === "check_in"
            ? ar ? "تم تسجيل الحضور بنجاح ✔" : "Check-in recorded ✔"
            : result.deduplicated
              ? ar ? "تم تأكيد الانصراف من الطلب السابق ✔" : "Previous check-out confirmed ✔"
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
    if (eventType === "check_out") {
      setConfirmCheckoutOpen(true);
      return;
    }

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
    <div className="h-dvh min-h-screen bg-background overflow-hidden" dir={ar ? "rtl" : "ltr"}>
      <main
        ref={mainRef}
        className="h-full overflow-y-auto overflow-x-hidden"
        style={{
          overscrollBehavior: 'none',
          overscrollBehaviorY: 'none',
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch' as any,
        }}
      >
        <div className="min-h-full flex items-center justify-center p-4">
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
              <AlertDialog open={confirmCheckoutOpen} onOpenChange={setConfirmCheckoutOpen}>
                <AlertDialogContent dir={ar ? "rtl" : "ltr"}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{ar ? "تأكيد تسجيل الانصراف" : "Confirm check-out"}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {ar ? "سيتم حفظ وقت الانصراف الحالي بعد التحقق من الكود. هل تريد المتابعة؟" : "The current check-out time will be saved after QR validation. Continue?"}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{ar ? "إلغاء" : "Cancel"}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { setScanning(true); setStatus("scanning"); setMessage(""); }}>
                      {ar ? "بدء الانصراف" : "Start check-out"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

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

              {mode === "qr" && scanning && <QrScanner onScan={onScan} />}

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
      </main>
    </div>
  );
};

export default AttendanceScan;
