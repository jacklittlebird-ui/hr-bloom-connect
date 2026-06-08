import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Cron health check — runs hourly.
 *
 * Checks the last successful run of the 'auto-checkout' job. If it has not
 * succeeded in the last STALE_AFTER_HOURS, notifies all Admin + HR users.
 *
 * Also records its own heartbeat so the dashboard can confirm THIS job is
 * still running.
 */
const STALE_AFTER_HOURS = 2;          // alert if auto-checkout hasn't pinged in 2h
const NOTIFY_COOLDOWN_HOURS = 3;      // don't spam — only re-notify every 3h

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // 1) Look up last successful auto-checkout run
    const { data: lastSuccessRow } = await admin
      .from("cron_health_pings")
      .select("last_run_at")
      .eq("job_name", "auto-checkout")
      .eq("success", true)
      .order("last_run_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastSuccess = lastSuccessRow?.last_run_at ? new Date(lastSuccessRow.last_run_at).getTime() : 0;
    const ageHours = lastSuccess ? (Date.now() - lastSuccess) / (1000 * 60 * 60) : Infinity;
    const isStale = ageHours > STALE_AFTER_HOURS;

    let notified = 0;
    if (isStale) {
      // 2) Find admin + HR users
      const { data: roles } = await admin
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "hr"]);

      const userIds = Array.from(new Set((roles ?? []).map((r) => r.user_id).filter(Boolean)));

      // 3) Skip if we already notified within the cooldown window
      const cutoff = new Date(Date.now() - NOTIFY_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
      const { data: recent } = await admin
        .from("notifications")
        .select("id")
        .eq("module", "attendance")
        .eq("type", "warning")
        .ilike("title_ar", "%تعطل الإغلاق التلقائي%")
        .gt("created_at", cutoff)
        .limit(1);

      if (!recent || recent.length === 0) {
        const ageLabel = isFinite(ageHours) ? `${ageHours.toFixed(1)} ساعة` : "غير معروف";
        const ageLabelEn = isFinite(ageHours) ? `${ageHours.toFixed(1)}h` : "unknown";
        const rows = userIds.map((uid) => ({
          user_id: uid,
          title_ar: `⚠️ تعطل الإغلاق التلقائي للحضور`,
          title_en: `⚠️ Auto-checkout cron is down`,
          desc_ar: `لم ينجح تشغيل المهمة منذ ${ageLabel}. قد تتراكم سجلات حضور مفتوحة.`,
          desc_en: `Auto-checkout has not run successfully for ${ageLabelEn}. Open attendance records may pile up.`,
          type: "warning",
          module: "attendance",
          target_type: "admin",
        }));
        if (rows.length > 0) {
          const { error: nerr } = await admin.from("notifications").insert(rows);
          if (nerr) console.error("[cron-health-check] notify error:", nerr);
          else notified = rows.length;
        }
      }
    }

    // 4) Heartbeat for ourselves
    await admin.from("cron_health_pings").insert({
      job_name: "cron-health-check",
      success: true,
      details: { auto_checkout_age_hours: isFinite(ageHours) ? Number(ageHours.toFixed(2)) : null, stale: isStale, notified },
    });

    return new Response(
      JSON.stringify({ ok: true, auto_checkout_age_hours: isFinite(ageHours) ? ageHours : null, stale: isStale, notified }),
      { headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[cron-health-check] error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
