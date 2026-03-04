import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QrCode, RefreshCw, MapPin, ShieldAlert, ShieldCheck, Loader2, LogOut } from "lucide-react";
import QRCode from "qrcode";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const AttendanceKiosk = () => {
  const { language } = useLanguage();
  const { session, logout } = useAuth();
  const ar = language === "ar";

  const [qrSrc, setQrSrc] = useState("");
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState("");
  const intervalRef = useRef<number>();

  // Geolocation state
  const [geoStatus, setGeoStatus] = useState<"checking" | "allowed" | "denied" | "out_of_range" | "no_coords">("checking");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const watchRef = useRef<number | null>(null);

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

  // Watch GPS position
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      setError(ar ? "المتصفح لا يدعم تحديد الموقع" : "Browser does not support geolocation");
      return;
    }

    setGeoStatus("checking");

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setGeoStatus("denied");
        setError(
          ar
            ? "يجب السماح بالوصول للموقع الجغرافي لاستخدام نقطة الحضور"
            : "Location access is required to use the attendance kiosk"
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, [ar]);

  // Validate user position against selected location
  useEffect(() => {
    if (!userCoords || !selectedLocation) return;

    const loc = locations.find((l) => l.id === selectedLocation);
    if (!loc) return;

    if (loc.latitude == null || loc.longitude == null) {
      setGeoStatus("no_coords");
      setError(
        ar
          ? "لم يتم تحديد إحداثيات هذا الموقع بعد. يرجى التواصل مع الإدارة."
          : "This location has no GPS coordinates configured. Please contact admin."
      );
      return;
    }

    const dist = haversineDistance(userCoords.lat, userCoords.lng, loc.latitude, loc.longitude);
    setDistance(Math.round(dist));
    const radius = loc.radius_m || 150;

    if (dist <= radius) {
      setGeoStatus("allowed");
      setError("");
    } else {
      setGeoStatus("out_of_range");
      setError(
        ar
          ? `أنت خارج نطاق الموقع المسموح (${Math.round(dist)}م بعيداً، الحد الأقصى ${radius}م)`
          : `You are outside the allowed location range (${Math.round(dist)}m away, max ${radius}m)`
      );
    }
  }, [userCoords, selectedLocation, locations, ar]);

  // Generate QR token every 4.8s — only if location is verified
  useEffect(() => {
    if (!selectedLocation || !session?.access_token || geoStatus !== "allowed" || !userCoords) return;

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
            body: JSON.stringify({
              location_id: selectedLocation,
              gps_lat: userCoords.lat,
              gps_lng: userCoords.lng,
            }),
          }
        );
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Server error");
          setQrSrc("");
          return;
        }
        if (json.token) {
          const src = await QRCode.toDataURL(json.token, {
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

    const countdownInterval = window.setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 5));
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(countdownInterval);
    };
  }, [selectedLocation, session, geoStatus, userCoords]);

  // Clear QR when not allowed
  useEffect(() => {
    if (geoStatus !== "allowed") {
      setQrSrc("");
    }
  }, [geoStatus]);

  const currentLocation = locations.find((l) => l.id === selectedLocation);

  const renderStatusBanner = () => {
    if (geoStatus === "checking") {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{ar ? "جاري التحقق من الموقع الجغرافي..." : "Verifying your location..."}</span>
        </div>
      );
    }
    if (geoStatus === "allowed") {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20">
          <ShieldCheck className="h-5 w-5" />
          <span>
            {ar ? "تم التحقق من الموقع بنجاح" : "Location verified successfully"}
            {distance != null && ` (${distance}m)`}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
        <ShieldAlert className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center p-4 font-arabic"
      dir={ar ? "rtl" : "ltr"}
    >
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { logout(); }}
            className="absolute top-2 ltr:right-2 rtl:left-2 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{ar ? "خروج" : "Logout"}</span>
          </Button>
          <div className="flex justify-center mb-2">
            <QrCode className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {ar ? "نقطة تسجيل الحضور" : "Attendance Kiosk"}
          </CardTitle>
          {currentLocation && (
            <p className="text-muted-foreground flex items-center justify-center gap-1">
              <MapPin className="h-4 w-4" />
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

          {/* Geo status banner */}
          {renderStatusBanner()}

          {/* QR Code display — only when allowed */}
          <div className="flex flex-col items-center gap-4">
            {geoStatus === "allowed" && qrSrc ? (
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
            ) : geoStatus === "allowed" ? (
              <div className="w-[300px] h-[300px] rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="w-[300px] h-[300px] rounded-lg border-2 border-dashed border-destructive/30 flex items-center justify-center">
                <div className="text-center space-y-2 p-4">
                  <ShieldAlert className="h-12 w-12 text-destructive/50 mx-auto" />
                  <p className="text-muted-foreground text-sm">
                    {ar
                      ? "لا يمكن توليد رمز QR من خارج الموقع المحدد"
                      : "QR code cannot be generated outside the designated location"}
                  </p>
                </div>
              </div>
            )}
            {geoStatus === "allowed" && (
              <p className="text-sm text-muted-foreground text-center">
                {ar
                  ? "امسح هذا الرمز باستخدام تطبيق HR Link على هاتفك"
                  : "Scan this code using the HR Link app on your phone"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceKiosk;
