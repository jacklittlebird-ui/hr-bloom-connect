import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { QrCode, RefreshCw } from "lucide-react";
import QRCode from "qrcode";

const AttendanceKiosk = () => {
  const { language } = useLanguage();
  const { session } = useAuth();
  const ar = language === "ar";

  const [qrSrc, setQrSrc] = useState("");
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState("");
  const intervalRef = useRef<number>();

  // Fetch locations
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("qr_locations")
        .select("*")
        .eq("is_active", true);
      if (data && data.length > 0) {
        setLocations(data);
        setSelectedLocation(data[0].id);
      }
    })();
  }, []);

  // Generate QR token every 4.8s
  useEffect(() => {
    if (!selectedLocation || !session?.access_token) return;

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

    const tick = async () => {
      try {
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/generate-qr-token`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ location_id: selectedLocation }),
          }
        );
        const { token, expiresAt } = await res.json();
        if (token) {
          const src = await QRCode.toDataURL(token, {
            width: 300,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
          setQrSrc(src);
          setError("");
          setCountdown(5);
        }
      } catch (e: any) {
        setError(e.message);
      }
    };

    tick();
    intervalRef.current = window.setInterval(tick, 4800);

    // Countdown timer
    const countdownInterval = window.setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 5));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(countdownInterval);
    };
  }, [selectedLocation, session]);

  const currentLocation = locations.find((l) => l.id === selectedLocation);

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4"
      dir={ar ? "rtl" : "ltr"}
    >
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <QrCode className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {ar ? "نقطة تسجيل الحضور" : "Attendance Kiosk"}
          </CardTitle>
          {currentLocation && (
            <p className="text-muted-foreground">
              {ar ? currentLocation.name_ar : currentLocation.name_en}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Location selector */}
          {locations.length > 1 && (
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder={ar ? "اختر الموقع" : "Select Location"} />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {ar ? loc.name_ar : loc.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* QR Code display */}
          <div className="flex flex-col items-center gap-4">
            {qrSrc ? (
              <div className="relative">
                <img
                  src={qrSrc}
                  alt="Attendance QR Code"
                  className="w-[300px] h-[300px] rounded-lg shadow-lg"
                />
                <Badge
                  variant="secondary"
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  {countdown}s
                </Badge>
              </div>
            ) : (
              <div className="w-[300px] h-[300px] rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
                <p className="text-muted-foreground text-sm">
                  {error || (ar ? "جاري التحميل..." : "Loading...")}
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              {ar
                ? "امسح هذا الرمز باستخدام تطبيق HR Link على هاتفك"
                : "Scan this code using the HR Link app on your phone"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceKiosk;
