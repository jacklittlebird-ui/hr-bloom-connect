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
import { PortalWelcomeBanner } from '@/components/portal/PortalWelcomeBanner';
import { resetSessionTimer } from '@/lib/security';

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

/** Get the current 30-min bucket number */
const getBucket = () => Math.floor(Date.now() / (30 * 60 * 1000));

/** Seconds remaining until the next bucket */
const getSecondsToNextBucket = () => {
  const nowMs = Date.now();
  const bucketMs = 30 * 60 * 1000;
  return Math.floor(((Math.floor(nowMs / bucketMs) + 1) * bucketMs - nowMs) / 1000);
};

const AttendanceKiosk = () => {
  const { language } = useLanguage();
  const { session, logout } = useAuth();
  const ar = language === "ar";

  const QR_COUNT = 3;
  const [qrSrcs, setQrSrcs] = useState<string[]>(["", "", ""]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [countdown, setCountdown] = useState(getSecondsToNextBucket());
  const [error, setError] = useState("");
  const lastBucketRef = useRef<number>(getBucket());
  const isGeneratingRef = useRef(false);

  // Geolocation state
  const [geoStatus, setGeoStatus] = useState<"checking" | "allowed" | "denied" | "out_of_range" | "no_coords">("checking");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const watchRef = useRef<number | null>(null);

  // ── Keep-alive: prevent session timeout ──
  useEffect(() => {
    const keepAlive = setInterval(() => {
      resetSessionTimer(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(keepAlive);
  }, []);

  // ── Freeze detection: reload if page was suspended ──
  useEffect(() => {
    let lastActivity = Date.now();
    const markAlive = () => { lastActivity = Date.now(); };

    // Update activity on any interaction or timer fire
    const aliveInterval = setInterval(() => { markAlive(); }, 30000);

    const freezeCheck = setInterval(() => {
      const now = Date.now();
      // If more than 5 min passed since last tick, page was likely frozen/suspended
      if (now - lastActivity > 5 * 60 * 1000) {
        console.log("[Kiosk] Page freeze detected, reloading...");
        window.location.reload();
      }
      lastActivity = now;
    }, 60000);

    return () => {
      clearInterval(aliveInterval);
      clearInterval(freezeCheck);
    };
  }, []);

  // ── Daily reload at 4:00 AM for a clean slate ──
  useEffect(() => {
    const dailyReload = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 4 && now.getMinutes() === 0) {
        console.log("[Kiosk] Daily 4 AM reload");
        window.location.reload();
      }
    }, 60000);
    return () => clearInterval(dailyReload);
  }, []);

  // ── Keep-alive: Wake Lock API (prevent screen sleep) ──
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
          wakeLock?.addEventListener('release', () => {
            // Re-acquire on release (e.g. tab switch)
            setTimeout(requestWakeLock, 1000);
          });
        }
      } catch { /* ignore */ }
    };

    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      wakeLock?.release().catch(() => {});
    };
  }, []);

  // ── Keep-alive: refresh Supabase token before it expires ──
  useEffect(() => {
    const tokenRefresh = setInterval(async () => {
      try {
        await supabase.auth.refreshSession();
      } catch { /* ignore */ }
    }, 10 * 60 * 1000); // every 10 min
    return () => clearInterval(tokenRefresh);
  }, []);

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

  // ── QR generation: bucket-aware approach ──
  // Instead of a 30-min setInterval (which drifts), we check every 5 seconds
  // if the time bucket has changed, and only regenerate when it does.
  const generateQRCodes = useCallback(async () => {
    if (isGeneratingRef.current) return;
    if (!selectedLocation || !session?.access_token || geoStatus !== "allowed" || !userCoords) return;

    isGeneratingRef.current = true;
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

    try {
      const url = `https://${projectId}.supabase.co/functions/v1/generate-qr-token`;
      const results = await Promise.all(
        Array.from({ length: QR_COUNT }, () =>
          fetch(url, {
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
          }).then(r => r.json().then(j => ({ ok: r.ok, json: j })))
        )
      );

      const srcs: string[] = [];
      let hasError = false;
      for (const r of results) {
        if (!r.ok || !r.json.token) {
          hasError = true;
          srcs.push("");
        } else {
          const src = await QRCode.toDataURL(r.json.token, {
            width: 280,
            margin: 2,
            color: { dark: "#000000", light: "#ffffff" },
          });
          srcs.push(src);
        }
      }
      setQrSrcs(srcs);
      if (!hasError) {
        setError("");
        lastBucketRef.current = getBucket();
      }
    } catch (e: any) {
      console.error("[Kiosk] QR fetch error:", e);
      setError(e.message);
    } finally {
      isGeneratingRef.current = false;
    }
  }, [selectedLocation, session, geoStatus, userCoords]);

  // Initial generation + bucket-change detection every 10 seconds
  useEffect(() => {
    if (!selectedLocation || !session?.access_token || geoStatus !== "allowed" || !userCoords) return;

    // Generate immediately on mount / when deps change
    generateQRCodes();

    const checkInterval = setInterval(() => {
      const currentBucket = getBucket();
      // Update countdown
      setCountdown(getSecondsToNextBucket());
      // If bucket changed, regenerate
      if (currentBucket !== lastBucketRef.current) {
        generateQRCodes();
      }
    }, 10000); // check every 10 seconds

    return () => clearInterval(checkInterval);
  }, [selectedLocation, session, geoStatus, userCoords, generateQRCodes]);

  // Countdown ticker (cosmetic, every second)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(getSecondsToNextBucket());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Clear QR when not allowed
  useEffect(() => {
    if (geoStatus !== "allowed") {
      setQrSrcs(["", "", ""]);
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
      className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-arabic gap-4"
      dir={ar ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-4xl">
        <PortalWelcomeBanner />
      </div>
      <Card className="w-full max-w-4xl">
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

          {/* QR Codes display — 3 side by side */}
          {geoStatus === "allowed" ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {qrSrcs.map((src, i) => (
                  <div key={i} className="relative">
                    {src ? (
                      <>
                        <img
                          src={src}
                          alt={`QR Code ${i + 1}`}
                          className="w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] rounded-lg shadow-lg"
                        />
                        <Badge
                          variant="secondary"
                          className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs"
                        >
                          <RefreshCw className="h-3 w-3" />
                          {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                        </Badge>
                      </>
                    ) : (
                      <div className="w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] rounded-lg border-2 border-dashed border-muted flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {ar
                  ? "امسح أي رمز باستخدام تطبيق HR Link على هاتفك"
                  : "Scan any code using the HR Link app on your phone"}
              </p>
            </div>
          ) : (
            <div className="flex justify-center">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceKiosk;
