import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Auto-checkout policy:
 *
 *  - Run hourly via pg_cron.
 *  - Close any attendance record whose check_in is older than EXACTLY 18 hours
 *    and which has no check_out yet.
 *  - When auto-closing, work hours are HARD-CAPPED to 5h (never the elapsed 18-24h).
 *  - status set to 'auto-closed', notes appended with [AUTO_CLOSED], audit log
 *    entry inserted (action_type = 'AUTO_CLOSED').
 *  - After every run, records a heartbeat into public.cron_health_pings so the
 *    dashboard can alert when the cron stops running.
 */
const AUTO_CLOSE_AFTER_HOURS = 18;
const AUTO_CLOSED_WORK_HOURS = 5;

export async function recordCronPing(
  admin: any,
  jobName: string,
  payload: { success: boolean; records_processed?: number; errors_count?: number; details?: unknown },
) {
  try {
    await admin.from("cron_health_pings").insert({
      job_name: jobName,
      success: payload.success,
      records_processed: payload.records_processed ?? 0,
      errors_count: payload.errors_count ?? 0,
      details: (payload.details ?? null) as any,
    });
  } catch (e) {
    console.error("[auto-checkout] failed to write cron health ping:", e);
  }
}

/**
 * Pure helper used by tests and by the runtime. Given an open attendance
 * record's check_in timestamp (ISO), returns the auto-close payload while
 * enforcing the 5h cap regardless of how long the record was open.
 */
export function computeAutoCloseUpdate(checkInIso: string, nowMs: number = Date.now()) {
  const checkInMs = new Date(checkInIso).getTime();
  const elapsedMs = nowMs - checkInMs;
  const elapsedHours = elapsedMs / (60 * 60 * 1000);
  const eligible = elapsedHours >= AUTO_CLOSE_AFTER_HOURS;
  // HARD CAP: always 5h, never more — even if cron was down for days.
  const workHours = AUTO_CLOSED_WORK_HOURS;
  const checkOutIso = new Date(checkInMs + workHours * 60 * 60 * 1000).toISOString();
  return {
    eligible,
    elapsedHours,
    checkOutIso,
    workHours,
    workMinutes: workHours * 60,
    status: "auto-closed" as const,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const cronHeader = req.headers.get("x-cron-secret") || "";
    const expectedCron = Deno.env.get("CRON_SECRET") || "";
    if (expectedCron && cronHeader && cronHeader !== expectedCron && authHeader !== `Bearer ${expectedCron}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const cutoffMs = Date.now() - AUTO_CLOSE_AFTER_HOURS * 60 * 60 * 1000;
    const cutoff = new Date(cutoffMs).toISOString();

    const { data: openRecords, error: fetchErr } = await admin
      .from("attendance_records")
      .select("id, employee_id, check_in, date, notes, status")
      .is("check_out", null)
      .not("check_in", "is", null)
      .lt("check_in", cutoff)
      .limit(500);

    if (fetchErr) {
      console.error("[auto-checkout] fetch error:", fetchErr);
      await recordCronPing(admin, "auto-checkout", { success: false, details: { error: fetchErr.message } });
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    if (!openRecords || openRecords.length === 0) {
      console.log("[auto-checkout] No records older than 18h to close");
      await recordCronPing(admin, "auto-checkout", { success: true, records_processed: 0 });
      return new Response(JSON.stringify({ ok: true, closed: 0 }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    console.log(`[auto-checkout] Found ${openRecords.length} record(s) to AUTO-CLOSE at 18h`);

    let closed = 0;
    let errors = 0;

    for (const record of openRecords) {
      const plan = computeAutoCloseUpdate(record.check_in as string);
      if (!plan.eligible) {
        console.log(`[auto-checkout] SKIP record ${record.id} - not yet 18h old`);
        continue;
      }

      const noteSuffix = `[AUTO_CLOSED] Automatically closed after ${AUTO_CLOSE_AFTER_HOURS}h because employee did not check out. Work hours capped at ${plan.workHours}h.`;
      const newNotes = record.notes && !String(record.notes).includes("[AUTO_CLOSED]")
        ? `${record.notes} ${noteSuffix}`
        : (record.notes ?? noteSuffix);

      const { error: updateErr } = await admin
        .from("attendance_records")
        .update({
          check_out: plan.checkOutIso,
          status: plan.status,
          work_hours: plan.workHours,
          work_minutes: plan.workMinutes,
          notes: newNotes,
        })
        .eq("id", record.id)
        .is("check_out", null);

      if (updateErr) {
        console.error(`[auto-checkout] Failed to close record ${record.id}:`, updateErr);
        errors++;
        continue;
      }

      await admin.from("audit_logs").insert({
        user_id: "00000000-0000-0000-0000-000000000000",
        action_type: "AUTO_CLOSED",
        affected_table: "attendance_records",
        record_id: record.id,
        new_data: {
          employee_id: record.employee_id,
          check_in: record.check_in,
          check_out: plan.checkOutIso,
          reason: `Automatically closed after ${AUTO_CLOSE_AFTER_HOURS}h — work hours capped at ${plan.workHours}h`,
          policy_hours: AUTO_CLOSE_AFTER_HOURS,
          capped_work_hours: plan.workHours,
        },
      });

      closed++;
    }

    await recordCronPing(admin, "auto-checkout", {
      success: errors === 0,
      records_processed: closed,
      errors_count: errors,
      details: { total_eligible: openRecords.length },
    });

    return new Response(
      JSON.stringify({ ok: true, closed, errors, total: openRecords.length }),
      { headers: { ...corsHeaders, "content-type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[auto-checkout] error:", e);
    await recordCronPing(admin, "auto-checkout", { success: false, details: { error: e?.message ?? String(e) } });
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
