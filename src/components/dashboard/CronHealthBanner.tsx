import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const STALE_AFTER_HOURS = 2;

export const CronHealthBanner = () => {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [checking, setChecking] = useState(false);
  const [running, setRunning] = useState(false);

  const fetchHealth = async () => {
    setChecking(true);
    try {
      const { data } = await supabase
        .from("cron_health_pings" as any)
        .select("last_run_at")
        .eq("job_name", "auto-checkout")
        .eq("success", true)
        .order("last_run_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setLastRun(data ? new Date((data as any).last_run_at) : null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(id);
  }, []);

  const ageHours = lastRun ? (Date.now() - lastRun.getTime()) / (1000 * 60 * 60) : Infinity;
  const stale = ageHours > STALE_AFTER_HOURS;

  if (!stale) return null;

  const ageLabel = isFinite(ageHours)
    ? (ar ? `${ageHours.toFixed(1)} ساعة` : `${ageHours.toFixed(1)}h`)
    : (ar ? "غير معروف" : "unknown");

  const triggerNow = async () => {
    setRunning(true);
    try {
      await supabase.functions.invoke("auto-checkout", { body: {} });
      await fetchHealth();
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mb-4 rounded-lg border-2 border-destructive/40 bg-destructive/10 p-4 flex items-start gap-3" dir={ar ? "rtl" : "ltr"}>
      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-destructive">
          {ar ? "تعطّل الإغلاق التلقائي للحضور" : "Auto-checkout cron is stale"}
        </div>
        <div className="text-sm text-destructive/90 mt-1 break-words">
          {ar
            ? `لم تُسجَّل عملية إغلاق تلقائي ناجحة منذ ${ageLabel}. قد تتراكم سجلات حضور مفتوحة.`
            : `No successful auto-checkout run for ${ageLabel}. Open attendance records may pile up.`}
        </div>
      </div>
      <Button size="sm" variant="destructive" onClick={triggerNow} disabled={running || checking} className="gap-1.5 shrink-0">
        <RefreshCw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} />
        {ar ? "تشغيل الآن" : "Run now"}
      </Button>
    </div>
  );
};

export default CronHealthBanner;
